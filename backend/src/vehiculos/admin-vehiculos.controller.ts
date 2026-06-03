import { Controller, Get, Query, UseGuards, Param, Body, Patch, Post, Delete, ParseIntPipe } from '@nestjs/common';
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

  /** Detalle COMPLETO de un vehículo incluyendo propietario */
  @Get('detalle/:placa')
  @ApiOperation({ summary: 'Detalle completo de vehículo + propietario (Admin)' })
  detalle(@Param('placa') placa: string) {
    return this.vehiculosService.detalleVehiculoAdmin(placa);
  }

  /** Crear vehículo y asignarlo a un usuario existente */
  @Post()
  @ApiOperation({ summary: 'Crear vehículo y asignarlo a un usuario (Admin)' })
  crear(@Body() dto: any) {
    return this.vehiculosService.crearVehiculoPorAdmin(dto);
  }

  /** Editar cualquier campo de un vehículo (sin cooldown) */
  @Patch(':placa')
  @ApiOperation({ summary: 'Editar vehículo (Admin)' })
  editar(@Param('placa') placa: string, @Body() dto: any) {
    return this.vehiculosService.actualizarVehiculoPorAdmin(placa, dto);
  }

  /** Eliminar un vehículo del sistema */
  @Delete(':placa')
  @ApiOperation({ summary: 'Eliminar vehículo (Admin)' })
  eliminar(@Param('placa') placa: string) {
    return this.vehiculosService.eliminarVehiculoPorAdmin(placa);
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

