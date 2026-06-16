import { Controller, Get, Res, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('historial')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getHistorial(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return await this.dashboardService.obtenerHistorial(page, limit, desde, hasta);
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
