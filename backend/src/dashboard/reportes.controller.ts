import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';
import { AdminReporteHistoricoQueryDto } from './dto/admin-reportes.query.dto';

/**
 * RF21–RF23: Controlador de reportes analíticos e históricos (ADMIN).
 *
 * Decisión de arquitectura:
 * - Se expone bajo /reportes (no /admin/reportes) para diferenciar:
 *   - Descargas legacy (excel/pdf) bajo /admin/reportes existentes.
 *   - Motor analítico + exportación ligera (CSV) bajo /reportes.
 */
@ApiTags('reportes')
@ApiBearerAuth() // SECURITY: requiere JWT para evitar exposición pública de históricos (RNF2).
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard) // SECURITY: autenticación + control de rol.
@Roles('ADMIN') // RF21–RF23: solo administrador puede acceder a históricos/exports masivos.
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('historico') // RF21: histórico paginado + métricas derivadas (tiempo promedio, pico ocupación).
  @ApiOperation({ summary: 'Histórico analítico de movimientos (RF21/RF22)' })
  async historico(@Query() query: AdminReporteHistoricoQueryDto) {
    return await this.reportesService.obtenerHistorico(query); // RF21: consulta optimizada y paginada.
  }

  @Get('exportar/csv') // RF23: exportación ligera sin librerías pesadas (stream CSV).
  @ApiOperation({ summary: 'Exportar histórico a CSV (RF23)' })
  @ApiResponse({ status: 200, description: 'Archivo CSV' })
  async exportarCsv(@Query() query: AdminReporteHistoricoQueryDto, @Res() res: Response) {
    const { filename } = await this.reportesService.prepararCsvHistorico(query); // RF23: filename institucional derivado del rango.

    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); // RF23: UTF-8 para caracteres latinoamericanos.
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); // RF23: descarga automática del navegador.

    res.write('\uFEFF'); // RF23: BOM UTF-8 para compatibilidad con Excel (acentos sin corrupción).

    await this.reportesService.streamCsvHistorico(query, res); // RF23: stream en chunks para consumo mínimo de RAM.

    res.end(); // RF23: finaliza respuesta de descarga.
  }
}

