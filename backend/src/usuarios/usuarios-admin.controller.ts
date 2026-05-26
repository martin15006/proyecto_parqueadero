import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOperativoDto } from './dto/create-operativo.dto';
import { ResetPasswordOperativoDto } from './dto/reset-password-operativo.dto';
import { UpdateOperativoDto } from './dto/update-operativo.dto';
import { UpdateOperativoEstadoDto } from './dto/update-operativo-estado.dto';
import { UsuarioService } from './usuario.service';

/**
 * Controlador para acciones administrativas sobre usuarios (gestión de personal).
 *
 * Seguridad:
 * - Requiere JWT válido
 * - Requiere rol ADMIN
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/usuarios/operativo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsuariosAdminController {
  constructor(private readonly usuarioService: UsuarioService) {}

  /**
   * Crea una cuenta de usuario para personal Operativo.
   *
   * Reglas:
   * - El rol se fuerza server-side a OPERATIVO (no se acepta desde el body)
   * - Campos adicionales son rechazados por el ValidationPipe global
   *
   * @param dto Datos mínimos para crear el operativo.
   * @returns Usuario creado (sin contraseña).
   */
  @Post()
  @ApiOperation({ summary: 'Crear usuario Operativo (Solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Operativo creado exitosamente' })
  async createOperativo(@Body() dto: CreateOperativoDto) {
    return await this.usuarioService.crearOperativoByAdmin(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar personal Operativo (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Listado de operativos' })
  async listOperativos() {
    return await this.usuarioService.listarOperativosAdmin();
  }

  @Put(':documento')
  @ApiOperation({ summary: 'Editar datos de un Operativo (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Operativo actualizado' })
  async updateOperativo(@Param('documento') documento: string, @Body() dto: UpdateOperativoDto) {
    return await this.usuarioService.actualizarOperativoAdmin(documento, dto);
  }

  @Patch(':documento/estado')
  @ApiOperation({ summary: 'Activar/Desactivar cuenta de Operativo (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async updateEstadoOperativo(
    @Param('documento') documento: string,
    @Body() dto: UpdateOperativoEstadoDto,
  ) {
    return await this.usuarioService.actualizarEstadoOperativoAdmin(documento, dto.activo);
  }

  @Patch(':documento/reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña de Operativo (Solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida' })
  async resetPasswordOperativo(
    @Param('documento') documento: string,
    @Body() dto: ResetPasswordOperativoDto,
  ) {
    return await this.usuarioService.restablecerContrasenaOperativoAdmin(documento, dto.contra);
  }
}
