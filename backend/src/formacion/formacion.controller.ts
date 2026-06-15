import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { FormacionService } from './formacion.service';
import { CreateFormacionDto } from './dto/create-formacion.dto';
import { UpdateFormacionDto } from './dto/update-formacion.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/formaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FormacionController {
  constructor(private readonly formacionService: FormacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar fichas por estado (Admin)' })
  @ApiResponse({ status: 200, description: 'Listado de fichas' })
  listar(@Query('estado') estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS') {
    return this.formacionService.listar(estado);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ficha (Admin)' })
  crear(@Body() dto: CreateFormacionDto, @CurrentUser() admin: Omit<Usuario, 'contra'>) {
    return this.formacionService.crear(dto, admin.documento);
  }

  @Patch(':ficha')
  @ApiOperation({ summary: 'Editar ficha (Admin)' })
  actualizar(
    @Param('ficha') ficha: string,
    @Body() dto: UpdateFormacionDto,
    @CurrentUser() admin: Omit<Usuario, 'contra'>,
  ) {
    return this.formacionService.actualizar(ficha, dto, admin.documento);
  }

  @Delete(':ficha')
  @ApiOperation({ summary: 'Desactivar ficha — soft delete (Admin)' })
  eliminar(@Param('ficha') ficha: string, @CurrentUser() admin: Omit<Usuario, 'contra'>) {
    return this.formacionService.eliminar(ficha, admin.documento);
  }

  @Post(':ficha/reactivar')
  @ApiOperation({ summary: 'Reactivar ficha desactivada (Admin)' })
  reactivar(@Param('ficha') ficha: string, @CurrentUser() admin: Omit<Usuario, 'contra'>) {
    return this.formacionService.reactivar(ficha, admin.documento);
  }
}
