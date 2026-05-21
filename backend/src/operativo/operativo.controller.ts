import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';

import { OperativoService } from './operativo.service';

import { LoginOperativoDto } from './dto/login-operativo.dto';
import { EscanearQrDto } from './dto/escanear-qr.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';

@Controller('operativo')
export class OperativoController {
  constructor(private readonly operativoService: OperativoService) {}

  @Post('login')
  login(@Body() dto: LoginOperativoDto) {
    return this.operativoService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('escanear-qr')
  escanearQr(@Body() dto: EscanearQrDto) {
    return this.operativoService.escanearQr(dto.qr);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('registrar-entrada')
  registrarEntrada(
    @Body() dto: RegistrarEntradaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.operativoService.registrarEntrada(
      dto.placa,
      { ...req.user, ip: req.ip },
    );
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @Post('salida-emergencia')
  salidaEmergencia(@Request() req: AuthenticatedRequest) {
    return this.operativoService.salidaEmergencia({ ...req.user, ip: req.ip });
  }
}