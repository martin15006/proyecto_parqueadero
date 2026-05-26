import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioService } from './usuario.service';
import { AdminListUsuariosQueryDto } from './dto/admin-list-usuarios.query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con filtros (Admin) incluyendo vehículos asociados' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios' })
  async listar(@Query() query: AdminListUsuariosQueryDto) {
    return await this.usuarioService.listarUsuariosAdmin(query);
  }
}

