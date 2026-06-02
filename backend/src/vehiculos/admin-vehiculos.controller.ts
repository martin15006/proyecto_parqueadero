import { Controller, Get, Query, UseGuards, Param, Body, Patch, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VehiculosService } from './vehiculos.service';
import { AdminListVehiculosQueryDto } from './dto/admin-list-vehiculos.query.dto';
import { ResolverSolicitudDto } from './dto/resolver-solicitud.dto';
import { EstadoSolicitud } from './entities/solicitud-vehiculo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/vehiculos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminVehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vehículos con filtros e indicador de estado ADENTRO (Admin)' })
  @ApiResponse({ status: 200, description: 'Listado de vehículos' })
  async listar(@Query() query: AdminListVehiculosQueryDto) {
    return await this.vehiculosService.listarVehiculosAdmin(query);
  }

  // ─── SOLICITUDES ─────────────────────────────────────────────────────────────

  /**
   * Lista todas las solicitudes de registro de vehículo.
   * Query param opcional: ?estado=PENDIENTE | APROBADO | RECHAZADO
   */
  @Get('solicitudes')
  @ApiOperation({ summary: 'Listar solicitudes de registro de vehículos (Admin)' })
  listarSolicitudes(@Query('estado') estado?: EstadoSolicitud) {
    return this.vehiculosService.listarSolicitudes(estado);
  }

  /**
   * Aprueba o rechaza una solicitud de registro.
   * Body: { estado: 'APROBADO' | 'RECHAZADO', motivoRechazo?: string }
   */
  @Patch('solicitudes/:id')
  @ApiOperation({ summary: 'Aprobar o rechazar solicitud de vehículo (Admin)' })
  resolverSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() admin: Omit<Usuario, 'contra'>,
  ) {
    return this.vehiculosService.resolverSolicitud(id, dto, admin.documento);
  }
}

