/**
 * Estados estandarizados para Sensores IoT y Bahías de Parqueo.
 * Se utilizan para la lógica de negocio, telemetría y visualización en tiempo real.
 */
export enum IotStatusEnum {
  AVAILABLE = 'AVAILABLE', // Bahía libre, sensor operativo
  OCCUPIED = 'OCCUPIED',   // Bahía con vehículo detectado
  OFFLINE = 'OFFLINE',     // Sensor sin reporte (Heartbeat fallido)
  ERROR = 'ERROR',         // Sensor reporta falla técnica o hardware
  ONLINE = 'ONLINE',       // Sensor recién conectado o reestablecido
  DISABLED = 'DISABLED',   // Bahía o parqueadero deshabilitado manualmente
}
