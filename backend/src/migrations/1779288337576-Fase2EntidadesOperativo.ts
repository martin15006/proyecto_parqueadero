import { MigrationInterface, QueryRunner } from "typeorm";

export class Fase2EntidadesOperativo1779288337576 implements MigrationInterface {
    name = 'Fase2EntidadesOperativo1779288337576'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehiculo" DROP CONSTRAINT "vehiculo_idtipovehiculo_fkey"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "registro_vehiculo_idusuario_fkey"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "registro_vehiculo_idvehiculo_fkey"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "usuario_idtipousr_fkey"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "usuario_idformacion_fkey"`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" DROP CONSTRAINT "codigo_otp_documento_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."idx_otp_documento"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "registro_vehiculo_idusuario_idvehiculo_key"`);
        await queryRunner.query(`CREATE TABLE "visitante" ("idVisitante" SERIAL NOT NULL, "nombreCompleto" character varying(120) NOT NULL, "documento" character varying(20) NOT NULL, "placa" character varying(10) NOT NULL, "marca" character varying(50) NOT NULL, "modelo" character varying(50) NOT NULL, "descripcion" text, "idOperativo" integer NOT NULL, "fechaIngreso" TIMESTAMP NOT NULL DEFAULT now(), "fechaSalida" TIMESTAMP, CONSTRAINT "UQ_230673049166ff9783f4348c942" UNIQUE ("documento"), CONSTRAINT "UQ_1fb7ee051bbf620b133788b7b5f" UNIQUE ("placa"), CONSTRAINT "PK_f56a99c86ae122bc91d4a4802d4" PRIMARY KEY ("idVisitante"))`);
        await queryRunner.query(`CREATE TABLE "telemetria_evento" ("idEvento" SERIAL NOT NULL, "idSensor" integer NOT NULL, "tipoEvento" character varying(30) NOT NULL, "payload" json, "fechaEvento" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_00625b1d534d703fd7f6b4c3c12" PRIMARY KEY ("idEvento"))`);
        await queryRunner.query(`CREATE TABLE "alerta_sistema" ("idAlerta" SERIAL NOT NULL, "tipo" character varying(30) NOT NULL, "mensaje" text NOT NULL, "leida" boolean NOT NULL DEFAULT false, "fechaCreacion" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c332836b5fddfbae0baaa8e45c1" PRIMARY KEY ("idAlerta"))`);
        await queryRunner.query(`CREATE TABLE "contingencia" ("idContingencia" SERIAL NOT NULL, "tipoOperacion" character varying(20) NOT NULL, "placa" character varying(20) NOT NULL, "motivo" text NOT NULL, "idOperativo" integer NOT NULL, "fechaCreacion" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_88b18f308c058621c5463d4c285" PRIMARY KEY ("idContingencia"))`);
        await queryRunner.query(`CREATE TABLE "auditoria" ("idAuditoria" SERIAL NOT NULL, "accion" character varying(100) NOT NULL, "entidad" character varying(100) NOT NULL, "idEntidad" integer, "datosAnteriores" json, "datosNuevos" json, "idUsuario" integer NOT NULL, "ip" character varying(45), "userAgent" character varying(255), "fechaCreacion" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_007b6ca432c0c460947494dce2f" PRIMARY KEY ("idAuditoria"))`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP CONSTRAINT "tipo_vehiculo_pkey"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP COLUMN "idtipov"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD "idtipov" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD CONSTRAINT "PK_d8b39fe06a39805918ed9709db6" PRIMARY KEY ("idtipov")`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" ALTER COLUMN "creadoen" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "codigo_otp" ALTER COLUMN "creadoen" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP CONSTRAINT "PK_d8b39fe06a39805918ed9709db6"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP COLUMN "idtipov"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD "idtipov" smallint GENERATED ALWAYS AS IDENTITY NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD CONSTRAINT "tipo_vehiculo_pkey" PRIMARY KEY ("idtipov")`);
        await queryRunner.query(`DROP TABLE "auditoria"`);
        await queryRunner.query(`DROP TABLE "contingencia"`);
        await queryRunner.query(`DROP TABLE "alerta_sistema"`);
        await queryRunner.query(`DROP TABLE "telemetria_evento"`);
        await queryRunner.query(`DROP TABLE "visitante"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "registro_vehiculo_idusuario_idvehiculo_key" UNIQUE ("idusuario", "idvehiculo")`);
        await queryRunner.query(`CREATE INDEX "idx_otp_documento" ON "codigo_otp" ("documento") `);
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD CONSTRAINT "codigo_otp_documento_fkey" FOREIGN KEY ("documento") REFERENCES "usuario"("documento") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "usuario_idformacion_fkey" FOREIGN KEY ("idformacion") REFERENCES "formacion"("ficha") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "usuario_idtipousr_fkey" FOREIGN KEY ("idtipousr") REFERENCES "tipo_usuario"("idtipousr") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "registro_vehiculo_idvehiculo_fkey" FOREIGN KEY ("idvehiculo") REFERENCES "vehiculo"("placa") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "registro_vehiculo_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "usuario"("documento") ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_idtipovehiculo_fkey" FOREIGN KEY ("idtipovehiculo") REFERENCES "tipo_vehiculo"("idtipov") ON DELETE RESTRICT ON UPDATE CASCADE`);
    }

}
