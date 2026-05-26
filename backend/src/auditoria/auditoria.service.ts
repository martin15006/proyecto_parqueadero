import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import type { AdminAuditoriaOperacionesQueryDto } from './dto/admin-auditoria-operaciones.query.dto';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

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

  /**
   * Registra una nueva acción en los logs de auditoría.
   * REFACTOR: Se asegura conversión estricta de idEntidad a string para evitar errores de tipo.
   */
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

    // PERFORMANCE: create() retorna una instancia única de la entidad sin persistir
    const nuevaAuditoria = this.auditoriaRepository.create(auditoriaData);
    
    // SECURITY: save() persiste la entidad en la base de datos
    return await this.auditoriaRepository.save(nuevaAuditoria);
  }

  /**
   * Retorna logs de auditoría paginados para administración y monitoreo móvil.
   * MOBILE_API: Endpoint optimizado para scroll infinito en la app móvil.
   * PAGINATION: Implementa paginación por offset para control de carga de datos.
   */
  async findAll(page: number = 1, limit: number = 20) {
    // PAGINATION: Cálculo de desplazamiento basado en página y límite solicitado
    const [data, total] = await this.auditoriaRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOperacionesOperativo(query: AdminAuditoriaOperacionesQueryDto) {
    const page = typeof query.page === 'number' && query.page > 0 ? query.page : 1;
    const limit = typeof query.limit === 'number' && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const now = new Date();
    const defaultTo = new Date(now);
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 14);

    const from = query.desde ? new Date(query.desde) : defaultFrom;
    const to = query.hasta ? new Date(query.hasta) : defaultTo;

    const qb = this.auditoriaRepository.createQueryBuilder('a')
      .innerJoin(Usuario, 'u', 'u.documento = a.id_usuario')
      .andWhere('u.id_tipo_usr = :rolOperativo', { rolOperativo: TipoUsuarioEnum.OPERATIVO })
      .where('a.created_at BETWEEN :from AND :to', { from, to })
      // INMUTABILIDAD (RF37/RF24): la tabla auditoria ya no soporta soft-delete (no existe deleted_at),
      // y adicionalmente la DB rechaza UPDATE/DELETE vía triggers; por lo tanto este filtro es innecesario.
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.operativo) {
      qb.andWhere('a.id_usuario = :op', { op: query.operativo });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * RF35 (Métricas operativas): Cuenta acciones de auditoría por usuario y rango temporal.
   *
   * Justificación:
   * - El proyecto ya registra REGISTRAR_ENTRADA / REGISTRAR_SALIDA en auditoría desde OperativoService.
   * - Esto permite calcular "ingresos/salidas del día" sin exponer datos administrativos y sin inventar tablas nuevas.
   *
   * RNF2:
   * - No se registran datos sensibles en logs; solo se ejecuta un COUNT en DB.
   */
  async contarAccionPorUsuarioEnRango(params: {
    idUsuario: string;
    accion: string;
    desde: Date;
    hasta: Date;
  }) {
    return await this.auditoriaRepository
      .createQueryBuilder('a') // PERFORMANCE: COUNT directo en DB (no trae filas).
      .where('a.id_usuario = :idUsuario', { idUsuario: params.idUsuario }) // RF35: filtra por operativo autenticado.
      .andWhere('a.accion = :accion', { accion: params.accion }) // RF35: filtra por tipo de operación.
      .andWhere('a.created_at BETWEEN :desde AND :hasta', { desde: params.desde, hasta: params.hasta }) // RF35: rango del día.
      .getCount(); // RF35: métrica final (entero).
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
}
