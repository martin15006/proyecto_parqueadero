import React from 'react';

interface Alert {
  id: string;
  tipo: string;
  mensaje: string;
  fecha: Date;
}

interface AlertPanelProps {
  alerts: Alert[];
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="bg-gray-800/50 px-5 py-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Alertas del Sistema
        </h3>
        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-bold uppercase">Sin alertas activas</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-xl border flex gap-3 items-start transition-all animate-in fade-in slide-in-from-right-5 ${
                alert.tipo === 'EMERGENCIA' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-orange-500/10 border-orange-500/30'
              }`}
            >
              <div className={`p-2 rounded-lg ${alert.tipo === 'EMERGENCIA' ? 'bg-red-500' : 'bg-orange-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black uppercase mb-0.5 ${alert.tipo === 'EMERGENCIA' ? 'text-red-500' : 'text-orange-500'}`}>
                  {alert.tipo}
                </p>
                <p className="text-xs text-gray-300 font-medium leading-tight">
                  {alert.mensaje}
                </p>
                <p className="text-[9px] text-gray-500 mt-2 font-mono">
                  {new Date(alert.fecha).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
