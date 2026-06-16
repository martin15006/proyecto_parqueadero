import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Formacion } from '../usuarios/entities/formacion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateFormacionDto } from './dto/create-formacion.dto';
import { UpdateFormacionDto } from './dto/update-formacion.dto';

type EstadoFiltro = 'ACTIVO' | 'INACTIVO' | 'TODOS';

@Injectable()
export class FormacionService {
  constructor(
    @InjectRepository(Formacion)
    private readonly formacionRepository: Repository<Formacion>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(estado: EstadoFiltro = 'ACTIVO') {
    const qb = this.formacionRepository
      .createQueryBuilder('f')
      .orderBy('f.ficha', 'ASC');

    if (estado === 'INACTIVO') {
      qb.withDeleted().andWhere('f.deleted_at IS NOT NULL');
    } else if (estado === 'TODOS') {
      qb.withDeleted();
    }

    const fichas = await qb.getMany();
    return fichas.map((f) => ({
      ficha: f.ficha,
      nombre: f.nombre,
      ambiente: f.ambiente ?? null,
      jornada: f.jornada ?? null,
      createdAt: f.createdAt,
      activo: !f.deletedAt,
    }));
  }

  async crear(dto: CreateFormacionDto, actor: string) {
    const ficha = dto.ficha.trim();
    const existe = await this.formacionRepository.findOne({
      where: { ficha },
      withDeleted: true,
    });
    if (existe) {
      throw new BadRequestException('Ya existe una ficha con ese número');
    }

    const nueva = this.formacionRepository.create({
      ficha,
      nombre: dto.nombre.trim(),
      ambiente: dto.ambiente?.trim() || undefined,
      jornada: dto.jornada || undefined,
    });
    const guardada = await this.formacionRepository.save(nueva);

    await this.auditoriaService.create({
      accion: 'CREAR_FICHA',
      entidad: 'FORMACION',
      idEntidad: guardada.ficha,
      idUsuario: actor,
      datosNuevos: { ficha: guardada.ficha, nombre: guardada.nombre },
    });

    return guardada;
  }

  async actualizar(ficha: string, dto: UpdateFormacionDto, actor: string) {
    const f = await this.formacionRepository.findOne({ where: { ficha } });
    if (!f) throw new NotFoundException('Ficha no encontrada');

    if (dto.nombre !== undefined) f.nombre = dto.nombre.trim();
    if (dto.ambiente !== undefined) f.ambiente = dto.ambiente.trim();
    if (dto.jornada !== undefined) f.jornada = dto.jornada;

    const guardada = await this.formacionRepository.save(f);

    await this.auditoriaService.create({
      accion: 'EDITAR_FICHA',
      entidad: 'FORMACION',
      idEntidad: ficha,
      idUsuario: actor,
      datosNuevos: { nombre: guardada.nombre, ambiente: guardada.ambiente, jornada: guardada.jornada },
    });

    return guardada;
  }

  async eliminar(ficha: string, actor: string): Promise<{ mensaje: string }> {
    const f = await this.formacionRepository.findOne({ where: { ficha } });
    if (!f) throw new NotFoundException('Ficha no encontrada');

    await this.formacionRepository.softDelete({ ficha });

    await this.auditoriaService.create({
      accion: 'ELIMINAR_FICHA',
      entidad: 'FORMACION',
      idEntidad: ficha,
      idUsuario: actor,
      datosNuevos: { eliminadoLogico: true },
    });

    return { mensaje: 'Ficha desactivada exitosamente' };
  }

  async reactivar(ficha: string, actor: string): Promise<{ mensaje: string }> {
    const f = await this.formacionRepository.findOne({
      where: { ficha },
      withDeleted: true,
    });
    if (!f) throw new NotFoundException('Ficha no encontrada');
    if (!f.deletedAt) throw new BadRequestException('La ficha ya está activa');

    await this.formacionRepository.restore({ ficha });

    await this.auditoriaService.create({
      accion: 'REACTIVAR_FICHA',
      entidad: 'FORMACION',
      idEntidad: ficha,
      idUsuario: actor,
      datosNuevos: { reactivado: true },
    });

    return { mensaje: 'Ficha reactivada exitosamente' };
  }
}
