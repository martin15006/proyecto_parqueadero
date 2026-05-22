import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
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
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra un vehículo y lo vincula al usuario.
   * OPTIMIZATION: Si el vehículo existe, solo crea el vínculo.
   */
  async registrarVehiculo(documento: string, dto: CreateVehiculoDto): Promise<{ mensaje: string; vehiculo: Vehiculo }> {
    const tipo = await this.tipoVehiculoRepository.findOne({ where: { idTipoV: dto.idTipoVehiculo } });
    if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');

    const placaNormalizada = dto.placa.toUpperCase().trim();
    let vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });

    if (!vehiculo) {
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

    const yaRegistrado = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });

    if (yaRegistrado) throw new ConflictException('Este vehículo ya se encuentra vinculado a tu cuenta');

    const nuevoRegistro = this.registroRepository.create({ idUsuario: documento, idVehiculo: placaNormalizada });
    const registroGuardado = await this.registroRepository.save(nuevoRegistro);

    await this.auditoriaService.create({
      accion: 'VINCULAR_VEHICULO',
      entidad: 'REGISTRO_VEHICULO',
      idEntidad: registroGuardado.idRegistroV,
      idUsuario: documento,
      datosNuevos: { idUsuario: documento, idVehiculo: vehiculo.placa },
    });

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
   * Detalle de vehículo.
   */
  async obtenerDetalle(documento: string, placa: string) {
    const placaNormalizada = placa.toUpperCase();

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    if (!registro) throw new NotFoundException('Vehículo no encontrado en tus registros');

    return {
      placa: registro.vehiculo.placa,
      fotoVehiculo: registro.vehiculo.fotoVehiculo,
      fotoTarjetaP: registro.vehiculo.fotoTarjetaP,
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
    const placaNormalizada = placa.toUpperCase();

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes permisos para modificar este vehículo');

    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const fotoVehiculoVieja = vehiculo.fotoVehiculo;
    const fotoTarjetaVieja = vehiculo.fotoTarjetaP;

    if (dto.fotoVehiculo) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.fotoTarjetaP) vehiculo.fotoTarjetaP = dto.fotoTarjetaP;
    if (dto.color) vehiculo.color = dto.color;
    if (dto.idTipoVehiculo) vehiculo.idTipoVehiculo = dto.idTipoVehiculo;

    await this.vehiculoRepository.save(vehiculo);

    // SECURITY: Limpieza de fotos obsoletas en Cloudinary
    const fotosABorrar: string[] = [];
    if (dto.fotoVehiculo && fotoVehiculoVieja && fotoVehiculoVieja !== dto.fotoVehiculo) fotosABorrar.push(fotoVehiculoVieja);
    if (dto.fotoTarjetaP && fotoTarjetaVieja && fotoTarjetaVieja !== dto.fotoTarjetaP) fotosABorrar.push(fotoTarjetaVieja);
    
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
   * SECURITY: Borra físicamente el vehículo y sus fotos si queda huérfano.
   */
  async eliminarRegistro(documento: string, placa: string) {
    const placaNormalizada = placa.toUpperCase();

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new NotFoundException('El vínculo no existe o ya fue eliminado');

    await this.registroRepository.remove(registro);

    const otrosRegistros = await this.registroRepository.count({ where: { idVehiculo: placaNormalizada } });

    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
      if (vehiculo) {
        await this.cloudinaryService.borrarVariasPorUrl([vehiculo.fotoVehiculo, vehiculo.fotoTarjetaP]);
        await this.vehiculoRepository.remove(vehiculo);
      }
    }

    return { ok: true, mensaje: 'Vínculo eliminado exitosamente' };
  }
}
