export interface CreateVehiculoDto {
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
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
  color: string;
  tipoVehiculo: string;
  idTipoVehiculo: number;
  idRegistroV: number;
}