import { Body, Controller, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BahiasService } from './bahias.service';
import { UpdateParqueaderoEstadoDto } from './dto/update-parqueadero-estado.dto';
import { ForzarEstadoBahiaDto } from './dto/forzar-estado-bahia.dto';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';
import { UsuarioService } from '../usuarios/usuario.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BahiasAdminController {
  constructor(
    private readonly bahiasService: BahiasService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @Patch('parqueadero/estado')
  @ApiOperation({ summary: 'Cambiar estado general del parqueadero (deshabilitado/habilitado)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async actualizarEstadoParqueadero(@Body() dto: UpdateParqueaderoEstadoDto, @Req() req: AuthenticatedRequest) {
    const documentoActor = req.user?.sub || 'SISTEMA'; // RF25: actor para auditoría y notificación (se usa para resolver nombre).
    const actor = await this.usuarioService.findOneByDocumento(documentoActor); // RF25: obtenemos nombre del administrador que ejecuta el cambio.

    return await this.bahiasService.actualizarEstadoParqueadero(
      {
        deshabilitado: dto.deshabilitado, // RF14: estado solicitado.
        motivo: dto.motivo, // RF14: motivo obligatorio si deshabilita.
        duracionEstimada: dto.duracionEstimada, // RF14: duración estimada opcional.
      },
      {
        idUsuario: documentoActor, // RF37: se registra en auditoría.
        nombre: actor?.nombreCompleto || null, // RF25: nombre del administrador para historial visible al usuario.
        ip: req.ip, // Auditoría técnica.
        userAgent: req.headers['user-agent'], // Auditoría técnica.
      },
    );
  }

  @Patch('bahia/:id/forzar-estado')
  @ApiOperation({ summary: 'Forzar estado manual de una bahía (fallback)' })
  @ApiResponse({ status: 200, description: 'Bahía actualizada' })
  async forzarEstadoBahia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForzarEstadoBahiaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.bahiasService.forzarEstadoBahia(id, dto.estado, {
      idUsuario: req.user?.sub || 'SISTEMA',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
