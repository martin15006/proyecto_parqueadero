export interface IVehiculoEventoPayload {
  placa: string;
  fecha: Date;
  bahia?: string;
}

export interface IOcupacionPayload {
  total: number;
  ocupados: number;
  disponibles: number;
  bahias: Array<{
    idBahia: number;
    nombreBahia: string;
    estado: 'AVAILABLE' | 'OCCUPIED' | 'OFFLINE' | 'ERROR';
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
}
