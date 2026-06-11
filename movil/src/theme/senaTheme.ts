// Tema visual de la app — Parqueadero SENA
// Soporta modo claro y oscuro con identidad SENA

export const lightColors = {
  verde: '#39A900',
  verdeOscuro: '#007832',
  verdeClaro: '#5fd924',
  verdeMuyClaro: '#edf7e6',
  verdeBrillante: '#43c200',

  azulMarino: '#00304D',
  violeta: '#71277A',
  amarillo: '#FDC300',

  blanco: '#ffffff',
  negro: '#1a1a1a',
  fondo: '#f4f6f4',
  superficie: '#ffffff',
  superficieAlt: '#f8f8f8',

  gris: '#9b9b9b',
  grisClaro: '#e0e0e0',
  grisOscuro: '#505050',
  grisMuyClaro: '#f0f0f0',

  error: '#c0392b',
  exito: '#39A900',
  warning: '#FDC300',
  info: '#00304D',

  textoPrimario: '#1a1a1a',
  textoSecundario: '#505050',
  textoTenue: '#8a8a8a',
  textoSobreVerde: '#ffffff',

  borde: '#e2e8e2',

  glassFondo: 'rgba(255,255,255,0.6)',
  glassBorde: 'rgba(0,0,0,0.08)',

  sombraColor: '#000000',
};

export const darkColors = {
  verde: '#5fd924',
  verdeOscuro: '#39A900',
  verdeClaro: '#7fff42',
  verdeMuyClaro: 'rgba(57, 169, 0, 0.15)',
  verdeBrillante: '#5fd924',

  azulMarino: '#4a8fc2',
  violeta: '#a554b5',
  amarillo: '#FDC300',

  blanco: '#ffffff',
  negro: '#ffffff', // En oscuro, "negro" es blanco para texto
  fondo: '#001f12',
  superficie: 'rgba(255,255,255,0.04)',
  superficieAlt: 'rgba(255,255,255,0.07)',

  gris: 'rgba(255,255,255,0.45)',
  grisClaro: 'rgba(255,255,255,0.12)',
  grisOscuro: 'rgba(255,255,255,0.72)',
  grisMuyClaro: 'rgba(255,255,255,0.06)',

  error: '#ff6b6b',
  exito: '#5fd924',
  warning: '#FDC300',
  info: '#4a8fc2',

  textoPrimario: '#ffffff',
  textoSecundario: 'rgba(255,255,255,0.72)',
  textoTenue: 'rgba(255,255,255,0.50)',
  textoSobreVerde: '#ffffff',

  borde: 'rgba(255,255,255,0.10)',

  glassFondo: 'rgba(255,255,255,0.05)',
  glassBorde: 'rgba(255,255,255,0.10)',

  sombraColor: '#000000',
};

export type ColorScheme = typeof lightColors;

export const fonts = {
  pequeno: 12,
  normal: 14,
  medio: 16,
  grande: 18,
  titulo: 24,
  enorme: 32,
};

export const espacios = {
  micro: 4,
  pequeno: 8,
  normal: 12,
  medio: 16,
  grande: 24,
  enorme: 32,
};

export const animaciones = {
  rapida: 150,
  media: 300,
  lenta: 500,
};

export const gradientes = {
  fondoOscuro: ['#003820', '#002918', '#001f12'] as [string, string, string],
  verdeAurora: ['rgba(57,169,0,0.22)', 'transparent'] as [string, string],
  cardOscura: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string],
  verdeButton: ['#43c200', '#007832'] as [string, string],
};

// Mantiene compatibilidad con código antiguo que importa 'colors'
export const colors = lightColors;
