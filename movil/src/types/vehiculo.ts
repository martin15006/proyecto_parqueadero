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
  creadoEn: string;
  resueltoEn: string | null;
  tipoVehiculo?: TipoVehiculo;
}

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

export interface InfoCompartido {
  compartido: boolean;
  receptor?: {
    documento: string;
    nombre: string;
    compartidoDesde: string;
  };
}