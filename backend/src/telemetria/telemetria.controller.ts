import { Controller, Post, Body, UseGuards, Get, Patch, Delete, Param, ParseIntPipe, ForbiddenException, Req, BadRequestException } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto';
import { CrearSensorDto } from './dto/crear-sensor.dto';
import { ActualizarSensorDto } from './dto/actualizar-sensor.dto';
import { IotAuthGuard } from '../common/guards/iot-auth.guard';
import { BahiasService } from '../bahias/bahias.service';
import type { AuthenticatedRequest } from '../common/interfaces/auth.interface';

@Controller('telemetria')
export class TelemetriaController {
  constructor(
    private readonly telemetriaService: TelemetriaService,
    private readonly bahiasService: BahiasService,
  ) {}

  private assertSimuladorHabilitado() {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      throw new ForbiddenException('Simulador no disponible en producción');
    }
  }

  @Get('sensores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async getSensores() {
    return await this.telemetriaService.findAllSensores();
  }

  @Post('sensores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async crearSensor(@Body() dto: CrearSensorDto) {
    return await this.telemetriaService.crearSensor(dto);
  }

  @Patch('sensores/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async actualizarSensor(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarSensorDto) {
    return await this.telemetriaService.actualizarSensor(id, dto);
  }

  @Delete('sensores/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async eliminarSensor(@Param('id', ParseIntPipe) id: number) {
    return await this.telemetriaService.eliminarSensor(id);
  }

  @Post('lectura')
  @UseGuards(IotAuthGuard)
  async recibirLectura(@Body() dto: TelemetryPayloadDto) {
    return await this.telemetriaService.procesarLectura(dto);
  }

  @Post('test-offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async forzarChequeoOffline() {
    return await this.telemetriaService.monitorizarSensores();
  }

  @Post('simulador/qr-ingreso')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async simularIngresoQr(
    @Body() body: { idBahia?: number; placa?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertSimuladorHabilitado();

    const idBahia = Number.isFinite(body?.idBahia) ? Number(body.idBahia) : 5;
    if (!Number.isInteger(idBahia) || idBahia < 1) {
      throw new BadRequestException('Parámetros inválidos para la simulación');
    }

    const placa = String(body?.placa || 'SIM-QR').trim().toUpperCase();

    await this.bahiasService.forzarEstadoBahia(
      idBahia,
      'OCCUPIED',
      {
        idUsuario: req.user?.sub || 'SISTEMA',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    await this.telemetriaService.simularAlertaSistema(
      'SIMULACION_QR',
      `Ingreso simulado (QR escaneado): Vehículo ${placa} asignado a Bahía ${idBahia}`,
    );

    return { ok: true, mensaje: 'Ingreso simulado ejecutado', placa, idBahia };
  }

  @Post('simulador/alerta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async simularAlerta(@Body() body: { tipo?: string; mensaje?: string }) {
    this.assertSimuladorHabilitado();

    const tipo = String(body?.tipo || 'SIMULACION').trim().toUpperCase();
    const mensaje = String(body?.mensaje || '').trim();
    if (!mensaje) {
      throw new BadRequestException('El mensaje de alerta es obligatorio');
    }

    await this.telemetriaService.simularAlertaSistema(tipo, mensaje);
    return { ok: true, mensaje: 'Alerta simulada emitida', tipo };
  }
}
