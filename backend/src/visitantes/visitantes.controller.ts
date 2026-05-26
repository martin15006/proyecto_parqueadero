import { Controller, Get, Post, Body, Param, Patch, UseGuards, ParseIntPipe } from '@nestjs/common';
import { VisitantesService } from './visitantes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/auth.interface';
import { CreateVisitanteDto } from './dto/create-visitante.dto';

@Controller('visitantes')
@UseGuards(JwtAuthGuard, RolesGuard)
/**
 * Controlador HTTP para la gestión de visitantes.
 */
export class VisitantesController {
  constructor(private readonly visitantesService: VisitantesService) {}

  /**
   * Lista los visitantes registrados.
   * @returns Lista ordenada por fecha de creación.
   */
  @Get()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findAll() {
    return await this.visitantesService.findAll();
  }

  /**
   * Registra un visitante y lo vincula al operario autenticado.
   * @param dto Datos del visitante.
   * @param user Usuario autenticado (JWT).
   * @returns Visitante creado.
   */
  @Post()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async create(
    @Body() dto: CreateVisitanteDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return await this.visitantesService.create(dto, user.sub);
  }

  /**
   * Registra la salida (fechaSalida) de un visitante.
   * @param id Identificador del visitante.
   * @returns Visitante actualizado.
   */
  @Patch(':id/salida')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async registrarSalida(@Param('id', ParseIntPipe) id: number) {
    return await this.visitantesService.registrarSalida(id);
  }
}
