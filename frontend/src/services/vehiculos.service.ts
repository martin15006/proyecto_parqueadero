import api from '../api/axios';
import type {
  AdminVehiculoItem,
  BackendEnvelope,
  CreateVehiculoDto,
  TipoVehiculo,
  Vehiculo,
  SolicitudVehiculoAdmin,
  EstadoSolicitudVehiculo,
} from '../types';

export const vehiculosService = {
  listarTipos: async (): Promise<BackendEnvelope<TipoVehiculo[]>> => {
    const response = await api.get('/vehiculos/tipos');
    return response.data;
  },

  findAll: async (page = 1, limit = 10): Promise<BackendEnvelope<Vehiculo[]>> => {
    const response = await api.get(`/vehiculos?page=${page}&limit=${limit}`);
    return response.data;
  },

  listarMios: async (): Promise<BackendEnvelope<Vehiculo[]>> => {
    const response = await api.get('/vehiculos/mios');
    return response.data;
  },

  createVehicleEntry: async (datos: CreateVehiculoDto): Promise<BackendEnvelope<Vehiculo>> => {
    const response = await api.post('/vehiculos', datos);
    return response.data;
  },
  registrar: async (datos: CreateVehiculoDto): Promise<BackendEnvelope<Vehiculo>> => {
    return vehiculosService.createVehicleEntry(datos);
  },

  obtenerDetalle: async (placa: string): Promise<BackendEnvelope<Vehiculo>> => {
    const response = await api.get(`/vehiculos/detalle/${placa}`);
    return response.data;
  },

  actualizar: async (placa: string, datos: Partial<CreateVehiculoDto>): Promise<BackendEnvelope<Vehiculo>> => {
    const response = await api.patch(`/vehiculos/${placa}`, datos);
    return response.data;
  },

  eliminar: async (placa: string): Promise<BackendEnvelope<{ message?: string }>> => {
    const response = await api.delete(`/vehiculos/${placa}`);
    return response.data;
  },

  listarVehiculosAdmin: async (params?: { q?: string; placa?: string; marca?: string }): Promise<BackendEnvelope<AdminVehiculoItem[]>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.placa) query.set('placa', params.placa);
    if (params?.marca) query.set('marca', params.marca);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/admin/vehiculos${suffix}`);
    return response.data;
  },

  detalleVehiculoAdmin: async (placa: string): Promise<BackendEnvelope<any>> => {
    const response = await api.get(`/admin/vehiculos/detalle/${placa}`);
    return response.data;
  },

  crearVehiculoAdmin: async (datos: {
    documentoPropietario: string;
    placa: string;
    fotoVehiculo: string;
    fotoTarjetaP: string;
    fotoPlaca?: string;
    color: string;
    idTipoVehiculo: number;
  }): Promise<BackendEnvelope<{ mensaje: string; placa: string }>> => {
    const response = await api.post('/admin/vehiculos', datos);
    return response.data;
  },

  editarVehiculoAdmin: async (placa: string, datos: any): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.patch(`/admin/vehiculos/${placa}`, datos);
    return response.data;
  },

  eliminarVehiculoAdmin: async (placa: string): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.delete(`/admin/vehiculos/${placa}`);
    return response.data;
  },

  salidaEmergenciaAdmin: async (payload: { placa?: string; idRegistroVehiculo?: number; motivo: string }): Promise<BackendEnvelope<any>> => {
    const response = await api.post('/admin/movimientos/salida-emergencia', payload);
    return response.data;
  },

  listarSolicitudes: async (
    estado?: EstadoSolicitudVehiculo,
  ): Promise<BackendEnvelope<SolicitudVehiculoAdmin[]>> => {
    const suffix = estado ? `?estado=${estado}` : '';
    const response = await api.get(`/admin/vehiculos/solicitudes${suffix}`);
    return response.data;
  },

  /**
   * Aprueba o rechaza una solicitud de registro.
   * Si estado = 'RECHAZADO', motivoRechazo es obligatorio.
   */
  resolverSolicitud: async (
    idSolicitud: number,
    estado: 'APROBADO' | 'RECHAZADO',
    motivoRechazo?: string,
    camposRechazados?: string[],
  ): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.patch(`/admin/vehiculos/solicitudes/${idSolicitud}`, {
      estado,
      motivoRechazo,
      camposRechazados,
    });
    return response.data;
  },
};
