import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tipo_vehiculo' })
export class TipoVehiculo {
  @PrimaryGeneratedColumn({ name: 'idtipov' })
  idTipoV: number;

  @Column({ name: 'tipovehiculo', type: 'varchar', length: 30 })
  tipoVehiculo: string;
}