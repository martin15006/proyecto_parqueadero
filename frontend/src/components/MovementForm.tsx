import { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { AlertCircle, Car, CheckCircle2, FileText, Hash, ScanLine, ShieldAlert, XCircle } from 'lucide-react';
import { operativoService } from '../services/operativo.service'; // RF10/RF14: integración real con backend operativo (entrada/salida/contingencia).
import { socketService } from '../services/socket.service';

interface MovementFormProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export interface MovementFormHandle {
  activateManualMode: () => void;
}

interface FeedbackState {
  type: 'success' | 'error' | 'loading' | null;
  message: string;
}

interface OperativoResponse {
  ok: boolean; // RF33: indica éxito de la operación (feedback verde/rojo).
  mensaje: string; // RF33: mensaje semántico para mostrar al vigilante.
  bahia?: string; // RF33: bahía asignada cuando hay ingreso.
  movimiento?: {
    horaIngreso?: string;
    horaSalida?: string;
  }; // RF32: el backend persiste el movimiento y lo retorna opcionalmente.
  aprendiz?: {
    nombreCompleto: string;
    documento: string;
    fotoPersona: string;
  };
  vehiculo?: {
    placa: string;
    tipoVehiculo?: string;
    color?: string;
    fotoVehiculo: string;
    fotoTarjetaP: string;
    fotoPlaca: string;
  };
}

type TurnoIngresoRow = {
  placa: string;
  horaIngreso: string;
  tipoVehiculo: string;
};

type VehiculoSeleccionable = {
  placa: string; // RF31: identificador mínimo para selección manual.
  tipoVehiculo: string; // RF31: muestra tipo existente en el sistema (no inventa modelo/marca).
  color: string; // RF31: apoyo visual para confirmar el vehículo observado.
};

type EscaneoCodigoAutoResponse = OperativoResponse & {
  modo: 'AUTO'; // RF31: ingreso automático (un solo vehículo).
};

type EscaneoCodigoSeleccionResponse = {
  ok: boolean; // RF31: operación de escaneo exitosa, pero requiere selección.
  modo: 'SELECCION'; // RF31: múltiples vehículos => modal de selección obligatorio.
  aprendiz: {
    nombreCompleto: string;
    documento: string;
    fotoPersona: string;
  }; // RF33: feedback visual.
  codigo: string; // RF31: se reenvía en la confirmación sin mantener estado server-side.
  vehiculos: VehiculoSeleccionable[]; // RF31: lista para elegir.
};

type EscaneoCodigoResponse = EscaneoCodigoAutoResponse | EscaneoCodigoSeleccionResponse;

type InfoPlacaResponse = {
  vehiculo: {
    placa: string;
    color: string;
    tipoVehiculo: string;
    fotoVehiculo: string;
    fotoTarjetaP: string;
    fotoPlaca: string | null;
  };
  usuariosAutorizados: Array<{
    documento: string;
    nombreCompleto: string;
    fotoPersona: string;
    rol: 'PROPIETARIO' | 'COMPARTIDO';
  }>;
  movimientoActivo: {
    idMovimiento: number;
    documentoIngreso: string | null;
    nombreIngreso: string | null;
  } | null;
};

/**
 * FEATURE: MovementForm - Control de ingresos/salidas con escaneo híbrido y contingencia (RF33, RF34).
 * UI alineada a la estética institucional compacta (paleta #012E25 / #39B000 con modo oscuro);
 * conserva intactos los flujos del backend: info-placa, multivehículo, contingencia y evidencias.
 */
export const MovementForm = forwardRef<MovementFormHandle, MovementFormProps>(({ onSuccess, onError }, ref) => {
  const [inputValue, setInputValue] = useState<string>(''); // RF10/RF11/RF14: entrada única (placa o token escaneado) para flujo operativo.
  const [motivo, setMotivo] = useState<string>(''); // RF34: motivo requerido en registro manual (contingencia).
  const [showContingencia, setShowContingencia] = useState<boolean>(false); // RF34: UI para habilitar/deshabilitar contingencia.
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' }); // RF14/RF39: feedback semántico (permitido/denegado/bloqueado).
  const [multiVehiculos, setMultiVehiculos] = useState<VehiculoSeleccionable[] | null>(null); // RF31: lista para selección si el aprendiz tiene múltiples vehículos.
  const [codigoPendiente, setCodigoPendiente] = useState<string>(''); // RF31: token escaneado a reenviar en confirmación secundaria.
  const [aprendizPendiente, setAprendizPendiente] = useState<string>(''); // RF31/RF33: nombre visible del aprendiz para confirmación humana.
  const [feedbackOverlayOpen, setFeedbackOverlayOpen] = useState<boolean>(false); // RF33: overlay masivo para lectura a distancia.
  const [lastResponse, setLastResponse] = useState<OperativoResponse | null>(null);
  const [turnoIngresos, setTurnoIngresos] = useState<TurnoIngresoRow[]>([]);
  const [turnoLoading, setTurnoLoading] = useState<boolean>(true);

  // Estado para el modal de selección de usuario (cuando el vehículo está compartido)
  const [infoPlaca, setInfoPlaca] = useState<InfoPlacaResponse | null>(null);

  const inputRef = useRef<HTMLInputElement>(null); // RF33: foco permanente en el input (lector emula teclado).
  const motivoRef = useRef<HTMLInputElement>(null); // RF34: referencia para el input de motivo (contingencia).
  const scannerBufferRef = useRef<string>(''); // RF33: buffer local para capturar ráfagas del lector (keyboard wedge) cuando el foco se pierde.
  const lastScanKeyAtRef = useRef<number>(0); // RF33: timestamp del último carácter recibido; permite detectar ráfagas y reconstruir el código completo.
  const lastInputChangeAtRef = useRef<number>(0); // RF33: timestamp del último onChange del input para detectar nueva ráfaga del lector.

  useImperativeHandle(ref, () => ({
    activateManualMode: () => {
      setShowContingencia(true);
      setTimeout(() => motivoRef.current?.focus(), 100);
    },
  }));

  async function loadTurnoIngresos() {
    try {
      const res: any = await operativoService.resumenTurno();
      const ingresos = Array.isArray(res?.turno?.ingresos) ? (res.turno.ingresos as TurnoIngresoRow[]) : [];
      setTurnoIngresos(ingresos);
    } catch {
    } finally {
      setTurnoLoading(false);
    }
  }

  useEffect(() => {
    loadTurnoIngresos();

    const onEvento = () => loadTurnoIngresos();
    socketService.on('vehiculo_ingresado', onEvento);
    socketService.on('vehiculo_retirado', onEvento);

    const interval = window.setInterval(() => loadTurnoIngresos(), 5000);
    return () => {
      window.clearInterval(interval);
      socketService.off('vehiculo_ingresado', onEvento);
      socketService.off('vehiculo_retirado', onEvento);
    };
  }, []);

  /**
   * UX: Auto-foco permanente para operación manos libres (RF33)
   * Los lectores físicos USB emulan un teclado rápido + 'Enter'.
   */
  useEffect(() => {
    const focusScanInput = () => { // RF33: función central para forzar foco "mouse-free".
      if (showContingencia) return; // RF34: si el operador está escribiendo motivo, no robamos el foco.
      inputRef.current?.focus(); // RF33: enfoque directo al input de lectura (lector físico).
    };

    focusScanInput(); // RF33: foco inicial al montar para comenzar operación inmediata.

    const handleWindowFocus = () => focusScanInput(); // RF33: si el usuario vuelve a la pestaña, retoma foco al lector.
    window.addEventListener('focus', handleWindowFocus);

    const handleGlobalKeys = (e: KeyboardEvent) => { // RF33: atajos globales para operación sin mouse.
      if (e.key === 'F2') { // RF33: F2 fuerza el foco al lector en cualquier momento.
        e.preventDefault();
        focusScanInput();
        return;
      }

      if (e.key === 'Escape') { // RF33: ESC limpia campo y prepara el siguiente escaneo.
        e.preventDefault();
        setInputValue('');
        setFeedback({ type: null, message: '' });
        setFeedbackOverlayOpen(false);
        setMultiVehiculos(null);
        setCodigoPendiente('');
        setAprendizPendiente('');
        setInfoPlaca(null); // Cierra el modal de selección de usuario manual
        setTimeout(() => focusScanInput(), 0);
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      }

      if (showContingencia || multiVehiculos || infoPlaca || feedback.type === 'loading') {
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const activeTag = active?.tagName?.toUpperCase() ?? '';
      const isEditable =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        Boolean((active as any)?.isContentEditable);
      const scanFocused = active === inputRef.current;

      if (isEditable && !scanFocused) {
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      }

      const isChar = e.key.length === 1 && /^[0-9a-zA-Z-]$/.test(e.key);
      const now = Date.now();
      const last = lastScanKeyAtRef.current;
      const gap = last ? now - last : 0;

      if (!scanFocused && isChar) {
        if (gap > 200) {
          scannerBufferRef.current = '';
        }
        lastScanKeyAtRef.current = now;
        scannerBufferRef.current += e.key;
        focusScanInput();
        return;
      }

      if (!scanFocused && e.key === 'Enter') {
        const buffered = scannerBufferRef.current.replace(/[- ]/g, '').toUpperCase();
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        if (!buffered.length) return;
        e.preventDefault();
        focusScanInput();
        setInputValue(buffered);
        handleAction('codigo', buffered);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);

    // Los overlays NO se cierran solos por tiempo. Solo se cierran cuando:
    //  - El operativo presiona "Autorizar y cerrar" / clic en el aviso
    //  - El operativo presiona ESC
    //  - Se inicia una nueva acción (handleAction) que limpia el estado al comenzar

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleGlobalKeys);
    };
  }, [feedback.type, lastResponse, showContingencia, multiVehiculos, infoPlaca, handleAction]);

  const clearState = () => {
    setInputValue('');
    setMotivo('');
    setShowContingencia(false);
    setMultiVehiculos(null);
    setCodigoPendiente('');
    setAprendizPendiente('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeFeedback = () => {
    setFeedback({ type: null, message: '' });
    setFeedbackOverlayOpen(false);
    setLastResponse(null);
    // Prepara el input para el siguiente escaneo
    setInputValue('');
    scannerBufferRef.current = '';
    lastScanKeyAtRef.current = 0;
    lastInputChangeAtRef.current = 0;
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  /**
   * Orquestador de acciones operativas.
   * Conecta con los endpoints reales del backend.
   */
  async function handleAction(action: 'entrada' | 'salida' | 'manual' | 'codigo', value?: string) {
    const targetValue = String(value ?? inputValue).trim(); // RF33: normaliza string proveniente del lector o del teclado.
    const identificacionLimpia = targetValue.replace(/[- ]/g, '').toUpperCase();

    if (!targetValue && action !== 'codigo') { // RF33: validación de entrada mínima.
      setFeedback({ type: 'error', message: 'LA PLACA O CÓDIGO ES OBLIGATORIO' });
      setFeedbackOverlayOpen(true);
      return;
    }

    // Cierra cualquier modal/feedback anterior antes de empezar la nueva operación.
    setLastResponse(null);
    setFeedbackOverlayOpen(false);
    setFeedback({ type: 'loading', message: 'COMUNICANDO CON EL SERVIDOR...' });

    try {
      const upper = targetValue.toUpperCase(); // RF33: normalización para evaluar formatos.

      switch (action) {
        case 'entrada': {
          // Si la placa tiene varios usuarios autorizados (compartidos), preguntar quién entra.
          const info: InfoPlacaResponse = await operativoService.obtenerInfoPlaca(upper);

          if (info.usuariosAutorizados.length > 1 && !info.movimientoActivo) {
            // Múltiples usuarios autorizados → mostrar modal para elegir
            setInfoPlaca(info);
            setFeedback({ type: null, message: '' });
            return;
          }

          // Un solo usuario o ya hay movimiento activo → ingreso directo (sin documentoIngreso → backend asume propietario)
          const resEntrada: OperativoResponse = await operativoService.registrarEntrada(upper);
          setFeedback({ type: 'success', message: resEntrada.mensaje });
          setLastResponse(resEntrada);
          setFeedbackOverlayOpen(true);
          onSuccess(`Ingreso: ${targetValue}`);
          loadTurnoIngresos();
          setInputValue('');
          setMotivo('');
          setShowContingencia(false);
          break;
        }

        case 'salida': {
          const resSalida: OperativoResponse = await operativoService.registrarSalida(upper); // RF11: registra salida por placa (normalizada).
          setFeedback({ type: 'success', message: resSalida.mensaje });
          setLastResponse(resSalida);
          setFeedbackOverlayOpen(true); // RF33: muestra overlay verde para confirmación.
          onSuccess(`Salida: ${targetValue}`);
          loadTurnoIngresos();
          setInputValue('');
          setMotivo('');
          setShowContingencia(false);
          break;
        }

        case 'manual': {
          if (!motivo || motivo.length < 10) {
            throw new Error('EL MOTIVO DEBE TENER AL MENOS 10 CARACTERES');
          }
          const resManual: OperativoResponse = await operativoService.registrarIngresoManual(identificacionLimpia, motivo); // RF34: registro manual con motivo.
          setFeedback({ type: 'success', message: resManual.mensaje });
          setLastResponse(resManual);
          setFeedbackOverlayOpen(true); // RF33: overlay para confirmación.
          onSuccess(`Manual: ${targetValue} -> ${resManual.bahia}`);
          loadTurnoIngresos();
          setInputValue('');
          setMotivo('');
          setShowContingencia(false);
          break;
        }

        case 'codigo': {
          const resCodigo: EscaneoCodigoResponse = await operativoService.escanearCodigo(upper); // RF33: identifica aprendiz por token opaco.

          if (resCodigo.modo === 'AUTO') { // RF31: un solo vehículo => ingreso/salida directo.
            setFeedback({ type: 'success', message: resCodigo.mensaje });
            setLastResponse(resCodigo);
            setFeedbackOverlayOpen(true); // RF33: overlay verde masivo.
            onSuccess(resCodigo.mensaje);
            loadTurnoIngresos();
            setInputValue('');
            setMotivo('');
            setShowContingencia(false);
          } else { // RF31: múltiples vehículos => abre modal de selección.
            setMultiVehiculos(resCodigo.vehiculos);
            setCodigoPendiente(resCodigo.codigo);
            setAprendizPendiente(resCodigo.aprendiz?.nombreCompleto || 'USUARIO DESCONOCIDO');
            setLastResponse(null);
            setFeedback({ type: null, message: '' });
          }
          break;
        }
      }
    } catch (error: any) {
      const msg = error.message || error.response?.data?.message || 'ERROR DE COMUNICACIÓN CON EL SERVIDOR';
      setFeedback({ type: 'error', message: msg.toUpperCase() }); // RF39: feedback de error institucional.
      setFeedbackOverlayOpen(true); // RF33: overlay rojo.
      setLastResponse(null);
      onError(msg);
      // Limpia el input para que el siguiente escaneo no se acumule sobre el anterior
      setInputValue('');
      scannerBufferRef.current = '';
      lastScanKeyAtRef.current = 0;
      lastInputChangeAtRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAction('codigo'); // RF31/RF33: Enter desde lector (teclado emulado) dispara siempre el escaneo unificado.
    }
  };

  // Flag para evitar dobles confirmaciones por clicks rápidos
  const procesandoMultiRef = useRef<boolean>(false);

  /**
   * Confirma el ingreso manual de placa eligiendo qué usuario (propietario o
   * receptor compartido) está entrando con el vehículo.
   */
  async function handleConfirmarUsuarioManual(documento: string) {
    if (!infoPlaca) return;
    if (procesandoMultiRef.current) return;
    procesandoMultiRef.current = true;

    const placa = infoPlaca.vehiculo.placa;
    setInfoPlaca(null); // cierra el modal inmediatamente

    setFeedback({ type: 'loading', message: 'REGISTRANDO INGRESO...' });
    try {
      const resEntrada: OperativoResponse = await operativoService.registrarEntrada(placa, documento);
      setFeedback({ type: 'success', message: resEntrada.mensaje });
      setLastResponse(resEntrada);
      setFeedbackOverlayOpen(true);
      onSuccess(`Ingreso: ${placa}`);
      loadTurnoIngresos();
      setInputValue('');
      setMotivo('');
      setShowContingencia(false);
    } catch (error: any) {
      const msg = error.message || error.response?.data?.message || 'ERROR EN INGRESO';
      setFeedback({ type: 'error', message: msg.toUpperCase() });
      setFeedbackOverlayOpen(true);
      setLastResponse(null);
      onError(msg);
      setInputValue('');
      scannerBufferRef.current = '';
      lastScanKeyAtRef.current = 0;
      lastInputChangeAtRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      procesandoMultiRef.current = false;
    }
  }

  async function handleConfirmarMultivehiculo(placa: string) {
    // Protección contra doble click / doble confirmación
    if (procesandoMultiRef.current) return;
    procesandoMultiRef.current = true;

    // Cerramos el modal de selección INMEDIATAMENTE para que no se pueda
    // seleccionar otro vehículo mientras se procesa el primero.
    setMultiVehiculos(null);
    setCodigoPendiente('');
    setAprendizPendiente('');

    setFeedback({ type: 'loading', message: 'CONFIRMANDO SELECCIÓN...' });
    try {
      const res: OperativoResponse = await operativoService.confirmarIngresoMultivehiculo(codigoPendiente, placa);
      setFeedback({ type: 'success', message: res.mensaje });
      setLastResponse(res);
      setFeedbackOverlayOpen(true);
      onSuccess(res.mensaje);
      loadTurnoIngresos();
      setInputValue('');
      setMotivo('');
      setShowContingencia(false);
    } catch (error: any) {
      const msg = error.message || error.response?.data?.message || 'ERROR EN CONFIRMACIÓN';
      setFeedback({ type: 'error', message: msg.toUpperCase() });
      setFeedbackOverlayOpen(true);
      setLastResponse(null);
      onError(msg);
      setInputValue('');
      scannerBufferRef.current = '';
      lastScanKeyAtRef.current = 0;
      lastInputChangeAtRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      procesandoMultiRef.current = false;
    }
  }

  // RF33: El modal profesional se muestra cuando hay una respuesta exitosa.
  const showProfessionalModal = Boolean(feedback.type === 'success' && lastResponse);

  const horaTurno = useMemo(() => (iso: string) => {
    try {
      return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="space-y-6 relative" onClick={() => !showContingencia && !infoPlaca && !multiVehiculos && inputRef.current?.focus()}>
      {/* Overlay de Error o Carga — lectura a distancia */}
      {feedbackOverlayOpen && feedback.type && feedback.type !== 'success' && (
        <div
          className={`
            fixed inset-0 z-[150] flex items-center justify-center p-6
            animate-in fade-in duration-200 backdrop-blur-sm
            ${feedback.type === 'loading' ? 'bg-[#012E25]/95' : 'bg-red-900/95'}
          `}
          onClick={feedback.type === 'error' ? closeFeedback : undefined}
        >
          <div className="text-center text-white max-w-2xl space-y-6">
            <div className="flex justify-center">
              {feedback.type === 'loading' ? (
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <ScanLine size={60} strokeWidth={2} className="animate-pulse" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/20">
                  <XCircle size={60} strokeWidth={2} />
                </div>
              )}
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight uppercase break-words">
              {feedback.message}
            </h2>
            <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">
              {feedback.type === 'error' ? 'ESC o toque para cerrar • F2 enfocar' : 'Procesando, un momento...'}
            </p>
          </div>
        </div>
      )}

      {/* Input de Escaneo Compacto */}
      <div className="relative group max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <ScanLine className={`w-5 h-5 transition-colors ${inputValue ? 'text-[#39B000]' : 'text-gray-300 dark:text-gray-600 group-focus-within:text-[#39B000]'}`} />
        </div>
        <label className="sr-only" htmlFor="scan-input">Código o Placa</label>
        <input
          id="scan-input"
          ref={inputRef}
          type="text"
          placeholder="ESCANEAR O ESCRIBIR PLACA..."
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            // Distinguir entre escritura humana y ráfaga del lector físico:
            //  - Lector físico: dispara MUCHOS caracteres muy rápido (>= 4 chars
            //    de diferencia en un único onChange).
            //  - Humano: escribe 1 char por tecla.
            //
            // Solo cuando el lector envía una ráfaga grande mientras ya había contenido
            // (sobre-escribir un resultado previo), reemplazamos en vez de concatenar.
            const now = Date.now();
            const gap = now - lastInputChangeAtRef.current;
            const valorAnterior = inputValue;
            const valorNuevo = e.target.value.toUpperCase();
            const diff = valorNuevo.length - valorAnterior.length;

            const esRafagaLector = gap > 250 && valorAnterior.length > 0 && diff >= 4;

            if (esRafagaLector) {
              const nuevosCaracteres = valorNuevo.slice(valorAnterior.length);
              setInputValue(nuevosCaracteres);
            } else {
              setInputValue(valorNuevo);
            }
            lastInputChangeAtRef.current = now;
          }}
          onKeyDown={handleKeyDown}
          disabled={feedback.type === 'loading'}
          className={`
            w-full pl-12 pr-16 py-4 bg-gray-50 dark:bg-white/5 border-2 rounded-xl
            text-lg font-bold tracking-widest transition-all outline-none disabled:opacity-60
            ${feedback.type === 'error'
              ? 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600'
              : 'border-transparent focus:border-[#39B000] focus:bg-white dark:focus:bg-[#121212] text-[#012E25] dark:text-white'}
          `}
        />
        <div className="absolute inset-y-0 right-4 flex items-center gap-2">
          <div className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">F2</div>
        </div>
      </div>

      <p className="text-center text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest -mt-3">
        Lector físico en escucha activa • F2: Enfocar • ESC: Limpiar • Enter: Enviar
      </p>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        <button
          onClick={() => handleAction('entrada')}
          disabled={feedback.type === 'loading'}
          className="flex flex-col items-center justify-center gap-2 p-6 bg-[#39B000] text-white rounded-2xl hover:bg-[#007832] transition-all shadow-lg shadow-green-900/10 active:scale-95 group disabled:opacity-60"
        >
          <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Entrada</span>
        </button>
        <button
          onClick={() => handleAction('salida')}
          disabled={feedback.type === 'loading'}
          className="flex flex-col items-center justify-center gap-2 p-6 bg-[#012E25] text-white rounded-2xl hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95 group disabled:opacity-60"
        >
          <XCircle size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Salida</span>
        </button>
      </div>

      {/* Actividad Reciente Compacta — Vehículos ingresados en tu turno */}
      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ingresos de tu turno</h4>
          <span className={`text-[9px] font-bold uppercase tracking-widest ${turnoLoading ? 'text-orange-400 animate-pulse' : 'text-[#39B000] animate-pulse'}`}>
            {turnoLoading ? 'Cargando' : 'En vivo'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {turnoLoading ? (
            Array(2).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />)
          ) : turnoIngresos.length === 0 ? (
            <div className="col-span-full py-6 text-center border border-dashed border-gray-100 dark:border-white/5 rounded-xl">
              <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sin registros recientes</p>
            </div>
          ) : (
            turnoIngresos.slice(0, 6).map((ingreso, i) => (
              <div key={`${ingreso.placa}-${i}`} className="flex items-center gap-3 p-3 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/5 rounded-xl hover:border-gray-200 dark:hover:border-white/10 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-[#39B000] font-bold text-[10px] group-hover:bg-[#39B000] group-hover:text-white transition-all">
                  {ingreso.placa.substring(0, 2)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-[#012E25] dark:text-white leading-none truncate">{ingreso.placa}</p>
                  <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase truncate">
                    {(ingreso.tipoVehiculo || 'N/D')} • {horaTurno(ingreso.horaIngreso)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Registro Manual (Contingencia) */}
      <div className={`
        overflow-hidden transition-all duration-300 rounded-xl
        ${showContingencia ? 'max-h-[400px] border border-[#39B000]/20 bg-green-50/20 dark:bg-[#39B000]/5 p-6' : 'max-h-0'}
      `}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#012E25] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} /> Contingencia Manual
            </p>
            <span className="text-[8px] font-bold text-[#39B000] uppercase">Uso exclusivo sin lector QR</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Placa o Documento</label>
              <input
                type="text"
                placeholder="Identificación..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 focus:border-[#39B000] rounded-lg outline-none text-xs font-bold transition-all dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Motivo (mínimo 10 caracteres)</label>
              <input
                ref={motivoRef}
                type="text"
                placeholder="Ej: Falla del lector, visitante..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 focus:border-[#39B000] rounded-lg outline-none text-xs font-bold transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setShowContingencia(false); setMotivo(''); }}
              className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleAction('manual')}
              disabled={feedback.type === 'loading'}
              className="px-8 py-2 bg-[#39B000] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-green-900/10 active:scale-95 transition-all disabled:opacity-60"
            >
              Confirmar Registro
            </button>
          </div>
        </div>
      </div>

      {!showContingencia && (
        <button
          onClick={() => setShowContingencia(true)}
          className="w-full py-3 border border-dashed border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 rounded-xl text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-all"
        >
          + Activar Registro Manual
        </button>
      )}

      {/* Overlay: Selección de USUARIO en registro manual de placa (vehículo compartido) */}
      {infoPlaca && (
        <div className="fixed inset-0 z-[110] bg-[#012E25]/90 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-3xl my-auto overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#39B000] uppercase tracking-widest mb-1">Registro manual • Vehículo compartido</p>
                <h3 className="text-2xl font-bold text-[#012E25] dark:text-white tracking-widest">{infoPlaca.vehiculo.placa}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {infoPlaca.vehiculo.tipoVehiculo} • {infoPlaca.vehiculo.color}
                </p>
              </div>
              <button
                onClick={() => { setInfoPlaca(null); setFeedback({ type: null, message: '' }); }}
                className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 rounded-lg transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Galería de fotos del vehículo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FotoCard label="Vehículo" url={infoPlaca.vehiculo.fotoVehiculo} />
                <FotoCard label="Tarjeta de Propiedad" url={infoPlaca.vehiculo.fotoTarjetaP} />
                <FotoCard label="Foto de la Placa" url={infoPlaca.vehiculo.fotoPlaca} />
              </div>

              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Selecciona el usuario que está ingresando
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {infoPlaca.usuariosAutorizados.map((u) => (
                  <button
                    key={u.documento}
                    type="button"
                    onClick={() => handleConfirmarUsuarioManual(u.documento)}
                    disabled={feedback.type === 'loading'}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-[#39B000] hover:bg-green-50/30 dark:hover:bg-[#39B000]/10 transition-all group text-left disabled:opacity-60"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {u.fotoPersona ? (
                        <img src={u.fotoPersona} className="w-full h-full object-cover" alt={u.nombreCompleto} />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{u.nombreCompleto?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#012E25] dark:text-white truncate">{u.nombreCompleto}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">CC {u.documento}</p>
                      <span className={`mt-1 inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                        u.rol === 'PROPIETARIO'
                          ? 'bg-[#39B000]/10 text-[#39B000]'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {u.rol === 'PROPIETARIO' ? 'Propietario' : 'Compartido'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => { setInfoPlaca(null); setFeedback({ type: null, message: '' }); }}
                className="w-full text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-[9px] font-bold uppercase tracking-[0.3em] transition-colors"
              >
                [ ESC ] Cancelar operación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Selección de Vehículo (RF31) */}
      {multiVehiculos && (
        <div className="fixed inset-0 z-[100] bg-[#012E25]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#39B000] uppercase tracking-widest mb-1">Selección de Vehículo</p>
                <h3 className="text-lg font-bold text-[#012E25] dark:text-white">{aprendizPendiente}</h3>
              </div>
              <button onClick={clearState} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 rounded-lg transition-all">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-3">
              {multiVehiculos.map((v) => (
                <button
                  key={v.placa}
                  onClick={() => handleConfirmarMultivehiculo(v.placa)}
                  disabled={feedback.type === 'loading'}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-[#39B000] hover:bg-green-50/30 dark:hover:bg-[#39B000]/10 transition-all group text-left disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-[#39B000] group-hover:text-white transition-all">
                    <Car size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#012E25] dark:text-white">{v.placa}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{v.tipoVehiculo} • {v.color}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={clearState}
              className="w-full pb-5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-[9px] font-bold uppercase tracking-[0.3em] transition-colors"
            >
              [ ESC ] Cancelar operación
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Ingreso/Salida (Panel Profesional para el Vigilante) */}
      {showProfessionalModal && lastResponse && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl sm:rounded-[2rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] animate-in zoom-in duration-500 my-auto border border-white/20">
            {/* Header de Estado Ultra-Prominente */}
            <div className={`p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-b-[12px] ${lastResponse.movimiento?.horaSalida ? 'bg-orange-600 border-orange-700' : 'bg-[#012E25] border-[#39B000]'}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="bg-white/20 p-5 rounded-[2rem] shadow-2xl backdrop-blur-xl border border-white/30">
                  <CheckCircle2 size={60} className="text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-3">
                    <span className={`px-8 py-3 rounded-2xl text-2xl font-black uppercase tracking-[0.5em] shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${lastResponse.movimiento?.horaSalida ? 'bg-white text-orange-600' : 'bg-[#39B000] text-white'}`}>
                      {lastResponse.movimiento?.horaSalida ? 'SALIDA' : 'INGRESO'}
                    </span>
                    <p className="text-white/80 text-sm font-black uppercase tracking-[0.5em] border-l-4 border-white/30 pl-4">Confirmado</p>
                  </div>
                  <h3 className="text-white text-6xl sm:text-8xl font-black uppercase tracking-tighter leading-none filter drop-shadow-2xl mb-2">
                    {lastResponse.vehiculo?.placa}
                  </h3>
                  <p className="text-white/90 text-xl font-bold uppercase tracking-[0.2em]">{lastResponse.mensaje}</p>
                </div>
              </div>
              <button
                onClick={closeFeedback}
                className="group bg-white/10 hover:bg-white/20 p-6 rounded-[2rem] transition-all duration-300 shadow-xl border border-white/10"
              >
                <XCircle size={48} className="text-white/60 group-hover:text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="p-6 sm:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">

                {/* Columna Izquierda: Usuario y Tiempos */}
                <div className="lg:col-span-5 space-y-8 sm:space-y-12">

                  {/* Perfil del Usuario */}
                  <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 flex items-center gap-8 shadow-inner">
                    <div className="relative">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl bg-white">
                        {lastResponse.aprendiz?.fotoPersona ? (
                          <img
                            src={lastResponse.aprendiz.fotoPersona}
                            alt={lastResponse.aprendiz?.nombreCompleto}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[#012E25]/30">
                            <span className="text-7xl font-black">
                              {(lastResponse.aprendiz?.nombreCompleto || 'S').charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-[#39B000] text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl border-4 border-white">
                        VÁLIDO
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#39B000] text-xs font-black uppercase tracking-[0.3em] mb-2">Identidad del Usuario</p>
                      <h4 className="text-[#012E25] text-3xl sm:text-4xl font-black truncate leading-none mb-3">
                        {lastResponse.aprendiz?.nombreCompleto || 'USUARIO DESCONOCIDO'}
                      </h4>
                      <div className="inline-flex bg-slate-200/50 px-4 py-2 rounded-xl">
                        <p className="text-slate-600 font-black text-lg tracking-wider">
                          CC {lastResponse.aprendiz?.documento || '---'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tiempos de Operación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-center">
                      <p className="text-[#39B000] text-xs font-black uppercase tracking-[0.3em] mb-4">Hora de Registro</p>
                      <span className="text-white text-5xl font-black tracking-tighter tabular-nums leading-none mb-2">
                        {new Date(lastResponse.movimiento?.horaSalida || lastResponse.movimiento?.horaIngreso || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Servidor Local SENA</p>
                    </div>

                    {lastResponse.movimiento?.horaSalida && lastResponse.movimiento?.horaIngreso ? (
                      <div className="bg-orange-50 p-8 rounded-[2rem] border-4 border-orange-100 flex flex-col items-center justify-center text-center">
                        <p className="text-orange-600 text-xs font-black uppercase tracking-[0.3em] mb-4">Ingresó el Día</p>
                        <span className="text-orange-950 text-4xl font-black tracking-tighter tabular-nums leading-none mb-2">
                          {new Date(lastResponse.movimiento.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className="text-orange-600/60 text-[10px] font-bold uppercase tracking-widest">Entrada registrada</p>
                      </div>
                    ) : lastResponse.bahia ? (
                      <div className="bg-[#39B000]/10 p-8 rounded-[2rem] border-4 border-[#39B000]/20 flex flex-col items-center justify-center text-center">
                        <p className="text-[#39B000] text-xs font-black uppercase tracking-[0.3em] mb-4">Bahía Asignada</p>
                        <span className="text-[#012E25] text-6xl font-black tracking-tighter leading-none mb-2">{lastResponse.bahia}</span>
                        <p className="text-[#39B000]/60 text-[10px] font-bold uppercase tracking-widest">Zona Autorizada</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Columna Derecha: Galería de Inspección */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="flex items-center justify-between px-4">
                    <p className="text-[#012E25] text-sm font-black uppercase tracking-[0.5em] border-l-8 border-[#39B000] pl-4">
                      Evidencia del Registro
                    </p>
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldAlert size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Validación Requerida</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Foto Principal: Vehículo */}
                    <div className="col-span-2 relative group cursor-zoom-in">
                      <div className="absolute top-6 left-6 z-10 bg-[#012E25]/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl border border-white/20">
                        Vehículo Registrado
                      </div>
                      <div className="h-80 sm:h-96 rounded-[2rem] overflow-hidden border-8 border-slate-100 shadow-2xl bg-slate-100">
                        {lastResponse.vehiculo?.fotoVehiculo ? (
                          <img src={lastResponse.vehiculo.fotoVehiculo} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Vehículo" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Car size={100} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Foto Placa */}
                    <div className="relative group cursor-zoom-in">
                      <div className="absolute top-5 left-5 z-10 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                        Placa Física
                      </div>
                      <div className="h-56 rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-100">
                        {lastResponse.vehiculo?.fotoPlaca ? (
                          <img src={lastResponse.vehiculo.fotoPlaca} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Placa" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Hash size={60} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta Propiedad */}
                    <div className="relative group cursor-zoom-in">
                      <div className="absolute top-5 left-5 z-10 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                        Documento Legal
                      </div>
                      <div className="h-56 rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-100">
                        {lastResponse.vehiculo?.fotoTarjetaP ? (
                          <img src={lastResponse.vehiculo.fotoTarjetaP} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Tarjeta" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <FileText size={60} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-5 text-slate-500 max-w-xl">
                <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-600">
                  <ShieldAlert size={32} />
                </div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider leading-relaxed">
                  <span className="text-orange-600 font-black block mb-1">ATENCIÓN VIGILANTE:</span>
                  Verifique que la placa física coincida exactamente con la digital antes de permitir el movimiento.
                </p>
              </div>
              <button
                onClick={closeFeedback}
                className="w-full sm:w-auto bg-[#012E25] hover:bg-[#39B000] text-white px-16 py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] text-lg shadow-[0_20px_50px_rgba(1,46,37,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 border-b-8 border-black/20"
              >
                AUTORIZAR Y CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MovementForm.displayName = 'MovementForm';

/** Tarjeta pequeña de foto del vehículo para el modal de registro manual */
const FotoCard = ({ label, url }: { label: string; url: string | null }) => (
  <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5">
      <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">{label}</p>
    </div>
    <div className="h-32 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
      {url ? (
        <img src={url} className="w-full h-full object-cover" alt={label} />
      ) : (
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sin foto</span>
      )}
    </div>
  </div>
);
