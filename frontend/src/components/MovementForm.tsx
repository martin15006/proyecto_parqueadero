import React, { useState } from 'react';
import { operativoService } from '../services/operativo.service';

interface MovementFormProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

// FIX: MovementForm - Control de ingresos/salidas con validaciones y loading states
export const MovementForm: React.FC<MovementFormProps> = ({ onSuccess, onError }) => {
  const [placa, setPlaca] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return onError('La placa es obligatoria');
    
    setLoading(true);
    try {
      const res = await operativoService.registrarEntrada(placa);
      onSuccess(`Ingreso exitoso: Bahía ${res.bahia}`);
      setPlaca('');
    } catch (error: any) {
      onError(error.response?.data?.message || 'Error al registrar entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa) return onError('La placa es obligatoria');

    setLoading(true);
    try {
      await operativoService.registrarSalida(placa);
      onSuccess(`Salida registrada correctamente para ${placa}`);
      setPlaca('');
    } catch (error: any) {
      onError(error.response?.data?.message || 'Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  const handleScanQr = async () => {
    const qr = window.prompt('Escanee el código QR del usuario (Simulado):');
    if (!qr) return;

    setLoading(true);
    try {
      const res = await operativoService.escanearQr(qr);
      if (res.vehiculos && res.vehiculos.length > 0) {
        const selectedPlaca = res.vehiculos[0].placa;
        setPlaca(selectedPlaca);
        onSuccess(`QR válido: Usuario ${res.usuario.nombre}. Vehículo detectado: ${selectedPlaca}`);
      } else {
        onSuccess(`QR válido: Usuario ${res.usuario.nombre}, pero no tiene vehículos registrados.`);
      }
    } catch (error: any) {
      onError(error.response?.data?.message || 'Código QR inválido o no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencia = async () => {
    if (!window.confirm('¿CONFIRMA SALIDA DE EMERGENCIA GLOBAL? Se liberarán todas las bahías.')) return;
    
    setLoading(true);
    try {
      await operativoService.salidaEmergencia();
      onSuccess('PROTOCOLO DE EMERGENCIA ACTIVADO: Todas las bahías liberadas');
    } catch (error: any) {
      onError('Error al activar protocolo de emergencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
      <h3 className="text-gray-400 text-xs font-bold uppercase mb-6 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
        Control de Movimientos
      </h3>

      <div className="space-y-6">
        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block tracking-widest">
            Placa del Vehículo
          </label>
          <input 
            type="text" 
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="PVP-000"
            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-4 text-3xl font-black text-center tracking-[0.2em] focus:border-blue-500 outline-none transition-all placeholder:text-gray-800"
            maxLength={7}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleEntrada}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            {loading ? '...' : 'REGISTRAR ENTRADA'}
          </button>
          <button 
            onClick={handleSalida}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm transition-all active:scale-95 border border-gray-700"
          >
            {loading ? '...' : 'REGISTRAR SALIDA'}
          </button>
        </div>

        <button 
          onClick={handleScanQr}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          ESCANEAR CÓDIGO QR
        </button>

        <div className="pt-4 border-t border-gray-800 flex flex-col gap-3">
          <button 
            className="w-full bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white py-3 rounded-xl font-bold text-xs transition-all border border-orange-500/20"
            onClick={() => alert('Función de escaneo QR pendiente de integración con cámara')}
          >
            ESCANEAR QR USUARIO
          </button>
          <button 
            onClick={handleEmergencia}
            disabled={loading}
            className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-3 rounded-xl font-black text-xs transition-all active:scale-95 border border-red-600/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            SALIDA DE EMERGENCIA GLOBAL
          </button>
        </div>
      </div>
    </div>
  );
};
