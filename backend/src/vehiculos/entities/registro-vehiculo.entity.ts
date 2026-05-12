import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'registro_vehiculo' })
export class RegistroVehiculo {
  @PrimaryGeneratedColumn({ name: 'idregistrov' })
  idRegistroV: number;

  @Column({ name: 'idusuario', type: 'varchar', length: 10 })
  idUsuario: string;

  @Column({ name: 'idvehiculo', type: 'varchar', length: 10 })
  idVehiculo: string;
}