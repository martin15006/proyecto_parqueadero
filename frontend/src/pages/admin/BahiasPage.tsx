import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Power, Plus, Trash2, ToggleLeft, ToggleRight, Cpu, SlidersHorizontal } from 'lucide-react';
import { socketService } from '../../services/socket.service';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { parqueaderoAdminService } from '../../services/parqueadero-admin.service';
import { telemetriaService } from '../../services/telemetria.service';
import { useNotification } from '../../contexts/NotificationContext';
import type { BahiaEstado, OcupacionPayload, BahiaAdmin, SensorAdmin, TipoBahia } from '../../types';

const mensajeDeError = (e: any, fallback: string): string => {
  const raw = e?.response?.data?.message ?? e?.message;
  if (Array.isArray(raw)) {
    const textos = raw.filter((m) => typeof m === 'string' && m.trim());
    if (textos.length) return textos.join(' • ');
  }
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
};

type EstadoTile = BahiaEstado | 'SIN_SENSOR';

export const BahiasPage: React.FC = () => {
  const { showNotification } = useNotification();

  const [ocupacion, setOcupacion] = useState<OcupacionPayload | null>(null);
  const [bahias, setBahias] = useState<BahiaAdmin[]>([]);
  const [sensores, setSensores] = useState<SensorAdmin[]>([]);
  const [tipos, setTipos] = useState<TipoBahia[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [forzarBahia, setForzarBahia] = useState<BahiaAdmin | null>(null);
  const [crearBahiaOpen, setCrearBahiaOpen] = useState(false);
  const [nuevaBahia, setNuevaBahia] = useState({ nombreBahia: '', idTipoBahia: 0 });
  const [eliminarBahiaTarget, setEliminarBahiaTarget] = useState<BahiaAdmin | null>(null);

  const [crearSensorOpen, setCrearSensorOpen] = useState(false);
  const [nuevoSensor, setNuevoSensor] = useState({ codigo: '', idBahia: 0 });
  const [eliminarSensorTarget, setEliminarSensorTarget] = useState<SensorAdmin | null>(null);

  const [deshabilitarOpen, setDeshabilitarOpen] = useState(false);
  const [deshabForm, setDeshabForm] = useState({ motivo: '', duracionEstimada: '' });

  const fetchOcupacion = useCallback(async () => {
    const res = await parqueaderoAdminService.getOcupacion();
    setOcupacion(res?.data ?? null);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoadError(null);
      const [ocu, bah, sen, tip] = await Promise.all([
        parqueaderoAdminService.getOcupacion(),
        parqueaderoAdminService.getBahias(),
        telemetriaService.getSensores(),
        parqueaderoAdminService.getTipos(),
      ]);
      setOcupacion(ocu?.data ?? null);
      setBahias(Array.isArray(bah?.data) ? bah.data : []);
      setSensores(Array.isArray(sen) ? sen : []);
      setTipos(Array.isArray(tip?.data) ? tip.data : []);
    } catch (error) {
      setLoadError(mensajeDeError(error, 'No se pudo cargar la infraestructura'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    socketService.connect();

    const refrescarOcupacion = () => { fetchOcupacion().catch(() => {}); };

    socketService.on('ocupacion_actualizada', refrescarOcupacion);
    socketService.on('conteo_global_disponibles', refrescarOcupacion);
    socketService.on('bahia_modificada', refrescarOcupacion);

    return () => {
      socketService.cleanup([
        { event: 'ocupacion_actualizada', callback: refrescarOcupacion },
        { event: 'conteo_global_disponibles', callback: refrescarOcupacion },
        { event: 'bahia_modificada', callback: refrescarOcupacion },
      ]);
    };
  }, [fetchAll, fetchOcupacion]);

  const estadoMeta = useMemo(() => {
    const total = ocupacion?.total ?? 0;
    const ocupados = ocupacion?.ocupados ?? 0;
    const disponibles = ocupacion?.disponibles ?? Math.max(total - ocupados, 0);
    const estado = ocupacion?.estadoParqueadero ?? 'DISPONIBLE';
    const deshabilitado = Boolean(ocupacion?.parqueaderoDeshabilitado);
    return { total, ocupados, disponibles, estado, deshabilitado };
  }, [ocupacion]);

  const estadoPorBahia = useMemo(() => {
    const map = new Map<number, BahiaEstado>();
    (ocupacion?.bahias ?? []).forEach((b) => map.set(b.idBahia, b.estado));
    return map;
  }, [ocupacion]);

  const sensorDeBahia = useCallback(
    (idBahia: number): SensorAdmin | undefined => {
      const asignados = sensores.filter((s) => s.idBahia === idBahia);
      return asignados.find((s) => s.activo) ?? asignados[0];
    },
    [sensores],
  );

  const estadoDeBahia = (bahia: BahiaAdmin): EstadoTile =>
    estadoPorBahia.get(bahia.idBahia) ?? 'SIN_SENSOR';

  const abrirCrearBahia = () => {
    setNuevaBahia({ nombreBahia: '', idTipoBahia: tipos[0]?.idTipoB ?? 0 });
    setCrearBahiaOpen(true);
  };

  const handleCrearBahia = async () => {
    if (!nuevaBahia.nombreBahia.trim()) {
      showNotification('Indica el nombre de la bahía', 'error');
      return;
    }
    if (!nuevaBahia.idTipoBahia) {
      showNotification('Selecciona el tipo de bahía', 'error');
      return;
    }
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.crearBahia({
        nombreBahia: nuevaBahia.nombreBahia.trim(),
        idTipoBahia: Number(nuevaBahia.idTipoBahia),
      });
      showNotification('Bahía creada', 'success');
      setCrearBahiaOpen(false);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo crear la bahía'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleToggleBahia = async (bahia: BahiaAdmin) => {
    const desactivada = bahia.estadoManual === 'DISABLED';
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.activarBahia(bahia.idBahia, desactivada);
      showNotification(desactivada ? 'Bahía activada' : 'Bahía desactivada (fuera de servicio)', 'success');
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo cambiar el estado de la bahía'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleEliminarBahia = async () => {
    if (!eliminarBahiaTarget) return;
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.eliminarBahia(eliminarBahiaTarget.idBahia);
      showNotification('Bahía eliminada', 'success');
      setEliminarBahiaTarget(null);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo eliminar la bahía'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const forzarEstado = async (estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO') => {
    if (!forzarBahia) return;
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.forzarEstadoBahia(forzarBahia.idBahia, estado);
      setForzarBahia(null);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo forzar el estado'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const abrirCrearSensor = () => {
    setNuevoSensor({ codigo: '', idBahia: bahias[0]?.idBahia ?? 0 });
    setCrearSensorOpen(true);
  };

  const handleCrearSensor = async () => {
    if (!nuevoSensor.codigo.trim()) {
      showNotification('Indica el código del sensor', 'error');
      return;
    }
    if (!nuevoSensor.idBahia) {
      showNotification('Selecciona la bahía a la que se asigna', 'error');
      return;
    }
    setAccionLoading(true);
    try {
      await telemetriaService.crearSensor({
        codigo: nuevoSensor.codigo.trim().toUpperCase(),
        idBahia: Number(nuevoSensor.idBahia),
      });
      showNotification('Sensor creado y asignado', 'success');
      setCrearSensorOpen(false);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo crear el sensor'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleToggleSensor = async (sensor: SensorAdmin) => {
    setAccionLoading(true);
    try {
      await telemetriaService.actualizarSensor(sensor.idSensor, { activo: !sensor.activo });
      showNotification(sensor.activo ? 'Sensor desactivado' : 'Sensor activado', 'success');
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo cambiar el sensor'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleReasignarSensor = async (sensor: SensorAdmin, idBahia: number) => {
    if (idBahia === sensor.idBahia) return;
    setAccionLoading(true);
    try {
      await telemetriaService.actualizarSensor(sensor.idSensor, { idBahia });
      showNotification('Sensor reasignado', 'success');
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo reasignar el sensor'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const handleEliminarSensor = async () => {
    if (!eliminarSensorTarget) return;
    setAccionLoading(true);
    try {
      await telemetriaService.eliminarSensor(eliminarSensorTarget.idSensor);
      showNotification('Sensor eliminado', 'success');
      setEliminarSensorTarget(null);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo eliminar el sensor'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const toggleParqueadero = async () => {
    if (estadoMeta.deshabilitado) {
      setAccionLoading(true);
      try {
        await parqueaderoAdminService.actualizarEstadoParqueadero(false);
        showNotification('Parqueadero habilitado', 'success');
        await fetchAll();
      } catch (e) {
        showNotification(mensajeDeError(e, 'No se pudo habilitar el parqueadero'), 'error');
      } finally {
        setAccionLoading(false);
      }
      return;
    }
    setDeshabForm({ motivo: '', duracionEstimada: '' });
    setDeshabilitarOpen(true);
  };

  const handleConfirmDeshabilitar = async () => {
    if (!deshabForm.motivo.trim()) {
      showNotification('El motivo es obligatorio para deshabilitar', 'error');
      return;
    }
    setAccionLoading(true);
    try {
      await parqueaderoAdminService.actualizarEstadoParqueadero(
        true,
        deshabForm.motivo.trim(),
        deshabForm.duracionEstimada.trim() || undefined,
      );
      showNotification('Parqueadero deshabilitado', 'success');
      setDeshabilitarOpen(false);
      await fetchAll();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo deshabilitar el parqueadero'), 'error');
    } finally {
      setAccionLoading(false);
    }
  };

  const tileStyles = (estado: EstadoTile) => {
    switch (estado) {
      case 'OCCUPIED':
        return { container: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30', dot: 'bg-rose-600', label: 'OCUPADA' };
      case 'AVAILABLE':
        return { container: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-600', label: 'DISPONIBLE' };
      case 'DISABLED':
        return { container: 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10', dot: 'bg-slate-500', label: 'DESHABILITADA' };
      case 'OFFLINE':
        return { container: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500', label: 'OFFLINE' };
      case 'SIN_SENSOR':
        return { container: 'bg-slate-50 dark:bg-white/5 border-dashed border-slate-300 dark:border-white/10', dot: 'bg-slate-400', label: 'SIN SENSOR' };
      default:
        return { container: 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10', dot: 'bg-slate-500', label: String(estado) };
    }
  };

  const bahiasOptions = useMemo(
    () => bahias.map((b) => ({ value: b.idBahia, label: b.nombreBahia })),
    [bahias],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Infraestructura</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Gestión de bahías y sensores</p>
        </div>
        <button
          type="button"
          disabled={accionLoading || loading}
          onClick={toggleParqueadero}
          className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border bg-white dark:bg-[#121212] border-slate-200 dark:border-white/10 shadow-sm transition-all duration-200 ${
            accionLoading ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-white/10'
          }`}
        >
          <Power size={14} className={estadoMeta.deshabilitado ? 'text-rose-600' : 'text-slate-500'} />
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
            {estadoMeta.deshabilitado ? 'Habilitar parqueadero' : 'Deshabilitar parqueadero'}
          </span>
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${estadoMeta.deshabilitado ? 'bg-rose-600' : 'bg-slate-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${estadoMeta.deshabilitado ? 'translate-x-5' : 'translate-x-1'}`} />
          </span>
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total en servicio</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{estadoMeta.total}</p>
        </div>
        <div className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espacios ocupados</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{estadoMeta.ocupados}</p>
        </div>
        <div className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espacios disponibles</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{estadoMeta.disponibles}</p>
        </div>
        <div className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado del parqueadero</p>
          <Badge variant={estadoMeta.estado === 'DISPONIBLE' ? 'success' : estadoMeta.estado === 'LLENO' ? 'warning' : 'neutral'}>
            {estadoMeta.estado}
          </Badge>
        </div>
      </div>

      {loadError && !loading && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold uppercase tracking-widest">
          {loadError}
        </div>
      )}

      {/* ---- Bahías ---- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Bahías</h2>
          <Button variant="primary" size="sm" onClick={abrirCrearBahia} disabled={accionLoading}>
            <Plus size={14} className="mr-2" /> Añadir bahía
          </Button>
        </div>

        {bahias.length === 0 && !loading ? (
          <div className="p-10 text-center rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-slate-500 font-black uppercase tracking-widest text-xs">
            No hay bahías registradas
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bahias.map((b) => {
              const estado = estadoDeBahia(b);
              const s = tileStyles(estado);
              const sensor = sensorDeBahia(b.idBahia);
              const desactivada = b.estadoManual === 'DISABLED';
              return (
                <div key={b.idBahia} className={`relative p-4 rounded-xl border transition-all ${s.container}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bahía</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{b.nombreBahia}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/60 bg-white/60 dark:bg-white/10 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    <span className="truncate">{b.tipoBahia?.tipoBahia || 'Estándar'}</span>
                    <span className="text-slate-400 truncate">{sensor ? sensor.codigo : 'sin sensor'}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBahia(b)}
                      disabled={accionLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                      {desactivada ? <ToggleLeft size={12} /> : <ToggleRight size={12} className="text-emerald-600" />}
                      {desactivada ? 'Activar' : 'Desactivar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForzarBahia(b)}
                      disabled={accionLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                      <SlidersHorizontal size={12} /> Forzar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEliminarBahiaTarget(b)}
                      disabled={accionLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Sensores ---- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sensores</h2>
          <Button variant="primary" size="sm" onClick={abrirCrearSensor} disabled={accionLoading || bahias.length === 0}>
            <Plus size={14} className="mr-2" /> Añadir sensor
          </Button>
        </div>

        <div className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          {sensores.length === 0 && !loading ? (
            <div className="p-10 text-center text-slate-500 font-black uppercase tracking-widest text-xs">
              No hay sensores registrados
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {sensores.map((sensor) => {
                const bahia = bahias.find((b) => b.idBahia === sensor.idBahia);
                return (
                  <div key={sensor.idSensor} className="flex flex-col lg:flex-row lg:items-center gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sensor.activo ? 'bg-[#39A900]/10 text-[#39A900]' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                        <Cpu size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{sensor.codigo}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sensor.estadoActual}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bahía</label>
                      <select
                        value={sensor.idBahia}
                        disabled={accionLoading}
                        onChange={(e) => handleReasignarSensor(sensor, Number(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#39A900]"
                      >
                        {!bahia && <option value={sensor.idBahia}>Bahía #{sensor.idBahia}</option>}
                        {bahiasOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={sensor.activo ? 'success' : 'neutral'}>{sensor.activo ? 'Activo' : 'Inactivo'}</Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleSensor(sensor)}
                        disabled={accionLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
                      >
                        {sensor.activo ? <ToggleRight size={12} className="text-emerald-600" /> : <ToggleLeft size={12} />}
                        {sensor.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEliminarSensorTarget(sensor)}
                        disabled={accionLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal: crear bahía */}
      <Modal
        isOpen={crearBahiaOpen}
        onClose={() => setCrearBahiaOpen(false)}
        title="Añadir bahía"
        footer={(
          <>
            <Button variant="outline" onClick={() => setCrearBahiaOpen(false)} disabled={accionLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleCrearBahia} isLoading={accionLoading}>Crear</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <Field label="Nombre de la bahía">
            <input
              type="text"
              value={nuevaBahia.nombreBahia}
              maxLength={20}
              onChange={(e) => setNuevaBahia({ ...nuevaBahia, nombreBahia: e.target.value })}
              placeholder="Ej. B-004"
              className={inputClass}
            />
          </Field>
          <Field label="Tipo de bahía">
            <select
              value={nuevaBahia.idTipoBahia}
              onChange={(e) => setNuevaBahia({ ...nuevaBahia, idTipoBahia: Number(e.target.value) })}
              className={inputClass}
            >
              <option value={0} disabled>Selecciona…</option>
              {tipos.map((t) => (
                <option key={t.idTipoB} value={t.idTipoB}>{t.tipoBahia}</option>
              ))}
            </select>
          </Field>
          <p className="text-[10px] text-slate-400 font-medium">
            La bahía empezará sin sensor: no contará en la capacidad hasta asignarle un sensor activo.
          </p>
        </div>
      </Modal>

      {/* Modal: crear sensor */}
      <Modal
        isOpen={crearSensorOpen}
        onClose={() => setCrearSensorOpen(false)}
        title="Añadir sensor"
        footer={(
          <>
            <Button variant="outline" onClick={() => setCrearSensorOpen(false)} disabled={accionLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleCrearSensor} isLoading={accionLoading}>Crear</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <Field label="Código del sensor">
            <input
              type="text"
              value={nuevoSensor.codigo}
              maxLength={50}
              onChange={(e) => setNuevoSensor({ ...nuevoSensor, codigo: e.target.value.toUpperCase() })}
              placeholder="Ej. SN-004"
              className={inputClass}
            />
          </Field>
          <Field label="Asignar a la bahía">
            <select
              value={nuevoSensor.idBahia}
              onChange={(e) => setNuevoSensor({ ...nuevoSensor, idBahia: Number(e.target.value) })}
              className={inputClass}
            >
              <option value={0} disabled>Selecciona…</option>
              {bahiasOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <p className="text-[10px] text-slate-400 font-medium">
            Cada bahía solo puede tener un sensor activo. El sensor inicia OFFLINE hasta recibir telemetría.
          </p>
        </div>
      </Modal>

      {/* Modal: forzar estado bahía */}
      <Modal
        isOpen={Boolean(forzarBahia)}
        onClose={() => setForzarBahia(null)}
        title="Forzar estado manual"
        footer={<Button variant="outline" onClick={() => setForzarBahia(null)}>Cerrar</Button>}
      >
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bahía</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{forzarBahia?.nombreBahia}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="primary" size="md" disabled={accionLoading} onClick={() => forzarEstado('AVAILABLE')}>Marcar Disponible</Button>
            <Button variant="primary" size="md" disabled={accionLoading} onClick={() => forzarEstado('OCCUPIED')}>Marcar Ocupado</Button>
            <Button variant="outline" size="md" disabled={accionLoading} onClick={() => forzarEstado('DISABLED')}>Marcar Deshabilitado</Button>
            <Button variant="outline" size="md" disabled={accionLoading} onClick={() => forzarEstado('AUTO')}>Volver a Automático</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: deshabilitar parqueadero */}
      <Modal
        isOpen={deshabilitarOpen}
        onClose={() => setDeshabilitarOpen(false)}
        title="Deshabilitar parqueadero"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeshabilitarOpen(false)} disabled={accionLoading}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDeshabilitar} isLoading={accionLoading}>Deshabilitar</Button>
          </>
        )}
      >
        <div className="space-y-5">
          <p className="text-xs font-medium text-slate-500">
            Mientras esté deshabilitado no se permiten ingresos y se notificará a los usuarios.
          </p>
          <Field label="Motivo (obligatorio)">
            <input
              type="text"
              value={deshabForm.motivo}
              maxLength={255}
              onChange={(e) => setDeshabForm({ ...deshabForm, motivo: e.target.value })}
              placeholder="Ej. Evento institucional, mantenimiento…"
              className={inputClass}
            />
          </Field>
          <Field label="Duración estimada (opcional)">
            <input
              type="text"
              value={deshabForm.duracionEstimada}
              maxLength={120}
              onChange={(e) => setDeshabForm({ ...deshabForm, duracionEstimada: e.target.value })}
              placeholder="Ej. 2 horas, hasta las 6 p.m."
              className={inputClass}
            />
          </Field>
        </div>
      </Modal>

      {/* Modal: confirmar eliminar bahía */}
      <Modal
        isOpen={Boolean(eliminarBahiaTarget)}
        onClose={() => setEliminarBahiaTarget(null)}
        title="Eliminar bahía"
        footer={(
          <>
            <Button variant="outline" onClick={() => setEliminarBahiaTarget(null)} disabled={accionLoading}>Cancelar</Button>
            <Button variant="danger" onClick={handleEliminarBahia} isLoading={accionLoading}>Eliminar</Button>
          </>
        )}
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          ¿Eliminar la bahía <span className="font-black">{eliminarBahiaTarget?.nombreBahia}</span>? Sus sensores quedarán
          inactivos y la bahía saldrá de la capacidad. Esta acción es reversible solo desde la base de datos.
        </p>
      </Modal>

      {/* Modal: confirmar eliminar sensor */}
      <Modal
        isOpen={Boolean(eliminarSensorTarget)}
        onClose={() => setEliminarSensorTarget(null)}
        title="Eliminar sensor"
        footer={(
          <>
            <Button variant="outline" onClick={() => setEliminarSensorTarget(null)} disabled={accionLoading}>Cancelar</Button>
            <Button variant="danger" onClick={handleEliminarSensor} isLoading={accionLoading}>Eliminar</Button>
          </>
        )}
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          ¿Eliminar el sensor <span className="font-black">{eliminarSensorTarget?.codigo}</span>? Su bahía dejará de contar
          con telemetría.
        </p>
      </Modal>
    </div>
  );
};

const inputClass =
  'w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-[#39A900] outline-none transition-all text-sm font-bold text-slate-900 dark:text-white';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
    {children}
  </div>
);
