import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Car, CheckCircle2, FileText, Hash, ScanLine, ShieldAlert, XCircle, LogIn, LogOut } from 'lucide-react';
import { operativoService } from '../services/operativo.service';
import { socketService } from '../services/socket.service';

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
  bahia?: string;
  movimiento?: {
    idMovimiento?: number;
    horaIngreso?: string;
    horaSalida?: string;
  };
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
  tipo?: 'INGRESO' | 'SALIDA';
  esVisitante?: boolean;
};

type VehiculoSeleccionable = {
  placa: string;
  tipoVehiculo: string;
  color: string;
  fotoVehiculo?: string;
};

type EscaneoCodigoAutoResponse = OperativoResponse & {
  modo: 'AUTO';
};

type EscaneoCodigoSeleccionResponse = {
  ok: boolean;
  modo: 'SELECCION';
  aprendiz: {
    nombreCompleto: string;
    documento: string;
    fotoPersona: string;
  };
  codigo: string;
  vehiculos: VehiculoSeleccionable[];
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

export const MovementForm = ({ onSuccess, onError }: MovementFormProps) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' });
  const [multiVehiculos, setMultiVehiculos] = useState<VehiculoSeleccionable[] | null>(null);
  const [codigoPendiente, setCodigoPendiente] = useState<string>('');
  const [aprendizPendiente, setAprendizPendiente] = useState<string>('');
  const [feedbackOverlayOpen, setFeedbackOverlayOpen] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<OperativoResponse | null>(null);
  const [turnoIngresos, setTurnoIngresos] = useState<TurnoIngresoRow[]>([]);
  const [turnoLoading, setTurnoLoading] = useState<boolean>(true);

  const [infoPlaca, setInfoPlaca] = useState<InfoPlacaResponse | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // buffer local para capturar ráfagas del lector (keyboard wedge) cuando el foco se pierde.
  const scannerBufferRef = useRef<string>('');
  const lastScanKeyAtRef = useRef<number>(0);
  const lastInputChangeAtRef = useRef<number>(0);

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
   * Auto-foco permanente para operación manos libres.
   * Los lectores físicos USB emulan un teclado rápido + 'Enter'.
   */
  useEffect(() => {
    const focusScanInput = () => {
      // No robar el foco si el usuario está escribiendo en OTRO campo
      // (p. ej. un modal abierto encima del panel, como el de visitantes).
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toUpperCase() ?? '';
      const enOtroCampo =
        active !== inputRef.current &&
        (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(active?.isContentEditable));
      if (enOtroCampo) return;
      inputRef.current?.focus();
    };

    focusScanInput();

    const handleWindowFocus = () => focusScanInput();
    window.addEventListener('focus', handleWindowFocus);

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        focusScanInput();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Si el modal de confirmación está abierto, Esc = Negar (no se hace).
        if (feedback.type === 'success' && lastResponse) {
          denegarMovimiento();
          return;
        }
        setInputValue('');
        setFeedback({ type: null, message: '' });
        setFeedbackOverlayOpen(false);
        setMultiVehiculos(null);
        setCodigoPendiente('');
        setAprendizPendiente('');
        setInfoPlaca(null);
        setTimeout(() => focusScanInput(), 0);
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      }

      if (multiVehiculos || infoPlaca || feedback.type === 'loading') {
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
        if (!buffered.length) {
          // Enter "a secas" con el modal abierto = Autorizar.
          // (Si venía un escaneo bufferizado, en cambio se procesa el siguiente.)
          if (feedback.type === 'success' && lastResponse) {
            e.preventDefault();
            autorizarMovimiento();
          }
          return;
        }
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
  }, [feedback.type, lastResponse, multiVehiculos, infoPlaca, handleAction]);

  const clearState = () => {
    setInputValue('');
    setMultiVehiculos(null);
    setCodigoPendiente('');
    setAprendizPendiente('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeFeedback = () => {
    setFeedback({ type: null, message: '' });
    setFeedbackOverlayOpen(false);
    setLastResponse(null);
    setInputValue('');
    scannerBufferRef.current = '';
    lastScanKeyAtRef.current = 0;
    lastInputChangeAtRef.current = 0;
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Autorizar: recién aquí se confirma y se muestra la notificación de éxito.
  const autorizarMovimiento = () => {
    if (lastResponse) {
      onSuccess(lastResponse.mensaje || 'Movimiento autorizado');
    }
    closeFeedback();
  };

  // Negar: revierte el movimiento recién creado (el ingreso/salida "no se hace").
  const denegarMovimiento = async () => {
    const idMov = lastResponse?.movimiento?.idMovimiento;
    const esSalida = Boolean(lastResponse?.movimiento?.horaSalida);
    if (idMov) {
      try {
        await operativoService.anularMovimiento(idMov);
        onSuccess(esSalida ? 'Salida revertida' : 'Ingreso anulado');
      } catch (error: any) {
        onError(error?.response?.data?.message || error?.message || 'No se pudo revertir el movimiento');
      }
    }
    closeFeedback();
  };

  async function handleAction(action: 'entrada' | 'salida' | 'codigo', value?: string) {
    const targetValue = String(value ?? inputValue).trim();

    if (!targetValue && action !== 'codigo') {
      setFeedback({ type: 'error', message: 'LA PLACA O CÓDIGO ES OBLIGATORIO' });
      setFeedbackOverlayOpen(true);
      return;
    }

    setLastResponse(null);
    setFeedbackOverlayOpen(false);
    setFeedback({ type: 'loading', message: 'COMUNICANDO CON EL SERVIDOR...' });

    try {
      const upper = targetValue.toUpperCase();

      switch (action) {
        case 'entrada': {
          const info: InfoPlacaResponse = await operativoService.obtenerInfoPlaca(upper);

          if (info.usuariosAutorizados.length > 1 && !info.movimientoActivo) {
            setInfoPlaca(info);
            setFeedback({ type: null, message: '' });
            return;
          }

          // Un solo usuario o ya hay movimiento activo → ingreso directo (sin documentoIngreso → backend asume propietario)
          const resEntrada: OperativoResponse = await operativoService.registrarEntrada(upper);
          setFeedback({ type: 'success', message: resEntrada.mensaje });
          setLastResponse(resEntrada);
          setFeedbackOverlayOpen(true);
          loadTurnoIngresos();
          setInputValue('');
          break;
        }

        case 'salida': {
          const resSalida: OperativoResponse = await operativoService.registrarSalida(upper);
          setFeedback({ type: 'success', message: resSalida.mensaje });
          setLastResponse(resSalida);
          setFeedbackOverlayOpen(true);
          loadTurnoIngresos();
          setInputValue('');
          break;
        }

        case 'codigo': {
          const resCodigo: EscaneoCodigoResponse = await operativoService.escanearCodigo(upper);

          if (resCodigo.modo === 'AUTO') {
            setFeedback({ type: 'success', message: resCodigo.mensaje });
            setLastResponse(resCodigo);
            setFeedbackOverlayOpen(true);
            loadTurnoIngresos();
            setInputValue('');
          } else {
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
      setFeedback({ type: 'error', message: msg.toUpperCase() });
      setFeedbackOverlayOpen(true);
      setLastResponse(null);
      onError(msg);
      setInputValue('');
      scannerBufferRef.current = '';
      lastScanKeyAtRef.current = 0;
      lastInputChangeAtRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Si el modal de confirmación está abierto, Enter = Autorizar.
      if (feedback.type === 'success' && lastResponse) {
        autorizarMovimiento();
        return;
      }
      // Una PLACA escrita (5–7 alfanuméricos) entra por el flujo de "Entrada":
      // pregunta el usuario si el vehículo tiene varios propietarios.
      // Un código/QR (token más largo) se resuelve automáticamente como hasta ahora.
      const val = inputValue.trim().toUpperCase();
      if (/^[A-Z0-9]{5,7}$/.test(val)) {
        handleAction('entrada', val);
      } else {
        handleAction('codigo');
      }
    }
  };

  // Flag para evitar dobles confirmaciones por clicks rápidos
  const procesandoMultiRef = useRef<boolean>(false);

  async function handleConfirmarUsuarioManual(documento: string) {
    if (!infoPlaca) return;
    if (procesandoMultiRef.current) return;
    procesandoMultiRef.current = true;

    const placa = infoPlaca.vehiculo.placa;
    setInfoPlaca(null);

    setFeedback({ type: 'loading', message: 'REGISTRANDO INGRESO...' });
    try {
      const resEntrada: OperativoResponse = await operativoService.registrarEntrada(placa, documento);
      setFeedback({ type: 'success', message: resEntrada.mensaje });
      setLastResponse(resEntrada);
      setFeedbackOverlayOpen(true);
      loadTurnoIngresos();
      setInputValue('');
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
      loadTurnoIngresos();
      setInputValue('');
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

  const showProfessionalModal = Boolean(feedback.type === 'success' && lastResponse);

  const horaTurno = useMemo(() => (iso: string) => {
    try {
      return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    } catch {
      return '';
    }
  }, []);

  const tiempoRelativo = useMemo(() => (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'hace un momento';
      if (min < 60) return `hace ${min} min`;
      const h = Math.floor(min / 60);
      if (h < 24) return `hace ${h} h`;
      return `hace ${Math.floor(h / 24)} d`;
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="space-y-6 relative" onClick={() => !infoPlaca && !multiVehiculos && inputRef.current?.focus()}>
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
            w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border-2 rounded-xl
            text-lg font-bold tracking-widest transition-all outline-none disabled:opacity-60
            ${feedback.type === 'error'
              ? 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600'
              : 'border-transparent focus:border-[#39B000] focus:bg-white dark:focus:bg-[#121212] text-[#012E25] dark:text-white'}
          `}
        />
      </div>

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

      {/* Solo informativo: detenemos la propagación del clic para que no se reenfoque el input de escaneo. */}
      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Movimientos recientes</h4>

        {turnoLoading ? (
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : turnoIngresos.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-gray-100 dark:border-white/5 rounded-xl">
            <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sin registros recientes</p>
          </div>
        ) : (
          <ol className="px-1">
            {turnoIngresos.slice(0, 8).map((ingreso, i, arr) => {
              const esSalida = ingreso.tipo === 'SALIDA';
              const esUltimo = i === arr.length - 1;
              return (
                <li key={`${ingreso.placa}-${ingreso.horaIngreso}-${i}`} className="relative flex gap-3">
                  {/* Eje de la línea de tiempo: punto + conector */}
                  <div className="flex flex-col items-center">
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      esSalida
                        ? 'bg-orange-50 text-orange-500 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30'
                        : 'bg-green-50 text-[#39B000] border-green-100 dark:bg-[#39B000]/10 dark:border-[#39B000]/20'
                    }`}>
                      {esSalida ? <LogOut size={14} /> : <LogIn size={14} />}
                    </div>
                    {!esUltimo && <div className="w-px flex-1 min-h-[14px] bg-gray-100 dark:bg-white/10" />}
                  </div>

                  <div className="flex-1 flex items-start justify-between gap-2 pb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#012E25] dark:text-white leading-none truncate">{ingreso.placa}</p>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          esSalida
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-green-50 text-[#39B000] dark:bg-[#39B000]/10 dark:text-[#39B000]'
                        }`}>
                          {esSalida ? 'Salida' : 'Ingreso'}
                        </span>
                        {ingreso.esVisitante && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 text-[8px] font-black uppercase tracking-widest">Visitante</span>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-1.5 uppercase tracking-wider truncate">
                        {(ingreso.tipoVehiculo || 'N/D')} • {tiempoRelativo(ingreso.horaIngreso)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#012E25] dark:text-white tabular-nums leading-none">{horaTurno(ingreso.horaIngreso)}</p>
                      {i === 0 && (
                        <p className="text-[8px] font-black text-[#39B000] uppercase tracking-widest mt-1">Más reciente</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

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

      {multiVehiculos && (
        <div className="fixed inset-0 z-[100] bg-[#012E25]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#39B000] uppercase tracking-widest mb-1">Selección de Vehículo</p>
                <h3 className="text-lg font-bold text-[#012E25] dark:text-white">{aprendizPendiente}</h3>
              </div>
              <button onClick={clearState} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 rounded-lg transition-all">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {multiVehiculos.map((v) => (
                <button
                  key={v.placa}
                  onClick={() => handleConfirmarMultivehiculo(v.placa)}
                  disabled={feedback.type === 'loading'}
                  className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-[#39B000] hover:bg-green-50/30 dark:hover:bg-[#39B000]/10 transition-all group disabled:opacity-60 active:scale-95"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 dark:text-gray-600">
                    {v.fotoVehiculo ? (
                      <img src={v.fotoVehiculo} alt={v.placa} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Car size={36} />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#012E25] dark:text-white tracking-wide">{v.placa}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{v.tipoVehiculo} • {v.color}</p>
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

      {showProfessionalModal && lastResponse && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-white/10 flex flex-col max-h-[94vh]">
            {/* Encabezado compacto */}
            <div className={`px-6 py-4 flex items-center justify-between gap-4 ${lastResponse.movimiento?.horaSalida ? 'bg-orange-600' : 'bg-[#012E25]'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <CheckCircle2 size={34} className="text-white/90 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] ${lastResponse.movimiento?.horaSalida ? 'bg-white text-orange-600' : 'bg-[#39B000] text-white'}`}>
                      {lastResponse.movimiento?.horaSalida ? 'Salida' : 'Ingreso'}
                    </span>
                    <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Confirmado</span>
                  </div>
                  <h3 className="text-white text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none mt-1.5 truncate">{lastResponse.vehiculo?.placa}</h3>
                </div>
              </div>
              <button
                onClick={denegarMovimiento}
                title="Negar (no se hace el ingreso)"
                className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Cuerpo: identidad + evidencia, todo a la vista */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-white/10 shadow bg-white shrink-0">
                  {lastResponse.aprendiz?.fotoPersona ? (
                    <img src={lastResponse.aprendiz.fotoPersona} alt={lastResponse.aprendiz?.nombreCompleto} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[#012E25]/30 text-3xl font-black">
                      {(lastResponse.aprendiz?.nombreCompleto || 'S').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[#39B000] text-[9px] font-black uppercase tracking-widest mb-1">Identidad</p>
                  <h4 className="text-[#012E25] dark:text-white text-lg font-black truncate leading-tight">{lastResponse.aprendiz?.nombreCompleto || 'DESCONOCIDO'}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">CC {lastResponse.aprendiz?.documento || '---'}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                    <ScanLine size={11} />
                    {new Date(lastResponse.movimiento?.horaSalida || lastResponse.movimiento?.horaIngreso || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {lastResponse.bahia && !lastResponse.movimiento?.horaSalida ? ` • Bahía ${lastResponse.bahia}` : ''}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 relative h-40">
                <span className="absolute top-2 left-2 z-10 bg-black/60 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Vehículo</span>
                {lastResponse.vehiculo?.fotoVehiculo ? (
                  <img src={lastResponse.vehiculo.fotoVehiculo} className="w-full h-full object-cover" alt="Vehículo" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Car size={44} /></div>
                )}
              </div>

              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <FotoMini label="Placa física" url={lastResponse.vehiculo?.fotoPlaca || null} icon={<Hash size={26} />} />
                <FotoMini label="Tarjeta" url={lastResponse.vehiculo?.fotoTarjetaP || null} icon={<FileText size={26} />} />
              </div>
            </div>

            {/* Pie compacto */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-slate-500 flex-1 min-w-0">
                <ShieldAlert size={16} className="text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">Verifique que la placa coincida.</p>
              </div>
              <button
                onClick={denegarMovimiento}
                className="shrink-0 bg-white dark:bg-white/5 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                Negar
              </button>
              <button
                onClick={autorizarMovimiento}
                className="shrink-0 bg-[#012E25] hover:bg-[#39B000] text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                Autorizar · Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FotoMini = ({ label, url, icon }: { label: string; url: string | null; icon: ReactNode }) => (
  <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 relative h-28">
    <span className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{label}</span>
    {url ? (
      <img src={url} className="w-full h-full object-cover" alt={label} />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-slate-300">{icon}</div>
    )}
  </div>
);

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
