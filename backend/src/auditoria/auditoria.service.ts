import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';

export interface CreateAuditoriaDto {
  accion: string;
  entidad: string;
  idEntidad?: string | number;
  datosAnteriores?: Record<string, unknown>;
  datosNuevos?: Record<string, unknown>;
  idUsuario: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  // idEntidad se convierte estrictamente a string para evitar errores de tipo en la entidad.
  async create(data: CreateAuditoriaDto): Promise<Auditoria> {
    const auditoriaData: Partial<Auditoria> = {
      accion: data.accion,
      entidad: data.entidad,
      idEntidad: data.idEntidad !== undefined ? String(data.idEntidad) : undefined,
      datosAnteriores: data.datosAnteriores,
      datosNuevos: data.datosNuevos,
      idUsuario: data.idUsuario,
      ip: data.ip,
      userAgent: data.userAgent,
    };

    const nuevaAuditoria = this.auditoriaRepository.create(auditoriaData);
    return await this.auditoriaRepository.save(nuevaAuditoria);
  }

  /**
   * Cuenta acciones de auditoría por usuario y rango temporal.
   *
   * Reutiliza los registros REGISTRAR_ENTRADA / REGISTRAR_SALIDA que OperativoService ya
   * escribe en auditoría, para calcular "ingresos/salidas del día" sin tablas nuevas ni
   * exponer datos administrativos. Solo ejecuta un COUNT; no registra datos sensibles.
   */
  async contarAccionPorUsuarioEnRango(params: {
    idUsuario: string;
    accion: string;
    desde: Date;
    hasta: Date;
  }) {
    return await this.auditoriaRepository
      .createQueryBuilder('a')
      .where('a.id_usuario = :idUsuario', { idUsuario: params.idUsuario })
      .andWhere('a.accion = :accion', { accion: params.accion })
      .andWhere('a.created_at BETWEEN :desde AND :hasta', { desde: params.desde, hasta: params.hasta })
      .getCount();
  }

  async listarAccionesPorUsuarioEnRango(params: {
    idUsuario: string;
    accion: string;
    desde: Date;
    hasta: Date;
    limit?: number;
  }) {
    const limit = typeof params.limit === 'number' && params.limit > 0 ? Math.min(params.limit, 200) : 50;

    return await this.auditoriaRepository
      .createQueryBuilder('a')
      .where('a.id_usuario = :idUsuario', { idUsuario: params.idUsuario })
      .andWhere('a.accion = :accion', { accion: params.accion })
      .andWhere('a.created_at BETWEEN :desde AND :hasta', { desde: params.desde, hasta: params.hasta })
      .orderBy('a.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Mapea el autor (idUsuario) de la acción registrada para cada entidad.
   * Útil para saber qué operativo autorizó cada ingreso (REGISTRAR_ENTRADA).
   * Devuelve un Map<idEntidad, idUsuario>.
   */
  async mapearAutoresPorEntidad(
    accion: string,
    entidad: string,
    idEntidades: Array<string | number>,
  ): Promise<Map<string, string>> {
    const ids = [...new Set(idEntidades.map((v) => String(v)))];
    if (ids.length === 0) return new Map();

    const registros = await this.auditoriaRepository.find({
      where: { accion, entidad, idEntidad: In(ids) },
      order: { createdAt: 'ASC' },
    });

    const map = new Map<string, string>();
    for (const r of registros) {
      if (r.idEntidad && !map.has(r.idEntidad)) {
        map.set(r.idEntidad, r.idUsuario);
      }
    }
    return map;
  }
}
