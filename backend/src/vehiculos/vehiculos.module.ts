import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehiculo, TipoVehiculo, RegistroVehiculo])],
  controllers: [VehiculosController],
  providers: [VehiculosService],
})
export class VehiculosModule {}