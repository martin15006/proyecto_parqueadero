/**
 * Estados estandarizados para Sensores IoT y Bahías de Parqueo.
 * Se utilizan para la lógica de negocio, telemetría y visualización en tiempo real.
 */
export enum IotStatusEnum {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  ONLINE = 'ONLINE',
  DISABLED = 'DISABLED',
}
