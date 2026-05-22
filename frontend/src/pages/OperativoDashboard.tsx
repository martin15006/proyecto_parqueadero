import React from 'react';
import { useOperativo } from '../hooks/useOperativo';
import { OperativoHeader } from '../components/OperativoHeader';
import { ParkingStats } from '../components/ParkingStats';
import { ParkingGrid } from '../components/ParkingGrid';
import { ActiveVehiclesTable } from '../components/ActiveVehiclesTable';
import { AlertPanel } from '../components/AlertPanel';
import { MovementForm } from '../components/MovementForm';
import { useNotification } from '../contexts/NotificationContext';

/**
 * Dashboard Operativo (Vista Principal).
 * Presenta una interfaz de alta disponibilidad para el control de ingresos y salidas.
 * Refactorizado para separar la lógica de negocio en el hook useOperativo.
 */
export const OperativoDashboard: React.FC = () => {
  const { 
    stats, 
    bahias, 
    vehiculos, 
    alerts, 
    loading,
    handleQuickSalida 
  } = useOperativo();

  const { showNotification } = useNotification();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Sincronizando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <OperativoHeader />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* FEATURE: Indicadores de Rendimiento (KPIs) en tiempo real */}
        <ParkingStats {...stats} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* FEATURE: Panel de Control y Monitoreo de Seguridad */}
          <div className="xl:col-span-4 space-y-6 flex flex-col">
            <MovementForm 
              onSuccess={(msg) => showNotification(msg, 'success')} 
              onError={(msg) => showNotification(msg, 'error')} 
            />
            
            {/* FEATURE: Panel de Alertas y Eventos Críticos */}
            <div className="flex-1 min-h-[300px]">
              <AlertPanel alerts={alerts} />
            </div>
          </div>

          {/* Mapa de Infraestructura y Tabla de Gestión de Activos */}
          <div className="xl:col-span-8 space-y-6 flex flex-col">
            <div className="flex-1">
              <ParkingGrid bahias={bahias} />
            </div>
            <div className="flex-1">
              <ActiveVehiclesTable 
                vehiculos={vehiculos} 
                onSalida={handleQuickSalida} 
              />
            </div>
          </div>
        </div>
      </main>

      {/* Barra de Estado del Sistema */}
      <footer className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center sm:text-left">
          Sistema Institucional de Gestión de Parqueadero &copy; 2026 | Refactor Enterprise-Ready
        </p>
        <div className="flex items-center gap-6">
          <StatusIndicator label="API Status" color="bg-green-500" />
          <StatusIndicator label="Socket Stream" color="bg-blue-500" />
        </div>
      </footer>
    </div>
  );
};

/**
 * Subcomponente para indicadores de estado en el footer.
 */
const StatusIndicator: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-2">
    <span className={`w-1.5 h-1.5 rounded-full ${color}`}></span>
    <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{label}: Active</span>
  </div>
);
