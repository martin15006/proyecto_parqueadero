import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitante } from './entities/visitante.entity';
import { CreateVisitanteDto } from './dto/create-visitante.dto';

@Injectable()
/**
 * Servicio de dominio para la gestión de visitantes.
 */
export class VisitantesService {
  constructor(
    @InjectRepository(Visitante)
    private readonly visitanteRepository: Repository<Visitante>,
  ) {}

  /**
   * Lista visitantes en orden descendente por fecha de creación.
   * @returns Lista de visitantes.
   */
  async findAll() {
    return await this.visitanteRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca un visitante por su identificador.
   * @param id Identificador del visitante.
   * @returns Visitante encontrado.
   * @throws NotFoundException si no existe.
   */
  async findOne(id: number) {
    const visitante = await this.visitanteRepository.findOne({ where: { idVisitante: id } });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');
    return visitante;
  }

  /**
   * Crea un visitante y lo vincula a un operario.
   * @param dto Datos del visitante.
   * @param idOperativo Identificador del operario autenticado.
   * @returns Visitante creado.
   */
  async create(dto: CreateVisitanteDto, idOperativo: string) {
    const nuevo = this.visitanteRepository.create({
      ...dto,
      idOperativo,
    });
    return await this.visitanteRepository.save(nuevo);
  }

  /**
   * Registra la salida de un visitante.
   * @param id Identificador del visitante.
   * @returns Visitante actualizado.
   */
  async registrarSalida(id: number) {
    const visitante = await this.findOne(id);
    visitante.fechaSalida = new Date();
    return await this.visitanteRepository.save(visitante);
  }
}
