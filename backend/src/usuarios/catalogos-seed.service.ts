import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TipoUsuario } from './entities/tipo-usuario.entity';
import { TipoVehiculo } from '../vehiculos/entities/tipo-vehiculo.entity';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

/**
 * Sembrador de catálogos base que dependen del módulo de usuarios:
 *  - tipo_usuario (con IDs fijos del enum TipoUsuarioEnum)
 *  - tipo_vehiculo (sin IDs específicos)
 *
 * NOTA: tipo_bahia lo siembra InfraestructuraSeedService en el módulo de
 * bahías, no se duplica aquí.
 *
 * Idempotente: solo inserta si la fila no existe.
 * Usa el patrón ensureSeeded() para garantizar que se ejecuta una sola vez
 * y permitir que AdminSeedService espere a que termine.
 */
@Injectable()
export class CatalogosSeedService {
  private readonly logger = new Logger(CatalogosSeedService.name);
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TipoUsuario)
    private readonly tipoUsuarioRepo: Repository<TipoUsuario>,
    @InjectRepository(TipoVehiculo)
    private readonly tipoVehiculoRepo: Repository<TipoVehiculo>,
  ) {}

  /**
   * Garantiza que el seeding se ejecute una sola vez aunque varios servicios
   * lo invoquen. Devuelve la misma promesa en llamadas concurrentes.
   */
  async ensureSeeded(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.runSeed();
    }
    return this.seedPromise;
  }

  private async runSeed() {
    await this.seedTipoUsuario();
    await this.seedTipoVehiculo();
  }

  /**
   * tipo_usuario: IDs fijos que deben coincidir con TipoUsuarioEnum.
   * Se usa OVERRIDING SYSTEM VALUE porque la columna es GENERATED ALWAYS AS IDENTITY.
   */
  private async seedTipoUsuario() {
    const tipos = [
      { id: TipoUsuarioEnum.APRENDIZ,      nombre: 'APRENDIZ'      },
      { id: TipoUsuarioEnum.ADMIN,         nombre: 'ADMIN'         },
      { id: TipoUsuarioEnum.OPERATIVO,     nombre: 'OPERATIVO'     },
      { id: TipoUsuarioEnum.PERSONAL_SENA, nombre: 'PERSONAL_SENA' },
    ];

    for (const t of tipos) {
      const existe = await this.tipoUsuarioRepo.findOne({ where: { idTipoUsr: t.id } });
      if (existe) continue;

      await this.dataSource.query(
        `INSERT INTO tipo_usuario (id_tipo_usr, tipo_usr)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2)
         ON CONFLICT (id_tipo_usr) DO NOTHING`,
        [t.id, t.nombre],
      );
      this.logger.log(`Tipo de usuario creado: ${t.nombre} (id=${t.id})`);
    }

    // Sincronizar la secuencia para que próximos INSERT no colisionen
    await this.dataSource.query(
      `SELECT setval(pg_get_serial_sequence('tipo_usuario', 'id_tipo_usr'),
                     (SELECT COALESCE(MAX(id_tipo_usr), 1) FROM tipo_usuario))`,
    );
  }

  private async seedTipoVehiculo() {
    const tipos = ['Carro', 'Moto'];
    for (const tipoVehiculo of tipos) {
      const existe = await this.tipoVehiculoRepo.findOne({ where: { tipoVehiculo } });
      if (!existe) {
        await this.tipoVehiculoRepo.save(this.tipoVehiculoRepo.create({ tipoVehiculo }));
        this.logger.log(`Tipo de vehículo creado: ${tipoVehiculo}`);
      }
    }
  }
}
