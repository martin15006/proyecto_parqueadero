import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Vehiculo } from './vehiculo.entity';

@Entity({ name: 'tipo_vehiculo' })
export class TipoVehiculo {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idTipoV: number;

  @Column({ length: 30 })
  tipoVehiculo: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Vehiculo, (vehiculo) => vehiculo.tipoVehiculo)
  vehiculos: Vehiculo[];
}
