import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn, 
  DeleteDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { TipoVehiculo } from './tipo-vehiculo.entity';
import { RegistroVehiculo } from './registro-vehiculo.entity';

@Entity({ name: 'vehiculo' })
export class Vehiculo {
  @PrimaryColumn({ length: 10 })
  placa: string;

  @Column({ length: 255 })
  fotoVehiculo: string;

  @Column({ length: 255 })
  fotoTarjetaP: string;

  @Column({ length: 255, nullable: true })
  fotoPlaca: string;

  @Column({ length: 50 })
  color: string;

  @Index()
  @Column({ type: 'smallint' })
  idTipoVehiculo: number;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => TipoVehiculo, (tipo) => tipo.vehiculos)
  @JoinColumn({ name: 'id_tipo_vehiculo' })
  tipoVehiculo: TipoVehiculo;

  @OneToMany(() => RegistroVehiculo, (registro) => registro.vehiculo)
  registrosUsuarios: RegistroVehiculo[];

  @BeforeInsert()
  @BeforeUpdate()
  private normalizarPlaca() {
    if (typeof this.placa === 'string') {
      this.placa = this.placa.replace(/[- ]/g, '').toUpperCase();
    }
  }
}
