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
    const documentoActor = req.user?.sub || 'SISTEMA';
    const actor = await this.usuarioService.findOneByDocumento(documentoActor);

    return await this.operativoService.salidaEmergenciaVehiculo(dto, {
      sub: documentoActor,
      nombre: actor?.nombreCompleto || null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
