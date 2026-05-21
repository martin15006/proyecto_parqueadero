import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeRelationsV31779368188389 implements MigrationInterface {
    name = 'StandardizeRelationsV31779368188389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "codigo_otp" DROP CONSTRAINT "FK_c7982857234f57262074b84d0fd"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "FK_39fc0bf0d72443050f46bcadcf3"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "FK_ffb9cd8da78ca239e9c85b7cabd"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT "FK_2e24cdf58869055626b71770839"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT "FK_67a6fa084924a6caa622eecf592"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT "FK_9de16149bcef476860eac545336"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT "FK_c215b3818ab28243c3afab91398"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "FK_2a40626900ae93dd649f4a1cc6d"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "FK_3970b48b1e91fa661c576eeaf48"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" DROP CONSTRAINT "FK_e04e38078099589c1f6d44be764"`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" DROP COLUMN "usuario_documento"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "tipo_usuario_id_tipo_usr"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "formacion_ficha"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP COLUMN "tipo_bahia_id_tipo_b"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP COLUMN "tipo_control_id_tipo_c"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP COLUMN "registro_vehiculo_id_registro_v"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP COLUMN "bahia_id_bahia"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP COLUMN "usuario_documento"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP COLUMN "vehiculo_placa"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" DROP COLUMN "tipo_vehiculo_id_tipo_v"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "visitante_id_visitante_seq" OWNED BY "visitante"."id_visitante"`);
        await queryRunner.query(`ALTER TABLE "visitante" ALTER COLUMN "id_visitante" SET DEFAULT nextval('"visitante_id_visitante_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "tipo_vehiculo_id_tipo_v_seq" OWNED BY "tipo_vehiculo"."id_tipo_v"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ALTER COLUMN "id_tipo_v" SET DEFAULT nextval('"tipo_vehiculo_id_tipo_v_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "telemetria_evento_id_evento_seq" OWNED BY "telemetria_evento"."id_evento"`);
        await queryRunner.query(`ALTER TABLE "telemetria_evento" ALTER COLUMN "id_evento" SET DEFAULT nextval('"telemetria_evento_id_evento_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "sensor_id_sensor_seq" OWNED BY "sensor"."id_sensor"`);
        await queryRunner.query(`ALTER TABLE "sensor" ALTER COLUMN "id_sensor" SET DEFAULT nextval('"sensor_id_sensor_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "alerta_sistema_id_alerta_seq" OWNED BY "alerta_sistema"."id_alerta"`);
        await queryRunner.query(`ALTER TABLE "alerta_sistema" ALTER COLUMN "id_alerta" SET DEFAULT nextval('"alerta_sistema_id_alerta_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "contingencia_id_contingencia_seq" OWNED BY "contingencia"."id_contingencia"`);
        await queryRunner.query(`ALTER TABLE "contingencia" ALTER COLUMN "id_contingencia" SET DEFAULT nextval('"contingencia_id_contingencia_seq"')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "auditoria_id_auditoria_seq" OWNED BY "auditoria"."id_auditoria"`);
        await queryRunner.query(`ALTER TABLE "auditoria" ALTER COLUMN "id_auditoria" SET DEFAULT nextval('"auditoria_id_auditoria_seq"')`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD CONSTRAINT "FK_199ee1ed0c664f40a1096d333a0" FOREIGN KEY ("documento") REFERENCES "usuario"("documento") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_9a57475b8dd331058712b98d6c4" FOREIGN KEY ("id_tipo_usr") REFERENCES "tipo_usuario"("id_tipo_usr") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_206e2b87e297bd2a296d769e713" FOREIGN KEY ("id_formacion") REFERENCES "formacion"("ficha") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_51f6e1355f9fbc8ad630f024ea0" FOREIGN KEY ("id_tipo_bahia") REFERENCES "tipo_bahia"("id_tipo_b") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_e80fab85d6abc0dd8b5f20d1f08" FOREIGN KEY ("id_tipo_control") REFERENCES "tipo_control"("id_tipo_c") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_43aa406122e887932ebec005ea5" FOREIGN KEY ("id_registro_vehiculo") REFERENCES "registro_vehiculo"("id_registro_v") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_e35098040e9f56cf9e2264cf258" FOREIGN KEY ("id_bahia") REFERENCES "bahia"("id_bahia") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_0cde046d8b67c22573244479556" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("documento") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_9d5e5c97fc9643d4fd8f222982f" FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("placa") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD CONSTRAINT "FK_c77dd806b31c2269e68635bdb81" FOREIGN KEY ("id_tipo_vehiculo") REFERENCES "tipo_vehiculo"("id_tipo_v") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehiculo" DROP CONSTRAINT "FK_c77dd806b31c2269e68635bdb81"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "FK_9d5e5c97fc9643d4fd8f222982f"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT "FK_0cde046d8b67c22573244479556"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT "FK_e35098040e9f56cf9e2264cf258"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT "FK_43aa406122e887932ebec005ea5"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT "FK_e80fab85d6abc0dd8b5f20d1f08"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT "FK_51f6e1355f9fbc8ad630f024ea0"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "FK_206e2b87e297bd2a296d769e713"`);
        await queryRunner.query(`ALTER TABLE "usuario" DROP CONSTRAINT "FK_9a57475b8dd331058712b98d6c4"`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" DROP CONSTRAINT "FK_199ee1ed0c664f40a1096d333a0"`);
        await queryRunner.query(`ALTER TABLE "auditoria" ALTER COLUMN "id_auditoria" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "auditoria_id_auditoria_seq"`);
        await queryRunner.query(`ALTER TABLE "contingencia" ALTER COLUMN "id_contingencia" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "contingencia_id_contingencia_seq"`);
        await queryRunner.query(`ALTER TABLE "alerta_sistema" ALTER COLUMN "id_alerta" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "alerta_sistema_id_alerta_seq"`);
        await queryRunner.query(`ALTER TABLE "sensor" ALTER COLUMN "id_sensor" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "sensor_id_sensor_seq"`);
        await queryRunner.query(`ALTER TABLE "telemetria_evento" ALTER COLUMN "id_evento" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "telemetria_evento_id_evento_seq"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ALTER COLUMN "id_tipo_v" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "tipo_vehiculo_id_tipo_v_seq"`);
        await queryRunner.query(`ALTER TABLE "visitante" ALTER COLUMN "id_visitante" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "visitante_id_visitante_seq"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD "tipo_vehiculo_id_tipo_v" smallint`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD "vehiculo_placa" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD "usuario_documento" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD "bahia_id_bahia" smallint`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD "registro_vehiculo_id_registro_v" integer`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD "tipo_control_id_tipo_c" smallint`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD "tipo_bahia_id_tipo_b" smallint`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD "formacion_ficha" character varying(7)`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD "tipo_usuario_id_tipo_usr" smallint`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD "usuario_documento" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD CONSTRAINT "FK_e04e38078099589c1f6d44be764" FOREIGN KEY ("tipo_vehiculo_id_tipo_v") REFERENCES "tipo_vehiculo"("id_tipo_v") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_3970b48b1e91fa661c576eeaf48" FOREIGN KEY ("vehiculo_placa") REFERENCES "vehiculo"("placa") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_2a40626900ae93dd649f4a1cc6d" FOREIGN KEY ("usuario_documento") REFERENCES "usuario"("documento") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_c215b3818ab28243c3afab91398" FOREIGN KEY ("bahia_id_bahia") REFERENCES "bahia"("id_bahia") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_9de16149bcef476860eac545336" FOREIGN KEY ("registro_vehiculo_id_registro_v") REFERENCES "registro_vehiculo"("id_registro_v") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_67a6fa084924a6caa622eecf592" FOREIGN KEY ("tipo_control_id_tipo_c") REFERENCES "tipo_control"("id_tipo_c") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_2e24cdf58869055626b71770839" FOREIGN KEY ("tipo_bahia_id_tipo_b") REFERENCES "tipo_bahia"("id_tipo_b") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_ffb9cd8da78ca239e9c85b7cabd" FOREIGN KEY ("formacion_ficha") REFERENCES "formacion"("ficha") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_39fc0bf0d72443050f46bcadcf3" FOREIGN KEY ("tipo_usuario_id_tipo_usr") REFERENCES "tipo_usuario"("id_tipo_usr") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD CONSTRAINT "FK_c7982857234f57262074b84d0fd" FOREIGN KEY ("usuario_documento") REFERENCES "usuario"("documento") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
