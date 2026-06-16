import api from '../api/axios';

export const operativoService = {
  login: async (documento: string, contra: string) => {
    const response = await api.post('/operativo/login', { documento, password: contra });
    return response.data;
  },

  escanearCodigo: async (codigo: string) => {
    const response = await api.post('/operativo/escanear-codigo', { codigo });
    return response.data.data || response.data;
  },

  confirmarIngresoMultivehiculo: async (codigo: string, placa: string) => {
    const response = await api.post('/operativo/confirmar-ingreso-multivehiculo', { codigo, placa });
    return response.data.data || response.data;
  },

  registrarEntrada: async (placa: string, documentoIngreso?: string) => {
    const response = await api.post('/operativo/registrar-entrada', { placa, documentoIngreso });
    return response.data.data || response.data;
  },

  obtenerInfoPlaca: async (placa: string) => {
    const response = await api.get(`/operativo/info-placa/${encodeURIComponent(placa)}`);
    return response.data.data || response.data;
  },

  registrarSalida: async (placa: string) => {
    const response = await api.post('/operativo/registrar-salida', { placa });
    return response.data.data || response.data;
  },

  anularMovimiento: async (idMovimiento: number) => {
    const response = await api.post('/operativo/anular-movimiento', { idMovimiento });
    return response.data.data || response.data;
  },

  salidaEmergencia: async () => {
    const response = await api.post('/operativo/salida-emergencia');
    return response.data.data || response.data;
  },

  registrarIngresoManual: async (identificacion: string, motivo: string) => {
    const response = await api.post('/operativo/registrar-ingreso-manual', { identificacion, motivo });
    return response.data.data || response.data;
  },

  resumenTurno: async () => {
    const response = await api.get('/operativo/resumen-turno');
    return (response.data && response.data.data) ? response.data.data : response.data;
  },
};

export const dashboardService = {
  getResumen: async () => {
    const response = await api.get('/dashboard/resumen');
    return response.data.data;
  },
  getEstadisticas: async () => {
    const response = await api.get('/dashboard/estadisticas');
    return response.data.data;
  },
  getTraficoHoras: async () => {
    const response = await api.get('/dashboard/trafico-horas');
    return response.data.data;
  },
  getOcupacionTipo: async () => {
    const response = await api.get('/dashboard/ocupacion-tipo');
    return response.data.data;
  },
  getHeatmap: async () => {
    const response = await api.get('/dashboard/heatmap');
    return response.data.data;
  },
  getHistorial: async (page = 1, limit = 20, desde?: string, hasta?: string) => {
    const response = await api.get('/dashboard/historial', { params: { page, limit, desde, hasta } });
    const env = response.data || {};
    const filas = Array.isArray(env.data) ? env.data : (Array.isArray(env) ? env : []);
    const meta = env.meta || {};
    return {
      data: filas,
      total: meta.total ?? filas.length,
      page: meta.page ?? page,
      lastPage: meta.lastPage ?? 1,
    };
  }
};

export const authService = {
  loginPaso1: async (correo: string, contra: string) => {
    const response = await api.post('/auth/login', { correo, contra });
    return response.data;
  },

  verificarOtp: async (correo: string, codigo: string) => {
    const response = await api.post('/auth/verificar-otp', { correo, codigo });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  solicitarRecuperacion: async (correo: string) => {
    const response = await api.post('/auth/recuperar/solicitar', { correo });
    return response.data;
  }
};

export const bahiasService = {
  getOcupacion: async () => {
    const response = await api.get('/bahias/ocupacion');
    const payload = (response.data && response.data.data) ? response.data.data : response.data;
    return payload;
  },

  getSensorizadas: async () => {
    const response = await api.get('/bahias/sensorizadas');
    const payload = (response.data && response.data.data) ? response.data.data : response.data;
    return payload;
  },
};
