import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BahiasService } from './bahias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('bahias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BahiasController {
  constructor(private readonly bahiasService: BahiasService) {}

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

  @Get(':id')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findOne(@Param('id') id: string) {
    return await this.bahiasService.findOne(+id);
  }
}
