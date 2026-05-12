import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
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
        'registro.idregistrov AS "idRegistroV"',
      ])
      .getRawMany();

    return registros;
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

    // Verificar si el vehículo todavía está registrado a OTROS usuarios
    const otrosRegistros = await this.registroRepository.count({
      where: { idVehiculo: placaNormalizada },
    });

    // Si nadie más tiene este vehículo, borrarlo junto con sus fotos
    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({
        where: { placa: placaNormalizada },
      });

      if (vehiculo) {
        // Borrar fotos de Cloudinary
        await this.cloudinaryService.borrarVariasPorUrl([
          vehiculo.fotoVehiculo,
          vehiculo.fotoTarjetaP,
        ]);

        // Borrar el vehículo de la BD
        await this.vehiculoRepository.remove(vehiculo);
      }
    }

    return { mensaje: 'Vehículo eliminado de tus registros' };
  }
}