import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';

export interface ResumenPurga {
  usuarios: number;
  vehiculos: number;
  fichas: number;
  errores: number;
}

@Injectable()
export class RetencionService {
  private readonly logger = new Logger(RetencionService.name);
  private static readonly DIAS_RETENCION = 90;

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ejecutarPurgaProgramada() {
    await this.purgar();
  }

  async purgar(dias = RetencionService.DIAS_RETENCION): Promise<ResumenPurga> {
    const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const resumen: ResumenPurga = { usuarios: 0, vehiculos: 0, fichas: 0, errores: 0 };

    const usuarios: Array<{ documento: string }> = await this.dataSource.query(
      `SELECT documento FROM usuario WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
      [cutoff],
    );
    for (const u of usuarios) {
      try {
        await this.purgarUsuario(u.documento);
        resumen.usuarios++;
      } catch (e) {
        resumen.errores++;
        this.logger.error(`No se pudo purgar el usuario ${u.documento}: ${this.msg(e)}`);
      }
    }

    const vehiculos: Array<{ placa: string }> = await this.dataSource.query(
      `SELECT placa FROM vehiculo WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
      [cutoff],
    );
    for (const v of vehiculos) {
      try {
        await this.purgarVehiculo(v.placa);
        resumen.vehiculos++;
      } catch (e) {
        resumen.errores++;
        this.logger.error(`No se pudo purgar el vehículo ${v.placa}: ${this.msg(e)}`);
      }
    }

    const fichas: Array<{ ficha: string }> = await this.dataSource.query(
      `SELECT ficha FROM formacion WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
      [cutoff],
    );
    for (const f of fichas) {
      try {
        await this.purgarFicha(f.ficha);
        resumen.fichas++;
      } catch (e) {
        resumen.errores++;
        this.logger.error(`No se pudo purgar la ficha ${f.ficha}: ${this.msg(e)}`);
      }
    }

    const total = resumen.usuarios + resumen.vehiculos + resumen.fichas;
    if (total > 0 || resumen.errores > 0) {
      this.logger.log(`Purga de retención (>${dias}d): ${JSON.stringify(resumen)}`);
      await this.auditoriaService.create({
        accion: 'PURGA_RETENCION',
        entidad: 'SISTEMA',
        idUsuario: 'SISTEMA',
        datosNuevos: { ...resumen, dias, cutoff },
      });
    }

    return resumen;
  }

  private purgarUsuario(documento: string) {
    return this.dataSource.transaction(async (m) => {
      await m.query(`DELETE FROM compartir WHERE documento = $1`, [documento]);
      await m.query(
        `DELETE FROM movimiento_vehiculo WHERE id_registro_vehiculo IN (SELECT id_registro_v FROM registro_vehiculo WHERE id_usuario = $1)`,
        [documento],
      );
      await m.query(
        `DELETE FROM compartir WHERE id_registro_v IN (SELECT id_registro_v FROM registro_vehiculo WHERE id_usuario = $1)`,
        [documento],
      );
      await m.query(`DELETE FROM registro_vehiculo WHERE id_usuario = $1`, [documento]);
      await m.query(`DELETE FROM codigo_otp WHERE documento = $1`, [documento]);
      await m.query(`DELETE FROM notificacion_usuario WHERE id_usuario = $1`, [documento]);
      await m.query(`DELETE FROM solicitud_vehiculo WHERE documento = $1`, [documento]);
      await m.query(`DELETE FROM usuario WHERE documento = $1`, [documento]);
    });
  }

  private purgarVehiculo(placa: string) {
    return this.dataSource.transaction(async (m) => {
      await m.query(
        `DELETE FROM movimiento_vehiculo WHERE id_registro_vehiculo IN (SELECT id_registro_v FROM registro_vehiculo WHERE id_vehiculo = $1)`,
        [placa],
      );
      await m.query(
        `DELETE FROM compartir WHERE id_registro_v IN (SELECT id_registro_v FROM registro_vehiculo WHERE id_vehiculo = $1)`,
        [placa],
      );
      await m.query(`DELETE FROM registro_vehiculo WHERE id_vehiculo = $1`, [placa]);
      await m.query(`DELETE FROM vehiculo WHERE placa = $1`, [placa]);
    });
  }

  private purgarFicha(ficha: string) {
    return this.dataSource.transaction(async (m) => {
      await m.query(`UPDATE usuario SET id_formacion = NULL WHERE id_formacion = $1`, [ficha]);
      await m.query(`DELETE FROM formacion WHERE ficha = $1`, [ficha]);
    });
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
