import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BahiasService } from './bahias.service';
import { Bahia } from './entities/bahia.entity';
import { TipoBahia } from './entities/tipo-bahia.entity';
import { TipoControl } from './entities/tipo-control.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bahia, TipoBahia, TipoControl, MovimientoVehiculo]),
  ],
  
  providers: [BahiasService],
  exports: [BahiasService, TypeOrmModule],
})
export class BahiasModule {}
