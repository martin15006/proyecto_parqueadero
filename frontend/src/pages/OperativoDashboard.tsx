import React, { useMemo, useState } from 'react'; // UI: hooks para render reactivo del panel operativo (tiempo real).
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react'; // UI: iconografía accesible y de alto contraste (WCAG).
import { useAuth } from '../AuthContext'; // UX: mantiene el hook de autenticación existente (sesión/operador/logout).
import { MovementForm } from '../components/MovementForm'; // RF10/RF11/RF14: pasarela de acceso (escaneo/placa/contingencia).
import { useOperativo } from '../hooks/useOperativo'; // RF15/RF18: fuente única de datos en vivo (REST + WebSocket) para ocupación/alertas.
import { useNotification } from '../contexts/NotificationContext'; // UX: notificaciones en UI sin romper integración existente.
import type { BahiaSensorizada } from '../types'; // RF15: tipo con estadoPanel calculado por el backend (LIBRE/OCUPADO/SALIDA_PENDIENTE/etc).

/**
 * Dashboard Operativo (Vista Principal) — Rediseño UI/UX SENA.
 *
 * Objetivo:
 * - Alinear estrictamente la estética a la guía digital del SENA (paleta institucional y alto contraste).
 * - Consumir reglas críticas de negocio ya inyectadas (bloqueos RF14, capacidad RF15, emergencia RF18).
 * - Mantener intactos los hooks de sockets, autenticación y llamadas asíncronas existentes (directriz).
 */
export const OperativoDashboard: React.FC = () => {
  const { stats, bahias, vehiculos, alerts, loading, handleQuickSalida, refresh } = useOperativo(); // RF15/RF18: mantiene el consumo de datos en vivo.
  const { showNotification } = useNotification(); // UX: notificaciones no intrusivas.
  const { user, logout } = useAuth(); // UX: mantiene autenticación y cierre de sesión existente.

  const [recent, setRecent] = useState<Array<{ id: string; tipo: 'SUCCESS' | 'ERROR'; mensaje: string; fecha: Date }>>([]); // RF12 (operación): historial local de eventos recientes (últimos 5) para auditoría visual.

  const operadorNombre = useMemo(() => { // UX: nombre del operador para navbar sin exponer tokens.
    return user?.usuario?.nombreCompleto || 'Operador'; // UX: fallback si no hay perfil disponible.
  }, [user?.usuario?.nombreCompleto]); // UX: memoiza por estabilidad.

  const ocupacionPct = useMemo(() => { // RF15: porcentaje de ocupación para semáforo de capacidad.
    if (!stats.total) return 0; // RF15: evita división por cero.
    return Math.round((stats.ocupados / stats.total) * 100); // RF15: cálculo simple y estable para UI.
  }, [stats.ocupados, stats.total]); // RF15: depende de stats.

  const estadoGlobal = useMemo(() => { // RF14/RF15/RF18: deduce estado global a partir de eventos reales sin inventar fuentes.
    const tipos = alerts.map(a => String(a.tipo || '').toUpperCase()); // RF15: normaliza tipos de alertas recibidas por WebSocket.
    if (tipos.some(t => t.includes('PARQUEADERO_DESHABILITADO'))) return 'DESHABILITADO'; // RF14: bloqueo administrativo (fase 3).
    if (tipos.some(t => t.includes('PARQUEADERO_LLENO'))) return 'LLENO'; // RF15: capacidad 100% (fase 3/39).
    if (tipos.some(t => t.includes('UMBRAL_80'))) return 'ALERTA_80'; // RF15: alerta operativa 80%.
    if (stats.total > 0 && stats.disponibles === 0) return 'LLENO'; // RF15: fallback si no llegó alerta pero el cálculo indica 100%.
    return 'DISPONIBLE'; // RF15: estado por defecto si no hay señales de bloqueo/lleno.
  }, [alerts, stats.disponibles, stats.total]); // RF15: recalcula con datos en vivo.

  const estadoStyle = useMemo(() => { // UI: paleta institucional de alto contraste (hex exigidos).
    if (estadoGlobal === 'DESHABILITADO') return { bg: 'bg-[#D32F2F]', label: 'DESHABILITADO', sub: 'Bloqueo total de ingresos (RF14)', ring: 'ring-[#D32F2F]/25' }; // RF14.
    if (estadoGlobal === 'LLENO') return { bg: 'bg-[#FF6B00]', label: 'LLENO', sub: 'Cupos agotados (100%)', ring: 'ring-[#FF6B00]/25' }; // RF15.
    if (estadoGlobal === 'ALERTA_80') return { bg: 'bg-[#FF6B00]', label: 'ALERTA 80%', sub: 'Ocupación alta (RF15/RF39)', ring: 'ring-[#FF6B00]/25' }; // RF15.
    return { bg: 'bg-[#39A900]', label: 'DISPONIBLE', sub: 'Ingreso permitido según reglas', ring: 'ring-[#39A900]/25' }; // RF15.
  }, [estadoGlobal]); // UI: depende del estado.

  const pushRecent = (tipo: 'SUCCESS' | 'ERROR', mensaje: string) => { // RF12: inserta evento reciente y limita a 5.
    setRecent((prev) => [{ id: `${Date.now()}-${Math.random()}`, tipo, mensaje, fecha: new Date() }, ...prev].slice(0, 5)); // RF12: id estable sin depender de APIs del navegador.
  }; // RF12: fin pushRecent.

  if (loading) { // UX: pantalla de carga con guía institucional (sin parpadeos).
    return ( // UX: render loading.
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6"> {/* UI: fondo base claro requerido. */}
        <div className="w-14 h-14 rounded-full border-4 border-[#003939]/20 border-t-[#003939] animate-spin" /> {/* UI: spinner en verde oscuro. */}
        <p className="mt-4 text-[12px] font-black uppercase tracking-[0.28em] text-[#003939]">Sincronizando sistema...</p> {/* UX: feedback institucional. */}
        <p className="mt-2 text-sm text-slate-600 font-medium text-center max-w-md">Conectando a infraestructura de bahías y eventos en tiempo real.</p> {/* UX: mensaje calmante. */}
      </div> // UX: fin loading.
    ); // UX: fin return.
  } // UX: fin loading.

  return ( // UI: render principal.
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#39A900]/20"> {/* Paleta: fondo base + selección SENA. */}
      <header className="sticky top-0 z-50 bg-[#003939] text-white border-b border-black/10"> {/* Paleta: navbar portería verde oscuro (requisito). */}
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4"> {/* UI: contenedor central. */}
          <div className="flex items-center gap-3"> {/* UI: marca + estado. */}
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center"> {/* UI: ícono container. */}
              <span className="w-2.5 h-2.5 rounded-full bg-[#39A900] animate-pulse" /> {/* UI: punto vivo (sistema online). */}
            </div> {/* UI: fin icono container. */}
            <div> {/* UI: títulos. */}
              <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-90">SENA • Portería</p> {/* Guía: marca institucional. */}
              <h1 className="text-lg font-black tracking-tight">Panel Operativo de Acceso</h1> {/* UI: título principal. */}
            </div> {/* UI: fin títulos. */}
          </div> {/* UI: fin marca. */}

          <div className="flex items-center gap-3"> {/* UI: acciones navbar. */}
            <div className="hidden sm:flex flex-col items-end"> {/* UI: información del operador. */}
              <p className="text-sm font-black leading-none">{operadorNombre}</p> {/* UX: nombre del operador (no PII sensible). */}
              <p className="text-[11px] font-bold opacity-85">Operador de turno</p> {/* UX: rol visible. */}
            </div> {/* UI: fin info operador. */}

            <button
              type="button"
              onClick={refresh} // UX: recarga manual sin romper hooks.
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-white/25"
              aria-label="Refrescar datos"
              title="Refrescar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={logout} // UX: cierre de sesión preservando el contexto existente.
              className="h-10 px-4 rounded-xl bg-white text-[#003939] font-black uppercase tracking-widest text-[11px] hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/25"
            >
              Cerrar sesión
            </button>
          </div> {/* UI: fin acciones navbar. */}
        </div> {/* UI: fin container navbar. */}
      </header> {/* UI: fin header. */}

      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 space-y-6"> {/* UI: contenedor principal. */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6"> {/* Layout: grid robusto para 3 secciones. */}
          <div className="lg:col-span-12"> {/* Sección A: barra superior de estado (a lo ancho). */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]"> {/* UI: card premium. */}
              <div className="absolute inset-0 pointer-events-none"> {/* UI: capa de pulso perimetral. */}
                <div className={`absolute inset-0 ${estadoStyle.ring} ring-8 animate-pulse`} /> {/* RF14/RF15: pulso cambia con estado. */}
              </div>

              <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"> {/* UI: layout responsive. */}
                <div className="flex items-center gap-4"> {/* UI: bloque estado gigante. */}
                  <div className={`w-16 h-16 rounded-3xl ${estadoStyle.bg} text-white flex items-center justify-center shadow-sm`}> {/* Paleta: estado. */}
                    {estadoGlobal === 'DESHABILITADO' ? <ShieldAlert className="w-9 h-9" /> : <AlertTriangle className="w-9 h-9" />} {/* RF14: icono de bloqueo; RF15: alerta. */}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Estado general</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-black text-[#003939] tracking-tight">{estadoStyle.label}</p> {/* Paleta: tipografía fuerte. */}
                    <p className="mt-1 text-sm font-semibold text-slate-600">{estadoStyle.sub}</p> {/* RF14/RF15: explicación corta. */}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:min-w-[520px]"> {/* UI: KPIs de alto contraste. */}
                  <Kpi label="TOTAL" value={stats.total} />
                  <Kpi label="OCUPADOS" value={stats.ocupados} />
                  <Kpi label="LIBRES" value={stats.disponibles} highlight />
                  <Kpi label="OCUPACIÓN" value={`${ocupacionPct}%`} />
                </div>
              </div>
            </div>
          </div> {/* Fin sección A. */}

          <div className="lg:col-span-4 space-y-6"> {/* Sección B: pasarela de acceso (input foco). */}
            <MovementForm
              onSuccess={(msg) => { showNotification(msg, 'success'); pushRecent('SUCCESS', msg); }} // RF10/RF11: registra éxito visual y en historial.
              onError={(msg) => { showNotification(msg, 'error'); pushRecent('ERROR', msg); }} // RF14/RF15: registra bloqueo/error y en historial.
            />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <MapaBahias bahias={bahias} />
          </div>

          <div className="lg:col-span-3 space-y-6"> {/* Sección D: historial y alertas. */}
            <MovimientosRecientes recent={recent} /> {/* RF12: últimos 5 eventos del turno (según acciones y errores). */}
            <AlertasOperativas alerts={alerts} /> {/* RF14/RF15/RF18: alertas del sistema (socket) con alto contraste. */}
            <VehiculosActivos vehiculos={vehiculos.slice(0, 5)} onSalida={handleQuickSalida} /> {/* RF11: salida rápida sobre vehículos activos. */}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"> {/* UI: footer limpio. */}
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
  ); // UI: fin return.
};

const Kpi: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => ( // UI: KPI accesible y reusable.
  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4"> {/* UI: card KPI. */}
    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p> {/* UI: label. */}
    <p className={`mt-2 text-3xl font-black tracking-tight ${highlight ? 'text-[#39A900]' : 'text-[#003939]'}`}>{value}</p> {/* Paleta: valor destacado en verde. */}
  </div>
);


const MapaBahias: React.FC<{ bahias: BahiaSensorizada[] }> = ({ bahias }) => { // RF15: mapa operativo — usa estadoPanel calculado por el backend.
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
              // RF15: la fuente de verdad es estadoPanel (calculado por BahiasService.derivarEstadoPanel).
              // NO usar b.ocupada — ese campo no existe en BahiaSensorizada y siempre sería undefined.
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

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => ( // UI: componente de leyenda accesible.
  <span className="inline-flex items-center gap-2">
    <span className={`w-3 h-3 rounded-sm ${color}`} aria-hidden="true" />
    <span>{label}</span>
  </span>
);

const MovimientosRecientes: React.FC<{ recent: Array<{ id: string; tipo: 'SUCCESS' | 'ERROR'; mensaje: string; fecha: Date }> }> = ({ recent }) => ( // RF12: historial de operación reciente.
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

const AlertasOperativas: React.FC<{ alerts: Array<{ id: string; tipo: string; mensaje: string; fecha: Date }> }> = ({ alerts }) => ( // RF14/RF15/RF18: lista de alertas del sistema.
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

const VehiculosActivos: React.FC<{ vehiculos: Array<{ placa: string; bahia: string; estado: string; horaIngreso: string }>; onSalida: (placa: string) => void }> = ({ vehiculos, onSalida }) => ( // RF11: vista compacta para salida rápida.
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
