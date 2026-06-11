import { apiRequest } from './api';
import {
  CreateVehiculoDto,
  TipoVehiculo,
  VehiculoUsuario,
  SolicitudVehiculo,
  CorregirSolicitudDto,
  VehiculoCompartido,
  InvitacionCompartido,
  InfoCompartido,
} from '../types/vehiculo';

export interface ActualizarVehiculoDto {
  fotoVehiculo?: string;
  color?: string;
}

export interface EstadoEdicionVehiculo {
  puedeEditar: boolean;
  ultimaEdicionAt: string | null;
  proximaEdicionDisponible: string | null;
  diasRestantes: number;
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

  async actualizar(placa: string, datos: ActualizarVehiculoDto): Promise<{ mensaje: string; proximaEdicionDisponible: string }> {
    return apiRequest<{ mensaje: string; proximaEdicionDisponible: string }>(`/vehiculos/${placa}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
      conAuth: true,
    });
  },

  async puedeEditar(placa: string): Promise<EstadoEdicionVehiculo> {
    return apiRequest<EstadoEdicionVehiculo>(`/vehiculos/${placa}/puede-editar`, {
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

  async listarMisSolicitudes(): Promise<SolicitudVehiculo[]> {
    return apiRequest<SolicitudVehiculo[]>('/vehiculos/solicitudes', {
      method: 'GET',
      conAuth: true,
    });
  },

  /**
   * Corrige una solicitud rechazada (solo los campos marcados por el admin) y la reenvía.
   */
  async corregirSolicitud(
    idSolicitud: number,
    datos: CorregirSolicitudDto,
  ): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/solicitudes/${idSolicitud}/corregir`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
      conAuth: true,
    });
  },

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

  /** Invitaciones de compartido pendientes de aceptación/rechazo */
  async listarInvitacionesPendientes(): Promise<InvitacionCompartido[]> {
    return apiRequest<InvitacionCompartido[]>('/vehiculos/compartidos-pendientes', {
      method: 'GET',
      conAuth: true,
    });
  },

  async aceptarInvitacion(idCompartir: number): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/compartidos/${idCompartir}/aceptar`, {
      method: 'POST',
      conAuth: true,
    });
  },

  async rechazarInvitacion(idCompartir: number): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/compartidos/${idCompartir}/rechazar`, {
      method: 'POST',
      conAuth: true,
    });
  },

  /**
   * El receptor renuncia/elimina un vehículo compartido que ya había aceptado.
   * El propietario recibe una notificación.
   */
  async eliminarVehiculoCompartido(idCompartir: number): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/vehiculos/compartidos/${idCompartir}`, {
      method: 'DELETE',
      conAuth: true,
    });
  },
};
