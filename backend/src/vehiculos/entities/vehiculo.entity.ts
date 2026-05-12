import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'vehiculo' })
export class Vehiculo {
  @PrimaryColumn({ name: 'placa', type: 'varchar', length: 10 })
  placa: string;

  @Column({ name: 'fotovehiculo', type: 'varchar', length: 255 })
  fotoVehiculo: string;

  @Column({ name: 'fototarjetap', type: 'varchar', length: 255 })
  fotoTarjetaP: string;

  @Column({ name: 'color', type: 'varchar', length: 50 })
  color: string;

  @Column({ name: 'idtipovehiculo', type: 'smallint' })
  idTipoVehiculo: number;
}