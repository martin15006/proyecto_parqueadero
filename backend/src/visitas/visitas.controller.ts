import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { VisitasService } from './visitas.service';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';

@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar el ingreso temporal de un visitante (ADMIN/OPERATIVO)' })
  @ApiResponse({ status: 201, description: 'Visita registrada' })
  registrar(
    @Body() dto: RegistrarVisitaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.visitasService.registrarVisita(dto, { ...req.user, ip: req.ip });
  }

  @Get('activas')
  @ApiOperation({ summary: 'Listar las visitas activas (ADMIN/OPERATIVO)' })
  @ApiResponse({ status: 200, description: 'Listado de visitas activas' })
  listarActivas() {
    return this.visitasService.listarActivas();
  }

  @Post(':id/salida')
  @ApiOperation({ summary: 'Registrar la salida de un visitante (ADMIN/OPERATIVO)' })
  @ApiResponse({ status: 200, description: 'Salida de visita registrada' })
  registrarSalida(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.visitasService.registrarSalida(id, { ...req.user, ip: req.ip });
  }
}
