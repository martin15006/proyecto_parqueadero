import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitante } from './entities/visitante.entity';

@Injectable()
export class VisitantesService {
  constructor(
    @InjectRepository(Visitante)
    private readonly visitanteRepository: Repository<Visitante>,
  ) {}

  async findAll() {
    return await this.visitanteRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const visitante = await this.visitanteRepository.findOne({ where: { idVisitante: id } });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');
    return visitante;
  }

  async create(data: Partial<Visitante>) {
    const nuevo = this.visitanteRepository.create(data);
    return await this.visitanteRepository.save(nuevo);
  }

  async registrarSalida(id: number) {
    const visitante = await this.findOne(id);
    visitante.fechaSalida = new Date();
    return await this.visitanteRepository.save(visitante);
  }
}
