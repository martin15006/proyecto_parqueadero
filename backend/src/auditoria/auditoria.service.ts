import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';

export interface RegistrarAuditoriaDto {
  accion: string;
  entidad: string;
  idEntidad?: number;
  datosAnteriores?: Record<string, any>;
  datosNuevos?: Record<string, any>;
  idUsuario: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  async registrar(data: RegistrarAuditoriaDto): Promise<Auditoria> {
    const auditoria = this.auditoriaRepository.create({
      accion: data.accion,
      entidad: data.entidad,
      idEntidad: data.idEntidad,
      datosAnteriores: data.datosAnteriores,
      datosNuevos: data.datosNuevos,
      idUsuario: data.idUsuario,
      ip: data.ip,
      userAgent: data.userAgent,
    });

    return await this.auditoriaRepository.save(auditoria);
  }
}