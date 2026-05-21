import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto';
import { IotAuthGuard } from '../common/guards/iot-auth.guard';

@Controller('telemetria')
export class TelemetriaController {
  constructor(private readonly telemetriaService: TelemetriaService) {}

  @Get('sensores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async getSensores() {
    return await this.telemetriaService.findAllSensores();
  }

  /**
   * Endpoint Principal para Recepción de Telemetría.
   * IOT_CONTRACT: El hardware debe enviar un POST con 'x-iot-api-key' en el header.
   * Ejemplo de payload: {"sensorId": "SN-001", "status": "OCCUPIED", "battery": 85, "rssi": -65}
   */
  @Post('lectura')
  @UseGuards(IotAuthGuard) // SECURITY: Validación de API Key dedicada para hardware
  async recibirLectura(@Body() dto: TelemetryPayloadDto) {
    return await this.telemetriaService.procesarLectura(dto);
  }

  @Post('test-offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  async forzarChequeoOffline() {
    return await this.telemetriaService.monitorizarSensores();
  }
}
