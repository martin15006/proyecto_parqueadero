import React from 'react';
import type { BahiaSensorizada, EstadoPanel } from '../types';

// ── Paleta de color por estado ──────────────────────────────────────────────

const ESTADO_STYLES: Record<
  EstadoPanel,
  { wrapper: string; text: string; badge?: string; label: string }
> = {
  LIBRE: {
    wrapper: 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    text: 'text-green-500',
    label: 'Libre',
  },
  OCUPADO: {
    wrapper: 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    text: 'text-red-500',
    badge: 'bg-red-500',
    label: 'Ocupado',
  },
  SALIDA_PENDIENTE: {
    wrapper: 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    text: 'text-amber-400',
    badge: 'bg-amber-500',
    label: 'Salida pendiente',
  },
  DISCREPANCIA: {
    // Rojo de alerta: el sensor detecta presencia física sin QR autorizado previamente.
    // El operario debe verificar la bahía de inmediato.
    wrapper: 'bg-red-500/10 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    text: 'text-red-500',
    badge: 'bg-red-600',
    label: 'Ocupado',
  },
  OFFLINE: {
    wrapper: 'bg-gray-900 border-gray-800 opacity-50 grayscale',
    text: 'text-gray-400',
    label: 'Offline',
  },
  DESHABILITADO: {
    wrapper: 'bg-gray-900 border-gray-800 opacity-50 grayscale',
    text: 'text-gray-400',
    label: 'Deshabilitado',
  },
};

// ── BahiaCard ────────────────────────────────────────────────────────────────

interface BahiaCardProps {
  bahia: BahiaSensorizada;
}

/**
 * Tarjeta individual de bahía sensorizada.
 *
 * Muestra el estado físico en tiempo real derivado de `estadoPanel`:
 * - **LIBRE** — verde, sin placa.
 * - **OCUPADO** — rojo, muestra placa con animación.
 * - **SALIDA_PENDIENTE** — ámbar, vehículo salió físicamente pero el operario
 *   aún no confirmó en portería. Muestra placa y badge parpadeante.
 * - **DISCREPANCIA** — sensor detecta presencia física; se muestra igual que OCUPADO.
 * - **OFFLINE / DESHABILITADO** — gris con overlay.
 */
export const BahiaCard: React.FC<BahiaCardProps> = ({ bahia }) => {
  const styles = ESTADO_STYLES[bahia.estadoPanel] ?? ESTADO_STYLES.LIBRE;
  const isInactive = bahia.estadoPanel === 'OFFLINE' || bahia.estadoPanel === 'DESHABILITADO';

  return (
    <div
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-500
        flex flex-col items-center justify-center h-28 w-full
        ${styles.wrapper}
      `}
    >
      <span className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">
        {bahia.tipoBahia}
      </span>

      <span className={`text-2xl font-black ${styles.text}`}>
        {bahia.nombreBahia}
      </span>

      {/* Placa del vehículo activo */}
      {bahia.placa && !isInactive && (
        <div
          className={`
            mt-2 px-2 py-0.5 text-white text-[9px] font-black rounded uppercase tracking-tighter
            ${styles.badge ?? 'bg-gray-600'}
            ${bahia.estadoPanel === 'SALIDA_PENDIENTE' ? 'animate-pulse' : ''}
          `}
        >
          {bahia.placa}
        </div>
      )}

      {/* Badge de estado para SALIDA_PENDIENTE */}
      {bahia.estadoPanel === 'SALIDA_PENDIENTE' && (
        <span className="mt-1 text-[8px] font-bold text-amber-400 uppercase tracking-tight">
          Confirmar salida
        </span>
      )}

    

      {/* Overlay para estados inactivos */}
      {isInactive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">
            {styles.label}
          </span>
        </div>
      )}
    </div>
  );
};

// ── MapaBahias ───────────────────────────────────────────────────────────────

interface MapaBahiasProps {
  /** Lista proveniente de `GET /api/bahias/sensorizadas` (solo bahías con sensor activo). */
  bahias: BahiaSensorizada[];
  /** Número de vehículos con QR escaneado que aún no llegaron a ninguna bahía. */
  enTransitoIngreso?: number;
}

/**
 * Grid dinámico de bahías sensorizadas.
 *
 * Renderiza **solo** las bahías recibidas (máx. las que tengan sensor activo,
 * normalmente 3 para `SN-001`, `SN-002`, `SN-003`) sin hardcodear ningún número.
 *
 * Si `enTransitoIngreso > 0` muestra un banner informativo indicando cuántos
 * vehículos fueron autorizados en portería y están en camino hacia una bahía.
 */
export const MapaBahias: React.FC<MapaBahiasProps> = ({ bahias, enTransitoIngreso = 0 }) => {
  return (
    <div className="space-y-3">
      {/* Banner de vehículos en tránsito de ingreso */}
      {enTransitoIngreso > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wide">
            {enTransitoIngreso} vehículo{enTransitoIngreso > 1 ? 's' : ''} en tránsito de ingreso — esperando asignación de sensor
          </span>
        </div>
      )}

      {/* Grid de bahías */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        {bahias.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-600 uppercase text-xs font-black tracking-widest">
            Sin sensores activos configurados
          </div>
        ) : (
          bahias.map((bahia) => <BahiaCard key={bahia.idBahia} bahia={bahia} />)
        )}
      </div>
    </div>
  );
};
