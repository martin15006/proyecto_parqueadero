import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UsuarioService } from '../usuarios/usuario.service';
import { AuthService } from '../auth/auth.service';
import { BahiasService } from '../bahias/bahias.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';
import { MailService } from '../mail/mail.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { Contingencia } from '../contingencia/entities/contingencia.entity';
import { AlertaSistema } from '../telemetria/entities/alerta-sistema.entity';
import { ConfirmarIngresoMultivehiculoDto } from './dto/confirmar-ingreso-multivehiculo.dto';

import { LoginOperativoDto } from './dto/login-operativo.dto';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { SalidaEmergenciaVehiculoDto } from './dto/salida-emergencia-vehiculo.dto';
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
    @InjectRepository(AlertaSistema)
    private readonly alertaSistemaRepository: Repository<AlertaSistema>,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly bahiasService: BahiasService,
    private readonly eventosGateway: EventosGateway,
    private readonly auditoriaService: AuditoriaService,
    private readonly mailService: MailService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * RF31/RF33/RF35: Flujo unificado de escaneo (Code128 actual + QR futuro).
   *
   * Comportamiento RF31 (Multi-vehículo):
   * - 1 vehículo: registra ingreso inmediato (flujo rápido).
   * - >1 vehículo: retorna lista de vehículos para selección y NO registra ingreso hasta confirmación.
   *
   * Seguridad y Fase 3 (RF14/RF39):
   * - Reutiliza registrarEntrada() que ya valida DESHABILITADO/LLENO de forma fulminante.
   */
  async escanearCodigo(codigo: string, operador: (IJwtPayload & { ip: string }) | null) {
    const token = String(codigo ?? '').trim(); // RF33: normaliza entrada del lector (teclado emulado).

    if (!token.length) {
      throw new BadRequestException({
        message: 'El código escaneado es obligatorio.',
        errorCode: 'CODIGO_OBLIGATORIO',
      });
    }

    const resultado = await this.usuarioService.buscarPorQR(token); // RF31: identifica al aprendiz a partir del token opaco.
    const usuario = resultado.usuario; // RF31: perfil del aprendiz (sin contraseña).
    const vehiculos = resultado.vehiculos || []; // RF31: flota asociada al aprendiz.

    if (vehiculos.length === 0) {
      throw new BadRequestException({
        message: 'El usuario no tiene vehículos registrados.',
        errorCode: 'USUARIO_SIN_VEHICULOS',
      });
    }

    const listaVehiculos = vehiculos.map((v: Vehiculo) => ({
      placa: v.placa, // RF31: dato mínimo para selección.
      tipoVehiculo: v.tipoVehiculo?.tipoVehiculo ?? 'N/D', // RF31: se usa lo existente; no se inventa marca/modelo.
      color: v.color, // RF31: apoyo visual para selección en portería.
    }));

    if (vehiculos.length === 1) {
      if (!operador) {
        throw new BadRequestException({
          message: 'Operación no permitida sin contexto de operador.',
          errorCode: 'OPERADOR_REQUERIDO',
        });
      }

      const placa = vehiculos[0].placa; // RF31: único vehículo => ingreso directo.
      const ingreso = await this.registrarEntrada(placa, operador); // RF31/RF39: registra ingreso y aplica bloqueos DESHABILITADO/LLENO.

      return {
        ...ingreso, // RF33/RF35: reutiliza payload estándar (bahía asignada, mensaje, etc.).
        modo: 'AUTO', // RF31: indica al frontend que no requiere selección adicional.
        aprendiz: { nombreCompleto: usuario.nombreCompleto }, // RF33: feedback visual inmediato (sin PII adicional).
        vehiculo: listaVehiculos[0], // RF31: confirma qué vehículo se procesó.
      };
    }

    return {
      ok: true,
      modo: 'SELECCION', // RF31: múltiples vehículos => selección manual obligatoria.
      aprendiz: { nombreCompleto: usuario.nombreCompleto }, // RF33: feedback visual para el vigilante.
      codigo: token, // RF31: se devuelve para reenviar en la confirmación (sin mantener estado server-side).
      vehiculos: listaVehiculos, // RF31: lista para modal de selección.
    };
  }

  /**
   * RF31: Confirmación secundaria cuando el aprendiz posee múltiples vehículos.
   *
   * Seguridad:
   * - Revalida el `codigo` (token opaco) para obtener el usuario real.
   * - Verifica que la placa seleccionada pertenezca a ese usuario antes de registrar el ingreso.
   */
  async confirmarIngresoMultivehiculo(
    dto: ConfirmarIngresoMultivehiculoDto,
    operador: IJwtPayload & { ip: string },
  ) {
    const codigo = String(dto.codigo ?? '').trim(); // RF31: normalización del token.
    const placaSeleccionada = String(dto.placa ?? '').trim().toUpperCase(); // RF31: normalización de placa para comparación y registro.

    const resultado = await this.usuarioService.buscarPorQR(codigo); // RF31: revalidación del aprendiz.
    const vehiculos = resultado.vehiculos || []; // RF31: flota del usuario.

    const placaPertenece = vehiculos.some((v: Vehiculo) => v.placa === placaSeleccionada); // RF31: evita ingreso de placa no asociada.
    if (!placaPertenece) {
      throw new BadRequestException({
        message: 'El vehículo seleccionado no pertenece al usuario identificado por el código.',
        errorCode: 'VEHICULO_NO_ASOCIADO',
      });
    }

    const ingreso = await this.registrarEntrada(placaSeleccionada, operador); // RF31/RF39: aplica bloqueos y registra entrada real.

    return {
      ...ingreso, // RF33: mensaje y bahía asignada.
      modo: 'CONFIRMADO', // RF31: confirma al frontend que el ingreso fue ejecutado tras selección.
      aprendiz: { nombreCompleto: resultado.usuario.nombreCompleto }, // RF33: feedback visual.
      vehiculo: { placa: placaSeleccionada }, // RF31: placa confirmada.
    };
  }

  /**
   * RF35: Resumen operativo para sincronización inicial del dashboard (no depende de /dashboard/resumen admin-only).
   *
   * Contenido restringido (mínimo privilegio):
   * - Ocupación actual (bahías total/ocupadas/disponibles + estado global).
   * - Conteo de ingresos/salidas del día ejecutados por este operativo (basado en auditoría existente).
   * - Alertas técnicas recientes (sensores/hardware) desde la tabla de alertas del sistema.
   */
  async obtenerResumenTurno(operador: IJwtPayload & { ip: string }) {
    const ocupacion = await this.bahiasService.obtenerOcupacion(); // RF35: fuente de verdad para mapa operativo.

    const inicioDia = new Date(); // RF35: para "ingresos del día" sin inventar el concepto de turnos no modelado.
    inicioDia.setHours(0, 0, 0, 0); // RF35: fija inicio del día local del servidor.

    const accionesIngreso = await this.auditoriaService.listarAccionesPorUsuarioEnRango({
      idUsuario: operador.sub,
      accion: 'REGISTRAR_ENTRADA',
      desde: inicioDia,
      hasta: new Date(),
      limit: 50,
    });

    const placasTurno = Array.from(
      new Set(
        accionesIngreso
          .map((a: any) => String(a?.datosNuevos?.placa ?? '').trim())
          .filter(Boolean)
          .map((p) => p.replace(/[- ]/g, '').toUpperCase()),
      ),
    );

    const vehiculosTurno = placasTurno.length
      ? await this.movimientoRepository.manager.find(Vehiculo, {
          where: { placa: In(placasTurno) },
          relations: ['tipoVehiculo'],
        })
      : [];

    const tipoPorPlaca = new Map(
      vehiculosTurno.map((v) => [v.placa, v.tipoVehiculo?.tipoVehiculo ?? 'N/D'] as const),
    );

    const ingresosTurno = accionesIngreso
      .map((a: any) => {
        const placa = String(a?.datosNuevos?.placa ?? '').trim().replace(/[- ]/g, '').toUpperCase();
        if (!placa) return null;
        return {
          placa,
          horaIngreso: a.createdAt,
          tipoVehiculo: tipoPorPlaca.get(placa) ?? 'N/D',
        };
      })
      .filter(Boolean)
      .slice(0, 50);

    const ingresosHoy = await this.auditoriaService.contarAccionPorUsuarioEnRango({
      idUsuario: operador.sub, // RF35: documento del operativo autenticado.
      accion: 'REGISTRAR_ENTRADA', // RF35: acción registrada en auditoría al procesar un ingreso.
      desde: inicioDia, // RF35: rango del día.
      hasta: new Date(), // RF35: hasta el momento actual.
    }); // RF35: métrica operativa basada en auditoría existente.

    const salidasHoy = await this.auditoriaService.contarAccionPorUsuarioEnRango({
      idUsuario: operador.sub, // RF35: documento del operativo autenticado.
      accion: 'REGISTRAR_SALIDA', // RF35: acción registrada en auditoría al procesar una salida.
      desde: inicioDia, // RF35: rango del día.
      hasta: new Date(), // RF35: hasta el momento actual.
    }); // RF35: métrica operativa basada en auditoría existente.

    const alertasTecnicas = await this.alertaSistemaRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    }); // RF35: entrega últimas alertas del sistema (incluye sensores/hardware si existen).

    return {
      ocupacion, // RF35: stats + bahías para mapa.
      turno: {
        ingresosHoy, // RF35: conteo de ingresos del día ejecutados por el operativo.
        salidasHoy, // RF35: conteo de salidas del día ejecutadas por el operativo.
        ingresos: ingresosTurno,
      }, // RF35: agrupación sin exponer datos administrativos.
      alertasTecnicas: alertasTecnicas.map(a => ({
        tipo: a.tipo,
        mensaje: a.mensaje,
        fecha: a.createdAt,
      })), // RF35: payload mínimo para UI (sin datos sensibles).
    };
  }

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
    await this.bahiasService.validarIngresoPermitido(); // RF14/RF39: se valida antes de cualquier operación para impedir bypass (operativo/contingencia).
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
    await this.bahiasService.validarIngresoPermitido(); // RF14/RF39: contingencia sigue subordinada al estado administrativo y a la capacidad real.
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      if (!operador?.sub) {
        throw new UnauthorizedException('Operador inválido');
      }

      const identificacion = String(dto.identificacion ?? dto.placa ?? '').trim();
      if (!identificacion) {
        throw new BadRequestException('La placa o documento es obligatorio');
      }

      const placaNormalizada = this.normalizarPlaca(identificacion);
      const esDocumento = /^[0-9]{6,10}$/.test(placaNormalizada);

      let placaARegistrar = placaNormalizada;
      if (esDocumento) {
        const usuario = await this.usuarioService.findOneByDocumento(placaNormalizada);
        if (!usuario) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const [registroUsuario] = await manager.find(RegistroVehiculo, {
          where: { idUsuario: placaNormalizada },
          order: { createdAt: 'ASC' },
          take: 1,
        });

        if (!registroUsuario) {
          throw new BadRequestException('El usuario no tiene vehículos asociados');
        }

        placaARegistrar = this.normalizarPlaca(registroUsuario.idVehiculo);
      }

      // 1. Validaciones de existencia (placa normalizada)
      const { registro } = await this.validarVehiculoYRegistro(placaARegistrar, manager);
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
        placa: placaARegistrar,
        motivo: dto.motivo,
        idOperativo: operador.sub, // Documento del operario
        idMovimiento: movimientoGuardado.idMovimiento,
      });

      await manager.save(contingencia);

      // 5. Ejecutar procesos post-ingreso (Auditoría, Sockets, etc.)
      await this.ejecutarPostIngreso(movimientoGuardado, placaARegistrar, bahia.nombreBahia, operador);

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

      // CRÍTICO (PostgreSQL):
      // El lock FOR UPDATE falla si la consulta incluye LEFT JOIN (nullable side of an outer join).
      // Por eso primero bloqueamos la fila del movimiento activo SIN cargar relaciones; luego cargamos la bahía aparte.
      const movimientoActivo = await manager
        .createQueryBuilder(MovimientoVehiculo, 'mov')
        .setLock('pessimistic_write')
        .where('mov.id_registro_vehiculo = :idRegistroVehiculo', { idRegistroVehiculo: registro.idRegistroV })
        .andWhere('mov.estado = :estado', { estado: EstadoMovimiento.ADENTRO })
        .getOne();

      if (!movimientoActivo) {
        throw new BadRequestException('El vehículo no tiene un ingreso activo registrado');
      }

      movimientoActivo.horaSalida = new Date();
      movimientoActivo.estado = EstadoMovimiento.SALIDA;
      await manager.save(movimientoActivo);

      const bahia = await manager.findOne(Bahia, {
        where: { idBahia: movimientoActivo.idBahia },
      });
      if (bahia) {
        (movimientoActivo as any).bahia = bahia;
      }

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

  async salidaEmergenciaVehiculo(
    dto: SalidaEmergenciaVehiculoDto,
    actor: { sub: string; nombre: string | null; ip?: string; userAgent?: string },
  ) {
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      const ahora = new Date();
      const placa = dto.placa?.trim().toUpperCase();

      let registro: RegistroVehiculo | null = null;
      if (dto.idRegistroVehiculo) {
        registro = await manager.findOne(RegistroVehiculo, {
          where: { idRegistroV: dto.idRegistroVehiculo },
          relations: ['usuario', 'vehiculo'],
        });
      } else if (placa) {
        registro = await manager.findOne(RegistroVehiculo, {
          where: { idVehiculo: placa },
          relations: ['usuario', 'vehiculo'],
        });
      }

      if (!registro) throw new NotFoundException('Registro de vehículo no encontrado');

      const movimientoActivo = await manager.findOne(MovimientoVehiculo, {
        where: { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.ADENTRO },
        lock: { mode: 'pessimistic_write' },
      });

      if (!movimientoActivo) {
        throw new BadRequestException('El vehículo no tiene un ingreso activo registrado');
      }

      movimientoActivo.horaSalida = ahora;
      movimientoActivo.estado = EstadoMovimiento.SALIDA;
      movimientoActivo.esManual = true;
      await manager.save(movimientoActivo);

      const contingencia = manager.create(Contingencia, {
        tipoOperacion: 'SALIDA',
        placa: registro.idVehiculo,
        motivo: dto.motivo,
        idOperativo: actor.sub,
        idMovimiento: movimientoActivo.idMovimiento,
      });
      await manager.save(contingencia);

      await this.auditoriaService.create({
        accion: 'SALIDA_EMERGENCIA_MANUAL',
        entidad: 'MOVIMIENTO_VEHICULO',
        idEntidad: movimientoActivo.idMovimiento,
        idUsuario: actor.sub,
        datosNuevos: {
          placa: registro.idVehiculo,
          motivo: dto.motivo,
          idBahia: movimientoActivo.idBahia,
          horaSalida: ahora,
        },
        ip: actor.ip,
        userAgent: actor.userAgent,
      });

      this.eventosGateway.emitirVehiculoRetirado({ placa: registro.idVehiculo, fecha: ahora });
      await this.sincronizarEstadoGlobal();

      const correo = registro.usuario?.correo;
      const nombreUsuario = registro.usuario?.nombreCompleto;
      if (correo && nombreUsuario) {
        await this.mailService.enviarNotificacionSalidaEmergencia( // RF25: notificación por correo (canal externo) ante salida de emergencia.
          correo, // RNF2: se usa solo para envío, no para logs.
          nombreUsuario, // RF25: personaliza el mensaje sin exponer datos sensibles adicionales.
          registro.idVehiculo, // RF25: placa afectada (dato funcional requerido).
          dto.motivo, // RF25: motivo informado al usuario.
        );
      }

      const documentoUsuario = registro.usuario?.documento;
      if (documentoUsuario) {
        await this.notificacionesService.registrarSalidaEmergencia({ // RF25: persistencia en bandeja (historial visible).
          idUsuario: documentoUsuario, // RF25: destinatario (aprendiz) para consulta posterior.
          placa: registro.idVehiculo, // RF25: placa del vehículo afectado.
          motivo: dto.motivo, // RF25: motivo de la salida de emergencia.
          actorNombre: actor.nombre, // RF25: nombre del administrador que autorizó (criterio explícito).
        }); // RNF2: no se persisten tokens/QR/credenciales; solo datos de notificación.
      }

      return {
        ok: true,
        mensaje: 'Salida de emergencia registrada',
        idMovimiento: movimientoActivo.idMovimiento,
        placa: registro.idVehiculo,
        idBahia: movimientoActivo.idBahia,
      };
    });
  }

  /**
   * Valida un código QR.
   */
  async escanearQr(qr: string) {
    return await this.usuarioService.buscarPorQR(qr);
  }

  // --- MÉTODOS PRIVADOS DE SOPORTE ---

  private normalizarPlaca(value: string) {
    return String(value ?? '').replace(/[- ]/g, '').toUpperCase();
  }

  private async validarVehiculoYRegistro(placa: string, manager: EntityManager) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const vehiculo =
      (await manager.findOne(Vehiculo, { where: { placa: placaNormalizada } })) ??
      (await manager
        .createQueryBuilder(Vehiculo, 'vehiculo')
        .where(`REPLACE(REPLACE(vehiculo.placa, '-', ''), ' ', '') = :placa`, { placa: placaNormalizada })
        .getOne());

    if (!vehiculo) throw new NotFoundException('Placa no reconocida en el sistema');

    const registro =
      (await manager.findOne(RegistroVehiculo, { where: { idVehiculo: placaNormalizada } })) ??
      (await manager
        .createQueryBuilder(RegistroVehiculo, 'registro')
        .where(`REPLACE(REPLACE(registro.id_vehiculo, '-', ''), ' ', '') = :placa`, { placa: placaNormalizada })
        .getOne());

    if (!registro) throw new BadRequestException('Vehículo sin vinculación activa a un usuario');

    return { vehiculo, registro };
  }

  private async verificarVehiculoAfuera(idRegistro: number, manager: EntityManager) {
    const activo = await manager.findOne(MovimientoVehiculo, {
      where: { idRegistroVehiculo: idRegistro, estado: In([EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]) },
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
          .where('mov.estado IN (:...estados)', { estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO] })
          .getQuery();
        return 'bahia.id_bahia NOT IN ' + subQuery;
      })
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
    const conteo = await this.bahiasService.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      ...conteo,
      actualizadoEn: new Date(),
    });
    await this.bahiasService.evaluarAlertasOcupacion(); // RF13/RF39: dispara alertas 80/100 tras cada cambio de ocupación.
  }
}
