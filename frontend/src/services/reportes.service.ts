import api from '../api/axios';
import type { BackendEnvelope } from '../types';

export type FlujoGroupBy = 'dia' | 'semana' | 'mes';

export type FlujoItem = {
  fecha: string;
  ingresos: number;
  salidas: number;
};

export type HistoricoItem = {
  idMovimiento: number;
  placa: string;
  tipoVehiculo: string;
  idUsuario: string;
  propietario: string;
  horaIngreso: string;
  horaSalida: string | null;
  bahiaAsignada: string;
  operadorResponsable: string;
  estanciaMinutos: number | null;
};

export type HistoricoMeta = {
  pagination: { total: number; page: number; lastPage: number; limit: number };
  stats: {
    totalIngresos: number;
    promedioEstanciaMinutos: number | null;
    picoMaximoOcupacion: number;
  };
};

export const reportesService = {
  flujo: async (params: { groupBy: FlujoGroupBy; desde?: string; hasta?: string }): Promise<BackendEnvelope<FlujoItem[]>> => {
    const query = new URLSearchParams();
    query.set('groupBy', params.groupBy);
    if (params.desde) query.set('desde', params.desde);
    if (params.hasta) query.set('hasta', params.hasta);
    const response = await api.get(`/admin/reportes/flujo?${query.toString()}`);
    return response.data;
  },

  historico: async (params: {
    desde?: string;
    hasta?: string;
    tipoVehiculo?: string;
    idUsuario?: string;
    page?: number;
    limit?: number;
  }): Promise<BackendEnvelope<HistoricoItem[]> & { meta?: HistoricoMeta }> => {
    const query = new URLSearchParams();
    if (params.desde) query.set('desde', params.desde);
    if (params.hasta) query.set('hasta', params.hasta);
    if (params.tipoVehiculo) query.set('tipoVehiculo', params.tipoVehiculo);
    if (params.idUsuario) query.set('idUsuario', params.idUsuario);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const response = await api.get(`/reportes/historico?${query.toString()}`);
    return response.data;
  },
};
