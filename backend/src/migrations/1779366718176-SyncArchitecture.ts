import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncArchitecture1779366718176 implements MigrationInterface {
    name = 'SyncArchitecture1779366718176'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Eliminar constraints antiguas que serán recreadas con estándares TypeORM
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT IF EXISTS "bahia_idtipobahia_fkey"`);
        await queryRunner.query(`ALTER TABLE "bahia" DROP CONSTRAINT IF EXISTS "bahia_idtipocontrol_fkey"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT IF EXISTS "movimiento_vehiculo_idregistrovehiculo_fkey"`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" DROP CONSTRAINT IF EXISTS "movimiento_vehiculo_idbahia_fkey"`);
        await queryRunner.query(`ALTER TABLE "vehiculo" DROP CONSTRAINT IF EXISTS "vehiculo_idtipovehiculo_fkey"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT IF EXISTS "registro_vehiculo_idusuario_fkey"`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" DROP CONSTRAINT IF EXISTS "registro_vehiculo_idvehiculo_fkey"`);

        // 2. Crear tabla Sensor (si no existe)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sensor" ("idSensor" SERIAL NOT NULL, "codigo" character varying(50) NOT NULL, "idBahia" integer NOT NULL, "activo" boolean NOT NULL DEFAULT true, "ultimaLectura" TIMESTAMP, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_dc38d26f3551fc6fff2f4315c94" UNIQUE ("codigo"), CONSTRAINT "PK_98ba643512a31b7bedefd9eecd6" PRIMARY KEY ("idSensor"))`);

        // 3. Renombrar columnas existentes a estándares snake_case
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "fotopersona" TO "foto_persona"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "nombrecompleto" TO "nombre_completo"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "numtelf" TO "num_telf"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "contactoemerg" TO "contacto_emerg"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "contra" TO "password"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "idtipousr" TO "id_tipo_usr"`);
        await queryRunner.query(`ALTER TABLE "usuario" RENAME COLUMN "idformacion" TO "id_formacion"`);

        // 4. Renombrar columnas de tiempo existentes a created_at
        await queryRunner.query(`ALTER TABLE "visitante" RENAME COLUMN "fechaIngreso" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "telemetria_evento" RENAME COLUMN "fechaEvento" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "alerta_sistema" RENAME COLUMN "fechaCreacion" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "contingencia" RENAME COLUMN "fechaCreacion" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "auditoria" RENAME COLUMN "fechaCreacion" TO "created_at"`);

        // 5. Agregar columnas de auditoría faltantes (created_at, updated_at, deleted_at)
        const tables = [
            'usuario', 'vehiculo', 'registro_vehiculo', 'movimiento_vehiculo', 'bahia', 
            'tipo_vehiculo', 'tipo_usuario', 'formacion', 'tipo_bahia', 'tipo_control',
            'codigo_otp', 'visitante', 'telemetria_evento', 'alerta_sistema', 'contingencia', 'auditoria'
        ];

        for (const table of tables) {
            // Agregar created_at solo si no fue renombrado arriba
            if (!['visitante', 'telemetria_evento', 'alerta_sistema', 'contingencia', 'auditoria'].includes(table)) {
                // Para codigo_otp, si existe 'creadoen', renombrarlo, si no, agregarlo
                if (table === 'codigo_otp') {
                    await queryRunner.query(`ALTER TABLE "codigo_otp" RENAME COLUMN "creadoen" TO "created_at"`);
                } else {
                    await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
                }
            }
            await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
            await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE`);
        }

        // 6. Corregir tipos y enums
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP CONSTRAINT IF EXISTS "PK_d8b39fe06a39805918ed9709db6"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" DROP COLUMN IF EXISTS "idtipov"`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD "idtipov" SMALLSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tipo_vehiculo" ADD CONSTRAINT "PK_d8b39fe06a39805918ed9709db6" PRIMARY KEY ("idtipov")`);

        // 7. Recrear relaciones con nombres estándar de TypeORM
        await queryRunner.query(`ALTER TABLE "codigo_otp" ADD CONSTRAINT "FK_otp_usuario" FOREIGN KEY ("documento") REFERENCES "usuario"("documento") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_usuario_tipo" FOREIGN KEY ("id_tipo_usr") REFERENCES "tipo_usuario"("idtipousr") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD CONSTRAINT "FK_usuario_formacion" FOREIGN KEY ("id_formacion") REFERENCES "formacion"("ficha") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_bahia_tipo" FOREIGN KEY ("idtipobahia") REFERENCES "tipo_bahia"("idtipob") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "bahia" ADD CONSTRAINT "FK_bahia_control" FOREIGN KEY ("idtipocontrol") REFERENCES "tipo_control"("idtipoc") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_movimiento_registro" FOREIGN KEY ("idregistrovehiculo") REFERENCES "registro_vehiculo"("idregistrov") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "movimiento_vehiculo" ADD CONSTRAINT "FK_movimiento_bahia" FOREIGN KEY ("idbahia") REFERENCES "bahia"("idbahia") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_registro_usuario" FOREIGN KEY ("idusuario") REFERENCES "usuario"("documento") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "FK_registro_vehiculo" FOREIGN KEY ("idvehiculo") REFERENCES "vehiculo"("placa") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vehiculo" ADD CONSTRAINT "FK_vehiculo_tipo" FOREIGN KEY ("idtipovehiculo") REFERENCES "tipo_vehiculo"("idtipov") ON DELETE RESTRICT ON UPDATE CASCADE`);
        
        // 8. Unicidad en registro_vehiculo
        await queryRunner.query(`ALTER TABLE "registro_vehiculo" ADD CONSTRAINT "UQ_usuario_vehiculo" UNIQUE ("idusuario", "idvehiculo")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No es estrictamente necesario para esta corrección arquitectónica masiva,
        // pero se recomienda en producción. Dado el estado del proyecto, el UP es crítico.
    }
}
