import React, { useMemo } from 'react';
import { useOperativo } from '../../hooks/useOperativo';
import { Car, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import type { BahiaSensorizada } from '../../types';

/**
 * Estado de bahías sensorizadas en tiempo real.
 * RF15: la fuente de verdad es `estadoPanel` calculado por el backend
 * (LIBRE / OCUPADO / SALIDA_PENDIENTE / DISCREPANCIA / OFFLINE / DESHABILITADO).
 */
export const EstadoBahiasView: React.FC = () => {
  const { bahias, loading } = useOperativo();

  const stats = useMemo(() => {
    const esOffline = (b: BahiaSensorizada) => b.estadoPanel === 'OFFLINE' || b.estadoPanel === 'DESHABILITADO';
    const esOcupada = (b: BahiaSensorizada) =>
      b.estadoPanel === 'OCUPADO' || b.estadoPanel === 'SALIDA_PENDIENTE' || b.estadoPanel === 'DISCREPANCIA';
    return {
      libres: bahias.filter(b => b.estadoPanel === 'LIBRE').length,
      ocupadas: bahias.filter(b => esOcupada(b)).length,
      offline: bahias.filter(b => esOffline(b)).length,
      total: bahias.length
    };
  }, [bahias]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#39B000]/20 border-t-[#39B000] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Resumen de Bahías Superior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Libres" value={stats.libres} icon={<CheckCircle2 size={16} />} color="text-[#39B000]" bg="bg-green-50 dark:bg-[#39B000]/10" />
        <StatCard label="Ocupadas" value={stats.ocupadas} icon={<Car size={16} />} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" />
      </div>

      {/* Grid de Bahías Sensorizadas */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-6 lg:p-8 transition-colors duration-300">
        {bahias.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">Cargando infraestructura...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {bahias.map((b) => <BahiaCell key={b.idBahia} bahia={b} />)}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#39B000] animate-pulse" />
            Sincronización en vivo
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <LegendDot color="bg-[#39B000]" label="Libre" />
            <LegendDot color="bg-red-500" label="Ocupada" />
            <LegendDot color="bg-gray-300 dark:bg-gray-600" label="Offline" />
          </div>
          <p>Total de plazas: {stats.total}</p>
        </div>
      </div>
    </div>
  );
};

const BahiaCell: React.FC<{ bahia: BahiaSensorizada }> = ({ bahia: b }) => {
  const offline = b.estadoPanel === 'OFFLINE' || b.estadoPanel === 'DESHABILITADO';

  const tone = offline
    ? 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-gray-300 dark:text-gray-600'
    : b.estadoPanel === 'SALIDA_PENDIENTE'
      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
      : b.estadoPanel === 'DISCREPANCIA'
        ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        : b.estadoPanel === 'OCUPADO'
          ? 'border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : 'border-green-100 dark:border-[#39B000]/20 bg-green-50/30 dark:bg-[#39B000]/10 text-[#39B000]';

  return (
    <div
      className={`
        aspect-square rounded-lg border flex flex-col items-center justify-center text-center
        transition-all duration-200 hover:shadow-sm cursor-default relative group p-2
        ${tone}
      `}
    >
      <span className="text-[9px] font-black absolute top-1.5 left-1.5 opacity-40 uppercase">{b.nombreBahia}</span>

      {offline ? (
        <div className="flex flex-col items-center gap-1">
          <AlertCircle size={16} className="opacity-40" />
          <span className="text-[8px] font-black uppercase tracking-tight opacity-60">{b.estadoPanel}</span>
        </div>
      ) : b.estadoPanel === 'SALIDA_PENDIENTE' ? (
        <div className="flex flex-col items-center gap-1">
          <Car size={18} />
          {b.placa && (
            <span className="text-[8px] font-bold bg-white dark:bg-[#012E25] border border-amber-100 dark:border-amber-900/30 px-1 rounded shadow-sm truncate max-w-full">
              {b.placa}
            </span>
          )}
          <span className="text-[7px] font-black uppercase tracking-tight animate-pulse">Confirmar salida</span>
        </div>
      ) : b.estadoPanel === 'DISCREPANCIA' ? (
        <div className="flex flex-col items-center gap-1">
          <AlertTriangle size={18} />
          <span className="text-[8px] font-black uppercase tracking-tight animate-pulse">Discrepancia</span>
        </div>
      ) : b.estadoPanel === 'OCUPADO' ? (
        <div className="flex flex-col items-center gap-1">
          <Car size={18} />
          {b.placa && (
            <span className="text-[8px] font-bold bg-white dark:bg-[#012E25] border border-red-100 dark:border-red-900/30 px-1 rounded shadow-sm truncate max-w-full">
              {b.placa}
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-green-500/10 rounded-lg">
            <span className="text-[8px] font-black uppercase">LIBRE</span>
          </div>
        </>
      )}
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-sm ${color}`} aria-hidden="true" />
    <span>{label}</span>
  </span>
);

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212] shadow-sm transition-colors duration-300">
    <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  </div>
);
