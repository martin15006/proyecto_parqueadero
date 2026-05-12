import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'usuario' })
export class Usuario {
  @PrimaryColumn({ name: 'documento', type: 'varchar', length: 10 })
  documento: string;

  @Column({ name: 'fotopersona', type: 'varchar', length: 255 })
  fotoPersona: string;

  @Column({ name: 'nombrecompleto', type: 'varchar', length: 50 })
  nombreCompleto: string;

  @Column({ name: 'numtelf', type: 'varchar', length: 10 })
  numTelf: string;

  @Column({ name: 'contactoemerg', type: 'varchar', length: 10 })
  contactoEmerg: string;

  @Column({ name: 'correo', type: 'varchar', length: 50, unique: true })
  correo: string;

  @Column({ name: 'contra', type: 'varchar', length: 255 })
  contra: string;

  @Column({ name: 'idtipousr', type: 'smallint' })
  idTipoUsr: number;

  @Column({ name: 'idformacion', type: 'varchar', length: 7, nullable: true })
  idFormacion: string | null;

  @Column({ name: 'qr', type: 'varchar', length: 100, nullable: true, unique: true })
  QR: string | null;
}