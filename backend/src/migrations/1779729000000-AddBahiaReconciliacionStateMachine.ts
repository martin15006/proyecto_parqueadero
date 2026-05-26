import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBahiaReconciliacionStateMachine1779729000000 implements MigrationInterface {
  name = 'AddBahiaReconciliacionStateMachine1779729000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "estado_reconciliado" character varying(16) NOT NULL DEFAULT 'LIBRE'`);
    await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "transito_desde" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "discrepancia_desde" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "ultima_telemetria_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "bahia" ADD COLUMN IF NOT EXISTS "ultimo_fisico_ocupado" boolean`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_bahia_estado_reconciliado'
        ) THEN
          ALTER TABLE "bahia"
          ADD CONSTRAINT "ck_bahia_estado_reconciliado"
          CHECK ("estado_reconciliado" IN ('LIBRE', 'TRANSITO', 'OCUPADO', 'DISCREPANCIA', 'OFFLINE', 'DESHABILITADO'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bahia_estado_reconciliado" ON "bahia" ("estado_reconciliado")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bahia_transito_desde" ON "bahia" ("transito_desde")`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'movimiento_vehiculo_estado_enum' AND e.enumlabel = 'TRANSITO'
        ) THEN
          ALTER TYPE "public"."movimiento_vehiculo_estado_enum" RENAME TO "movimiento_vehiculo_estado_enum_old";
          CREATE TYPE "public"."movimiento_vehiculo_estado_enum" AS ENUM ('TRANSITO', 'ADENTRO', 'SALIDA', 'ANULADO');
          ALTER TABLE "movimiento_vehiculo"
            ALTER COLUMN "estado"
            TYPE "public"."movimiento_vehiculo_estado_enum"
            USING "estado"::text::"public"."movimiento_vehiculo_estado_enum";
          DROP TYPE "public"."movimiento_vehiculo_estado_enum_old";
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}

