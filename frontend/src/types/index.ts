export interface User {
  documento: string;
  nombreCompleto: string;
  correo: string;
  idTipoUsr: number;
  idFormacion?: string;
  fotoPersona?: string;
  numTelf?: string;
  contactoEmerg?: string;
  qr?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  usuario: User;
}

export interface Bahia {
  idBahia: number;
  nombreBahia: string;
  ocupada: boolean;
  fueraServicio?: boolean;
  placa?: string;
  horaIngreso?: string;
  tipoBahia?: {
    idTipoB: number;
    tipoBahia: string;
  };
}

export interface Movement {
  idMovimiento: number;
  placa: string;
  horaIngreso: string;
  horaSalida?: string;
  estado: string;
  bahia: string;
  usuario: string;
}

export interface DashboardStats {
  totalUsuarios: number;
  totalVehiculos: number;
  ocupacion: {
    total: number;
    ocupados: number;
    disponibles: number;
  };
  ingresosHoy: number;
  ingresosMes: number;
  alertasActivas: number;
}
