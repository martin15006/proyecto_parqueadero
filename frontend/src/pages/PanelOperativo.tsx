import React, { useState } from 'react';
import { useOperativo } from '../hooks/useOperativo';
import { operativoService } from '../services/operativo.service';
import { MapaBahias } from '../components/MapaBahias';
import { TablaMovimientos } from '../components/TablaMovimientos';
import { socketService } from '../services/socket.service';

/**
 * Panel Operativo de Control.
 * FEATURE: Centraliza la gestión de ingresos, salidas y monitoreo de infraestructura.
 * SOCKET: Sincronizado en tiempo real con el estado de las bahías.
 */
export const PanelOperativo: React.FC = () => {
  const { 
    stats, 
    bahias, 
    vehiculos, 
    alerts, 
    loading: initialLoading, 
    toast, 
    showToast,
    refresh
  } = useOperativo();
  
  const [placa, setPlaca] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isConnected = socketService.isConnected;

  /**
   * Procesa el registro de entrada de un vehículo.
   * API: POST /operativo/registrar-entrada.
   */
  const handleEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return;
    setActionLoading(true);
    try {
      const res = await operativoService.registrarEntrada(placa);
      showToast(`Entrada registrada: Bahía ${res.bahia}`, 'success');
      setPlaca('');
      refresh();
    } catch (error: any) {
      showToast(error.message || error.response?.data?.message || 'Error en entrada', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Procesa el registro de salida de un vehículo.
   * API: POST /operativo/registrar-salida.
   */
  const handleSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return;
    setActionLoading(true);
    try {
      await operativoService.registrarSalida(placa);
      showToast(`Salida registrada correctamente`, 'success');
      setPlaca('');
      refresh();
    } catch (error: any) {
      showToast(error.message || error.response?.data?.message || 'Error en salida', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Activa el protocolo de liberación masiva de bahías.
   * SECURITY: Requiere confirmación explícita del operador.
   */
  const handleEmergencia = async () => {
    if (!window.confirm('¿ESTÁ SEGURO DE ACTIVAR LA SALIDA DE EMERGENCIA?')) return;
    try {
      await operativoService.salidaEmergencia();
      showToast('Protocolo de emergencia activado', 'error');
      refresh();
    } catch (error) {
      showToast('Error activando emergencia', 'error');
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-black text-blue-500 uppercase tracking-tighter">Panel Operativo</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
            <span className="text-[10px] text-gray-500 uppercase font-bold">{isConnected ? 'En línea' : 'Desconectado'}</span>
          </div>
        </div>
        <button 
          onClick={handleEmergencia}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-black text-sm transition-all active:scale-95 shadow-lg shadow-red-900/20"
        >
          SALIDA EMERGENCIA
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <h3 className="text-gray-500 text-xs font-bold uppercase mb-4">Ocupación Realtime</h3>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-black">{stats.ocupados}</span>
              <span className="text-gray-600 text-xl font-bold"> / {stats.total}</span>
            </div>
            <div className="text-right">
              <span className="text-green-500 font-bold block">{stats.disponibles}</span>
              <span className="text-[10px] text-gray-600 uppercase">Disponibles</span>
            </div>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-500" 
              style={{ width: `${(stats.ocupados / (stats.total || 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <h3 className="text-gray-500 text-xs font-bold uppercase mb-4">Control de Acceso</h3>
          <form className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-gray-600 uppercase font-bold mb-1 block">Placa del Vehículo</label>
              <input 
                type="text" 
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-xl font-black tracking-widest focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleEntrada}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-sm transition-all"
              >
                {actionLoading ? '...' : 'ENTRADA'}
              </button>
              <button 
                onClick={handleSalida}
                disabled={actionLoading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-sm transition-all"
              >
                {actionLoading ? '...' : 'SALIDA'}
              </button>
            </div>
          </form>
          {toast && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-bold ${toast.tipo === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <section className="xl:col-span-3">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Mapa de Bahías
          </h2>
          <MapaBahias bahias={bahias} />
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
              Alertas
            </h2>
            <div className="flex flex-col gap-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-gray-600 uppercase font-bold">Sin alertas activas</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="bg-gray-900 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                    <p className="text-[10px] font-black text-yellow-500 uppercase">{alert.tipo}</p>
                    <p className="text-xs font-bold mt-1">{alert.mensaje}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-green-500 rounded-full"></span>
              Vehículos Activos
            </h2>
            <TablaMovimientos movimientos={vehiculos} />
          </div>
        </section>
      </div>
    </div>
  );
};
