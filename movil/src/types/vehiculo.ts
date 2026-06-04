export interface CreateVehiculoDto {
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  fotoPlaca: string;
  color: string;
  idTipoVehiculo: number;
}

export interface TipoVehiculo {
  idTipoV: number;
  tipoVehiculo: string;
}

export interface VehiculoUsuario {
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  fotoPlaca?: string;
  color: string;
  tipoVehiculo: string;
  idTipoVehiculo: number;
  idRegistroV: number;
}

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface SolicitudVehiculo {
  idSolicitud: number;
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  fotoPlaca: string | null;
  color: string;
  idTipoVehiculo: number;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  camposRechazados: string[] | null;
  creadoEn: string;
  resueltoEn: string | null;
  tipoVehiculo?: TipoVehiculo;
}

export interface CorregirSolicitudDto {
  placa?: string;
  color?: string;
  idTipoVehiculo?: number;
  fotoVehiculo?: string;
  fotoTarjetaP?: string;
  fotoPlaca?: string;
}

export type EstadoCompartido = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';

export interface VehiculoCompartido {
  idCompartir: number;
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  color: string;
  tipoVehiculo: string;
  propietario: string;
  compartidoDesde: string;
}

export interface InvitacionCompartido {
  idCompartir: number;
  placa: string;
  fotoVehiculo: string;
  color: string;
  tipoVehiculo: string;
  propietario: string;
  documentoPropietario: string;
  recibidaEn: string;
}

export interface InfoCompartido {
  compartido: boolean;
  estado?: EstadoCompartido;
  receptor?: {
    documento: string;
    nombre: string;
    compartidoDesde: string;
  };
}