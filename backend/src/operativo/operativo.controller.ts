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

@Controller('operativo')
export class OperativoController {
  constructor(private readonly operativoService: OperativoService) {}

  @Post('login')
  login(@Body() dto: LoginOperativoDto) {
    return this.operativoService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('escanear-qr')
  escanearQr(@Body() dto: EscanearQrDto) {
    return this.operativoService.escanearQr(dto.qr);
  }

  @UseGuards(JwtAuthGuard)
  @Post('registrar-entrada')
  registrarEntrada(
    @Body() dto: RegistrarEntradaDto,
    @Request() req: any,
  ) {
    return this.operativoService.registrarEntrada(
      dto.placa,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('registrar-salida')
  registrarSalida(
    @Body() dto: RegistrarSalidaDto,
    @Request() req: any,
  ) {
    return this.operativoService.registrarSalida(
      dto.placa,
      req.user,
    );
  }
}