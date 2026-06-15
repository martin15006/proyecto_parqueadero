import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Visita, EstadoVisita } from './entities/visita.entity';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';
import { BahiasService } from '../bahias/bahias.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';
import { IJwtPayload } from '../common/interfaces/auth.interface';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';

/** Vista de una visita lista para el panel (sin exponer columnas internas). */
export interface VisitaDto {
  idVisita: number;
  codigo: string;
  nombreVisitante: string;
  documentoVisitante: string;
  placa: string;
  tipoVehiculo: string | null;
  aQuienVisita: string;
  motivo: string | null;
  horaIngreso: Date;
  horaSalida: Date | null;
  expiraEn: Date;
  estado: EstadoVisita;
  /** `true` cuando la visita superó su tiempo permitido y sigue activa. */
  vencida: boolean;
}

const DURACION_DEFAULT_MIN = 240; // 4 horas

@Injectable()
export class VisitasService {
  constructor(
    @InjectRepository(Visita)
    private readonly visitaRepository: Repository<Visita>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    private readonly bahiasService: BahiasService,
    private readonly auditoriaService: AuditoriaService,
    private readonly eventosGateway: EventosGateway,
  ) {}

  /**
   * Registra el ingreso de un visitante (registro temporal).
   *
   * Seguridad/consistencia:
   * - Respeta el aforo y el estado del parqueadero (`validarIngresoPermitido`).
   * - Evita visitas duplicadas abiertas con la misma placa o documento.
   * - Queda auditado (operativo + IP) y suma a la ocupación.
   */
  async registrarVisita(
    dto: RegistrarVisitaDto,
    operador: IJwtPayload & { ip: string },
  ): Promise<VisitaDto> {
    const placa = this.normalizarPlaca(dto.placa);
    if (!/^[A-Z0-9]{5,7}$/.test(placa)) {
      throw new BadRequestException({
        message: 'La placa no tiene un formato válido.',
        errorCode: 'PLACA_INVALIDA',
      });
    }

    const documento = String(dto.documentoVisitante ?? '').trim();
    if (!/^[0-9]{5,10}$/.test(documento)) {
      throw new BadRequestException({
        message: 'El documento del visitante no es válido.',
        errorCode: 'DOCUMENTO_INVALIDO',
      });
    }

    // Aforo + parqueadero habilitado (misma puerta que los ingresos normales).
    await this.bahiasService.validarIngresoPermitido();

    // Anti-duplicado: no puede haber dos visitas activas con la misma placa o
    // documento — primero hay que registrar la salida de la anterior.
    const abierta = await this.visitaRepository.findOne({
      where: [
        { placa, estado: EstadoVisita.ADENTRO },
        { documentoVisitante: documento, estado: EstadoVisita.ADENTRO },
      ],
    });
    if (abierta) {
      throw new BadRequestException({
        message:
          'Ya existe una visita activa con esa placa o documento. Registre la salida antes de crear otra.',
        errorCode: 'VISITA_ACTIVA_EXISTENTE',
      });
    }

    // Ingreso único por placa: si la placa pertenece a un vehículo enrolado que
    // ya está dentro (movimiento ADENTRO/TRANSITO), no puede entrar como visitante.
    // (Si está enrolado pero AFUERA, sí se permite el ingreso como visita.)
    const movimientoActivo = await this.movimientoRepository
      .createQueryBuilder('mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .where('rv.id_vehiculo = :placa', { placa })
      .andWhere('mv.estado IN (:...estados)', {
        estados: [EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO],
      })
      .getOne();
    if (movimientoActivo) {
      throw new BadRequestException({
        message: 'El vehículo ya se encuentra ingresado.',
        errorCode: 'PLACA_YA_ADENTRO',
      });
    }

    const ahora = new Date();
    const duracion = this.clamp(dto.duracionMinutos ?? DURACION_DEFAULT_MIN, 15, 1440);
    const expiraEn = new Date(ahora.getTime() + duracion * 60 * 1000);

    const visita = this.visitaRepository.create({
      nombreVisitante: String(dto.nombreVisitante).trim(),
      documentoVisitante: documento,
      placa,
      tipoVehiculo: dto.tipoVehiculo?.trim() || null,
      aQuienVisita: dto.aQuienVisita?.trim() || '',
      motivo: dto.motivo?.trim() || null,
      horaIngreso: ahora,
      estado: EstadoVisita.ADENTRO,
      expiraEn,
      idOperativoIngreso: operador.sub,
    });

    const guardada = await this.visitaRepository.save(visita);

    await this.auditoriaService.create({
      accion: 'REGISTRAR_VISITA',
      entidad: 'VISITA',
      idEntidad: guardada.idVisita,
      idUsuario: operador.sub,
      datosNuevos: {
        placa,
        documentoVisitante: documento,
        aQuienVisita: guardada.aQuienVisita,
        expiraEn,
      },
      ip: operador.ip,
    });

    // Mismo canal que los vehículos enrolados: refresca historial y "movimientos recientes".
    this.eventosGateway.emitirVehiculoIngresado({ placa, fecha: ahora, bahia: 'LIBRE' });
    await this.sincronizarOcupacion();

    return this.toDto(guardada);
  }

  /**
   * Cierra una visita activa (salida del visitante).
   */
  async registrarSalida(
    idVisita: number,
    operador: IJwtPayload & { ip: string },
  ): Promise<VisitaDto> {
    const visita = await this.visitaRepository.findOne({ where: { idVisita } });
    if (!visita) throw new NotFoundException('Visita no encontrada');

    if (visita.estado !== EstadoVisita.ADENTRO) {
      throw new BadRequestException('La visita ya fue cerrada anteriormente');
    }

    visita.horaSalida = new Date();
    visita.estado = EstadoVisita.SALIDA;
    visita.idOperativoSalida = operador.sub;

    const guardada = await this.visitaRepository.save(visita);

    await this.auditoriaService.create({
      accion: 'REGISTRAR_SALIDA_VISITA',
      entidad: 'VISITA',
      idEntidad: guardada.idVisita,
      idUsuario: operador.sub,
      datosNuevos: { placa: guardada.placa, horaSalida: guardada.horaSalida },
      ip: operador.ip,
    });

    this.eventosGateway.emitirVehiculoRetirado({ placa: guardada.placa, fecha: guardada.horaSalida! });
    await this.sincronizarOcupacion();

    return this.toDto(guardada);
  }

  /**
   * Lista las visitas activas (dentro de las instalaciones), las vencidas primero.
   */
  async listarActivas(): Promise<VisitaDto[]> {
    const visitas = await this.visitaRepository.find({
      where: { estado: EstadoVisita.ADENTRO },
      order: { horaIngreso: 'DESC' },
    });
    return visitas
      .map((v) => this.toDto(v))
      .sort((a, b) => Number(b.vencida) - Number(a.vencida));
  }

  /** Emite el conteo global y reevalúa las alertas de ocupación (en vivo). */
  private async sincronizarOcupacion(): Promise<void> {
    const conteo = await this.bahiasService.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: conteo.total,
      ocupados: conteo.ocupados,
      disponibles: conteo.disponibles,
      estadoParqueadero: conteo.estadoParqueadero,
      actualizadoEn: new Date(),
    });
    try {
      await this.bahiasService.evaluarAlertasOcupacion();
    } catch {
      /* no bloquear el flujo por un fallo de notificación */
    }
  }

  private toDto(v: Visita): VisitaDto {
    return {
      idVisita: v.idVisita,
      codigo: `V-${String(v.idVisita).padStart(4, '0')}`,
      nombreVisitante: v.nombreVisitante,
      documentoVisitante: v.documentoVisitante,
      placa: v.placa,
      tipoVehiculo: v.tipoVehiculo,
      aQuienVisita: v.aQuienVisita,
      motivo: v.motivo,
      horaIngreso: v.horaIngreso,
      horaSalida: v.horaSalida,
      expiraEn: v.expiraEn,
      estado: v.estado,
      vencida:
        v.estado === EstadoVisita.ADENTRO &&
        new Date(v.expiraEn).getTime() < Date.now(),
    };
  }

  private normalizarPlaca(value: string): string {
    return String(value ?? '').replace(/[- ]/g, '').toUpperCase();
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
