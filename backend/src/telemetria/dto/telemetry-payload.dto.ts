import { IsString, IsEnum, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { IotStatusEnum } from '../../common/enums/iot-status.enum';

/**
 * DTO Estricto para la recepción de telemetría desde hardware.
 * IOT_CONTRACT: Especificación del JSON que debe enviar el ESP32/Raspberry.
 */
export class TelemetryPayloadDto {
  @IsString()
  @IsNotEmpty()
  sensorId: string; // IOT_CONTRACT: Identificador único del dispositivo (MAC o ID fijo)

  @IsEnum(IotStatusEnum)
  @IsNotEmpty()
  status: IotStatusEnum; // IOT_CONTRACT: [AVAILABLE, OCCUPIED, ERROR]

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  battery?: number; // IOT_CONTRACT: Porcentaje de batería (0-100)

  @IsNumber()
  @IsOptional()
  rssi?: number; // IOT_CONTRACT: Fuerza de señal WiFi/LoRa en dBm
}
