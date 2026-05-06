import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Usuario {

    @PrimaryColumn({
        length: 10,
    })
    documento: string;

    @Column({
        length: 255,
        nullable: false,
    })
    fotoPersona: string;

    @Column({
        length: 50,
        nullable: false,
    })
    nombreCompleto: string;

    @Column({
        length: 10,
        nullable: false,
    })
    numTelf: string;

    @Column({
        length: 10,
        nullable: false,
    })
    contactoEmerg: string;

    @Column({
        length: 50,
        nullable: false,
        unique: true,
    })
    correo: string;

    @Column({
        length: 255,
        nullable: false,
    })
    contra: string;

    @Column({
        type: 'smallint',
        nullable: false,
    })
    idTipoUsr: number;

    @Column({
        length: 7,
        nullable: true,
    })
    idFormacion: string;

    @Column({
        length: 100,
        nullable: true,
        unique: true,
    })
    QR: string;
}