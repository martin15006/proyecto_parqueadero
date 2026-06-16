import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, ShieldCheck,
  Car, LayoutGrid, Info
} from 'lucide-react';
import { useOperativo } from '../../hooks/useOperativo';
import { useNotification } from '../../contexts/NotificationContext';
import { MovementForm } from '../../components/MovementForm';
import { VisitantesPanel } from '../../components/VisitantesPanel';
import { operativoService } from '../../services/operativo.service';

export const ControlAccesoView: React.FC = () => {
  const { stats, alerts, loading, refresh } = useOperativo();
  const { showNotification } = useNotification();

  const [yaCargo, setYaCargo] = useState(false);
  useEffect(() => { if (!loading) setYaCargo(true); }, [loading]);

  const handleSalidaEmergencia = async () => {
    if (!window.confirm('¿ESTÁ SEGURO? Esta acción registrará la salida de todos los vehículos activos.')) return;
    try {
      await operativoService.salidaEmergencia();
      showNotification('Protocolo de emergencia activado. Salidas registradas.', 'success');
      refresh();
    } catch (err: any) {
      showNotification(err.response?.data?.mensaje || err.response?.data?.message || 'Error al activar emergencia', 'error');
    }
  };

  const estadoGlobal = useMemo(() => {
    const tipos = alerts.map(a => String(a.tipo || '').toUpperCase());
    if (tipos.some(t => t.includes('PARQUEADERO_DESHABILITADO'))) return 'DESHABILITADO';
    if (tipos.some(t => t.includes('PARQUEADERO_LLENO'))) return 'LLENO';
    if (tipos.some(t => t.includes('UMBRAL_80'))) return 'ALERTA_80';
    if (stats.total > 0 && stats.disponibles === 0) return 'LLENO';
    return 'DISPONIBLE';
  }, [alerts, stats.disponibles, stats.total]);

  const estadoStyle = useMemo(() => {
    if (estadoGlobal === 'DESHABILITADO') return { bg: 'bg-red-600', label: 'DESHABILITADO', color: 'text-red-600' };
    if (estadoGlobal === 'LLENO') return { bg: 'bg-orange-500', label: 'LLENO', color: 'text-orange-500' };
    if (estadoGlobal === 'ALERTA_80') return { bg: 'bg-orange-400', label: 'ALERTA 80%', color: 'text-orange-400' };
    return { bg: 'bg-[#39B000]', label: 'DISPONIBLE', color: 'text-[#39B000]' };
  }, [estadoGlobal]);

  if (loading && !yaCargo) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#39B000]/20 border-t-[#39B000] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-white dark:bg-[#121212] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className={`w-10 h-10 rounded-lg ${estadoStyle.bg} flex items-center justify-center text-white shrink-0`}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sistema</p>
            <p className={`text-sm font-bold ${estadoStyle.color}`}>{estadoStyle.label}</p>
          </div>
        </div>

        <KpiMini label="Capacidad" value={stats.total} icon={<LayoutGrid size={16} />} />
        <KpiMini label="Ocupados" value={stats.ocupados} icon={<Car size={16} />} />
        <KpiMini label="Disponibles" value={stats.disponibles} icon={<Info size={16} />} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-colors duration-300">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5">
              <h2 className="text-sm font-bold text-[#012E25] dark:text-white uppercase tracking-widest">Control de Acceso</h2>
            </div>
            <div className="p-8">
              <MovementForm
                onSuccess={(msg) => { showNotification(msg, 'success'); refresh(); }}
                onError={(msg) => { showNotification(msg, 'error'); }}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-6 space-y-4 transition-colors duration-300">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Protocolos Especiales</h3>

            <button
              onClick={handleSalidaEmergencia}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-red-50 dark:border-red-900/20 bg-red-50/10 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-red-700 dark:text-red-400">Emergencia</p>
                <p className="text-[9px] text-red-400 dark:text-red-500/60 uppercase">Liberación total</p>
              </div>
            </button>
          </div>

          <VisitantesPanel onChange={refresh} />
        </div>
      </div>
    </div>
  );
};

const KpiMini: React.FC<{ label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-4 transition-colors duration-300">
    <div className={`p-2 rounded-lg ${highlight ? 'bg-[#39B000]/10 text-[#39B000]' : 'bg-gray-50 dark:bg-white/5 text-gray-400'}`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-base font-bold ${highlight ? 'text-[#39B000]' : 'text-[#012E25] dark:text-white'}`}>{value}</p>
    </div>
  </div>
);
