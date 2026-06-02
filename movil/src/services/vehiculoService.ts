import { apiRequest } from './api';
import {
  CreateVehiculoDto,
  TipoVehiculo,
  VehiculoUsuario,
  SolicitudVehiculo,
  VehiculoCompartido,
  InfoCompartido,
} from '../types/vehiculo';

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

  /**
   * Envía una solicitud de registro de vehículo al administrador.
   * El vehículo NO queda registrado hasta que el admin apruebe.
   */
  async solicitarRegistro(datos: CreateVehiculoDto): Promise<{ mensaje: string; idSolicitud: number }> {
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

  // ─── Solicitudes ────────────────────────────────────────────

  async listarMisSolicitudes(): Promise<SolicitudVehiculo[]> {
    return apiRequest<SolicitudVehiculo[]>('/vehiculos/solicitudes', {
      method: 'GET',
      conAuth: true,
    });
  },

  // ─── Compartir ──────────────────────────────────────────────

  async listarCompartidosConmigo(): Promise<VehiculoCompartido[]> {
    return apiRequest<VehiculoCompartido[]>('/vehiculos/compartidos-conmigo', {
      method: 'GET',
      conAuth: true,
    });
  },

  async obtenerInfoCompartido(placa: string): Promise<InfoCompartido> {
    return apiRequest<InfoCompartido>(`/vehiculos/${placa}/compartir`, {
      method: 'GET',
      conAuth: true,
    });
  },

  async compartirConUsuario(placa: string, documentoReceptor: string): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/${placa}/compartir`, {
      method: 'POST',
      body: JSON.stringify({ documentoReceptor }),
      conAuth: true,
    });
  },

  async quitarCompartido(placa: string): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/${placa}/compartir`, {
      method: 'DELETE',
      conAuth: true,
    });
  },
};
