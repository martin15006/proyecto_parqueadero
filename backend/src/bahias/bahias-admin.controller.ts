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
    const documentoActor = req.user?.sub || 'SISTEMA';
    const actor = await this.usuarioService.findOneByDocumento(documentoActor);

    return await this.bahiasService.actualizarEstadoParqueadero(
      {
        deshabilitado: dto.deshabilitado,
        motivo: dto.motivo,
        duracionEstimada: dto.duracionEstimada,
      },
      {
        idUsuario: documentoActor,
        nombre: actor?.nombreCompleto || null,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
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
