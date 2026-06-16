import api from '../api/axios';

export type EstadoVisita = 'ADENTRO' | 'SALIDA';

export interface Visita {
  idVisita: number;
  codigo: string;
  nombreVisitante: string;
  documentoVisitante: string;
  placa: string;
  tipoVehiculo: string | null;
  aQuienVisita: string;
  motivo: string | null;
  horaIngreso: string;
  horaSalida: string | null;
  expiraEn: string;
  estado: EstadoVisita;
  vencida: boolean;
}

export interface RegistrarVisitaPayload {
  nombreVisitante: string;
  documentoVisitante: string;
  placa: string;
  aQuienVisita?: string;
  tipoVehiculo?: string;
  motivo?: string;
  duracionMinutos?: number;
}

const unwrap = <T>(response: { data: { data?: T } & T }): T =>
  (response.data?.data ?? response.data) as T;

export const visitasService = {
  registrar: async (payload: RegistrarVisitaPayload): Promise<Visita> => {
    const response = await api.post('/visitas', payload);
    return unwrap<Visita>(response);
  },

  listarActivas: async (): Promise<Visita[]> => {
    const response = await api.get('/visitas/activas');
    return unwrap<Visita[]>(response) ?? [];
  },

  registrarSalida: async (idVisita: number): Promise<Visita> => {
    const response = await api.post(`/visitas/${idVisita}/salida`);
    return unwrap<Visita>(response);
  },
};
