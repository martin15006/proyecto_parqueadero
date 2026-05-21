import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

/**
 * Controlador de Auditoría.
 * Expone endpoints para la consulta de logs de actividad del sistema.
 * Restringido exclusivamente para administradores.
 */
@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuarioEnum.ADMIN)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Obtiene el listado de logs de auditoría con soporte para paginación.
   */
  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.auditoriaService.findAll(page, limit);
  }
}
