import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';
import { AdminReporteExcelQueryDto, AdminReporteFlujoQueryDto, AdminReportePdfQueryDto } from './dto/admin-reportes.query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('excel')
  @ApiOperation({ summary: 'Generar reporte Excel (movimientos/usuarios/vehiculos) por rango de fechas' })
  @ApiResponse({ status: 200, description: 'Archivo Excel' })
  async exportExcel(@Query() query: AdminReporteExcelQueryDto, @Res() res: Response) {
    const { buffer, filename } = await this.reportesService.generarExcel(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Generar reporte PDF de bitácora de ocupación por rango de fechas' })
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  async exportPdf(@Query() query: AdminReportePdfQueryDto, @Res() res: Response) {
    const { buffer, filename } = await this.reportesService.generarPdfOcupacion(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('flujo')
  @ApiOperation({ summary: 'Estadística de flujo (ingresos/salidas) agrupado por día/semana/mes' })
  async flujo(@Query() query: AdminReporteFlujoQueryDto) {
    return await this.reportesService.obtenerFlujo(query);
  }
}

