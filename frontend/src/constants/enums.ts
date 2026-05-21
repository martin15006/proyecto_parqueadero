/**
 * Catálogo de Roles de Usuario (Sincronizado con Backend).
 */
export const UserRole = {
  APRENDIZ: 1,
  ADMIN: 2,
  OPERATIVO: 3
} as const;

/**
 * Catálogo de Tipos de Vehículo.
 */
export const VehicleType = {
  MOTO: 1,
  CARRO: 2,
  BICICLETA: 3,
  CAMIONETA: 4
} as const;

/**
 * Estados de Movimiento de Vehículo.
 */
export const MovementStatus = {
  ADENTRO: 'ADENTRO',
  SALIDA: 'SALIDA'
} as const;
