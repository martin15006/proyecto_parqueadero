import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

@Injectable()
export class SerialBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialBridgeService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serialPort: any = null;

  private readonly portPath: string;

  private readonly baudRate: number;

  private readonly sensorIds: [string, string, string];

  private readonly occupiedMinCm: number;

  private readonly occupiedMaxCm: number;

  private readonly freeMaxCm: number;

  private readonly enabled: boolean;

  constructor(private readonly telemetriaService: TelemetriaService) {
    this.enabled =
      (process.env.SERIAL_ENABLED ?? 'true').toLowerCase() !== 'false';

    this.portPath =
      process.env.SERIAL_PORT_PATH ??
      (process.platform === 'win32' ? 'COM3' : '/dev/ttyACM0');

    this.baudRate = Number(process.env.SERIAL_BAUD_RATE ?? 9600);

    this.sensorIds = [
      process.env.SERIAL_SENSOR_ID_0 ?? 'SN-001',
      process.env.SERIAL_SENSOR_ID_1 ?? 'SN-002',
      process.env.SERIAL_SENSOR_ID_2 ?? 'SN-003',
    ];

    this.occupiedMinCm = Number(process.env.SERIAL_OCCUPIED_MIN_CM ?? 3.0);
    this.occupiedMaxCm = Number(process.env.SERIAL_OCCUPIED_MAX_CM ?? 12.0);
    this.freeMaxCm     = Number(process.env.SERIAL_FREE_MAX_CM     ?? 60.0);
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log(
        '[SerialBridge] Deshabilitado por SERIAL_ENABLED=false — NestJS continúa normalmente.',
      );
      return;
    }
    await this.openPort();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closePort();
  }

  private async openPort(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SerialPort } = require('serialport') as { SerialPort: any };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ReadlineParser } = require('@serialport/parser-readline') as { ReadlineParser: any };

      this.serialPort = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      const parser = this.serialPort.pipe(
        new ReadlineParser({ delimiter: '\r\n' }),
      );

      parser.on('data', (data: string) => void this.handleLine(data.trim()));
      this.serialPort.open((openErr: Error | null) => {
        if (openErr) {
          console.warn(
            `[SerialBridge] Arduino no detectado en ${this.portPath}: ${openErr.message}` +
              ` — NestJS continúa normalmente.`,
          );
          return;
        }
        this.logger.log(
          `[SerialBridge] ✓ Puerto ${this.portPath} abierto a ${this.baudRate} baudios.\n` +
            `  Sensores → [0]=${this.sensorIds[0]}  [1]=${this.sensorIds[1]}  [2]=${this.sensorIds[2]}\n` +
            `  Rangos HC-SR04: OCCUPIED [${this.occupiedMinCm}, ${this.occupiedMaxCm}) cm | FREE (${this.occupiedMaxCm}, ${this.freeMaxCm}] cm`,
        );
      });

      this.serialPort.on('error', (err: Error) => {
        console.warn(
          `[SerialBridge] Error de puerto serial: ${err.message} — NestJS continúa.`,
        );
      });

      this.serialPort.on('close', () => {
        console.warn(
          '[SerialBridge] Conexión con Arduino cerrada — NestJS continúa normalmente.',
        );
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[SerialBridge] No se pudo inicializar serialport: ${msg} — NestJS continúa normalmente.`,
      );
    }
  }

  private async closePort(): Promise<void> {
    if (!this.serialPort?.isOpen) return;
    try {
      await new Promise<void>((resolve) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.serialPort.close(() => resolve()),
      );
      this.logger.log('[SerialBridge] Puerto serial cerrado limpiamente.');
    } catch {
    }
  }

  private async handleLine(data: string): Promise<void> {
    if (!data) return;

    const MAX_POSICIONES = 3 as const;

    try {
      const distancias = data.split(',').map(Number).slice(0, MAX_POSICIONES);

      for (let i = 0; i < this.sensorIds.length; i++) {
        const distanceCm = distancias[i];

        if (distanceCm === undefined || Number.isNaN(distanceCm)) {
          this.logger.warn(
            `[SerialBridge] Posición ${i} no numérica en trama "${data}" — omitida.`,
          );
          continue;
        }

        const status: IotStatusEnum =
          distanceCm >= this.occupiedMinCm && distanceCm < this.occupiedMaxCm
            ? IotStatusEnum.OCCUPIED
            : distanceCm > this.occupiedMaxCm && distanceCm <= this.freeMaxCm
              ? IotStatusEnum.AVAILABLE
              : IotStatusEnum.ERROR;

        this.logger.verbose(
          `[SerialBridge] [${i}] ${this.sensorIds[i]} | ${distanceCm.toFixed(1)} cm → ${status}`,
        );

        await this.telemetriaService.procesarLectura({
          sensorId: this.sensorIds[i],
          status,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SerialBridge] Error procesando trama "${data}": ${msg}`);
    }
  }
}
