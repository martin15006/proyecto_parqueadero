import { Controller, Delete, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/auth.interface';
import { NotificacionesService } from './notificaciones.service';

/**
 * RF25: Controlador de consulta para la bandeja de notificaciones del Aprendiz.
 */
@ApiTags('notificaciones')
@ApiBearerAuth() // RNF2: requiere JWT; evita exposición pública de historial.
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard) // RNF2: autenticación + autorización obligatorias.
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mias') // RF25: bandeja personal del usuario autenticado.
  @Roles(TipoUsuarioEnum.APRENDIZ) // RF25: endpoint orientado a Aprendiz (usuario final).
  @ApiOperation({ summary: 'Obtener mis notificaciones (RF25)' }) // RF25: trazabilidad explícita.
  async obtenerMisNotificaciones(@CurrentUser() usuario: IJwtPayload) {
    return await this.notificacionesService.obtenerMisNotificaciones(usuario.sub); // RNF2: usa sub del JWT (documento) sin loguearlo.
  }

  /** Elimina una notificación específica del usuario autenticado */
  @Delete(':id')
  @Roles(TipoUsuarioEnum.APRENDIZ)
  @ApiOperation({ summary: 'Eliminar una notificación' })
  async eliminarNotificacion(
    @CurrentUser() usuario: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.notificacionesService.eliminarNotificacion(usuario.sub, id);
  }

  /** Elimina TODAS las notificaciones del usuario autenticado */
  @Delete()
  @Roles(TipoUsuarioEnum.APRENDIZ)
  @ApiOperation({ summary: 'Eliminar todas mis notificaciones' })
  async eliminarTodas(@CurrentUser() usuario: IJwtPayload) {
    return await this.notificacionesService.eliminarTodas(usuario.sub);
  }
}

