import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { VisitantesService } from './visitantes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/auth.interface';

@Controller('visitantes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitantesController {
  constructor(private readonly visitantesService: VisitantesService) {}

  @Get()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findAll() {
    return await this.visitantesService.findAll();
  }

  /**
   * Registro de Visitantes.
   * SECURITY: Extrae el documento del operador desde el JWT para auditoría.
   */
  @Post()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async create(
    @Body() data: any, 
    @CurrentUser() user: IJwtPayload
  ) {
    // SECURITY: Se vincula el registro al operario que lo realiza (usando sub/documento del JWT)
    return await this.visitantesService.create({ 
      ...data, 
      idOperativo: user.sub 
    });
  }

  @Patch(':id/salida')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async registrarSalida(@Param('id') id: number) {
    return await this.visitantesService.registrarSalida(id);
  }
}
