import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VehiculosService } from './vehiculos.service';
import { AdminListVehiculosQueryDto } from './dto/admin-list-vehiculos.query.dto';

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
}

