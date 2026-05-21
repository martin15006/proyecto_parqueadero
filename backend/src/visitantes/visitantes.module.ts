import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitantesService } from './visitantes.service';
import { VisitantesController } from './visitantes.controller';
import { Visitante } from './entities/visitante.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visitante])],
  controllers: [VisitantesController],
  providers: [VisitantesService],
  exports: [VisitantesService],
})
export class VisitantesModule {}
