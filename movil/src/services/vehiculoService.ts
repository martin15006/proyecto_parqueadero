import { apiRequest } from './api';
import { CreateVehiculoDto, TipoVehiculo, VehiculoUsuario } from '../types/vehiculo';

export interface ActualizarVehiculoDto {
  fotoVehiculo?: string;
  fotoTarjetaP?: string;
  fotoPlaca?: string;
  color?: string;
  idTipoVehiculo?: number;
}

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

  async obtenerDetalle(placa: string): Promise<VehiculoUsuario> {
    return apiRequest<VehiculoUsuario>(`/vehiculos/detalle/${placa}`, {
      method: 'GET',
      conAuth: true,
    });
  },

  async actualizar(placa: string, datos: ActualizarVehiculoDto): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/${placa}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
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