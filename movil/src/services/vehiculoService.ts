import { apiRequest } from './api';
import {
  CreateVehiculoDto,
  TipoVehiculo,
  VehiculoUsuario,
} from '../types/vehiculo';

export const vehiculoService = {
  async listarTipos(): Promise<TipoVehiculo[]> {
    return apiRequest<TipoVehiculo[]>('/vehiculos/tipos', { method: 'GET' });
  },

  async registrar(datos: CreateVehiculoDto) {
    return apiRequest('/vehiculos', {
      method: 'POST',
      body: JSON.stringify(datos),
      conAuth: true,
    });
  },

  async listarMios(): Promise<VehiculoUsuario[]> {
    return apiRequest<VehiculoUsuario[]>('/vehiculos/mios', {
      method: 'GET',
      conAuth: true,
    });
  },

  async eliminar(placa: string) {
    return apiRequest(`/vehiculos/${placa}`, {
      method: 'DELETE',
      conAuth: true,
    });
  },
};