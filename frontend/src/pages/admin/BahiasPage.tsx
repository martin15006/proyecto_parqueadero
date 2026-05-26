import React, { useMemo, useState, useEffect } from 'react';
import { Power } from 'lucide-react';
import { socketService } from '../../services/socket.service';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { parqueaderoAdminService } from '../../services/parqueadero-admin.service';
import type { BahiaEstado, OcupacionPayload } from '../../types';

/**
 * Gestión de Bahías (Admin).
 * Mapa visual de la infraestructura con estados en tiempo real y detalles técnicos.
 */
export const BahiasPage: React.FC = () => {
  const [ocupacion, setOcupacion] = useState<OcupacionPayload | null>(null);
  const [bahias, setBahias] = useState<OcupacionPayload['bahias']>([]);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBahia, setSelectedBahia] = useState<OcupacionPayload['bahias'][number] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const buildFallbackBahias = (): OcupacionPayload['bahias'] => {
    return Array.from({ length: 30 }, (_, idx) => {
      const idBahia = idx + 1;
      return {
        idBahia,
        nombreBahia: `Bahía ${String(idBahia).padStart(2, '0')}`,
        estado: 'AVAILABLE' as const,
        tipo: 'Estándar',
      };
    });
  };

  /**
   * Carga el estado global de ocupación y la infraestructura de bahías.
   * Este endpoint debe devolver 30 bahías (Bahía 01..30) una vez el backend inicializa la infraestructura.
   */
  const fetchOcupacion = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await parqueaderoAdminService.getOcupacion();
      const payload = res?.data;
      const lista = Array.isArray(payload?.bahias) ? payload.bahias : [];

      setOcupacion(payload ?? null);
      setBahias(lista);
    } catch (error) {
      const maybeAny = error as any;
      setLoadError(typeof maybeAny?.message === 'string' ? maybeAny.message : 'No se pudo cargar la infraestructura');
      setOcupacion(null);
      setBahias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOcupacion();
    socketService.connect();

    // Sincronización Realtime
    const handleOcupacion = (data: any) => {
      setLoadError(null);
      const lista = Array.isArray(data?.bahias) ? data.bahias : [];
      setOcupacion(data ?? null);
      setBahias(lista);
    };

    socketService.on('ocupacion_actualizada', handleOcupacion);

    return () => {
      socketService.cleanup([
        { event: 'ocupacion_actualizada', callback: handleOcupacion },
      ]);
    };
  }, []);

  const onClickBahia = (b: OcupacionPayload['bahias'][number]) => {
    setSelectedBahia(b);
    setIsModalOpen(true);
  };

  const estadoMeta = useMemo(() => {
    const total = ocupacion?.total ?? 30;
    const ocupados = ocupacion?.ocupados ?? 0;
    const disponibles = ocupacion?.disponibles ?? Math.max(total - ocupados, 0);
    const estado = ocupacion?.estadoParqueadero ?? 'DISPONIBLE';
    const deshabilitado = Boolean(ocupacion?.parqueaderoDeshabilitado);
    return { total, ocupados, disponibles, estado, deshabilitado };
  }, [ocupacion]);

  const toggleParqueadero = async () => {
    if (!ocupacion) return;
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.actualizarEstadoParqueadero(!ocupacion.parqueaderoDeshabilitado);
    } finally {
      setAccionLoading(false);
    }
  };

  const forzarEstado = async (estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO') => {
    if (!selectedBahia) return;
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.forzarEstadoBahia(selectedBahia.idBahia, estado);
      setIsModalOpen(false);
      setSelectedBahia(null);
    } finally {
      setAccionLoading(false);
    }
  };

  /**
   * Diseño premium del mapa 2D:
   * - Disponible: emerald suave
   * - Ocupado: rose suave
   * - Deshabilitado / Offline: slate neutro
   *
   * Nota: este mapa se alimenta del payload `OcupacionPayload.bahias`, que debe traer 30 elementos.
   */
  const tileStyles = (estado: BahiaEstado) => {
    if (estado === 'OCCUPIED') {
      return {
        container: 'bg-rose-50 border-rose-200',
        pill: 'bg-white/60 border-rose-200 text-rose-800',
        dot: 'bg-rose-600',
        label: 'OCUPADA',
      };
    }

    if (estado === 'AVAILABLE') {
      return {
        container: 'bg-emerald-50 border-emerald-200',
        pill: 'bg-white/60 border-emerald-200 text-emerald-800',
        dot: 'bg-emerald-600',
        label: 'DISPONIBLE',
      };
    }

    if (estado === 'DISABLED') {
      return {
        container: 'bg-slate-100 border-slate-200',
        pill: 'bg-white/60 border-slate-200 text-slate-700',
        dot: 'bg-slate-500',
        label: 'DESHABILITADA',
      };
    }

    if (estado === 'OFFLINE') {
      return {
        container: 'bg-slate-100 border-slate-200',
        pill: 'bg-white/60 border-slate-200 text-slate-700',
        dot: 'bg-amber-500',
        label: 'OFFLINE',
      };
    }

    return {
      container: 'bg-slate-100 border-slate-200',
      pill: 'bg-white/60 border-slate-200 text-slate-700',
      dot: 'bg-slate-500',
      label: 'ERROR',
    };
  };

  const bahiasToRender = useMemo(() => {
    if (Array.isArray(bahias) && bahias.length > 0) return bahias;
    return buildFallbackBahias();
  }, [bahias]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Infraestructura</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Mapa de bahías y control en tiempo real</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex flex-wrap gap-3">
            <LegendItem variant="success" label="Disponible" />
            <LegendItem variant="error" label="Ocupada" />
            <LegendItem variant="neutral" label="Deshabilitada" />
          </div>
          <button
            type="button"
            disabled={accionLoading || loading}
            onClick={toggleParqueadero}
            className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border bg-white border-slate-200 shadow-sm transition-all duration-200 ${
              accionLoading ? 'opacity-60' : 'hover:bg-gray-50'
            }`}
          >
            <Power size={14} className={estadoMeta.deshabilitado ? 'text-slate-900' : 'text-slate-500'} />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Deshabilitar parqueadero
            </span>
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              estadoMeta.deshabilitado ? 'bg-slate-900' : 'bg-slate-200'
            }`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                estadoMeta.deshabilitado ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de espacios</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{estadoMeta.total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espacios ocupados</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{estadoMeta.ocupados}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espacios disponibles</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{estadoMeta.disponibles}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado del parqueadero</p>
          <Badge variant={estadoMeta.estado === 'DISPONIBLE' ? 'success' : estadoMeta.estado === 'LLENO' ? 'warning' : 'neutral'}>
            {estadoMeta.estado}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {loadError && !loading && (
          <div className="col-span-full p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold uppercase tracking-widest">
            {loadError}
          </div>
        )}

        {bahiasToRender.map((b) => {
          const s = tileStyles(b.estado);
          const numero = String(b.idBahia).padStart(2, '0');
          return (
            <button
              type="button"
              key={b.idBahia}
              onClick={() => onClickBahia(b)}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left hover:shadow-sm ${s.container}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bahía</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                    {numero}
                  </p>
                </div>

                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${s.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
                <span className="truncate">{b.tipo || 'Estándar'}</span>
                <span className="text-slate-400 tabular-nums">ID {b.idBahia}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedBahia(null); }}
        title="Forzar estado manual"
        footer={(
          <>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setSelectedBahia(null); }}>Cerrar</Button>
          </>
        )}
      >
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bahía</p>
            <p className="text-lg font-black text-slate-900">{selectedBahia?.nombreBahia}</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">
              Estado actual: {selectedBahia?.estado}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="primary" size="md" disabled={accionLoading} onClick={() => forzarEstado('AVAILABLE')}>
              Marcar Disponible
            </Button>
            <Button variant="primary" size="md" disabled={accionLoading} onClick={() => forzarEstado('OCCUPIED')}>
              Marcar Ocupado
            </Button>
            <Button variant="outline" size="md" disabled={accionLoading} onClick={() => forzarEstado('DISABLED')}>
              Marcar Deshabilitado
            </Button>
            <Button variant="outline" size="md" disabled={accionLoading} onClick={() => forzarEstado('AUTO')}>
              Volver a Automático
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const LegendItem: React.FC<{ variant: any; label: string }> = ({ variant, label }) => (
  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${
      variant === 'success' ? 'bg-emerald-600' :
      variant === 'error' ? 'bg-rose-600' : 'bg-slate-400'
    }`}></div>
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
  </div>
);
