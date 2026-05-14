// Tema visual de la app — Parqueadero SENA
// Soporta modo claro y oscuro con identidad SENA

export const lightColors = {
  // Verdes SENA
  verde: '#39A900',
  verdeOscuro: '#007832',
  verdeClaro: '#5fd924',
  verdeMuyClaro: '#edf7e6',
  verdeBrillante: '#43c200',

  // Acentos SENA
  azulMarino: '#00304D',
  violeta: '#71277A',
  amarillo: '#FDC300',

  // Base claro
  blanco: '#ffffff',
  negro: '#1a1a1a',
  fondo: '#f4f6f4',
  superficie: '#ffffff',
  superficieAlt: '#f8f8f8',

  // Grises
  gris: '#9b9b9b',
  grisClaro: '#e0e0e0',
  grisOscuro: '#505050',
  grisMuyClaro: '#f0f0f0',

  // Estados
  error: '#c0392b',
  exito: '#39A900',
  warning: '#FDC300',
  info: '#00304D',

  // Texto
  textoPrimario: '#1a1a1a',
  textoSecundario: '#505050',
  textoTenue: '#8a8a8a',
  textoSobreVerde: '#ffffff',

  // Bordes
  borde: '#e2e8e2',

  // Glass (en claro casi no se usa)
  glassFondo: 'rgba(255,255,255,0.6)',
  glassBorde: 'rgba(0,0,0,0.08)',

  // Sombras
  sombraColor: '#000000',
};

export const darkColors = {
  // Verdes SENA (un poco más brillantes para que resalten en oscuro)
  verde: '#5fd924',
  verdeOscuro: '#39A900',
  verdeClaro: '#7fff42',
  verdeMuyClaro: 'rgba(57, 169, 0, 0.15)',
  verdeBrillante: '#5fd924',

  // Acentos
  azulMarino: '#4a8fc2',
  violeta: '#a554b5',
  amarillo: '#FDC300',

  // Base oscuro inspirado en aurora SENA
  blanco: '#ffffff',
  negro: '#ffffff', // En oscuro, "negro" es blanco para texto
  fondo: '#001f12',
  superficie: 'rgba(255,255,255,0.04)',
  superficieAlt: 'rgba(255,255,255,0.07)',

  // Grises (invertidos)
  gris: 'rgba(255,255,255,0.45)',
  grisClaro: 'rgba(255,255,255,0.12)',
  grisOscuro: 'rgba(255,255,255,0.72)',
  grisMuyClaro: 'rgba(255,255,255,0.06)',

  // Estados
  error: '#ff6b6b',
  exito: '#5fd924',
  warning: '#FDC300',
  info: '#4a8fc2',

  // Texto
  textoPrimario: '#ffffff',
  textoSecundario: 'rgba(255,255,255,0.72)',
  textoTenue: 'rgba(255,255,255,0.50)',
  textoSobreVerde: '#ffffff',

  // Bordes
  borde: 'rgba(255,255,255,0.10)',

  // Glass (el alma del modo oscuro)
  glassFondo: 'rgba(255,255,255,0.05)',
  glassBorde: 'rgba(255,255,255,0.10)',

  // Sombras
  sombraColor: '#000000',
};

export type ColorScheme = typeof lightColors;

// Fuentes (igual en ambos modos)
export const fonts = {
  pequeno: 12,
  normal: 14,
  medio: 16,
  grande: 18,
  titulo: 24,
  enorme: 32,
};

// Espacios consistentes
export const espacios = {
  micro: 4,
  pequeno: 8,
  normal: 12,
  medio: 16,
  grande: 24,
  enorme: 32,
};

// Animaciones
export const animaciones = {
  rapida: 150,
  media: 300,
  lenta: 500,
};

// Gradientes (para fondos especiales en oscuro)
export const gradientes = {
  fondoOscuro: ['#003820', '#002918', '#001f12'] as [string, string, string],
  verdeAurora: ['rgba(57,169,0,0.22)', 'transparent'] as [string, string],
  cardOscura: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string],
  verdeButton: ['#43c200', '#007832'] as [string, string],
};

// EXPORT POR DEFECTO PARA COMPATIBILIDAD HACIA ATRÁS
// Esto evita romper código antiguo que importa 'colors'
export const colors = lightColors;