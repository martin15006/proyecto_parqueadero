import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { OperativoService } from './operativo.service';

import { LoginOperativoDto } from './dto/login-operativo.dto';
import { EscanearQrDto } from './dto/escanear-qr.dto';
import { EscanearCodigoDto } from './dto/escanear-codigo.dto';
import { ConfirmarIngresoMultivehiculoDto } from './dto/confirmar-ingreso-multivehiculo.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';
import { ConfigService } from '@nestjs/config';

@Controller('operativo')
export class OperativoController {
  constructor(
    private readonly operativoService: OperativoService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginOperativoDto) {
    return this.operativoService.login(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('escanear-qr')
  escanearQr(
    @Body() dto: EscanearQrDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Inicia tránsito de ingreso SIN asignar bahía.
    // El SerialBridgeService vincula el vehículo a la bahía física al detectar presencia (<umbral cm).
    return this.operativoService.escanearQr(dto.qr, { ...req.user, ip: req.ip });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('escanear-codigo')
  escanearCodigo(
    @Body() dto: EscanearCodigoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.escanearCodigo(
      dto.codigo,
      { ...req.user, ip: req.ip },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('confirmar-ingreso-multivehiculo')
  confirmarIngresoMultivehiculo(
    @Body() dto: ConfirmarIngresoMultivehiculoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.confirmarIngresoMultivehiculo(
      dto,
      { ...req.user, ip: req.ip },
    );
  }

  /**
   * Información de una placa para registro manual: datos del vehículo + fotos +
   * lista de usuarios autorizados a ingresarlo (dueño + receptores con compartido ACEPTADO).
   * También indica si tiene un movimiento activo y quién lo ingresó.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Get('info-placa/:placa')
  infoPlaca(@Param('placa') placa: string) {
    return this.operativoService.obtenerInfoPlacaParaRegistroManual(placa);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('registrar-entrada')
  registrarEntrada(
    @Body() dto: RegistrarEntradaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.registrarEntrada(
      dto.placa,
      { ...req.user, ip: req.ip },
      dto.documentoIngreso,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('registrar-salida')
  registrarSalida(
    @Body() dto: RegistrarSalidaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.registrarSalida(
      dto.placa,
      { ...req.user, ip: req.ip },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('registrar-ingreso-manual')
  registrarIngresoManual(
    @Body() dto: RegistrarIngresoManualDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.registrarIngresoManual(
      dto,
      { ...req.user, ip: req.ip },
    );
  }

  @Post('camara-ingest')
  async camaraIngest(
    @Body() body: { placa?: string; camaraId?: string },
    @Req() req: any,
  ) {
    const apiKey = req?.headers?.['x-anpr-api-key'];
    const headerValue = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    const provided = typeof headerValue === 'string' ? headerValue.trim() : '';
    const expected = String(this.configService.get<string>('ANPR_API_KEY') ?? '').trim();
    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException('Acceso denegado: API Key de cámara inválida o ausente');
    }

    const placaRaw = String(body?.placa ?? '').trim();
    const camaraIdRaw = String(body?.camaraId ?? '').trim();
    if (!placaRaw || !camaraIdRaw) {
      throw new BadRequestException('placa y camaraId son obligatorios');
    }

    const placa = placaRaw.replace(/[- ]/g, '').toUpperCase();
    const actor = camaraIdRaw.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 10) || 'SISTEMA';

    return this.operativoService.registrarEntrada(
      placa,
      { sub: actor, correo: '', idTipoUsr: TipoUsuarioEnum.OPERATIVO, ip: req.ip },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('salida-emergencia')
  salidaEmergencia(@Request() req: AuthenticatedRequest) {
    return this.operativoService.salidaEmergencia({ ...req.user, ip: req.ip });
  }

  // Endpoint dedicado para OPERATIVO (no depende de /dashboard/resumen, que es admin-only).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.OPERATIVO)
  @Get('resumen-turno')
  resumenTurno(@Request() req: AuthenticatedRequest) {
    return this.operativoService.obtenerResumenTurno({ ...req.user, ip: req.ip });
  }
}
