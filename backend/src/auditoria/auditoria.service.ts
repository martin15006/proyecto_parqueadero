import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}