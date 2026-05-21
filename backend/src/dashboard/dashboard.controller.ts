import { Controller, Get, Res, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Obtiene el historial detallado de movimientos con paginación.
   * MOBILE_API: Endpoint clave para la auditoría operativa desde el móvil.
   * PAGINATION: Parámetros opcionales 'page' y 'limit'.
   */
  @Get('historial')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getHistorial(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return await this.dashboardService.obtenerHistorial(page, limit);
  }

  @Get('resumen')
  @Roles(TipoUsuarioEnum.ADMIN)
  async getResumen() {
    return await this.dashboardService.obtenerResumen();
  }

  @Get('estadisticas')
  @Roles(TipoUsuarioEnum.ADMIN)
  async getEstadisticas() {
    return await this.dashboardService.obtenerEstadisticas();
  }

  @Get('trafico-horas')
  @Roles(TipoUsuarioEnum.ADMIN)
  async getTraficoHoras() {
    return await this.dashboardService.obtenerTraficoPorHoras();
  }

  @Get('ocupacion-tipo')
  @Roles(TipoUsuarioEnum.ADMIN)
  async getOcupacionTipo() {
    return await this.dashboardService.obtenerOcupacionPorTipo();
  }

  @Get('heatmap')
  @Roles(TipoUsuarioEnum.ADMIN)
  async getHeatmap() {
    return await this.dashboardService.obtenerMapaCalor();
  }

  @Get('exportar/excel')
  @Roles(TipoUsuarioEnum.ADMIN)
  async exportExcel(@Res() res: Response, @Request() req: any) {
    return await this.dashboardService.exportarExcel(res, { ...req.user, ip: req.ip });
  }

  @Get('exportar/pdf')
  @Roles(TipoUsuarioEnum.ADMIN)
  async exportPDF(@Res() res: Response, @Request() req: any) {
    return await this.dashboardService.exportarPDF(res, { ...req.user, ip: req.ip });
  }
}
