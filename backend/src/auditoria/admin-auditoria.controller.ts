import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditoriaService } from './auditoria.service';
import { AdminAuditoriaOperacionesQueryDto } from './dto/admin-auditoria-operaciones.query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('operaciones')
  @ApiOperation({ summary: 'Consultar operaciones del personal operativo (RF37)' })
  @ApiResponse({ status: 200, description: 'Listado de operaciones' })
  async operaciones(@Query() query: AdminAuditoriaOperacionesQueryDto) {
    return await this.auditoriaService.findOperacionesOperativo(query);
  }
}

