import { Controller, Delete, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/auth.interface';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mias')
  @Roles(TipoUsuarioEnum.APRENDIZ)
  @ApiOperation({ summary: 'Obtener mis notificaciones (RF25)' })
  async obtenerMisNotificaciones(@CurrentUser() usuario: IJwtPayload) {
    return await this.notificacionesService.obtenerMisNotificaciones(usuario.sub);
  }

  @Delete(':id')
  @Roles(TipoUsuarioEnum.APRENDIZ)
  @ApiOperation({ summary: 'Eliminar una notificación' })
  async eliminarNotificacion(
    @CurrentUser() usuario: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.notificacionesService.eliminarNotificacion(usuario.sub, id);
  }

  @Delete()
  @Roles(TipoUsuarioEnum.APRENDIZ)
  @ApiOperation({ summary: 'Eliminar todas mis notificaciones' })
  async eliminarTodas(@CurrentUser() usuario: IJwtPayload) {
    return await this.notificacionesService.eliminarTodas(usuario.sub);
  }
}
