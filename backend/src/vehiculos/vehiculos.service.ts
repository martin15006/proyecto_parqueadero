import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from './entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { AdminListVehiculosQueryDto } from './dto/admin-list-vehiculos.query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

/**
 * Servicio de Gestión de Vehículos.
 * Controla el registro, actualización y vinculación de vehículos con usuarios.
 * REFACTOR: Implementa limpieza de recursos multimedia y auditoría integrada.
 */
@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(TipoVehiculo)
    private readonly tipoVehiculoRepository: Repository<TipoVehiculo>,
    @InjectRepository(RegistroVehiculo)
    private readonly registroRepository: Repository<RegistroVehiculo>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Normalización institucional de placas.
   * RNF2: Elimina guiones y espacios para evitar duplicidad técnica.
   */
  private normalizarPlaca(placa: string): string {
    return String(placa ?? '').replace(/[- ]/g, '').toUpperCase().trim();
  }

  /**
   * Registra un vehículo y lo vincula al usuario.
   * REFACTOR PROFESIONAL: Implementa Upsert (Update or Insert) manejando Soft Delete.
   * Evita errores de duplicidad restaurando registros existentes si es necesario.
   */
  async registrarVehiculo(documento: string, dto: CreateVehiculoDto): Promise<{ mensaje: string; vehiculo: Vehiculo }> {
    const tipo = await this.tipoVehiculoRepository.findOne({ where: { idTipoV: dto.idTipoVehiculo } });
    if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');

    const placaNormalizada = this.normalizarPlaca(dto.placa);
    
    // 1. Gestión del Vehículo (Base)
    let vehiculo = await this.vehiculoRepository.findOne({ 
      where: { placa: placaNormalizada },
      withDeleted: true 
    });

    if (vehiculo) {
      // Si el vehículo ya existe (activo o eliminado), actualizamos sus datos y lo restauramos.
      // Esto es más seguro y profesional que borrar/recrear, ya que mantiene la integridad referencial.
      Object.assign(vehiculo, { 
        ...dto, 
        placa: placaNormalizada, 
        deletedAt: null // Restaurar si estaba eliminado
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);

      await this.auditoriaService.create({ 
        accion: 'RESTAURAR_VEHICULO', 
        entidad: 'VEHICULO', 
        idEntidad: 0, 
        idUsuario: documento, 
        datosNuevos: { placa: vehiculo.placa, color: vehiculo.color, nota: 'Vehículo restaurado y actualizado' }, 
      });
    } else {
      // Si no existe, creación limpia
      vehiculo = this.vehiculoRepository.create({ ...dto, placa: placaNormalizada });
      vehiculo = await this.vehiculoRepository.save(vehiculo);

      await this.auditoriaService.create({ 
        accion: 'CREAR_VEHICULO', 
        entidad: 'VEHICULO', 
        idEntidad: 0, 
        idUsuario: documento, 
        datosNuevos: { placa: vehiculo.placa, color: vehiculo.color }, 
      });
    }

    // 2. Gestión del Vínculo (RegistroVehiculo)
    const yaRegistrado = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
      withDeleted: true,
    });

    if (yaRegistrado) {
      if (yaRegistrado.deletedAt) {
        // Restaurar vínculo previo
        yaRegistrado.deletedAt = null;
        await this.registroRepository.save(yaRegistrado);
      } else {
        throw new ConflictException('Este vehículo ya se encuentra vinculado a tu cuenta');
      }
    } else {
      // Crear nuevo vínculo
      const nuevoRegistro = this.registroRepository.create({ idUsuario: documento, idVehiculo: placaNormalizada });
      const registroGuardado = await this.registroRepository.save(nuevoRegistro);

      await this.auditoriaService.create({
        accion: 'VINCULAR_VEHICULO',
        entidad: 'REGISTRO_VEHICULO',
        idEntidad: registroGuardado.idRegistroV,
        idUsuario: documento,
        datosNuevos: { idUsuario: documento, idVehiculo: vehiculo.placa },
      });
    }

    return { mensaje: 'Vehículo registrado y vinculado correctamente', vehiculo };
  }

  /**
   * Lista vehículos vinculados al usuario autenticado.
   * MOBILE_API: Optimizado para mostrar la flota personal del usuario en la app.
   * SERIALIZATION: Mapea la relación Many-to-Many para un consumo simplificado en mobile.
   */
  async listarMisVehiculos(documento: string) {
    const registros = await this.registroRepository.find({
      where: { idUsuario: documento },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    return registros.map(reg => ({
      placa: reg.vehiculo.placa,
      fotoVehiculo: reg.vehiculo.fotoVehiculo,
      fotoTarjetaP: reg.vehiculo.fotoTarjetaP,
      fotoPlaca: reg.vehiculo.fotoPlaca,
      color: reg.vehiculo.color,
      tipoVehiculo: reg.vehiculo.tipoVehiculo.tipoVehiculo,
      idTipoVehiculo: reg.vehiculo.tipoVehiculo.idTipoV,
      idRegistroV: reg.idRegistroV,
    }));
  }

  /**
   * Lista todos los vehículos del sistema con paginación (Solo Admin).
   * MOBILE_API: Usado para la gestión masiva de flota desde la consola móvil.
   * PAGINATION: Controla el flujo de datos para evitar latencia en redes móviles.
   */
  async findAll(page: number = 1, limit: number = 10) {
    // PAGINATION: Offset dinámico para navegación entre páginas
    const [data, total] = await this.vehiculoRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['tipoVehiculo'],
      order: { placa: 'ASC' },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async listarVehiculosAdmin(query: AdminListVehiculosQueryDto) {
    const placa = query.placa ? this.normalizarPlaca(query.placa) : null;
    const marca = query.marca?.trim();
    const q = query.q?.trim();

    const qb = this.vehiculoRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.tipoVehiculo', 'tv')
      .orderBy('v.placa', 'ASC');

    if (placa) {
      qb.andWhere('v.placa ILIKE :placa', { placa: `%${placa}%` });
    }

    if (marca) {
      qb.andWhere('tv.tipo_vehiculo ILIKE :marca', { marca: `%${marca}%` });
    }

    if (q) {
      qb.andWhere('(v.placa ILIKE :q OR tv.tipo_vehiculo ILIKE :q)', { q: `%${q}%` });
    }

    const subQuery = qb.subQuery()
      .select('1')
      .from(MovimientoVehiculo, 'mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .where('rv.id_vehiculo = v.placa')
      .andWhere('mv.estado = :estadoAdentro', { estadoAdentro: EstadoMovimiento.ADENTRO })
      .andWhere('mv.deleted_at IS NULL')
      .getQuery();

    qb.addSelect(`EXISTS (${subQuery})`, 'is_adentro');

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((vehiculo, idx) => {
      const isAdentroRaw = raw[idx]?.is_adentro;
      const isAdentro = isAdentroRaw === true || isAdentroRaw === 't' || isAdentroRaw === 1 || isAdentroRaw === '1';
      return {
        ...vehiculo,
        isAdentro,
      };
    });
  }

  /**
   * Requerido por UsuarioService.
   */
  async findByUsuario(documento: string): Promise<Vehiculo[]> {
    const registros = await this.registroRepository.find({
      where: { idUsuario: documento },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });
    return registros.map(r => r.vehiculo);
  }

  /**
   * RF32: Historial de uso del Aprendiz.
   *
   * Objetivo:
   * - Permitir que el Aprendiz consulte sus ingresos/salidas (transparencia).
   * - Depende de que registrarSalida cierre correctamente el movimiento (horaSalida + estado).
   *
   * RNF2:
   * - Retorna solo información operativa del usuario autenticado (no expone datos de otros usuarios).
   */
  async listarHistorialUsuario(documento: string) {
    const movimientos = await this.movimientoRepository
      .createQueryBuilder('mv') // PERFORMANCE: consulta agregada con joins controlados.
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo') // RF32: enlaza movimiento con registro usuario-vehículo.
      .innerJoin(Vehiculo, 'v', 'v.placa = rv.id_vehiculo') // RF32: permite devolver la placa en el historial.
      .leftJoin(Bahia, 'b', 'b.id_bahia = mv.id_bahia') // RF32: permite devolver nombre de bahía si existe.
      .where('rv.id_usuario = :documento', { documento }) // RNF2: limita estrictamente al usuario autenticado.
      .orderBy('mv.hora_ingreso', 'DESC') // RF32: orden cronológico descendente.
      .limit(50) // UX: limita historial para evitar cargas grandes en móvil.
      .select([
        'mv.id_movimiento AS "idMovimiento"',
        'v.placa AS "placa"',
        'mv.hora_ingreso AS "horaIngreso"',
        'mv.hora_salida AS "horaSalida"',
        'mv.estado AS "estado"',
        'b.nombre_bahia AS "bahia"',
      ]) // RF32: payload mínimo para UI.
      .getRawMany();

    return movimientos;
  }

  /**
   * Detalle de vehículo.
   */
  async obtenerDetalle(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    if (!registro) throw new NotFoundException('Vehículo no encontrado en tus registros');

    return {
      placa: registro.vehiculo.placa,
      fotoVehiculo: registro.vehiculo.fotoVehiculo,
      fotoTarjetaP: registro.vehiculo.fotoTarjetaP,
      fotoPlaca: registro.vehiculo.fotoPlaca,
      color: registro.vehiculo.color,
      tipoVehiculo: registro.vehiculo.tipoVehiculo.tipoVehiculo,
      idTipoVehiculo: registro.vehiculo.tipoVehiculo.idTipoV,
      idRegistroV: registro.idRegistroV,
    };
  }

  /**
   * Actualiza datos y gestiona Cloudinary.
   */
  async actualizarVehiculo(documento: string, placa: string, dto: ActualizarVehiculoDto): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes permisos para modificar este vehículo');

    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const fotoVehiculoVieja = vehiculo.fotoVehiculo;
    const fotoTarjetaVieja = vehiculo.fotoTarjetaP;
    const fotoPlacaVieja = vehiculo.fotoPlaca;

    if (dto.fotoVehiculo) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.fotoTarjetaP) vehiculo.fotoTarjetaP = dto.fotoTarjetaP;
    if (dto.fotoPlaca) vehiculo.fotoPlaca = dto.fotoPlaca;
    if (dto.color) vehiculo.color = dto.color;
    if (dto.idTipoVehiculo) vehiculo.idTipoVehiculo = dto.idTipoVehiculo;

    await this.vehiculoRepository.save(vehiculo);

    // SECURITY: Limpieza de fotos obsoletas en Cloudinary
    const fotosABorrar: string[] = [];
    if (dto.fotoVehiculo && fotoVehiculoVieja && fotoVehiculoVieja !== dto.fotoVehiculo) fotosABorrar.push(fotoVehiculoVieja);
    if (dto.fotoTarjetaP && fotoTarjetaVieja && fotoTarjetaVieja !== dto.fotoTarjetaP) fotosABorrar.push(fotoTarjetaVieja);
    if (dto.fotoPlaca && fotoPlacaVieja && fotoPlacaVieja !== dto.fotoPlaca) fotosABorrar.push(fotoPlacaVieja);
    
    if (fotosABorrar.length > 0) await this.cloudinaryService.borrarVariasPorUrl(fotosABorrar);

    return { mensaje: 'Datos del vehículo actualizados exitosamente' };
  }

  /**
   * Catálogo de tipos.
   */
  async listarTipos(): Promise<TipoVehiculo[]> {
    return await this.tipoVehiculoRepository.find({ order: { tipoVehiculo: 'ASC' } });
  }

  /**
   * Desvincula usuario y vehículo.
   * SECURITY: Borra lógicamente el vínculo (Soft Delete) para preservar historial.
   */
  async eliminarRegistro(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new NotFoundException('El vínculo no existe o ya fue eliminado');

    // SECURITY: Impedir eliminar si el vehículo está dentro
    const estaAdentro = await this.movimientoRepository.findOne({
      where: { 
        idRegistroVehiculo: registro.idRegistroV, 
        estado: In([EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]) 
      }
    });

    if (estaAdentro) {
      throw new BadRequestException('No puedes eliminar un vehículo que se encuentra dentro del parqueadero');
    }

    await this.registroRepository.softRemove(registro);

    const otrosRegistros = await this.registroRepository.count({ where: { idVehiculo: placaNormalizada } });

    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
      if (vehiculo) {
        // Mantenemos el vehículo en la DB pero lo marcamos como eliminado si no tiene más dueños
        // Las fotos se quedan en Cloudinary si queremos auditoría, o se borran si es borrado físico.
        // Por consistencia con Soft Delete del registro, usamos softRemove en vehículo también.
        await this.vehiculoRepository.softRemove(vehiculo);
      }
    }

    return { ok: true, mensaje: 'Vínculo eliminado exitosamente' };
  }
}
