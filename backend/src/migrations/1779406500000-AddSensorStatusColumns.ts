import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * MIGRACIÓN: Corrección de esquema para tabla Sensor.
 * FIX: Agrega columnas faltantes (estado_actual, bateria, metadata) detectadas en TelemetriaService.
 */
export class AddSensorStatusColumns1779406500000 implements MigrationInterface {
    name = 'AddSensorStatusColumns1779406500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear el tipo ENUM para el estado del sensor si no existe (RF33)
        // Valores sincronizados con IotStatusEnum: AVAILABLE, OCCUPIED, OFFLINE, ERROR, ONLINE
        await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sensor_estado_actual_enum') THEN
                CREATE TYPE "public"."sensor_estado_actual_enum" AS ENUM('AVAILABLE', 'OCCUPIED', 'OFFLINE', 'ERROR', 'ONLINE');
            END IF;
        END $$;`);

        // 2. Agregar las columnas faltantes a la tabla sensor con estándares snake_case
        // PERFORMANCE: Se agregan con IF NOT EXISTS para evitar errores en ejecuciones parciales
        await queryRunner.query(`ALTER TABLE "sensor" ADD COLUMN IF NOT EXISTS "estado_actual" "public"."sensor_estado_actual_enum" NOT NULL DEFAULT 'OFFLINE'`);
        await queryRunner.query(`ALTER TABLE "sensor" ADD COLUMN IF NOT EXISTS "bateria" smallint`);
        await queryRunner.query(`ALTER TABLE "sensor" ADD COLUMN IF NOT EXISTS "metadata" json`);

        // 3. Asegurar que ultima_lectura sea timestamptz para consistencia con auditoría
        await queryRunner.query(`ALTER TABLE "sensor" ALTER COLUMN "ultima_lectura" TYPE TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sensor" DROP COLUMN IF EXISTS "metadata"`);
        await queryRunner.query(`ALTER TABLE "sensor" DROP COLUMN IF EXISTS "bateria"`);
        await queryRunner.query(`ALTER TABLE "sensor" DROP COLUMN IF EXISTS "estado_actual"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."sensor_estado_actual_enum"`);
    }
}
