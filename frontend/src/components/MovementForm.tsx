import React, { useState, useRef, useEffect } from 'react';
import { operativoService } from '../services/operativo.service';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Search, LogIn, LogOut, AlertCircle, ScanLine, FileText } from 'lucide-react';

interface MovementFormProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface FeedbackState {
  type: 'success' | 'error' | 'loading' | null;
  message: string;
}

interface OperativoResponse {
  ok: boolean;
  mensaje: string;
  bahia: string;
  movimiento?: unknown;
}

interface QrResponse {
  usuario: {
    nombreCompleto: string;
  };
  vehiculos: Array<{
    placa: string;
  }>;
}

/**
 * FEATURE: MovementForm - Control de ingresos/salidas con escaneo híbrido y contingencia (RF33, RF34)
 * REFACTOR: Eliminación de placeholders y conexión real a backend con feedback visual profesional.
 */
export const MovementForm: React.FC<MovementFormProps> = ({ onSuccess, onError }) => {
  const [inputValue, setInputValue] = useState('');
  const [motivo, setMotivo] = useState('');
  const [showContingencia, setShowContingencia] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' });
  
  // UX: Referencia para el input de escaneo (simula lector de barras/QR USB)
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * UX: Auto-foco permanente para operación manos libres (RF33)
   * Los lectores físicos USB emulan un teclado rápido + 'Enter'.
   */
  useEffect(() => {
    const focusInput = () => {
      // Solo enfocar si no se está escribiendo el motivo de contingencia
      if (!showContingencia) {
        inputRef.current?.focus();
      }
    };
    
    focusInput();
    
    // Re-enfocar si el usuario hace clic en el contenedor principal o vuelve a la pestaña
    const handleGlobalFocus = () => focusInput();
    window.addEventListener('focus', handleGlobalFocus);
    
    // Limpieza de feedback automático después de 5 segundos si es éxito
    let timeout: ReturnType<typeof setTimeout>;
    if (feedback.type === 'success') {
      timeout = setTimeout(() => setFeedback({ type: null, message: '' }), 5000);
    }

    return () => {
      window.removeEventListener('focus', handleGlobalFocus);
      if (timeout) clearTimeout(timeout);
    };
  }, [feedback.type, showContingencia]);

  const clearState = () => {
    setInputValue('');
    setMotivo('');
    setShowContingencia(false);
    setFeedback({ type: null, message: '' });
    // Pequeño delay para asegurar que el DOM se actualice antes del foco
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  /**
   * Orquestador de acciones operativas.
   * Conecta con los endpoints reales del backend.
   */
  const handleAction = async (action: 'entrada' | 'salida' | 'manual' | 'qr', value?: string) => {
    const targetValue = (value || inputValue).trim();
    
    if (!targetValue && action !== 'qr') {
      setFeedback({ type: 'error', message: 'LA PLACA O CÓDIGO ES OBLIGATORIO' });
      return;
    }

    setFeedback({ type: 'loading', message: 'COMUNICANDO WITH SERVIDOR...' });
    
    try {
      switch (action) {
        case 'entrada':
          const resEntrada: OperativoResponse = await operativoService.registrarEntrada(targetValue);
          setFeedback({ 
            type: 'success', 
            message: `¡INGRESO AUTORIZADO! Bahía Asignada: ${resEntrada.bahia}` 
          });
          onSuccess(`Ingreso: ${targetValue} -> ${resEntrada.bahia}`);
          clearState();
          break;

        case 'salida':
          await operativoService.registrarSalida(targetValue);
          setFeedback({ 
            type: 'success', 
            message: `¡SALIDA REGISTRADA! Vehículo ${targetValue} retirado.` 
          });
          onSuccess(`Salida: ${targetValue}`);
          clearState();
          break;

        case 'manual':
          if (!motivo || motivo.length < 10) {
            throw new Error('EL MOTIVO DEBE TENER AL MENOS 10 CARACTERES');
          }
          const resManual: OperativoResponse = await operativoService.registrarIngresoManual(targetValue, motivo);
          setFeedback({ 
            type: 'success', 
            message: `¡CONTINGENCIA REGISTRADA! Bahía: ${resManual.bahia}` 
          });
          onSuccess(`Manual: ${targetValue} -> ${resManual.bahia}`);
          clearState();
          break;

        case 'qr':
          const resQr: QrResponse = await operativoService.escanearQr(targetValue);
          if (resQr.vehiculos && resQr.vehiculos.length > 0) {
            const qrPlaca = resQr.vehiculos[0].placa;
            setInputValue(qrPlaca);
            setFeedback({ 
              type: 'success', 
              message: `QR VÁLIDO: ${resQr.usuario.nombreCompleto}. PLACA: ${qrPlaca}` 
            });
          } else {
            setFeedback({ 
              type: 'error', 
              message: `USUARIO ${resQr.usuario.nombreCompleto} SIN VEHÍCULOS REGISTRADOS` 
            });
            setInputValue('');
          }
          break;
      }
    } catch (error: any) {
      const errorMsg = error.message || 'ERROR EN LA OPERACIÓN';
      setFeedback({ type: 'error', message: errorMsg.toUpperCase() });
      onError(errorMsg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (inputValue.length > 15 || inputValue.startsWith('QR_')) {
        handleAction('qr');
      } else if (inputValue.length >= 4) {
        handleAction('entrada');
      }
    }
  };

  const handleEmergencia = async () => {
    if (!window.confirm('¿CONFIRMA SALIDA DE EMERGENCIA GLOBAL?')) return;
    setFeedback({ type: 'loading', message: 'ACTIVANDO PROTOCOLO DE EMERGENCIA...' });
    try {
      await operativoService.salidaEmergencia();
      setFeedback({ type: 'success', message: '¡EMERGENCIA! TODAS LAS BAHÍAS LIBERADAS.' });
      onSuccess('Protocolo de emergencia ejecutado');
      clearState();
    } catch (error: any) {
      setFeedback({ type: 'error', message: 'ERROR AL ACTIVAR EMERGENCIA' });
    }
  };

  return (
    <div 
      className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] relative overflow-hidden shadow-2xl transition-all"
      onClick={() => !showContingencia && inputRef.current?.focus()}
    >
      {/* Feedback Banners */}
      {feedback.type && (
        <div className={`absolute top-0 left-0 w-full p-4 text-center text-[10px] font-black z-20 animate-slide-down border-b shadow-2xl transition-all ${
          feedback.type === 'success' ? 'bg-green-500 text-white border-green-400' :
          feedback.type === 'error' ? 'bg-red-600 text-white border-red-500' :
          'bg-blue-600 text-white border-blue-500'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <ScanLine size={24} className="text-blue-500" /> Control de Acceso
            </h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Escaneo Híbrido Activo</p>
          </div>
          <Badge variant={feedback.type === 'loading' ? 'info' : 'success'}>
            {feedback.type === 'loading' ? 'Sincronizando' : 'Sistema Listo'}
          </Badge>
        </header>

        <div className="space-y-4">
          <Input 
            ref={inputRef}
            placeholder="Escanear QR o Digitar Placa..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={feedback.type === 'loading'}
            icon={<Search size={20} className="text-gray-400" />}
            className="!bg-gray-800 !border-gray-700 !text-white !placeholder-gray-600 !h-16 !text-lg !rounded-3xl focus:!border-blue-600"
          />

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="primary" 
              className="h-16 text-sm"
              onClick={() => handleAction('entrada')}
              isLoading={feedback.type === 'loading'}
            >
              <LogIn size={20} className="mr-2" /> ENTRADA
            </Button>
            <Button 
              variant="secondary" 
              className="h-16 text-sm border border-gray-700"
              onClick={() => handleAction('salida')}
              isLoading={feedback.type === 'loading'}
            >
              <LogOut size={20} className="mr-2" /> SALIDA
            </Button>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              onClick={() => setShowContingencia(!showContingencia)}
              className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={14} /> {showContingencia ? 'Ocultar Contingencia' : '¿Problemas con el sensor? Registro Manual'}
            </button>

            {showContingencia && (
              <div className="space-y-3 animate-fade-in p-6 bg-gray-800/50 rounded-[2rem] border border-gray-700/50">
                <Input 
                  label="Motivo de la Contingencia"
                  placeholder="Mínimo 10 caracteres..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="!bg-gray-900 !border-gray-800 !text-white"
                />
                <Button 
                  variant="outline" 
                  className="w-full !border-orange-500/50 !text-orange-500 hover:!bg-orange-500/10"
                  onClick={() => handleAction('manual')}
                  isLoading={feedback.type === 'loading'}
                >
                  Confirmar Registro Manual
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-800">
          <button 
            onClick={handleEmergencia}
            className="w-full py-4 rounded-2xl border-2 border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
          >
            <AlertCircle size={16} /> Protocolo de Emergencia
          </button>
        </div>
      </div>
    </div>
  );
};
