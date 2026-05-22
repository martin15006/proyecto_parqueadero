import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UsuarioService } from '../usuarios/usuario.service';
import { AuthService } from '../auth/auth.service';
import { BahiasService } from '../bahias/bahias.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';

import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { Contingencia } from '../contingencia/entities/contingencia.entity';

import { LoginOperativoDto } from './dto/login-operativo.dto';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { IJwtPayload } from '../common/interfaces/auth.interface';

/**
 * Servicio Operativo: Motor de control de entrada y salida de vehículos.
 * REFACTOR: Implementa transacciones atómicas y lógica de negocio desacoplada.
 */
@Injectable()
export class OperativoService {
  constructor(
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly bahiasService: BahiasService,
    private readonly eventosGateway: EventosGateway,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Autenticación para personal operativo.
   * SECURITY: Valida credenciales y rol operativo (ID: 3).
   * @param dto Credenciales de operador
   */
  async login(dto: LoginOperativoDto) {
    const usuario = await this.usuarioService.findOneByDocumento(dto.documento);
    if (!usuario) throw new NotFoundException('Operador no encontrado');

    const passwordMatch = await bcrypt.compare(dto.password, usuario.contra);
    if (!passwordMatch) throw new UnauthorizedException('Credenciales inválidas');

    if (usuario.idTipoUsr !== 3) {
      throw new BadRequestException('El usuario no posee permisos operativos');
    }

    const tokens = await this.authService.generarTokens(usuario);

    return {
      ok: true,
      mensaje: 'Acceso operativo concedido',
      ...tokens,
      usuario: {
        documento: usuario.documento,
        nombre: usuario.nombreCompleto,
        rol: 'OPERATIVO',
      },
    };
  }

  /**
   * Procesa el ingreso de un vehículo.
   * OPTIMIZATION: Utiliza Pessimistic Write Lock para evitar condiciones de carrera en bahías.
   * @param placa Identificador del vehículo
   * @param operador Datos del operador que registra
   */
  async registrarEntrada(placa: string, operador: IJwtPayload & { ip: string }) {
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      // 1. Validaciones de existencia y estado
      const { registro } = await this.validarVehiculoYRegistro(placa, manager);
      await this.verificarVehiculoAfuera(registro.idRegistroV, manager);

      // 2. Asignación de infraestructura con Lock
      const bahia = await this.asignarBahiaDisponible(manager);

      // 3. Registro del movimiento
      const nuevoMovimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        idBahia: bahia.idBahia,
        estado: EstadoMovimiento.ADENTRO,
      });

      const guardado = await manager.save(nuevoMovimiento);

      // 4. Auditoría, Sockets y Sincronización
      await this.ejecutarPostIngreso(guardado, placa, bahia.nombreBahia, operador);

      return {
        ok: true,
        mensaje: 'Ingreso procesado exitosamente',
        movimiento: guardado,
        bahia: bahia.nombreBahia,
      };
    });
  }

  /**
   * Registro Manual de Contingencia (RF34).
   * Permite el ingreso de vehículos cuando fallan los sistemas automáticos o por casos especiales.
   * PERFORMANCE: Mantiene Pessimistic Write Lock y transaccionalidad completa.
   * @param dto Datos del ingreso y motivo de contingencia
   * @param operador Datos del operario responsable
   */
  async registrarIngresoManual(dto: RegistrarIngresoManualDto, operador: IJwtPayload & { ip: string }) {
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      // 1. Validaciones de existencia (Se permite placa o documento)
      const { registro } = await this.validarVehiculoYRegistro(dto.placa, manager);
      await this.verificarVehiculoAfuera(registro.idRegistroV, manager);

      // 2. Asignación de infraestructura con Pessimistic Lock (Garantiza exclusión mutua)
      const bahia = await this.asignarBahiaDisponible(manager);

      // 3. Registro formal del movimiento marcado como manual
      const nuevoMovimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        idBahia: bahia.idBahia,
        estado: EstadoMovimiento.ADENTRO,
        esManual: true, // Flag de contingencia
      });

      const movimientoGuardado = await manager.save(nuevoMovimiento);

      // 4. Registro formal de la contingencia para auditoría RF34
      const contingencia = manager.create(Contingencia, {
        tipoOperacion: 'INGRESO',
        placa: dto.placa,
        motivo: dto.motivo,
        idOperativo: operador.sub, // Documento del operario
        idMovimiento: movimientoGuardado.idMovimiento,
      });

      await manager.save(contingencia);

      // 5. Ejecutar procesos post-ingreso (Auditoría, Sockets, etc.)
      await this.ejecutarPostIngreso(movimientoGuardado, dto.placa, bahia.nombreBahia, operador);

      return {
        ok: true,
        mensaje: 'Ingreso manual por contingencia registrado correctamente',
        idMovimiento: movimientoGuardado.idMovimiento,
        bahia: bahia.nombreBahia,
      };
    });
  }

  /**
   * Procesa la salida de un vehículo.
   * @param placa Identificador del vehículo
   * @param operador Datos del operador que registra
   */
  async registrarSalida(placa: string, operador: IJwtPayload & { ip: string }) {
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      const { registro } = await this.validarVehiculoYRegistro(placa, manager);

      const movimientoActivo = await manager.findOne(MovimientoVehiculo, {
        where: { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.ADENTRO },
        relations: ['bahia'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!movimientoActivo) {
        throw new BadRequestException('El vehículo no tiene un ingreso activo registrado');
      }

      movimientoActivo.horaSalida = new Date();
      movimientoActivo.estado = EstadoMovimiento.SALIDA;
      await manager.save(movimientoActivo);

      // 4. Auditoría, Sockets y Sincronización
      await this.ejecutarPostSalida(movimientoActivo, placa, operador);

      return {
        ok: true,
        mensaje: 'Salida procesada correctamente',
        movimiento: movimientoActivo,
      };
    });
  }

  /**
   * Procedimiento de emergencia global.
   * @param operador Operador que autoriza la emergencia
   */
  async salidaEmergencia(operador: IJwtPayload & { ip: string }) {
    const ahora = new Date();
    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: EstadoMovimiento.ADENTRO },
    });

    if (movimientosActivos.length === 0) {
      return { ok: true, mensaje: 'No hay vehículos activos en el sistema' };
    }

    await this.movimientoRepository.update(
      { estado: EstadoMovimiento.ADENTRO },
      { estado: EstadoMovimiento.SALIDA, horaSalida: ahora },
    );

    await this.auditoriaService.create({
      accion: 'SALIDA_EMERGENCIA_GLOBAL',
      entidad: 'MOVIMIENTO_VEHICULO',
      idUsuario: operador?.sub || 'SISTEMA',
      datosNuevos: { cantidadLiberada: movimientosActivos.length, fecha: ahora },
      ip: operador?.ip || '127.0.0.1',
      userAgent: 'Operativo App',
    });

    await this.sincronizarEstadoGlobal();
    return { ok: true, mensaje: `Se han liberado ${movimientosActivos.length} bahías por emergencia` };
  }

  /**
   * Valida un código QR.
   */
  async escanearQr(qr: string) {
    return await this.usuarioService.buscarPorQR(qr);
  }

  // --- MÉTODOS PRIVADOS DE SOPORTE ---

  private async validarVehiculoYRegistro(placa: string, manager: EntityManager) {
    const vehiculo = await manager.findOne(Vehiculo, { where: { placa } });
    if (!vehiculo) throw new NotFoundException('Placa no reconocida en el sistema');

    const registro = await manager.findOne(RegistroVehiculo, { where: { idVehiculo: placa } });
    if (!registro) throw new BadRequestException('Vehículo sin vinculación activa a un usuario');

    return { vehiculo, registro };
  }

  private async verificarVehiculoAfuera(idRegistro: number, manager: EntityManager) {
    const activo = await manager.findOne(MovimientoVehiculo, {
      where: { idRegistroVehiculo: idRegistro, estado: EstadoMovimiento.ADENTRO },
      lock: { mode: 'pessimistic_write' },
    });
    if (activo) throw new BadRequestException('El vehículo ya se encuentra dentro de las instalaciones');
  }

  private async asignarBahiaDisponible(manager: EntityManager): Promise<Bahia> {
    const disponible = await manager.createQueryBuilder(Bahia, 'bahia')
      .setLock('pessimistic_write')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('mov.id_bahia')
          .from(MovimientoVehiculo, 'mov')
          .where('mov.estado = :estado', { estado: EstadoMovimiento.ADENTRO })
          .getQuery();
        return 'bahia.id_bahia NOT IN ' + subQuery;
      })
      .setParameter('estado', EstadoMovimiento.ADENTRO)
      .getOne();

    if (!disponible) {
      throw new BadRequestException('Capacidad máxima alcanzada: No hay bahías disponibles');
    }
    
    return disponible;
  }

  private async ejecutarPostIngreso(mov: MovimientoVehiculo, placa: string, bahia: string, operador: IJwtPayload & { ip: string }) {
    await this.auditoriaService.create({
      accion: 'REGISTRAR_ENTRADA',
      entidad: 'MOVIMIENTO_VEHICULO',
      idEntidad: mov.idMovimiento,
      idUsuario: operador?.sub || 'SISTEMA',
      datosNuevos: { placa, bahia },
      ip: operador?.ip || '127.0.0.1',
      userAgent: 'Operativo App',
    });

    this.eventosGateway.emitirVehiculoIngresado({ placa, fecha: mov.horaIngreso, bahia });
    await this.sincronizarEstadoGlobal();
  }

  private async ejecutarPostSalida(mov: MovimientoVehiculo, placa: string, operador: IJwtPayload & { ip: string }) {
    await this.auditoriaService.create({
      accion: 'REGISTRAR_SALIDA',
      entidad: 'MOVIMIENTO_VEHICULO',
      idEntidad: mov.idMovimiento,
      idUsuario: operador?.sub || 'SISTEMA',
      datosNuevos: { placa, horaSalida: mov.horaSalida },
      ip: operador?.ip || '127.0.0.1',
      userAgent: 'Operativo App',
    });

    this.eventosGateway.emitirVehiculoRetirado({ placa, fecha: mov.horaSalida! });
    await this.sincronizarEstadoGlobal();
  }

  private async sincronizarEstadoGlobal() {
    const ocupacion = await this.bahiasService.obtenerOcupacion();
    this.eventosGateway.emitirOcupacionActualizada(ocupacion);
  }
}
