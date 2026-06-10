import React, { useState, useMemo } from 'react';
import { AlertTriangle, Info, ShieldAlert, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useOperativo } from '../../hooks/useOperativo';

export const AlertasView: React.FC = () => {
  const { alerts, loading } = useOperativo();
  const [activeTab, setActiveTab] = useState('todas');

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'todas') return alerts;
    if (activeTab === 'criticas') return alerts.filter(a => a.tipo?.includes('ERROR') || a.tipo?.includes('CRITICA'));
    if (activeTab === 'advertencias') return alerts.filter(a => a.tipo?.includes('ALERTA'));
    if (activeTab === 'informativas') return alerts.filter(a => !a.tipo?.includes('ERROR') && !a.tipo?.includes('CRITICA') && !a.tipo?.includes('ALERTA'));
    return alerts;
  }, [alerts, activeTab]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#39B000]/20 border-t-[#39B000] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Selector de Categorías Sobrio */}
      <div className="bg-white dark:bg-[#121212] p-2 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-wrap gap-1 transition-colors duration-300">
        <TabButton 
          active={activeTab === 'todas'} 
          onClick={() => setActiveTab('todas')} 
          label="Todas" 
          count={alerts.length}
        />
        <TabButton 
          active={activeTab === 'criticas'} 
          onClick={() => setActiveTab('criticas')} 
          label="Críticas" 
          color="bg-red-600"
          count={alerts.filter(a => a.tipo?.includes('ERROR') || a.tipo?.includes('CRITICA')).length}
        />
        <TabButton 
          active={activeTab === 'advertencias'} 
          onClick={() => setActiveTab('advertencias')} 
          label="Advertencias" 
          color="bg-orange-500"
          count={alerts.filter(a => a.tipo?.includes('ALERTA')).length}
        />
        <TabButton 
          active={activeTab === 'informativas'} 
          onClick={() => setActiveTab('informativas')} 
          label="Informativas" 
          color="bg-[#39B000]"
          count={alerts.filter(a => !a.tipo?.includes('ERROR') && !a.tipo?.includes('CRITICA') && !a.tipo?.includes('ALERTA')).length}
        />
      </div>

      {/* Listado de Novedades */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-[#121212] py-20 px-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm text-center transition-colors duration-300">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-white/10">
              <ShieldCheck className="text-[#39B000]" size={32} />
            </div>
            <h3 className="text-sm font-bold text-[#012E25] dark:text-white uppercase tracking-widest mb-2">Sistema sin Novedades</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest max-w-xs mx-auto">El parqueadero opera bajo parámetros normales de seguridad.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-5 hover:border-gray-200 dark:hover:border-white/10 transition-all">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                ${alert.tipo?.includes('ERROR') || alert.tipo?.includes('CRITICA') 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                  : alert.tipo?.includes('ALERTA') 
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' 
                    : 'bg-green-50 dark:bg-[#39B000]/10 text-[#39B000]'}
              `}>
                {alert.tipo?.includes('ERROR') || alert.tipo?.includes('CRITICA') ? <ShieldAlert size={18} /> : 
                 alert.tipo?.includes('ALERTA') ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-bold text-[#012E25] dark:text-white uppercase tracking-wider">{alert.tipo || 'Novedad'}</p>
                  <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600">•</span>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    {new Date(alert.fecha || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{alert.mensaje}</p>
              </div>

              <div className="hidden sm:block">
                 <span className={`
                    px-3 py-1 rounded text-[8px] font-bold uppercase tracking-widest border
                    ${alert.tipo?.includes('ERROR') || alert.tipo?.includes('CRITICA') 
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' 
                      : alert.tipo?.includes('ALERTA') 
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' 
                        : 'bg-green-50 dark:bg-[#39B000]/10 text-[#39B000] border-green-100 dark:border-[#39B000]/20'}
                  `}>
                    {alert.tipo?.includes('ERROR') || alert.tipo?.includes('CRITICA') ? 'Alta' : 'Normal'}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación Sobria */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          Historial de Seguridad
        </p>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-[#012E25] dark:hover:text-white transition-all disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <button className="text-gray-400 hover:text-[#012E25] dark:hover:text-white transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
  count: number;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label, color = 'bg-[#012E25]', count }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200
      ${active 
        ? `${color} text-white shadow-sm` 
        : `bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5`}
    `}
  >
    {label}
    <span className={`
      px-1.5 py-0.5 rounded text-[9px] font-bold
      ${active ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}
    `}>
      {count}
    </span>
  </button>
);

