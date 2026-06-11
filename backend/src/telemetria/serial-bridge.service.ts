import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

/**
 * Puente serial entre el Arduino y la capa de telemetría de NestJS.
 *
 * El sketch del Arduino envía una trama CSV por ciclo de lectura:
 * ```
 *   "<dist0>,<dist1>,<dist2>\r\n"
 *   Ejemplo: "8.5,25.0,60.0\r\n"
 * ```
 * Cada valor es la distancia en centímetros medida por un sensor ultrasónico.
 * El puente convierte cada valor en una llamada a
 * {@link TelemetriaService.procesarLectura}, que a su vez activa la máquina
 * de estados de `BahiasService` y emite el evento WebSocket a los clientes
 * conectados sin ninguna intervención adicional.
 *
 * @remarks
 * **Aislamiento total:** este servicio no modifica ni depende de entidades,
 * controladores ni lógica de negocio existente. Su única dependencia inyectada
 * es `TelemetriaService`.
 *
 * **Resiliencia para demo:** cualquier fallo del puerto serial (Arduino
 * desconectado, driver ausente, permiso denegado) se degrada a `console.warn`
 * y NestJS continúa arrancando con todas sus rutas HTTP y WebSocket activas.
 *
 * **Configuración en `.env`:** todos los parámetros (ruta, baudios, IDs de
 * sensor, umbral) son sobreescribibles sin tocar el código.
 *
 * **Cadena de ejecución activada por cada lectura:**
 * ```
 * SerialBridgeService.handleLine()
 *   └─ TelemetriaService.procesarLectura(dto)
 *        └─ BahiasService.procesarTelemetriaSensor(codigo, isOccupied)
 *             └─ EventosGateway → WS broadcast a clientes React / Expo
 * ```
 */
@Injectable()
export class SerialBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialBridgeService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serialPort: any = null;

  /** Ruta del dispositivo serial, resuelta según plataforma o variable de entorno. */
  private readonly portPath: string;

  /** Baudios — debe coincidir exactamente con `Serial.begin(N)` en el sketch. */
  private readonly baudRate: number;

  /**
   * Códigos de sensor mapeados a las posiciones del CSV [0..2].
   * Cada valor debe coincidir con la columna `codigo` de un registro
   * existente en la tabla `sensor` de la base de datos.
   *
   * Configurables en `.env`:
   * `SERIAL_SENSOR_ID_0` … `SERIAL_SENSOR_ID_2`
   */
  private readonly sensorIds: [string, string, string];

  /**
   * Límite inferior del rango OCCUPIED en centímetros (incluido).
   * Espejo de `d >= 3` en el sketch Arduino.
   *
   * Configurable en `.env`: `SERIAL_OCCUPIED_MIN_CM` (defecto: 3.0)
   */
  private readonly occupiedMinCm: number;

  /**
   * Límite superior del rango OCCUPIED en centímetros (excluido).
   * Espejo de `d < 12` en el sketch Arduino.
   * A partir de este valor comienza el rango FREE (exclusivo por debajo).
   *
   * Configurable en `.env`: `SERIAL_OCCUPIED_MAX_CM` (defecto: 12.0)
   */
  private readonly occupiedMaxCm: number;

  /**
   * Distancia máxima válida del HC-SR04 en centímetros (incluido).
   * Lecturas por encima se descartan como `ERROR` (fuera del alcance físico del sensor).
   *
   * Configurable en `.env`: `SERIAL_FREE_MAX_CM` (defecto: 60.0)
   */
  private readonly freeMaxCm: number;

  /** Permite deshabilitar el puente sin borrar código (útil en CI/CD). */
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
      // require() en lugar de import() dinámico: TypeScript no resuelve tipos
      // en tiempo de compilación, por lo que el archivo compila aunque el paquete
      // no esté instalado aún. El catch externo captura MODULE_NOT_FOUND en runtime.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SerialPort } = require('serialport') as { SerialPort: any };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ReadlineParser } = require('@serialport/parser-readline') as { ReadlineParser: any };

      this.serialPort = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      // El parser se adjunta ANTES de abrir el puerto para no perder ninguna trama.
      // Delimitador \r\n coincide exactamente con Serial.println() del Arduino.
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
      // No es crítico durante el shutdown; se ignora intencionalmente.
    }
  }

  /**
   * Parsea una trama CSV del Arduino y despacha una lectura por sensor
   * a {@link TelemetriaService.procesarLectura}.
   *
   * ### Formato de trama
   * ```
   * "<dist0>,<dist1>,<dist2>\r\n"   ← Serial.println() del sketch
   * Ejemplo: "8.5,45.2,22.1"
   * ```
   * Cada posición corresponde a un sensor por índice fijo:
   * - `[0]` → `SN-001`  `[1]` → `SN-002`  `[2]` → `SN-003`
   *
   * ### Clasificación de distancia (espejo exacto del sketch Arduino)
   * | Rango (cm)              | LED Arduino        | Estado backend      |
   * |-------------------------|--------------------|---------------------|
   * | `[occupiedMin, occupiedMax)` | Rojo encendido | `OCCUPIED`         |
   * | `(occupiedMax, freeMax]`     | Verde encendido| `AVAILABLE`        |
   * | Cualquier otro valor    | Ambos apagados     | `ERROR`             |
   *
   * > **Guarda contra desborde de firmware:** el sketch actual declara
   * > `NUM_SENSORS = 4` pero los arreglos `trigPins / echoPins / ledVerde / ledRojo`
   * > solo tienen 3 elementos. El `.slice(0, MAX_POSICIONES)` descarta cualquier
   * > índice ≥ 3 para evitar lecturas basura por acceso fuera de límites en C++.
   *
   * @param data - Línea recibida del parser, ya saneada con `.trim()`.
   */
  private async handleLine(data: string): Promise<void> {
    if (!data) return;

    /** Número máximo de sensores físicos válidos en el hardware actual. */
    const MAX_POSICIONES = 3 as const;

    try {
      // slice(0, 3) descarta el 4.º valor si el firmware lo emite por el bug NUM_SENSORS=4.
      const distancias = data.split(',').map(Number).slice(0, MAX_POSICIONES);

      for (let i = 0; i < this.sensorIds.length; i++) {
        const distanceCm = distancias[i];

        if (distanceCm === undefined || Number.isNaN(distanceCm)) {
          this.logger.warn(
            `[SerialBridge] Posición ${i} no numérica en trama "${data}" — omitida.`,
          );
          continue;
        }

        // Clasificación con los rangos exactos del sketch Arduino:
        //   d >= 3 && d < 12  →  LED rojo   →  OCCUPIED  (vehículo dentro del umbral)
        //   d > 12 && d <= 60 →  LED verde  →  AVAILABLE (bahía despejada)
        //   cualquier otro    →  ambos OFF  →  ERROR     (ruido, pulso inválido o HC-SR04 timeout)
        const status: IotStatusEnum =
          distanceCm >= this.occupiedMinCm && distanceCm < this.occupiedMaxCm
            ? IotStatusEnum.OCCUPIED
            : distanceCm > this.occupiedMaxCm && distanceCm <= this.freeMaxCm
              ? IotStatusEnum.AVAILABLE
              : IotStatusEnum.ERROR;

        this.logger.verbose(
          `[SerialBridge] [${i}] ${this.sensorIds[i]} | ${distanceCm.toFixed(1)} cm → ${status}`,
        );

        // Misma ruta de código que el endpoint HTTP POST /telemetria:
        // TelemetriaService.procesarLectura()
        //   └─ BahiasService.procesarTelemetriaSensor()
        //        └─ EventosGateway → WS broadcast
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
