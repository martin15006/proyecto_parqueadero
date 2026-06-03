import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioService } from './usuario.service';
import { AdminListUsuariosQueryDto } from './dto/admin-list-usuarios.query.dto';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con filtros (Admin)' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios' })
  async listar(@Query() query: AdminListUsuariosQueryDto) {
    return await this.usuarioService.listarUsuariosAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cualquier tipo de usuario (Admin)' })
  async crear(@Body() dto: CreateUsuarioAdminDto) {
    return await this.usuarioService.crearUsuarioPorAdmin(dto);
  }

  @Patch(':documento')
  @ApiOperation({ summary: 'Actualizar cualquier campo de un usuario (Admin)' })
  async actualizar(@Param('documento') documento: string, @Body() dto: any) {
    return await this.usuarioService.actualizarUsuarioPorAdmin(documento, dto);
  }

  @Delete(':documento')
  @ApiOperation({ summary: 'Eliminar un usuario (Admin)' })
  async eliminar(@Param('documento') documento: string) {
    return await this.usuarioService.eliminarUsuarioPorAdmin(documento);
  }
}
