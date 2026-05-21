import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Vehiculo } from './vehiculo.entity';
import { MovimientoVehiculo } from './movimiento-vehiculo.entity';

@Entity({ name: 'registro_vehiculo' })
@Unique(['idUsuario', 'idVehiculo'])
export class RegistroVehiculo {
  @PrimaryGeneratedColumn()
  idRegistroV: number;

  @Column({ length: 10 })
  idUsuario: string;

  @Column({ length: 10 })
  idVehiculo: string;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.registrosVehiculos)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Vehiculo, (vehiculo) => vehiculo.registrosUsuarios)
  @JoinColumn({ name: 'id_vehiculo' })
  vehiculo: Vehiculo;

  @OneToMany(() => MovimientoVehiculo, (movimiento) => movimiento.registroVehiculo)
  movimientos: MovimientoVehiculo[];
}
