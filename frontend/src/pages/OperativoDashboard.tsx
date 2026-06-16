import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { MovementForm } from '../components/MovementForm';
import { useOperativo } from '../hooks/useOperativo';
import { useNotification } from '../contexts/NotificationContext';
import type { BahiaSensorizada } from '../types';

export const OperativoDashboard: React.FC = () => {
  const { stats, bahias, vehiculos, alerts, loading, handleQuickSalida, refresh } = useOperativo();
  const { showNotification } = useNotification();
  const { user, logout } = useAuth();

  const [recent, setRecent] = useState<Array<{ id: string; tipo: 'SUCCESS' | 'ERROR'; mensaje: string; fecha: Date }>>([]);

  const operadorNombre = useMemo(() => {
    return user?.usuario?.nombreCompleto || 'Operador';
  }, [user?.usuario?.nombreCompleto]);

  const ocupacionPct = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.ocupados / stats.total) * 100);
  }, [stats.ocupados, stats.total]);

  const estadoGlobal = useMemo(() => {
    const tipos = alerts.map((a) => String(a.tipo || '').toUpperCase());
    if (tipos.some((t) => t.includes('PARQUEADERO_DESHABILITADO'))) return 'DESHABILITADO';
    if (stats.total > 0 && stats.ocupados >= stats.total) return 'LLENO';
    if (tipos.some((t) => t.includes('PARQUEADERO_LLENO'))) return 'LLENO';
    if (tipos.some((t) => t.includes('UMBRAL_80'))) return 'ALERTA_80';
    if (stats.total > 0 && (stats.ocupados / stats.total) >= 0.8) return 'ALERTA_80';
    return 'DISPONIBLE';
  }, [alerts, stats.ocupados, stats.total]);

  const estadoStyle = useMemo(() => {
    if (estadoGlobal === 'DESHABILITADO') return { bg: 'bg-[#D32F2F]', label: 'DESHABILITADO', sub: 'Bloqueo total de ingresos (RF14)', ring: 'ring-[#D32F2F]/25' };
    if (estadoGlobal === 'LLENO') return { bg: 'bg-[#FF6B00]', label: 'LLENO', sub: 'Cupos agotados (100%)', ring: 'ring-[#FF6B00]/25' };
    if (estadoGlobal === 'ALERTA_80') return { bg: 'bg-[#FF6B00]', label: 'ALERTA 80%', sub: 'Ocupación alta (RF15/RF39)', ring: 'ring-[#FF6B00]/25' };
    return { bg: 'bg-[#39A900]', label: 'DISPONIBLE', sub: 'Ingreso permitido según reglas', ring: 'ring-[#39A900]/25' };
  }, [estadoGlobal]);

  const pushRecent = (tipo: 'SUCCESS' | 'ERROR', mensaje: string) => {
    setRecent((prev) => [{ id: `${Date.now()}-${Math.random()}`, tipo, mensaje, fecha: new Date() }, ...prev].slice(0, 5));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-full border-4 border-[#003939]/20 border-t-[#003939] animate-spin" />
        <p className="mt-4 text-[12px] font-black uppercase tracking-[0.28em] text-[#003939]">Sincronizando sistema...</p>
        <p className="mt-2 text-sm text-slate-600 font-medium text-center max-w-md">Conectando a infraestructura de bahías y eventos en tiempo real.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#39A900]/20">
      <header className="sticky top-0 z-50 bg-[#003939] text-white border-b border-black/10">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39A900] animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-90">SENA • Portería</p>
              <h1 className="text-lg font-black tracking-tight">Panel Operativo de Acceso</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-black leading-none">{operadorNombre}</p>
              <p className="text-[11px] font-bold opacity-85">Operador de turno</p>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-white/25"
              aria-label="Refrescar datos"
              title="Refrescar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={logout}
              className="h-10 px-4 rounded-xl bg-white text-[#003939] font-black uppercase tracking-widest text-[11px] hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/25"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {estadoGlobal === 'LLENO' && (
          <div className="rounded-3xl border-2 border-[#D32F2F] bg-[#D32F2F]/5 p-5 flex items-start gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-[#D32F2F] text-white flex items-center justify-center shrink-0">
              <ShieldAlert size={28} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#D32F2F]">Alerta crítica</p>
              <h2 className="text-2xl font-black text-[#D32F2F] mt-1">Capacidad máxima alcanzada</h2>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                El parqueadero está LLENO ({stats.ocupados}/{stats.total}). No se permiten más ingresos
                hasta que ocurra una salida.
              </p>
            </div>
          </div>
        )}

        {estadoGlobal === 'DESHABILITADO' && (
          <div className="rounded-3xl border-2 border-[#FF6B00] bg-[#FF6B00]/5 p-5 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
              <ShieldAlert size={28} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#FF6B00]">Estado administrativo</p>
              <h2 className="text-2xl font-black text-[#FF6B00] mt-1">Parqueadero deshabilitado</h2>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                El parqueadero está fuera de servicio por decisión administrativa.
              </p>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute inset-0 ${estadoStyle.ring} ring-8 animate-pulse`} />
              </div>

              <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-3xl ${estadoStyle.bg} text-white flex items-center justify-center shadow-sm`}>
                    {estadoGlobal === 'DESHABILITADO' ? <ShieldAlert className="w-9 h-9" /> : <AlertTriangle className="w-9 h-9" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Estado general</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-black text-[#003939] tracking-tight">{estadoStyle.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{estadoStyle.sub}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:min-w-[520px]">
                  <Kpi label="TOTAL" value={stats.total} />
                  <Kpi label="OCUPADOS" value={stats.ocupados} />
                  <Kpi label="LIBRES" value={stats.disponibles} highlight />
                  <Kpi label="OCUPACIÓN" value={`${ocupacionPct}%`} />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <MovementForm
              onSuccess={(msg) => { showNotification(msg, 'success'); pushRecent('SUCCESS', msg); }}
              onError={(msg) => { showNotification(msg, 'error'); pushRecent('ERROR', msg); }}
            />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <MapaBahias bahias={bahias} />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <MovimientosRecientes recent={recent} />
            <AlertasOperativas alerts={alerts} />
            <VehiculosActivos vehiculos={vehiculos.slice(0, 5)} onSalida={handleQuickSalida} />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest text-center sm:text-left">Sistema Institucional de Parqueadero SENA • Sede Ibagué</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#003939]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39A900]" />
              API
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#003939]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39A900]" />
              SOCKET
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-black tracking-tight ${highlight ? 'text-[#39A900]' : 'text-[#003939]'}`}>{value}</p>
  </div>
);

const MapaBahias: React.FC<{ bahias: BahiaSensorizada[] }> = ({ bahias }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Mapa de disponibilidad</p>
          <p className="mt-1 text-lg font-black text-[#003939]">Bahías en tiempo real</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-600">
          <LegendDot color="bg-[#39A900]" label="Libre" />
          <LegendDot color="bg-[#D32F2F]" label="Ocupada" />
          <LegendDot color="bg-slate-400" label="Offline" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {bahias.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 font-semibold">Cargando infraestructura...</div>
          ) : (
            bahias.map((b) => {
              const isOffline = b.estadoPanel === 'OFFLINE' || b.estadoPanel === 'DESHABILITADO';
              const isOcupado = b.estadoPanel === 'OCUPADO'
                || b.estadoPanel === 'SALIDA_PENDIENTE'
                || b.estadoPanel === 'DISCREPANCIA';

              return (
                <div
                  key={b.idBahia}
                  className={[
                    'rounded-2xl border-2 p-4 min-h-[92px] flex flex-col items-center justify-center text-center transition-all duration-500',
                    isOffline
                      ? 'border-slate-300 bg-slate-100 text-slate-500'
                      : isOcupado
                        ? 'border-[#D32F2F]/50 bg-[#D32F2F]/5'
                        : 'border-[#39A900]/40 bg-[#39A900]/5',
                  ].join(' ')}
                >
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">{b.nombreBahia}</p>
                  {isOffline ? (
                    <p className="mt-2 text-[12px] font-black uppercase tracking-widest">{b.estadoPanel}</p>
                  ) : b.estadoPanel === 'SALIDA_PENDIENTE' ? (
                    <>
                      <p className="mt-2 text-base font-black text-[#D32F2F]">{b.placa || 'OCUPADA'}</p>
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-tight animate-pulse">Confirmar salida</p>
                    </>
                  ) : b.estadoPanel === 'DISCREPANCIA' ? (
                    <>
                      <p className="mt-2 text-base font-black text-[#D32F2F]">OCUPADO</p>
                      <p className="text-[9px] font-black text-[#D32F2F] uppercase tracking-tight animate-pulse">S/A</p>
                    </>
                  ) : isOcupado ? (
                    <p className="mt-2 text-base font-black text-[#D32F2F]">{b.placa || 'OCUPADA'}</p>
                  ) : (
                    <p className="mt-2 text-[12px] font-black uppercase tracking-widest text-[#39A900]">LIBRE</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`w-3 h-3 rounded-sm ${color}`} aria-hidden="true" />
    <span>{label}</span>
  </span>
);

const MovimientosRecientes: React.FC<{ recent: Array<{ id: string; tipo: 'SUCCESS' | 'ERROR'; mensaje: string; fecha: Date }> }> = ({ recent }) => (
  <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden">
    <div className="p-6 border-b border-slate-200 bg-[#003939] text-white">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-90">Historial reciente</p>
      <p className="mt-2 text-sm font-semibold opacity-90">Últimas 5 acciones / excepciones</p>
    </div>
    <div className="p-6">
      {recent.length === 0 ? (
        <p className="text-sm text-slate-600 font-medium">Sin eventos aún. Escanea un código para iniciar.</p>
      ) : (
        <div className="space-y-3">
          {recent.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.tipo === 'SUCCESS' ? 'bg-[#39A900]' : 'bg-[#D32F2F]'} text-white`}>
                {r.tipo === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-black text-[#003939]">{r.mensaje}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{r.fecha.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AlertasOperativas: React.FC<{ alerts: Array<{ id: string; tipo: string; mensaje: string; fecha: Date }> }> = ({ alerts }) => (
  <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden">
    <div className="p-6 border-b border-slate-200">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Alertas en vivo</p>
      <p className="mt-1 text-lg font-black text-[#003939]">Eventos del sistema</p>
    </div>
    <div className="p-6 space-y-3 max-h-[320px] overflow-auto">
      {alerts.length === 0 ? (
        <p className="text-sm text-slate-600 font-medium">Sin alertas. El sistema opera con normalidad.</p>
      ) : (
        alerts.slice(0, 8).map((a) => (
          <div key={a.id} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{a.tipo}</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{a.mensaje}</p>
          </div>
        ))
      )}
    </div>
  </div>
);

const VehiculosActivos: React.FC<{ vehiculos: Array<{ placa: string; bahia: string; estado: string; horaIngreso: string }>; onSalida: (placa: string) => void }> = ({ vehiculos, onSalida }) => (
  <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden">
    <div className="p-6 border-b border-slate-200">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Vehículos activos</p>
      <p className="mt-1 text-lg font-black text-[#003939]">Salida rápida</p>
    </div>
    <div className="p-6 space-y-3">
      {vehiculos.length === 0 ? (
        <p className="text-sm text-slate-600 font-medium">No hay vehículos activos detectados.</p>
      ) : (
        vehiculos.map((v) => (
          <div key={v.placa} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
            <div>
              <p className="text-sm font-black text-[#003939]">{v.placa}</p>
              <p className="text-[11px] font-bold text-slate-500">{v.bahia}</p>
            </div>
            <button
              type="button"
              onClick={() => onSalida(v.placa)}
              className="h-10 px-4 rounded-xl bg-[#003939] text-white font-black uppercase tracking-widest text-[11px] hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#003939]/20"
            >
              Salida
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);
