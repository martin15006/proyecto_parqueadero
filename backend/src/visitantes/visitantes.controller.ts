import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { VisitantesService } from './visitantes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('visitantes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitantesController {
  constructor(private readonly visitantesService: VisitantesService) {}

  @Get()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findAll() {
    return await this.visitantesService.findAll();
  }

  @Post()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async create(@Body() data: any, @Param('idOperativo') idOperativo: number) {
    // En una implementación real, idOperativo vendría del token
    return await this.visitantesService.create({ ...data, idOperativo });
  }

  @Patch(':id/salida')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async registrarSalida(@Param('id') id: number) {
    return await this.visitantesService.registrarSalida(id);
  }
}
