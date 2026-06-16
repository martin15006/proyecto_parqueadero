import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BahiasService } from './bahias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('bahias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BahiasController {
  constructor(private readonly bahiasService: BahiasService) {}

  @Get('estado-aprendiz')
  @Roles(TipoUsuarioEnum.APRENDIZ)
  async obtenerEstadoParaAprendiz() {
    const ocupacion = await this.bahiasService.obtenerOcupacion();

    return {
      indicadorGlobal: ocupacion.estadoParqueadero,
      espaciosDisponibles: ocupacion.disponibles,
      espaciosOcupados: ocupacion.ocupados,
      totalEspacios: ocupacion.total,
      parqueaderoDeshabilitado: ocupacion.parqueaderoDeshabilitado,
      bahias: ocupacion.bahias,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findAll() {
    return await this.bahiasService.findAll();
  }

  @Get('ocupacion')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getOcupacion() {
    return await this.bahiasService.obtenerOcupacion();
  }

  @Get('sensorizadas')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getSensorizadas() {
    return await this.bahiasService.obtenerBahiasSensorizadas();
  }

  @Get('tipos')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getTipos() {
    return await this.bahiasService.obtenerTiposBahia();
  }

  @Get(':id')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findOne(@Param('id') id: string) {
    return await this.bahiasService.findOne(+id);
  }
}
