export interface User {
  documento: string;
  nombreCompleto: string;
  correo: string;
  idTipoUsr: number;
  idFormacion?: string;
  fotoPersona?: string;
  numTelf?: string;
  contactoEmerg?: string;
  qr?: string;
  deletedAt?: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  usuario: User;
}

export interface Bahia {
  idBahia: number;
  nombreBahia: string;
  ocupada: boolean;
  fueraServicio?: boolean;
  placa?: string;
  horaIngreso?: string;
  tipoBahia?: {
    idTipoB: number;
    tipoBahia: string;
  };
}

export interface Movement {
  idMovimiento: number;
  placa: string;
  horaIngreso: string;
  horaSalida?: string;
  estado: string;
  bahia: string;
  usuario: string;
}

export interface DashboardStats {
  totalUsuarios: number;
  totalVehiculos: number;
  parqueaderoDeshabilitado?: boolean;
  estadoParqueadero?: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO';
  ocupacion: {
    total: number;
    ocupados: number;
    disponibles: number;
    porcentajeOcupacion?: number;
  };
  ingresosHoy: number;
  ingresosMes: number;
  alertasActivas: number;
}

export type BahiaEstado =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'TRANSITO'
  | 'DISCREPANCIA'
  | 'OFFLINE'
  | 'ERROR'
  | 'DISABLED';

export type EstadoPanel =
  | 'LIBRE'
  | 'OCUPADO'
  | 'SALIDA_PENDIENTE'   // Vehículo salió físicamente; confirmación de portería pendiente.
  | 'DISCREPANCIA'
  | 'OFFLINE'
  | 'DESHABILITADO';

export interface BahiaSensorizada {
  idBahia: number;
  nombreBahia: string;
  tipoBahia: string;
  estadoPanel: EstadoPanel;
  estadoSensor: string;
  placa: string | null;
  estadoMovimiento: string | null;
  ultimaTelemetriaAt: string | null;
}

export interface OcupacionPayload {
  total: number;
  ocupados: number;
  disponibles: number;
  parqueaderoDeshabilitado: boolean;
  estadoParqueadero: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO';
  bahias: Array<{
    idBahia: number;
    nombreBahia: string;
    estado: BahiaEstado;
    tipo: string;
  }>;
}

export interface TipoBahia {
  idTipoB: number;
  tipoBahia: string;
}

export interface BahiaAdmin {
  idBahia: number;
  nombreBahia: string;
  idTipoBahia: number;
  estadoManual: string | null;
  estadoReconciliado: string;
  ultimaTelemetriaAt: string | null;
  tipoBahia?: TipoBahia;
}

export interface SensorAdmin {
  idSensor: number;
  codigo: string;
  idBahia: number;
  activo: boolean;
  estadoActual: string;
  bateria?: number | null;
  ultimaLectura?: string | null;
}

export type BahiaModificadaPayload = {
  idBahia: string;
  nuevoEstado: 'LIBRE' | 'TRANSITO' | 'OCUPADO' | 'DISCREPANCIA' | 'OFFLINE' | 'DESHABILITADO';
  actualizadoEn: string;
};

export type ConteoGlobalDisponiblesPayload = {
  total: number;
  ocupados: number;
  disponibles: number;
  estadoParqueadero: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO';
  actualizadoEn: string;
};

export type BackendEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
  timestamp: string;
  meta?: unknown;
};

export interface TipoVehiculo {
  idTipoV: number;
  tipoVehiculo: string;
}

export interface Vehiculo {
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  color: string;
  idTipoVehiculo: number;
  tipoVehiculo?: TipoVehiculo | string;
  isAdentro?: boolean;
}

export interface AdminUsuarioItem extends User {
  rol: 'APRENDIZ' | 'ADMIN' | 'OPERATIVO' | 'PERSONAL_SENA';
  vehiculos: Vehiculo[];
  activo?: boolean;
}

export interface AdminVehiculoItem extends Vehiculo {
  isAdentro: boolean;
  usuario?: User | null;
}

export type EstadoSolicitudVehiculo = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface SolicitudVehiculoAdmin {
  idSolicitud: number;
  documento: string;
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  fotoPlaca: string | null;
  color: string;
  idTipoVehiculo: number;
  estado: EstadoSolicitudVehiculo;
  motivoRechazo: string | null;
  camposRechazados: string[] | null;
  creadoEn: string;
  resueltoEn: string | null;
  usuario?: {
    documento: string;
    nombreCompleto: string;
    correo: string;
    numTelf?: string;
  };
  tipoVehiculo?: {
    idTipoV: number;
    tipoVehiculo: string;
  };
}

export interface CreateVehiculoDto {
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  color: string;
  idTipoVehiculo: number;
}

export interface CreateUsuarioDto {
  documento: string;
  fotoPersona: string;
  nombreCompleto: string;
  numTelf: string;
  contactoEmerg: string;
  correo: string;
  contra: string;
  idFormacion?: string;
}

export interface CreateOperativoAdminDto {
  documento: string;
  nombreCompleto: string;
  correo: string;
  numTelf: string;
  contra: string;
}

export interface UpdateOperativoAdminDto {
  nombreCompleto?: string;
  correo?: string;
  numTelf?: string;
  contactoEmerg?: string;
}
