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
  /**
   * RF31/RF33: Flujo unificado de escaneo (Code128 / QR).
   *
   * Routing de acción por estado del movimiento activo:
   * - `TRANSITO` sin bahía → vehículo ya autorizado en ingreso; rechaza doble scan.
   * - `TRANSITO` con bahía o `ADENTRO` → registra salida definitiva (portería confirma).
   * - Sin movimiento activo → inicia tránsito de ingreso (`iniciarTransitoIngreso`).
   *
   * El ingreso ya **no asigna bahía**: eso es responsabilidad del sensor físico.
   */
  async escanearCodigo(codigo: string, operador: (IJwtPayload & { ip: string }) | null) {
    const token = String(codigo ?? '').trim();

    if (!token.length) {
      throw new BadRequestException({
        message: 'El código escaneado es obligatorio.',
        errorCode: 'CODIGO_OBLIGATORIO',
      });
    }

    const resultado = await this.usuarioService.buscarIdentidadUnificada(token);
    const usuario = resultado.usuario;
    let vehiculos = resultado.vehiculos || [];

    if (vehiculos.length === 0) {
      throw new BadRequestException({
        message: 'El usuario no tiene vehículos registrados.',
        errorCode: 'USUARIO_SIN_VEHICULOS',
      });
    }

    if (resultado.placaDetectada) {
      vehiculos = vehiculos.filter(v => v.placa === resultado.placaDetectada);
    }

    if (!operador) {
      throw new BadRequestException({
        message: 'Operación no permitida sin contexto de operador.',
        errorCode: 'OPERADOR_REQUERIDO',
      });
    }

    // 🔍 Si el usuario YA tiene un movimiento activo (con cualquiera de sus vehículos),
    // la acción es siempre SALIDA de ese vehículo — no mostramos modal de selección.
    const placas = vehiculos.map((v) => v.placa);
    const movimientoActivoMio = await this.movimientoRepository
      .createQueryBuilder('mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .where('rv.id_vehiculo IN (:...placas)', { placas })
      .andWhere('mv.documento_ingreso = :doc', { doc: usuario.documento })
      .andWhere('mv.estado IN (:...estados)', {
        estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO],
      })
      .orderBy('mv.hora_ingreso', 'DESC')
      .getOne();

    if (movimientoActivoMio) {
      const registro = await this.movimientoRepository.manager.findOne(RegistroVehiculo, {
        where: { idRegistroV: movimientoActivoMio.idRegistroVehiculo },
        relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
      });
      const placa = registro?.idVehiculo ?? '';
      const resultadoOp = await this.resolverAccionPorEstado(placa, usuario.documento, operador, usuario);
      return {
        ...resultadoOp,
        modo: 'AUTO',
        aprendiz: {
          nombreCompleto: usuario.nombreCompleto,
          documento: usuario.documento,
          fotoPersona: usuario.fotoPersona,
        },
        vehiculo: {
          placa,
          tipoVehiculo: registro?.vehiculo?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: registro?.vehiculo?.color,
          fotoVehiculo: registro?.vehiculo?.fotoVehiculo,
          fotoTarjetaP: registro?.vehiculo?.fotoTarjetaP,
          fotoPlaca: registro?.vehiculo?.fotoPlaca,
        },
      };
    }

    // Si solo tiene un vehículo, va directo a ingresarlo
    if (vehiculos.length === 1) {
      const placa = vehiculos[0].placa;
      const resultadoOp = await this.resolverAccionPorEstado(placa, usuario.documento, operador, usuario);

      return {
        ...resultadoOp,
        modo: 'AUTO',
        aprendiz: {
          nombreCompleto: usuario.nombreCompleto,
          documento: usuario.documento,
          fotoPersona: usuario.fotoPersona,
        },
        vehiculo: {
          placa: vehiculos[0].placa,
          tipoVehiculo: vehiculos[0].tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculos[0].color,
          fotoVehiculo: vehiculos[0].fotoVehiculo,
          fotoTarjetaP: vehiculos[0].fotoTarjetaP,
          fotoPlaca: vehiculos[0].fotoPlaca,
        },
      };
    }

    // Tiene varios vehículos y NINGUNO está adentro → debe elegir con cuál ingresar
    return {
      ok: true,
      modo: 'SELECCION',
      aprendiz: {
        nombreCompleto: usuario.nombreCompleto,
        documento: usuario.documento,
        fotoPersona: usuario.fotoPersona,
      },
      codigo: token,
      vehiculos: vehiculos.map((v: Vehiculo) => ({
        placa: v.placa,
        tipoVehiculo: v.tipoVehiculo?.tipoVehiculo ?? 'N/D',
        color: v.color,
        fotoVehiculo: v.fotoVehiculo,
        fotoTarjetaP: v.fotoTarjetaP,
        fotoPlaca: v.fotoPlaca,
      })),
    };
  }

  /**
   * Determina la acción a ejecutar según el estado del movimiento activo del vehículo:
   * - TRANSITO sin bahía → el vehículo ya está en camino hacia la bahía; no se duplica.
   * - TRANSITO con bahía / ADENTRO → el sensor detectó salida; el operario confirma.
   * - Sin movimiento → inicia tránsito de ingreso (sin asignar bahía).
   */
  /**
   * Lógica de portería simplificada:
   * - Si el vehículo NO tiene movimiento activo → ingreso (ADENTRO, sin bahía).
   * - Si el vehículo ya está ADENTRO → salida.
   *
   * El sensor es independiente: solo gestiona el estado visual de las bahías.
   * La portería no asigna ni libera bahías.
   */
  private async resolverAccionPorEstado(
    placa: string,
    documentoUsuario: string,
    operador: IJwtPayload & { ip: string },
    usuarioInfo?: any,
  ) {
    // Buscamos el registro del vehículo (sin filtrar por usuario, ya que puede ser compartido).
    const registro = await this.movimientoRepository.manager.findOne(RegistroVehiculo, {
      where: { idVehiculo: placa },
    });

    if (!registro) {
      return await this.iniciarTransitoIngreso(placa, documentoUsuario, operador, usuarioInfo);
    }

    // ¿Tiene movimiento activo? → entonces tocaría salida
    const movimientoActivo = await this.movimientoRepository.findOne({
      where: [
        { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.ADENTRO },
        { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.TRANSITO },
      ],
    });

    if (movimientoActivo) {
      // Solo quien hizo el ingreso puede registrar la salida.
      // Si `documentoIngreso` está vacío (movimientos antiguos), permitimos al propietario.
      const quienIngresó = movimientoActivo.documentoIngreso ?? registro.idUsuario;
      if (quienIngresó !== documentoUsuario) {
        throw new BadRequestException({
          message: 'Solo el usuario que realizó el ingreso puede registrar la salida de este vehículo.',
          errorCode: 'SALIDA_NO_AUTORIZADA',
        });
      }
      return await this.registrarSalida(placa, operador);
    }

    return await this.iniciarTransitoIngreso(placa, documentoUsuario, operador, usuarioInfo);
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
    const usuario = resultado.usuario;
    const vehiculos = resultado.vehiculos || []; // RF31: flota del usuario.

    const vehiculoSeleccionado = vehiculos.find((v: Vehiculo) => v.placa === placaSeleccionada);
    if (!vehiculoSeleccionado) {
      throw new BadRequestException({
        message: 'El vehículo seleccionado no pertenece al usuario identificado por el código.',
        errorCode: 'VEHICULO_NO_ASOCIADO',
      });
    }

    const resultadoOp = await this.resolverAccionPorEstado(
      placaSeleccionada,
      usuario.documento,
      operador,
      usuario,
    );

    return {
      ...resultadoOp, // RF33: mensaje y bahía asignada.
      modo: 'CONFIRMADO', // RF31: confirma al frontend que el ingreso fue ejecutado tras selección.
      aprendiz: { 
        nombreCompleto: usuario.nombreCompleto,
        documento: usuario.documento,
        fotoPersona: usuario.fotoPersona
      },
      vehiculo: { 
        placa: placaSeleccionada,
        fotoVehiculo: vehiculoSeleccionado.fotoVehiculo,
        fotoTarjetaP: vehiculoSeleccionado.fotoTarjetaP,
        fotoPlaca: vehiculoSeleccionado.fotoPlaca,
      },
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
    // obtenerOcupacion ahora devuelve:
    //   total     = bahías con sensor activo (físicas reales)
    //   ocupados  = QRs escaneados activos (movimientos ADENTRO/TRANSITO)
    //   disponibles = total - ocupados
    const estadoGlobal = await this.bahiasService.obtenerOcupacion();

    const inicioDia = new Date(); // RF35: para "ingresos del día" sin inventar el concepto de turnos no modelado.
    inicioDia.setHours(0, 0, 0, 0); // RF35: fija inicio del día local del servidor.

    const accionesIngreso = await this.auditoriaService.listarAccionesPorUsuarioEnRango({
      idUsuario: operador.sub,
      accion: 'REGISTRAR_ENTRADA',
      desde: inicioDia,
      hasta: new Date(),
      limit: 50,
    });

    // RF35: también las salidas del turno, para distinguir el tipo de cada movimiento.
    const accionesSalida = await this.auditoriaService.listarAccionesPorUsuarioEnRango({
      idUsuario: operador.sub,
      accion: 'REGISTRAR_SALIDA',
      desde: inicioDia,
      hasta: new Date(),
      limit: 50,
    });

    // Unimos ingresos y salidas etiquetando el tipo de cada acción.
    const accionesTurno: Array<{ a: any; tipo: 'INGRESO' | 'SALIDA' }> = [
      ...accionesIngreso.map((a: any) => ({ a, tipo: 'INGRESO' as const })),
      ...accionesSalida.map((a: any) => ({ a, tipo: 'SALIDA' as const })),
    ];

    const normalizarPlaca = (p: any) =>
      String(p ?? '').trim().replace(/[- ]/g, '').toUpperCase();

    const placasTurno = Array.from(
      new Set(
        accionesTurno
          .map(({ a }) => normalizarPlaca(a?.datosNuevos?.placa))
          .filter(Boolean),
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

    const ingresosTurno = accionesTurno
      .map(({ a, tipo }) => {
        const placa = normalizarPlaca(a?.datosNuevos?.placa);
        if (!placa) return null;
        return {
          placa,
          horaIngreso: a.createdAt, // momento del movimiento (ingreso o salida)
          tipoVehiculo: tipoPorPlaca.get(placa) ?? 'N/D',
          tipo, // 'INGRESO' | 'SALIDA'
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((x, y) => new Date(y.horaIngreso).getTime() - new Date(x.horaIngreso).getTime())
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

    const porcentajeOcupacion = estadoGlobal.total > 0
      ? parseFloat(((estadoGlobal.ocupados / estadoGlobal.total) * 100).toFixed(1))
      : 0;

    return {
      ocupacion: {
        total: estadoGlobal.total,
        ocupados: estadoGlobal.ocupados,
        disponibles: estadoGlobal.disponibles,
        porcentajeOcupacion,
        parqueaderoDeshabilitado: estadoGlobal.parqueaderoDeshabilitado,
        estadoParqueadero: estadoGlobal.estadoParqueadero,
      },
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
  /**
   * Registra el ingreso de un vehículo identificado por placa.
   * Sin asignación de bahía: el sensor gestiona el estado visual de forma independiente.
   * Mismo modelo que `iniciarTransitoIngreso` (flujo QR).
   */
  async registrarEntrada(
    placa: string,
    operador: IJwtPayload & { ip: string },
    documentoIngresoExplicito?: string,
  ) {
    await this.bahiasService.validarIngresoPermitido();
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      const { vehiculo, registro } = await this.validarVehiculoYRegistro(placa, manager);
      await this.verificarVehiculoAfuera(registro.idRegistroV, manager);

      // Cargamos el vehículo CON su tipo (para devolver datos completos al frontend).
      const vehiculoCompleto = await manager.findOne(Vehiculo, {
        where: { placa: vehiculo.placa },
        relations: ['tipoVehiculo'],
      });

      // Si se especificó un documentoIngreso, validar que sea autorizado:
      // - el propietario del registro, o
      // - un usuario con compartido ACEPTADO sobre este vehículo
      let documentoIngreso = registro.idUsuario;
      if (documentoIngresoExplicito && documentoIngresoExplicito.trim()) {
        const doc = documentoIngresoExplicito.trim();
        if (doc === registro.idUsuario) {
          documentoIngreso = doc;
        } else {
          const compartido = await manager
            .createQueryBuilder('compartir', 'c')
            .where('c.id_registro_v = :idReg', { idReg: registro.idRegistroV })
            .andWhere('c.documento = :doc', { doc })
            .andWhere(`c.estado = 'ACEPTADO'`)
            .getRawOne();
          if (!compartido) {
            throw new BadRequestException({
              message: 'El usuario indicado no está autorizado a ingresar este vehículo.',
              errorCode: 'USUARIO_NO_AUTORIZADO',
            });
          }
          documentoIngreso = doc;
        }
      }

      // Un usuario solo puede tener UN vehículo adentro a la vez
      await this.verificarUsuarioSinIngresoActivo(documentoIngreso, manager);

      const nuevoMovimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        estado: EstadoMovimiento.ADENTRO,
        documentoIngreso,
      });

      const guardado = await manager.save(nuevoMovimiento);

      await this.ejecutarPostIngreso(guardado, placa, 'LIBRE', operador);

      // Usuario que efectivamente ingresó (puede ser propietario o receptor compartido)
      const usuarioIngreso = await this.usuarioService.findOneByDocumento(documentoIngreso);

      return {
        ok: true,
        mensaje: 'Vehículo registrado. Puede estacionarse en cualquier bahía disponible.',
        movimiento: {
          idMovimiento: guardado.idMovimiento,
          horaIngreso: guardado.horaIngreso,
          estado: guardado.estado,
        },
        aprendiz: {
          nombreCompleto: usuarioIngreso?.nombreCompleto || 'USUARIO DESCONOCIDO',
          documento: usuarioIngreso?.documento || documentoIngreso,
          fotoPersona: usuarioIngreso?.fotoPersona,
        },
        vehiculo: {
          placa: vehiculoCompleto?.placa ?? placa,
          tipoVehiculo: vehiculoCompleto?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculoCompleto?.color,
          fotoVehiculo: vehiculoCompleto?.fotoVehiculo,
          fotoTarjetaP: vehiculoCompleto?.fotoTarjetaP,
          fotoPlaca: vehiculoCompleto?.fotoPlaca,
        },
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
      const { vehiculo, registro } = await this.validarVehiculoYRegistro(placaARegistrar, manager);
      await this.verificarVehiculoAfuera(registro.idRegistroV, manager);

      // Un usuario solo puede tener UN vehículo adentro a la vez
      await this.verificarUsuarioSinIngresoActivo(registro.idUsuario, manager);

      const vehiculoCompleto = await manager.findOne(Vehiculo, {
        where: { placa: vehiculo.placa },
        relations: ['tipoVehiculo'],
      });

      const nuevoMovimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        estado: EstadoMovimiento.ADENTRO,
        esManual: true,
        documentoIngreso: registro.idUsuario,
      });

      const movimientoGuardado = await manager.save(nuevoMovimiento);

      const contingencia = manager.create(Contingencia, {
        tipoOperacion: 'INGRESO',
        placa: placaARegistrar,
        motivo: dto.motivo,
        idOperativo: operador.sub,
        idMovimiento: movimientoGuardado.idMovimiento,
      });

      await manager.save(contingencia);

      await this.ejecutarPostIngreso(movimientoGuardado, placaARegistrar, 'LIBRE', operador);

      const usuario = await this.usuarioService.findOneByDocumento(registro.idUsuario);

      return {
        ok: true,
        mensaje: 'Ingreso manual por contingencia registrado correctamente',
        movimiento: {
          idMovimiento: movimientoGuardado.idMovimiento,
          horaIngreso: movimientoGuardado.horaIngreso,
          estado: movimientoGuardado.estado,
        },
        aprendiz: {
          nombreCompleto: usuario?.nombreCompleto || 'USUARIO DESCONOCIDO',
          documento: usuario?.documento || registro.idUsuario,
          fotoPersona: usuario?.fotoPersona,
        },
        vehiculo: {
          placa: vehiculoCompleto?.placa ?? placaARegistrar,
          tipoVehiculo: vehiculoCompleto?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculoCompleto?.color,
          fotoVehiculo: vehiculoCompleto?.fotoVehiculo,
          fotoTarjetaP: vehiculoCompleto?.fotoTarjetaP,
          fotoPlaca: vehiculoCompleto?.fotoPlaca,
        },
      };
    });
  }

  /**
   * Cierra formalmente el ciclo de vida de un movimiento vehicular.
   *
   * Prioridad de búsqueda (flujo IoT normal):
   * 1. `TRANSITO` **con** bahía asignada → el sensor ya detectó que el vehículo
   *    se retiró físicamente; el operario en portería confirma la salida definitiva.
   * 2. `ADENTRO` → salida directa (sin fase sensor, ej. contingencia o bahía manual).
   *
   * No cierra movimientos `TRANSITO` sin bahía (tránsito de ingreso activo).
   *
   * @param placa    Placa del vehículo a procesar.
   * @param operador Contexto JWT del operativo autorizante.
   */
  async registrarSalida(placa: string, operador: IJwtPayload & { ip: string }) {
    return await this.movimientoRepository.manager.transaction(async (manager) => {
      const { vehiculo, registro } = await this.validarVehiculoYRegistro(placa, manager);

      // Cargamos el vehículo CON su tipo (para devolver datos completos al frontend).
      const vehiculoCompleto = await manager.findOne(Vehiculo, {
        where: { placa: vehiculo.placa },
        relations: ['tipoVehiculo'],
      });

      const movimientoActivo = await manager
        .createQueryBuilder(MovimientoVehiculo, 'mov')
        .setLock('pessimistic_write')
        .where('mov.id_registro_vehiculo = :id', { id: registro.idRegistroV })
        .andWhere('mov.estado IN (:...estados)', {
          estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO],
        })
        .getOne();

      if (!movimientoActivo) {
        throw new BadRequestException('El vehículo no tiene un ingreso activo registrado');
      }

      movimientoActivo.horaSalida = new Date();
      movimientoActivo.estado = EstadoMovimiento.SALIDA;
      await manager.save(movimientoActivo);

      await this.ejecutarPostSalida(movimientoActivo, placa, operador);

      // Usuario que efectivamente ingresó el vehículo (puede ser propietario o receptor compartido)
      const docQuienIngreso = movimientoActivo.documentoIngreso ?? registro.idUsuario;
      const usuarioIngreso = await this.usuarioService.findOneByDocumento(docQuienIngreso);

      return {
        ok: true,
        mensaje: 'Salida procesada correctamente',
        movimiento: {
          idMovimiento: movimientoActivo.idMovimiento,
          horaIngreso: movimientoActivo.horaIngreso,
          horaSalida: movimientoActivo.horaSalida,
          estado: movimientoActivo.estado,
        },
        aprendiz: {
          nombreCompleto: usuarioIngreso?.nombreCompleto || 'USUARIO DESCONOCIDO',
          documento: usuarioIngreso?.documento || docQuienIngreso,
          fotoPersona: usuarioIngreso?.fotoPersona,
        },
        vehiculo: {
          placa: vehiculoCompleto?.placa ?? placa,
          tipoVehiculo: vehiculoCompleto?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculoCompleto?.color,
          fotoVehiculo: vehiculoCompleto?.fotoVehiculo,
          fotoTarjetaP: vehiculoCompleto?.fotoTarjetaP,
          fotoPlaca: vehiculoCompleto?.fotoPlaca,
        },
      };
    });
  }

  /**
   * Procedimiento de emergencia global.
   * Cierra todos los movimientos `ADENTRO` y los `TRANSITO` (tanto de ingreso
   * sin bahía como de salida con bahía) dejando el parqueadero limpio.
   *
   * @param operador Operador que autoriza la emergencia.
   */
  async salidaEmergencia(operador: IJwtPayload & { ip: string }) {
    const ahora = new Date();
    const movimientosActivos = await this.movimientoRepository.find({
      where: [
        { estado: EstadoMovimiento.ADENTRO },
        { estado: EstadoMovimiento.TRANSITO },
      ],
    });

    if (movimientosActivos.length === 0) {
      return { ok: true, mensaje: 'No hay vehículos activos en el sistema' };
    }

    for (const estado of [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]) {
      await this.movimientoRepository.update(
        { estado },
        { estado: EstadoMovimiento.SALIDA, horaSalida: ahora },
      );
    }

    await this.auditoriaService.create({
      accion: 'SALIDA_EMERGENCIA_GLOBAL',
      entidad: 'MOVIMIENTO_VEHICULO',
      idUsuario: operador?.sub || 'SISTEMA',
      datosNuevos: { cantidadLiberada: movimientosActivos.length, fecha: ahora },
      ip: operador?.ip || '127.0.0.1',
      userAgent: 'Operativo App',
    });

    await this.sincronizarEstadoGlobal();
    return { ok: true, mensaje: `Se han liberado ${movimientosActivos.length} vehículos por emergencia` };
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
      };
    });
  }

  /**
   * RF33: Punto de entrada del flujo IoT.  El QR se escanea en portería y el
   * vehículo queda en estado {@link EstadoMovimiento.TRANSITO} **sin bahía
   * asignada**.  La asignación física es responsabilidad exclusiva del
   * {@link SerialBridgeService}: cuando el sensor detecta presencia (<umbral
   * cm) en la bahía, llama a `BahiasService.procesarTelemetriaSensor` que
   * vincula el movimiento y lo promueve a {@link EstadoMovimiento.ADENTRO}.
   *
   * Flujo multi-vehículo: si el aprendiz tiene más de un vehículo registrado
   * se devuelve `modo: 'SELECCION'` igual que en `escanearCodigo`.
   *
   * @param qr   Token QR o documento del aprendiz.
   * @param operador Contexto JWT del operativo en turno.
   */
  async escanearQr(qr: string, operador: IJwtPayload & { ip: string }) {
    const token = String(qr ?? '').trim();
    if (!token.length) {
      throw new BadRequestException({
        message: 'El código QR es obligatorio.',
        errorCode: 'QR_OBLIGATORIO',
      });
    }

    const resultado = await this.usuarioService.buscarPorQR(token);
    const usuario = resultado.usuario;
    let vehiculos: Vehiculo[] = resultado.vehiculos || [];

    if (vehiculos.length === 0) {
      throw new BadRequestException({
        message: 'El usuario no tiene vehículos registrados.',
        errorCode: 'USUARIO_SIN_VEHICULOS',
      });
    }

    // 🔍 Si el usuario YA tiene un movimiento activo con cualquiera de sus vehículos,
    // la acción es siempre SALIDA — no se le consulta cuál usar.
    const placas = vehiculos.map((v) => v.placa);
    const movimientoActivoMio = await this.movimientoRepository
      .createQueryBuilder('mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .where('rv.id_vehiculo IN (:...placas)', { placas })
      .andWhere('mv.documento_ingreso = :doc', { doc: usuario.documento })
      .andWhere('mv.estado IN (:...estados)', {
        estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO],
      })
      .orderBy('mv.hora_ingreso', 'DESC')
      .getOne();

    if (movimientoActivoMio) {
      const registro = await this.movimientoRepository.manager.findOne(RegistroVehiculo, {
        where: { idRegistroV: movimientoActivoMio.idRegistroVehiculo },
        relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
      });
      const placa = registro?.idVehiculo ?? '';
      const resultadoOp = await this.resolverAccionPorEstado(placa, usuario.documento, operador, usuario);
      return {
        ...resultadoOp,
        modo: 'AUTO',
        aprendiz: {
          nombreCompleto: usuario.nombreCompleto,
          documento: usuario.documento,
          fotoPersona: usuario.fotoPersona,
        },
        vehiculo: {
          placa,
          tipoVehiculo: registro?.vehiculo?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: registro?.vehiculo?.color,
          fotoVehiculo: registro?.vehiculo?.fotoVehiculo,
          fotoTarjetaP: registro?.vehiculo?.fotoTarjetaP,
          fotoPlaca: registro?.vehiculo?.fotoPlaca,
        },
      };
    }

    if (vehiculos.length === 1) {
      const resultadoOp = await this.resolverAccionPorEstado(
        vehiculos[0].placa,
        usuario.documento,
        operador,
        usuario,
      );
      return {
        ...resultadoOp,
        modo: 'AUTO',
        aprendiz: {
          nombreCompleto: usuario.nombreCompleto,
          documento: usuario.documento,
          fotoPersona: usuario.fotoPersona,
        },
        vehiculo: {
          placa: vehiculos[0].placa,
          tipoVehiculo: vehiculos[0].tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculos[0].color,
          fotoVehiculo: vehiculos[0].fotoVehiculo,
          fotoTarjetaP: vehiculos[0].fotoTarjetaP,
          fotoPlaca: vehiculos[0].fotoPlaca,
        },
      };
    }

    return {
      ok: true,
      modo: 'SELECCION',
      aprendiz: {
        nombreCompleto: usuario.nombreCompleto,
        documento: usuario.documento,
        fotoPersona: usuario.fotoPersona,
      },
      codigo: token,
      vehiculos: vehiculos.map((v: Vehiculo) => ({
        placa: v.placa,
        tipoVehiculo: v.tipoVehiculo?.tipoVehiculo ?? 'N/D',
        color: v.color,
        fotoVehiculo: v.fotoVehiculo,
        fotoTarjetaP: v.fotoTarjetaP,
        fotoPlaca: v.fotoPlaca,
      })),
    };
  }

  /**
   * Registra el tránsito de ingreso **sin asignar bahía**.
   *
   * Crea un {@link MovimientoVehiculo} con `estado = TRANSITO` e `idBahia =
   * null`.  El `SerialBridgeService` completará la asignación al detectar
   * presencia física en alguna bahía sensorizada.
   *
   * @param placa    Placa normalizada del vehículo.
   * @param operador Contexto JWT del operativo autorizante.
   * @param usuarioInfo Datos opcionales del aprendiz (evita una re-consulta).
   */
  /**
   * Registra el ingreso de un vehículo.
   *
   * Crea un MovimientoVehiculo con estado ADENTRO e idBahia=null.
   * El sensor gestiona el estado visual de las bahías de forma completamente
   * independiente — la portería no asigna ni conoce la bahía donde se estacionará.
   */
  private async iniciarTransitoIngreso(
    placa: string,
    documentoUsuario: string,
    operador: IJwtPayload & { ip: string },
    usuarioInfo?: { nombreCompleto?: string; documento?: string; fotoPersona?: string },
  ) {
    await this.bahiasService.validarIngresoPermitido();

    return await this.movimientoRepository.manager.transaction(async (manager) => {
      const { vehiculo, registro } = await this.validarVehiculoYRegistro(placa, manager);
      await this.verificarVehiculoAfuera(registro.idRegistroV, manager);

      // Un usuario solo puede tener UN vehículo adentro a la vez
      await this.verificarUsuarioSinIngresoActivo(documentoUsuario, manager);

      // Cargamos el vehículo CON su tipo para devolver datos completos al frontend.
      const vehiculoCompleto = await manager.findOne(Vehiculo, {
        where: { placa: vehiculo.placa },
        relations: ['tipoVehiculo'],
      });

      const nuevoMovimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        estado: EstadoMovimiento.ADENTRO,
        esManual: false,
        documentoIngreso: documentoUsuario, // Quien escaneó el QR para ingresar
      });

      const guardado = await manager.save(nuevoMovimiento);

      await this.auditoriaService.create({
        accion: 'REGISTRAR_ENTRADA',
        entidad: 'MOVIMIENTO_VEHICULO',
        idEntidad: guardado.idMovimiento,
        idUsuario: operador?.sub || 'SISTEMA',
        datosNuevos: { placa, documentoIngreso: documentoUsuario },
        ip: operador?.ip || '127.0.0.1',
        userAgent: 'Operativo App',
      });

      this.eventosGateway.emitirVehiculoIngresado({
        placa,
        fecha: guardado.horaIngreso,
        bahia: 'LIBRE',
      });
      await this.sincronizarEstadoGlobal();

      // Usuario que efectivamente ingresó (puede ser receptor de un compartido).
      const usuario = usuarioInfo
        ?? await this.usuarioService.findOneByDocumento(documentoUsuario);

      return {
        ok: true,
        mensaje: 'Vehículo registrado. Puede estacionarse en cualquier bahía disponible.',
        estado: EstadoMovimiento.ADENTRO,
        movimiento: {
          idMovimiento: guardado.idMovimiento,
          horaIngreso: guardado.horaIngreso,
          estado: guardado.estado,
        },
        aprendiz: {
          nombreCompleto: (usuario as any)?.nombreCompleto || 'USUARIO DESCONOCIDO',
          documento: (usuario as any)?.documento || documentoUsuario,
          fotoPersona: (usuario as any)?.fotoPersona,
        },
        vehiculo: {
          placa: vehiculoCompleto?.placa ?? placa,
          tipoVehiculo: vehiculoCompleto?.tipoVehiculo?.tipoVehiculo ?? 'N/D',
          color: vehiculoCompleto?.color,
          fotoVehiculo: vehiculoCompleto?.fotoVehiculo,
          fotoTarjetaP: vehiculoCompleto?.fotoTarjetaP,
          fotoPlaca: vehiculoCompleto?.fotoPlaca,
        },
      };
    });
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

  /**
   * Garantiza que el usuario que va a ingresar NO tenga otro vehículo
   * (propio o compartido) ya adentro del parqueadero.
   *
   * Un usuario solo puede tener UN movimiento activo a la vez.
   *
   * NOTA técnica: PostgreSQL no permite `FOR UPDATE` con LEFT JOIN, por eso
   * primero bloqueamos solo la tabla movimiento_vehiculo y luego, si hay
   * registro activo, hacemos un fetch separado para obtener la placa.
   */
  private async verificarUsuarioSinIngresoActivo(documentoUsuario: string, manager: EntityManager) {
    const activo = await manager
      .createQueryBuilder(MovimientoVehiculo, 'mv')
      .where('mv.documento_ingreso = :doc', { doc: documentoUsuario })
      .andWhere('mv.estado IN (:...estados)', {
        estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO],
      })
      .setLock('pessimistic_write')
      .getOne();

    if (activo) {
      // Cargamos por separado la placa (sin lock) para incluirla en el mensaje
      const registro = await manager.findOne(RegistroVehiculo, {
        where: { idRegistroV: activo.idRegistroVehiculo },
      });
      const placa = registro?.idVehiculo ?? '';

      throw new BadRequestException({
        message: `Este usuario ya tiene un vehículo dentro del parqueadero${placa ? ` (placa ${placa})` : ''}. Debe registrar la salida antes de ingresar otro.`,
        errorCode: 'USUARIO_CON_INGRESO_ACTIVO',
      });
    }
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
    // Conteo unificado:
    //  - total     = bahías sensorizadas (físicas)
    //  - ocupados  = QRs escaneados activos (movimientos ADENTRO/TRANSITO)
    //  - disponibles = total - ocupados
    const conteo = await this.bahiasService.obtenerConteoGlobal();

    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: conteo.total,
      ocupados: conteo.ocupados,
      disponibles: conteo.disponibles,
      estadoParqueadero: conteo.estadoParqueadero,
      actualizadoEn: new Date(),
    });
    await this.bahiasService.evaluarAlertasOcupacion();
  }

  /**
   * Información de una placa para registro manual:
   *  - Datos y fotos del vehículo
   *  - Lista de usuarios que pueden ingresarlo (propietario + receptores con compartido ACEPTADO)
   *  - Si tiene un movimiento activo, indica quién lo ingresó
   */
  async obtenerInfoPlacaParaRegistroManual(placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    // 1) Vehículo + tipo
    const vehiculo = await this.movimientoRepository.manager.findOne(Vehiculo, {
      where: { placa: placaNormalizada },
      relations: ['tipoVehiculo'],
    });
    if (!vehiculo) {
      throw new NotFoundException({
        message: 'Placa no reconocida en el sistema',
        errorCode: 'PLACA_NO_ENCONTRADA',
      });
    }

    // 2) Registro vehículo-propietario
    const registro = await this.movimientoRepository.manager.findOne(RegistroVehiculo, {
      where: { idVehiculo: placaNormalizada },
      relations: ['usuario'],
    });

    const usuariosAutorizados: Array<{
      documento: string;
      nombreCompleto: string;
      fotoPersona: string;
      rol: 'PROPIETARIO' | 'COMPARTIDO';
    }> = [];

    if (registro?.usuario) {
      usuariosAutorizados.push({
        documento: registro.usuario.documento,
        nombreCompleto: registro.usuario.nombreCompleto,
        fotoPersona: registro.usuario.fotoPersona,
        rol: 'PROPIETARIO',
      });

      // 3) Receptores con compartido ACEPTADO
      const compartidosRaw = await this.movimientoRepository.manager
        .createQueryBuilder()
        .select('u.documento', 'documento')
        .addSelect('u.nombre_completo', 'nombreCompleto')
        .addSelect('u.foto_persona', 'fotoPersona')
        .from('compartir', 'c')
        .innerJoin('usuario', 'u', 'u.documento = c.documento')
        .where('c.id_registro_v = :idReg', { idReg: registro.idRegistroV })
        .andWhere(`c.estado = 'ACEPTADO'`)
        .getRawMany();

      for (const c of compartidosRaw) {
        usuariosAutorizados.push({
          documento: c.documento,
          nombreCompleto: c.nombreCompleto,
          fotoPersona: c.fotoPersona,
          rol: 'COMPARTIDO',
        });
      }
    }

    // 4) Movimiento activo (si existe)
    let movimientoActivoInfo: { idMovimiento: number; documentoIngreso: string | null; nombreIngreso: string | null } | null = null;
    if (registro) {
      const activo = await this.movimientoRepository.findOne({
        where: [
          { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.ADENTRO },
          { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.TRANSITO },
        ],
        relations: ['usuarioIngreso'],
      });
      if (activo) {
        movimientoActivoInfo = {
          idMovimiento: activo.idMovimiento,
          documentoIngreso: activo.documentoIngreso,
          nombreIngreso: activo.usuarioIngreso?.nombreCompleto ?? null,
        };
      }
    }

    return {
      vehiculo: {
        placa: vehiculo.placa,
        color: vehiculo.color,
        tipoVehiculo: vehiculo.tipoVehiculo?.tipoVehiculo ?? 'N/D',
        fotoVehiculo: vehiculo.fotoVehiculo,
        fotoTarjetaP: vehiculo.fotoTarjetaP,
        fotoPlaca: vehiculo.fotoPlaca,
      },
      usuariosAutorizados,
      movimientoActivo: movimientoActivoInfo,
    };
  }
}
