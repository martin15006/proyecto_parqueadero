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
  ) {}

  async registrarVehiculo(
    documento: string,
    dto: CreateVehiculoDto,
  ): Promise<{ mensaje: string; vehiculo: Vehiculo }> {
    const tipo = await this.tipoVehiculoRepository.findOne({
      where: { idTipoV: dto.idTipoVehiculo },
    });
    if (!tipo) {
      throw new BadRequestException('Tipo de vehículo no válido');
    }

    const placaNormalizada = dto.placa.toUpperCase().trim();

    let vehiculo = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
    });

    if (!vehiculo) {
      vehiculo = this.vehiculoRepository.create({
        ...dto,
        placa: placaNormalizada,
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    }

    const yaRegistrado = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });

    if (yaRegistrado) {
      throw new ConflictException('Ya tienes registrado este vehículo');
    }

    const nuevoRegistro = this.registroRepository.create({
      idUsuario: documento,
      idVehiculo: placaNormalizada,
    });
    await this.registroRepository.save(nuevoRegistro);

    return { mensaje: 'Vehículo registrado correctamente', vehiculo };
  }

  async listarMisVehiculos(documento: string) {
    const registros = await this.registroRepository
      .createQueryBuilder('registro')
      .innerJoin('vehiculo', 'v', 'v.placa = registro.idvehiculo')
      .innerJoin('tipo_vehiculo', 'tv', 'tv.idtipov = v.idtipovehiculo')
      .where('registro.idusuario = :documento', { documento })
      .select([
        'v.placa AS placa',
        'v.fotovehiculo AS "fotoVehiculo"',
        'v.fototarjetap AS "fotoTarjetaP"',
        'v.color AS color',
        'tv.tipovehiculo AS "tipoVehiculo"',
        'tv.idtipov AS "idTipoVehiculo"',
        'registro.idregistrov AS "idRegistroV"',
      ])
      .getRawMany();

    return registros;
  }

  /**
   * Obtiene el detalle de un vehículo si pertenece al usuario.
   */
  async obtenerDetalle(documento: string, placa: string) {
    const placaNormalizada = placa.toUpperCase();

    const tienePermiso = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!tienePermiso) {
      throw new ForbiddenException('Este vehículo no está registrado a tu nombre');
    }

    const detalle = await this.registroRepository
      .createQueryBuilder('registro')
      .innerJoin('vehiculo', 'v', 'v.placa = registro.idvehiculo')
      .innerJoin('tipo_vehiculo', 'tv', 'tv.idtipov = v.idtipovehiculo')
      .where('registro.idvehiculo = :placa', { placa: placaNormalizada })
      .andWhere('registro.idusuario = :documento', { documento })
      .select([
        'v.placa AS placa',
        'v.fotovehiculo AS "fotoVehiculo"',
        'v.fototarjetap AS "fotoTarjetaP"',
        'v.color AS color',
        'tv.tipovehiculo AS "tipoVehiculo"',
        'tv.idtipov AS "idTipoVehiculo"',
        'registro.idregistrov AS "idRegistroV"',
      ])
      .getRawOne();

    if (!detalle) throw new NotFoundException('Vehículo no encontrado');
    return detalle;
  }

  /**
   * Actualiza un vehículo. Solo el dueño puede hacerlo.
   * Si se cambian fotos, las viejas se borran de Cloudinary.
   */
  async actualizarVehiculo(
    documento: string,
    placa: string,
    dto: ActualizarVehiculoDto,
  ): Promise<{ mensaje: string }> {
    const placaNormalizada = placa.toUpperCase();

    const tienePermiso = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!tienePermiso) {
      throw new ForbiddenException('Este vehículo no está registrado a tu nombre');
    }

    const vehiculo = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    // Validar tipo nuevo si viene
    if (dto.idTipoVehiculo) {
      const tipo = await this.tipoVehiculoRepository.findOne({
        where: { idTipoV: dto.idTipoVehiculo },
      });
      if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');
    }

    const fotoVehiculoVieja = vehiculo.fotoVehiculo;
    const fotoTarjetaVieja = vehiculo.fotoTarjetaP;

    // Aplicar cambios
    if (dto.fotoVehiculo) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.fotoTarjetaP) vehiculo.fotoTarjetaP = dto.fotoTarjetaP;
    if (dto.color) vehiculo.color = dto.color;
    if (dto.idTipoVehiculo) vehiculo.idTipoVehiculo = dto.idTipoVehiculo;

    await this.vehiculoRepository.save(vehiculo);

    // Borrar fotos viejas de Cloudinary
    const fotosABorrar: string[] = [];
    if (dto.fotoVehiculo && fotoVehiculoVieja && fotoVehiculoVieja !== dto.fotoVehiculo) {
      fotosABorrar.push(fotoVehiculoVieja);
    }
    if (dto.fotoTarjetaP && fotoTarjetaVieja && fotoTarjetaVieja !== dto.fotoTarjetaP) {
      fotosABorrar.push(fotoTarjetaVieja);
    }
    if (fotosABorrar.length > 0) {
      await this.cloudinaryService.borrarVariasPorUrl(fotosABorrar);
    }

    return { mensaje: 'Vehículo actualizado correctamente' };
  }

  async listarTipos() {
    return this.tipoVehiculoRepository.find();
  }

  async eliminarRegistro(documento: string, placa: string) {
    const placaNormalizada = placa.toUpperCase();

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) {
      throw new NotFoundException('Registro no encontrado');
    }

    await this.registroRepository.remove(registro);

    const otrosRegistros = await this.registroRepository.count({
      where: { idVehiculo: placaNormalizada },
    });

    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({
        where: { placa: placaNormalizada },
      });

      if (vehiculo) {
        await this.cloudinaryService.borrarVariasPorUrl([
          vehiculo.fotoVehiculo,
          vehiculo.fotoTarjetaP,
        ]);

        await this.vehiculoRepository.remove(vehiculo);
      }
    }

    return { mensaje: 'Vehículo eliminado de tus registros' };
  }
}