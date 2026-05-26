import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';
import { OperativoService } from './operativo.service';
import { SalidaEmergenciaVehiculoDto } from './dto/salida-emergencia-vehiculo.dto';
import { UsuarioService } from '../usuarios/usuario.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMovimientosController {
  constructor(
    private readonly operativoService: OperativoService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @Post('salida-emergencia')
  @ApiOperation({ summary: 'Salida manual de emergencia por vehículo (RF24)' })
  @ApiResponse({ status: 200, description: 'Salida registrada' })
  async salidaEmergenciaVehiculo(@Body() dto: SalidaEmergenciaVehiculoDto, @Req() req: AuthenticatedRequest) {
    const documentoActor = req.user?.sub || 'SISTEMA'; // RF25: actor para notificación (nombre del administrador).
    const actor = await this.usuarioService.findOneByDocumento(documentoActor); // RF25: se resuelve nombreCompleto para el historial.

    return await this.operativoService.salidaEmergenciaVehiculo(dto, {
      sub: documentoActor, // RF24/RF37: documento del admin para auditoría interna.
      nombre: actor?.nombreCompleto || null, // RF25: nombre del admin requerido en la notificación al usuario.
      ip: req.ip, // Auditoría técnica.
      userAgent: req.headers['user-agent'], // Auditoría técnica.
    });
  }
}
