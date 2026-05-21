import { MigrationInterface, QueryRunner } from "typeorm";

export class FinalSyncArchitectureV21779367832857 implements MigrationInterface {
    name = 'FinalSyncArchitectureV21779367832857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Renombrar columnas existentes para evitar pérdida de datos y conflictos de NULL
        // TIPO_USUARIO
        await queryRunner.query(`ALTER TABLE "tipo_usuario" RENAME COLUMN "tipousr" TO "tipo_usr"`);
        await queryRunner.query(`ALTER TABLE "tipo_usuario" RENAME COLUMN "idtipousr" TO "id_tipo_usr"`);
        
        // TIPO_VEHICULO
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" RENAME COLUMN "tipovehiculo" TO "tipo_vehiculo"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" RENAME COLUMN "idtipov" TO "id_tipo_v"`);

        // VISITANTE
        await queryRunner.query(`ALTER TABLE "visitante" RENAME COLUMN "idVisitante" TO "id_visitante"`);
        await queryRunner.query(`ALTER TABLE "visitante" RENAME COLUMN "nombreCompleto" TO "nombre_completo"`);
        await queryRunner.query(`ALTER TABLE "visitante" RENAME COLUMN "idOperativo" TO "id_operativo"`);
        await queryRunner.query(`ALTER TABLE "visitante" RENAME COLUMN "fechaSalida" TO "fecha_salida"`);

        // CODIGO_OTP
        await queryRunner.query(`ALTER TABLE "codigo_otp" RENAME COLUMN "idotp" TO "id_otp"`);
        await queryRunner.query(`ALTER TABLE "codigo_otp" RENAME COLUMN "expiraen" TO "expira_en"`);

        // TIPO_BAHIA
        await queryRunner.query(`ALTER TABLE "tipo_bahia" RENAME COLUMN "idtipob" TO "id_tipo_b"`);
        await queryRunner.query(`ALTER TABLE "tipo_bahia" RENAME COLUMN "tipobahia" TO "tipo_bahia"`);

        // TIPO_CONTROL
        await queryRunner.query(`ALTER TABLE "tipo_control" RENAME COLUMN "idtipoc" TO "id_tipo_c"`);
        await queryRunner.query(`ALTER TABLE "tipo_control" RENAME COLUMN "tipocontrol" TO "tipo_control"`);

        // BAHIA
        await queryRunner.query(`ALTER TABLE "bahia" RENAME COLUMN "idbahia" TO "id_bahia"`);
        await queryRunner.query(`ALTER TABLE "bahia" RENAME COLUMN "nombrebahia" TO "nombre_bahia"`);
        await queryRunner.query(`ALTER TABLE "bahia" RENAME COLUMN "idtipobahia" TO "id_tipo_bahia"`);
        await queryRunner.query(`ALTER TABLE "bahia" RENAME COLUMN "idtipocontrol" TO "id_tipo_control"`);

        // MOVIMIENTO_VEHICULO
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" RENAME COLUMN "idmovimiento" TO "id_movimiento"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" RENAME COLUMN "horaingreso" TO "hora_ingreso"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" RENAME COLUMN "horasalida" TO "hora_salida"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" RENAME COLUMN "idregistrovehiculo" TO "id_registro_vehiculo"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" RENAME COLUMN "idbahia" TO "id_bahia"`);

        // REGISTRO_VEHICULO
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" RENAME COLUMN "idregistrov" TO "id_registro_v"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" RENAME COLUMN "idusuario" TO "id_usuario"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" RENAME COLUMN "idvehiculo" TO "id_vehiculo"`);

        // VEHICULO
        await queryRunner.query(`ALTER TABLE "vehiculo" RENAME COLUMN "fotovehiculo" TO "foto_vehiculo"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" RENAME COLUMN "fototarjetap" TO "foto_tarjeta_p"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" RENAME COLUMN "idtipovehiculo" TO "id_tipo_vehiculo"`);

        // TELEMETRIA_EVENTO
        await queryRunner.query(`ALTER TABLE "telemetria_evento" RENAME COLUMN "idEvento" TO "id_evento"`);
        await queryRunner.query(`ALTER TABLE "telemetria_evento" RENAME COLUMN "idSensor" TO "id_sensor"`);
        await queryRunner.query(`ALTER TABLE "telemetria_evento" RENAME COLUMN "tipoEvento" TO "tipo_evento"`);

        // SENSOR
        await queryRunner.query(`ALTER TABLE "sensor" RENAME COLUMN "idSensor" TO "id_sensor"`);
        await queryRunner.query(`ALTER TABLE "sensor" RENAME COLUMN "idBahia" TO "id_bahia"`);
        await queryRunner.query(`ALTER TABLE "sensor" RENAME COLUMN "ultimaLectura" TO "ultima_lectura"`);

        // ALERTA_SISTEMA
        await queryRunner.query(`ALTER TABLE "alerta_sistema" RENAME COLUMN "idAlerta" TO "id_alerta"`);

        // CONTINGENCIA
        await queryRunner.query(`ALTER TABLE "contingencia" RENAME COLUMN "idContingencia" TO "id_contingencia"`);
        await queryRunner.query(`ALTER TABLE "contingencia" RENAME COLUMN "idOperativo" TO "id_operativo"`);
        await queryRunner.query(`ALTER TABLE "contingencia" RENAME COLUMN "tipoOperacion" TO "tipo_operacion"`);

        // AUDITORIA
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "idAuditoria" TO "id_auditoria"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "idEntidad" TO "id_entidad"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "datosAnteriores" TO "datos_anteriores"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "datosNuevos" TO "datos_nuevos"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "idUsuario" TO "id_usuario"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "userAgent" TO "user_agent"`);

        // 2. Corregir tipos de Enums (Sustitución controlada)
        await queryRunner.query(`ALTER TYPE "public"."jornadas" RENAME TO "jornadas_old"`);
        await queryRunner.query(`CREATE TYPE "public"."formacion_jornada_enum" AS ENUM('MAÑANA', 'TARDE', 'NOCHE')`);
        await queryRunner.query(`ALTER TABLE "formacion" ALTER COLUMN "jornada" TYPE "public"."formacion_jornada_enum" USING "jornada"::"text"::"public"."formacion_jornada_enum"`);
        await queryRunner.query(`DROP TYPE "public"."jornadas_old"`);

        await queryRunner.query(`ALTER TYPE "public"."estado_mov" RENAME TO "estado_mov_old"`);
        await queryRunner.query(`CREATE TYPE "public"."movimiento_vehiculo_estado_enum" AS ENUM('ADENTRO', 'SALIDA')`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ALTER COLUMN "estado" TYPE "public"."movimiento_vehiculo_estado_enum" USING "estado"::"text"::"public"."movimiento_vehiculo_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."estado_mov_old"`);

        // 3. Agregar columnas de relación técnica (TypeORM standard para relaciones sin @JoinColumn explícito)
        // Nota: TypeORM a veces busca estas columnas si la relación no está mapeada a la columna real.
        // Las agregamos como opcionales para evitar errores de consulta.
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD COLUMN IF NOT EXISTS "usuario_documento" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "tipo_usuario_id_tipo_usr" smallint`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "formacion_ficha" character varying(7)`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "tipo_bahia_id_tipo_b" smallint`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "tipo_control_id_tipo_c" smallint`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD COLUMN IF NOT EXISTS "registro_vehiculo_id_registro_v" integer`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD COLUMN IF NOT EXISTS "bahia_id_bahia" smallint`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD COLUMN IF NOT EXISTS "usuario_documento" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD COLUMN IF NOT EXISTS "vehiculo_placa" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "tipo_vehiculo_id_tipo_v" smallint`);

        // 4. Asegurar Constraints y Unicidad
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "UQ_usuario_vehiculo_sync" UNIQUE ("id_usuario", "id_vehiculo")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // El rollback de esta migración manual es complejo, se prefiere corregir hacia adelante.
    }
}
