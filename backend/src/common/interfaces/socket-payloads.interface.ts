export interface IVehiculoEventoPayload {
  placa: string;
  fecha: Date;
  bahia?: string;
}

export interface IOcupacionPayload {
  total: number;
  ocupados: number;
  disponibles: number;
  parqueaderoDeshabilitado: boolean;
  estadoParqueadero: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO';
  bahias: Array<{
    idBahia: number;
    nombreBahia: string;
    estado:
      | 'AVAILABLE'
      | 'OCCUPIED'
      | 'TRANSITO'
      | 'DISCREPANCIA'
      | 'OFFLINE'
      | 'ERROR'
      | 'DISABLED';
    tipo: string;
  }>;
}

export interface ISensorOfflinePayload {
  sensorId: string;
  idBahia: number;
  fecha: Date;
}

export interface IAlertaPayload {
  tipo: string;
  mensaje: string;
  fecha: Date;
}

export interface ISensorDataPayload {
  codigo: string;
  valor: {
    ocupado: boolean;
    bateria?: number;
    rssi?: number;
  };
}

export interface IBahiaActualizadaPayload {
  idBahia: number;
  ocupada: boolean;
  sensor: string;
  estado?:
    | 'AVAILABLE'
    | 'OCCUPIED'
    | 'TRANSITO'
    | 'DISCREPANCIA'
    | 'OFFLINE'
    | 'ERROR'
    | 'DISABLED';
}

export interface IParqueaderoEstadoPayload {
  deshabilitado: boolean;
  motivo?: string;
  duracionEstimada?: string;
  deshabilitadoDesde?: Date;
  fecha: Date;
}

export interface IBahiaModificadaPayload {
  idBahia: string;
  nuevoEstado: 'LIBRE' | 'TRANSITO' | 'OCUPADO' | 'DISCREPANCIA' | 'OFFLINE' | 'DESHABILITADO';
  actualizadoEn: Date;
}

export interface IConteoGlobalDisponiblesPayload {
  total: number;
  ocupados: number;
  disponibles: number;
  estadoParqueadero: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO';
  actualizadoEn: Date;
}
