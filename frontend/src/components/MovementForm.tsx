import React, { useEffect, useMemo, useRef, useState } from 'react'; // UI: hooks para estado, refs y efectos (operación en tiempo real).
import { AlertCircle, Car, CheckCircle2, FileText, Hash, ScanLine, ShieldAlert, XCircle } from 'lucide-react'; // UI: iconos con alto contraste para feedback a distancia (WCAG).
import { operativoService } from '../services/operativo.service'; // RF10/RF14: integración real con backend operativo (entrada/salida/contingencia).
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
 * FEATURE: MovementForm - Control de ingresos/salidas con escaneo híbrido y contingencia (RF33, RF34)
 * REFACTOR: Eliminación de placeholders y conexión real a backend con feedback visual profesional.
 */
export const MovementForm: React.FC<MovementFormProps> = ({ onSuccess, onError }) => {
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
    }; // RF33: fin focusScanInput.

    focusScanInput(); // RF33: foco inicial al montar para comenzar operación inmediata.

    const handleWindowFocus = () => focusScanInput(); // RF33: si el usuario vuelve a la pestaña, retoma foco al lector.
    window.addEventListener('focus', handleWindowFocus); // RF33: asegura operación continua en monitoreo.

    const handleGlobalKeys = (e: KeyboardEvent) => { // RF33: atajos globales para operación sin mouse.
      if (e.key === 'F2') { // RF33: F2 fuerza el foco al lector en cualquier momento.
        e.preventDefault(); // RF33: evita comportamientos por defecto del navegador.
        focusScanInput(); // RF33: recupera foco para escaneo inmediato.
        return; // RF33: salida temprana.
      } // RF33: fin F2.

      if (e.key === 'Escape') { // RF33: ESC limpia campo y prepara el siguiente escaneo.
        e.preventDefault(); // RF33: evita salir de modales del navegador o acciones no deseadas.
        setInputValue(''); // RF33: limpia el input para recibir nueva lectura.
        setFeedback({ type: null, message: '' }); // RF33: limpia feedback para evitar confusión visual.
        setFeedbackOverlayOpen(false); // RF33: cierra overlay masivo si estaba activo.
        setMultiVehiculos(null); // RF31: si estaba en selección, se cancela para evitar confirmación accidental.
        setCodigoPendiente(''); // RF31: limpia token pendiente.
        setAprendizPendiente(''); // RF31: limpia nombre visible.
        setInfoPlaca(null); // Cierra el modal de selección de usuario manual
        setTimeout(() => focusScanInput(), 0); // RF33: re-enfoca inmediatamente tras limpiar.
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      } // RF33: fin ESC.

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
    }; // RF33: fin handler de teclado global.

    window.addEventListener('keydown', handleGlobalKeys);

    // Los overlays YA NO se cierran solos por tiempo. Solo se cierran cuando:
    //  - El operativo presiona "Autorizar y cerrar" / "Cerrar Aviso"
    //  - El operativo presiona ESC
    //  - Se inicia una nueva acción (handleAction) que limpia el estado al comenzar

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleGlobalKeys);
    };
  }, [feedback.type, lastResponse, showContingencia, multiVehiculos, infoPlaca, handleAction]);

  const clearState = () => {
    setInputValue(''); // RF33: prepara el input para el siguiente escaneo.
    setMotivo(''); // RF34: limpia motivo (contingencia).
    setShowContingencia(false); // RF34: vuelve al flujo principal por defecto.
    setMultiVehiculos(null); // RF31: cierra el modal de selección si estaba abierto.
    setCodigoPendiente(''); // RF31: limpia token pendiente para evitar confirmaciones accidentales.
    setAprendizPendiente(''); // RF31: limpia nombre mostrado en la UI.
    setTimeout(() => inputRef.current?.focus(), 50); // RF33: re-enfoca el lector tras limpiar estado.
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
      setFeedback({ type: 'error', message: 'LA PLACA O CÓDIGO ES OBLIGATORIO' }); // RF33: feedback semántico y visible.
      setFeedbackOverlayOpen(true); // RF33: muestra overlay masivo para lectura a distancia.
      return; // RF33: aborta.
    } // RF33: fin validación.

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

        case 'salida':
          const resSalida: OperativoResponse = await operativoService.registrarSalida(upper); // RF11: registra salida por placa (normalizada).
          setFeedback({ 
            type: 'success', 
            message: resSalida.mensaje 
          });
          setLastResponse(resSalida);
          setFeedbackOverlayOpen(true); // RF33: muestra overlay verde para confirmación.
          onSuccess(`Salida: ${targetValue}`);
          loadTurnoIngresos();
          setInputValue('');
          setMotivo('');
          setShowContingencia(false);
          break;

        case 'manual':
          if (!motivo || motivo.length < 10) {
            throw new Error('EL MOTIVO DEBE TENER AL MENOS 10 CARACTERES');
          }
          const resManual: OperativoResponse = await operativoService.registrarIngresoManual(identificacionLimpia, motivo); // RF34: registro manual con motivo.
          setFeedback({ 
            type: 'success', 
            message: resManual.mensaje 
          });
          setLastResponse(resManual);
          setFeedbackOverlayOpen(true); // RF33: overlay para confirmación.
          onSuccess(`Manual: ${targetValue} -> ${resManual.bahia}`);
          loadTurnoIngresos();
          setInputValue('');
          setMotivo('');
          setShowContingencia(false);
          break;

        case 'codigo':
          const resCodigo: EscaneoCodigoResponse = await operativoService.escanearCodigo(upper); // RF33: identifica aprendiz por token opaco.

          if (resCodigo.modo === 'AUTO') { // RF31: un solo vehículo => ingreso/salida directo.
            setFeedback({ 
              type: 'success', 
              message: resCodigo.mensaje
            });
            setLastResponse(resCodigo);
            setFeedbackOverlayOpen(true); // RF33: overlay verde masivo.
            onSuccess(resCodigo.mensaje);
            loadTurnoIngresos();
            setInputValue('');
            setMotivo('');
            setShowContingencia(false);
          } else { // RF31: múltiples vehículos => abre modal de selección.
            setMultiVehiculos(resCodigo.vehiculos); // RF31: inyecta lista de opciones.
            setCodigoPendiente(resCodigo.codigo); // RF31: guarda token para reenvío.
            setAprendizPendiente(resCodigo.aprendiz?.nombreCompleto || 'USUARIO DESCONOCIDO'); // RF33: muestra nombre del dueño.
            setLastResponse(null);
            setFeedback({ type: null, message: '' }); // Limpia carga.
          }
          break;
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

  /**
   * Procesa la confirmación manual de un vehículo (Aprendiz multi-vehículo).
   */
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
      setFeedback({
        type: 'success',
        message: res.mensaje,
      });
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

  const handleEmergencia = async () => {
    if (!window.confirm('¿CONFIRMA SALIDA DE EMERGENCIA GLOBAL?')) return;
    setFeedback({ type: 'loading', message: 'ACTIVANDO PROTOCOLO DE EMERGENCIA...' });
    try {
      await operativoService.salidaEmergencia();
      setFeedback({ type: 'success', message: '¡EMERGENCIA! TODAS LAS BAHÍAS LIBERADAS.' });
      setFeedbackOverlayOpen(true); // RF18: overlay masivo para confirmar el evento crítico.
      onSuccess('Protocolo de emergencia ejecutado');
      loadTurnoIngresos();
      clearState();
    } catch (error: any) {
      setFeedback({ type: 'error', message: 'ERROR AL ACTIVAR EMERGENCIA' });
      setFeedbackOverlayOpen(true); // RF18: overlay masivo de error.
    }
  };

  const overlayTone = useMemo(() => { // RF33: mapea el feedback a una paleta de alto contraste estilo SENA.
    if (feedback.type === 'success') return { bg: 'bg-[#39A900]', icon: CheckCircle2, label: 'ACCESO PERMITIDO' }; // Paleta SENA: verde.
    if (feedback.type === 'error') return { bg: 'bg-[#D32F2F]', icon: XCircle, label: 'ACCESO DENEGADO' }; // Paleta SENA: rojo.
    if (feedback.type === 'loading') return { bg: 'bg-[#003939]', icon: ScanLine, label: 'PROCESANDO' }; // Paleta SENA: verde oscuro.
    return null; // UX: sin overlay si no hay estado.
  }, [feedback.type]); // UX: recalcula solo si cambia el tipo.

  // RF33: El modal profesional se muestra cuando hay una respuesta exitosa.
  const showProfessionalModal = Boolean(feedback.type === 'success' && lastResponse);

  return (
    <div className="relative"> {/* UI: wrapper para superponer overlays sin romper el layout del dashboard. */}
      {/* Overlay de Error o Carga (Simple) */}
      {feedbackOverlayOpen && overlayTone && feedback.type && (feedback.type !== 'success') && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/80 p-4 pt-16 backdrop-blur-md">
          <div className={`w-full max-w-3xl rounded-3xl ${overlayTone.bg} text-white shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/20 animate-in zoom-in duration-300`}>
            <div className="p-8 sm:p-12 flex items-start gap-8">
              <div className="flex-shrink-0 bg-white/20 p-4 rounded-2xl">
                <overlayTone.icon className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] sm:text-[14px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{overlayTone.label}</p>
                <p className="text-3xl sm:text-4xl font-black leading-tight break-words">{feedback.message}</p>
                <div className="mt-6 flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                  <span>F2: Enfocar</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  <span>ESC: Limpiar</span>
                </div>
              </div>
            </div>
            <div className="px-8 sm:px-12 pb-10 flex justify-end">
              <button
                type="button"
                onClick={closeFeedback}
                className="rounded-2xl bg-white/10 hover:bg-white/20 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-4 focus:ring-white/40 active:scale-95"
              >
                Cerrar Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="bg-white border border-slate-200 rounded-3xl shadow-[0_18px_55px_rgba(15,23,42,0.10)] overflow-hidden"
        onClick={() => !showContingencia && inputRef.current?.focus()} // RF33: click en el contenedor devuelve foco al lector.
      >
        <div className="p-6 sm:p-8"> {/* UI: padding grande para uso continuo. */}
          <header className="flex items-start justify-between gap-4"> {/* UI: header del formulario. */}
            <div className="flex-1"> {/* UI: bloque izquierdo. */}
              <div className="flex items-center gap-3"> {/* UI: icono + título. */}
                <div className="w-11 h-11 rounded-2xl bg-[#003939] text-white flex items-center justify-center shadow-sm"> {/* Paleta: verde oscuro en cabecera. */}
                  <ScanLine className="w-6 h-6" /> {/* RF33: icono de escaneo. */}
                </div> {/* UI: fin icono container. */}
                <div> {/* UI: títulos. */}
                  <h3 className="text-lg sm:text-xl font-black text-[#003939] tracking-tight">Control de Acceso</h3> {/* Paleta: verde oscuro institucional. */}
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Code128 / QR • Operación Mouse-Free</p> {/* RF33: etiqueta de modo operativo. */}
                </div> {/* UI: fin títulos. */}
              </div> {/* UI: fin fila título. */}
            </div> {/* UI: fin bloque izquierdo. */}

            <div className="text-right"> {/* UI: bloque derecho para estado actual. */}
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-widest',
                  feedback.type === 'loading'
                    ? 'bg-[#003939]/10 text-[#003939] border-[#003939]/20'
                    : 'bg-[#39A900]/10 text-[#003939] border-[#39A900]/30',
                ].join(' ')}
              >
                <span className={[
                  'w-2.5 h-2.5 rounded-full',
                  feedback.type === 'loading' ? 'bg-[#FF6B00] animate-pulse' : 'bg-[#39A900]',
                ].join(' ')} />
                {feedback.type === 'loading' ? 'Procesando' : 'Listo'}
              </span>
            </div> {/* UI: fin bloque derecho. */}
          </header>

          <div className="mt-7"> {/* UI: cuerpo del formulario. */}
            <div className="flex items-center justify-between gap-4"> {/* RF33: fila de etiqueta “lector en escucha”. */}
              <div className="flex items-center gap-3"> {/* RF33: icono “láser” + texto. */}
                <span className="relative inline-flex h-3 w-3"> {/* RF33: contenedor del punto. */}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#39A900]/40 animate-ping" /> {/* Paleta: pulso verde (lector activo). */}
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39A900]" /> {/* Paleta: punto verde fijo. */}
                </span> {/* RF33: fin dot. */}
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">Lector Físico en Escucha Activa (Code128 / QR)</p> {/* RF33: confianza operacional. */}
              </div> {/* RF33: fin fila laser. */}
              <p className="hidden sm:block text-[11px] font-bold text-slate-500">F2: Enfocar • ESC: Limpiar • Enter: Enviar</p> {/* RF33: guía de atajos (accesible). */}
            </div> {/* RF33: fin fila. */}

            <div className="mt-4"> {/* RF33: zona del input principal. */}
              <label className="sr-only" htmlFor="scan-input">Código o Placa</label> {/* WCAG: label accesible aunque visualmente oculto. */}
              <div className="relative"> {/* UI: wrapper para icono interno. */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5"> {/* UI: icono no-interactivo. */}
                  <span className="w-3 h-3 rounded-full bg-[#003939] animate-pulse" /> {/* UI: punto “láser” en verde oscuro. */}
                </div> {/* UI: fin icono. */}
                <input
                  id="scan-input"
                  ref={inputRef}
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
                  onKeyDown={handleKeyDown} // RF33: Enter dispara el flujo unificado de escaneo.
                  disabled={feedback.type === 'loading'} // UX: evita doble envío.
                  placeholder="ESCANEAR CÓDIGO (BARRAS/QR) O DIGITAR PLACA"
                  className={[
                    'w-full rounded-2xl bg-[#F8FAFC] text-slate-900 placeholder:text-slate-500',
                    'border-4 border-[#003939] focus:border-[#39A900]',
                    'px-14 py-5 text-lg font-black tracking-wide',
                    'outline-none focus:ring-4 focus:ring-[#39A900]/20',
                    'disabled:opacity-60',
                  ].join(' ')}
                />
              </div> {/* UI: fin wrapper input. */}
            </div> {/* RF33: fin zona input. */}

            <div className="mt-5 grid grid-cols-2 gap-4"> {/* RF10/RF11: acciones principales entrada/salida. */}
              <button
                type="button"
                onClick={() => handleAction('entrada')}
                disabled={feedback.type === 'loading'}
                className="h-14 rounded-2xl bg-[#39A900] text-white font-black uppercase tracking-widest text-[12px] shadow-sm hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#39A900]/30 disabled:opacity-60"
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => handleAction('salida')}
                disabled={feedback.type === 'loading'}
                className="h-14 rounded-2xl bg-[#003939] text-white font-black uppercase tracking-widest text-[12px] shadow-sm hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#003939]/25 disabled:opacity-60"
              >
                Salida
              </button>
            </div>

            <div className="mt-6"> {/* RF34: acceso a contingencia manual. */}
              <button
                type="button"
                onClick={() => setShowContingencia((v) => !v)}
                className="w-full rounded-2xl border-2 border-[#003939]/20 bg-white px-5 py-4 text-left hover:bg-[#F1F5F9] focus:outline-none focus:ring-4 focus:ring-[#003939]/15"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[#003939]" />
                    <div>
                      <p className="text-[12px] font-black text-[#003939] uppercase tracking-widest">Registro Manual (Contingencia)</p>
                      <p className="mt-1 text-sm text-slate-600 font-medium">Usar solo si el lector/sensor no está operativo. Requiere motivo.</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-black text-slate-600">{showContingencia ? 'Ocultar' : 'Abrir'}</span>
                </div>
              </button>

              {showContingencia && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600" htmlFor="motivo-input">
                    Motivo (mínimo 10 caracteres)
                  </label>
                  <input
                    id="motivo-input"
                    ref={motivoRef}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-[#39A900]/20 focus:border-[#39A900]"
                    placeholder="Describe la contingencia de manera clara..."
                  />
                  <button
                    type="button"
                    onClick={() => handleAction('manual')}
                    disabled={feedback.type === 'loading'}
                    className="mt-4 w-full h-12 rounded-xl bg-[#FF6B00] text-white font-black uppercase tracking-widest text-[12px] hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25 disabled:opacity-60"
                  >
                    Confirmar Contingencia
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200"> {/* RF18: acción crítica de emergencia. */}
              <button
                type="button"
                onClick={handleEmergencia}
                className="w-full rounded-2xl border-2 border-[#D32F2F]/30 bg-[#D32F2F]/5 px-5 py-4 text-left hover:bg-[#D32F2F]/10 focus:outline-none focus:ring-4 focus:ring-[#D32F2F]/20"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#D32F2F]" />
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-[#D32F2F]">Protocolo de Emergencia</p>
                    <p className="mt-1 text-sm text-slate-700 font-medium">Libera bahías según política institucional. Requiere confirmación.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Vehículos Ingresados en tu Turno</p>
            <p className="mt-1 text-lg font-black text-[#232323]">Últimos ingresos registrados por ti</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#003939]">
            <span className={['w-2.5 h-2.5 rounded-full', turnoLoading ? 'bg-[#FF6B00] animate-pulse' : 'bg-[#39A900]'].join(' ')} />
            {turnoLoading ? 'Cargando' : 'En vivo'}
          </span>
        </div>
        <div className="p-6">
          {turnoIngresos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-600">Aún no hay ingresos registrados en tu turno.</p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Se actualiza automáticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-widest text-slate-500">
                    <th className="py-3 pr-4">Placa</th>
                    <th className="py-3 pr-4">Hora ingreso</th>
                    <th className="py-3">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {turnoIngresos.map((row) => {
                    const hora = row.horaIngreso ? new Date(row.horaIngreso).toLocaleTimeString() : '';
                    return (
                      <tr key={`${row.placa}-${row.horaIngreso}`} className="text-sm">
                        <td className="py-4 pr-4">
                          <span className="inline-flex items-center rounded-xl bg-[#003939] text-white px-3 py-2 font-black tracking-widest">
                            {row.placa}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-slate-700 font-semibold">{hora}</td>
                        <td className="py-4">
                          <span className="inline-flex items-center rounded-xl border border-[#39A900]/30 bg-[#39A900]/10 px-3 py-2 text-[12px] font-black text-[#003939]">
                            {row.tipoVehiculo || 'N/D'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Overlay: Selección de USUARIO en registro manual de placa */}
      {infoPlaca && (
        <div className="fixed inset-0 z-[110] bg-[#003939]/95 backdrop-blur-sm p-6 flex flex-col items-center justify-center overflow-y-auto animate-in fade-in zoom-in duration-300">
          <div className="max-w-5xl w-full">
            <p className="text-[#39A900] text-center text-sm font-black uppercase tracking-[0.4em] mb-3">Registro manual</p>
            <h2 className="text-white text-center text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2">
              {infoPlaca.vehiculo.placa}
            </h2>
            <p className="text-white/60 text-center text-xs font-bold uppercase tracking-widest mb-8">
              {infoPlaca.vehiculo.tipoVehiculo} • {infoPlaca.vehiculo.color}
            </p>

            {/* Galería de fotos del vehículo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <FotoCard label="Vehículo" url={infoPlaca.vehiculo.fotoVehiculo} />
              <FotoCard label="Tarjeta de Propiedad" url={infoPlaca.vehiculo.fotoTarjetaP} />
              <FotoCard label="Foto de la Placa" url={infoPlaca.vehiculo.fotoPlaca} />
            </div>

            <p className="text-white/80 text-center text-[11px] font-black uppercase tracking-widest mb-6">
              Selecciona el usuario que está ingresando
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoPlaca.usuariosAutorizados.map((u) => (
                <button
                  key={u.documento}
                  type="button"
                  onClick={() => handleConfirmarUsuarioManual(u.documento)}
                  disabled={feedback.type === 'loading'}
                  className="group rounded-2xl bg-[#003939] text-white p-5 text-left shadow-sm hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#39A900]/25 disabled:opacity-60 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {u.fotoPersona ? (
                      <img src={u.fotoPersona} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black">{u.nombreCompleto?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-black uppercase tracking-tight truncate">{u.nombreCompleto}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">CC {u.documento}</p>
                    <span className={`mt-2 inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                      u.rol === 'PROPIETARIO' ? 'bg-[#39A900]/20 text-[#39A900]' : 'bg-amber-500/20 text-amber-300'
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
              className="mt-10 w-full text-white/40 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              [ ESC ] Cancelar operación
            </button>
          </div>
        </div>
      )}

      {/* Overlay de Selección de Vehículo (RF31) */}
      {multiVehiculos && (
        <div className="fixed inset-0 z-[100] bg-[#003939]/95 backdrop-blur-sm p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="max-w-4xl w-full">
            <p className="text-[#39A900] text-center text-sm font-black uppercase tracking-[0.4em] mb-4">Aprendiz identificado</p>
            <h2 className="text-white text-center text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-12">{aprendizPendiente}</h2>
            
            <p className="text-white/60 text-center text-[10px] font-black uppercase tracking-widest mb-6">Seleccione el vehículo para registrar el ingreso</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {multiVehiculos.map((v) => (
                <button
                  key={v.placa}
                  type="button"
                  onClick={() => handleConfirmarMultivehiculo(v.placa)}
                  disabled={feedback.type === 'loading'}
                  className="group rounded-2xl bg-[#003939] text-white p-6 text-left shadow-sm hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#39A900]/25 disabled:opacity-60"
                >
                  <p className="text-4xl font-black tracking-tighter group-hover:scale-105 transition-transform">{v.placa}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-60">{v.tipoVehiculo} • {v.color}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearState}
              className="mt-12 w-full text-white/40 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              [ ESC ] Cancelar operación
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Ingreso/Salida (Panel Profesional para el Vigilante) */}
      {showProfessionalModal && lastResponse && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl sm:rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] animate-in zoom-in duration-500 my-auto border border-white/20">
            {/* Header de Estado Ultra-Prominente */}
            <div className={`p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-b-[12px] ${lastResponse.movimiento?.horaSalida ? 'bg-orange-600 border-orange-700' : 'bg-[#003939] border-[#39A900]'}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="bg-white/20 p-5 rounded-[2rem] shadow-2xl backdrop-blur-xl border border-white/30">
                  <CheckCircle2 size={60} className="text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-3">
                    <span className={`px-8 py-3 rounded-2xl text-2xl font-black uppercase tracking-[0.5em] shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${lastResponse.movimiento?.horaSalida ? 'bg-white text-orange-600' : 'bg-[#39A900] text-white'}`}>
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
                className="group bg-white/10 hover:bg-white/20 p-6 rounded-[2.5rem] transition-all duration-300 shadow-xl border border-white/10"
              >
                <XCircle size={48} className="text-white/60 group-hover:text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="p-6 sm:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
                
                {/* Columna Izquierda: Usuario y Tiempos */}
                <div className="lg:col-span-5 space-y-8 sm:space-y-12">
                  
                  {/* Perfil del Usuario */}
                  <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 flex items-center gap-8 shadow-inner">
                    <div className="relative">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-white">
                        {lastResponse.aprendiz?.fotoPersona ? (
                          <img 
                            src={lastResponse.aprendiz.fotoPersona} 
                            alt={lastResponse.aprendiz?.nombreCompleto}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[#003939]/30">
                            <span className="text-7xl font-black">
                              {(lastResponse.aprendiz?.nombreCompleto || 'S').charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-[#39A900] text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl border-4 border-white">
                        VÁLIDO
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#39A900] text-xs font-black uppercase tracking-[0.3em] mb-2">Identidad del Usuario</p>
                      <h4 className="text-[#003939] text-3xl sm:text-4xl font-black truncate leading-none mb-3">
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
                    <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center">
                      <p className="text-[#39A900] text-xs font-black uppercase tracking-[0.3em] mb-4">Hora de Registro</p>
                      <span className="text-white text-5xl font-black tracking-tighter tabular-nums leading-none mb-2">
                        {new Date(lastResponse.movimiento?.horaSalida || lastResponse.movimiento?.horaIngreso || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Servidor Local SENA</p>
                    </div>

                    {lastResponse.movimiento?.horaSalida && lastResponse.movimiento?.horaIngreso ? (
                      <div className="bg-orange-50 p-8 rounded-[3rem] border-4 border-orange-100 flex flex-col items-center justify-center text-center">
                        <p className="text-orange-600 text-xs font-black uppercase tracking-[0.3em] mb-4">Ingresó el Día</p>
                        <span className="text-orange-950 text-4xl font-black tracking-tighter tabular-nums leading-none mb-2">
                          {new Date(lastResponse.movimiento.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className="text-orange-600/60 text-[10px] font-bold uppercase tracking-widest">Entrada registrada</p>
                      </div>
                    ) : lastResponse.bahia ? (
                      <div className="bg-[#39A900]/10 p-8 rounded-[3rem] border-4 border-[#39A900]/20 flex flex-col items-center justify-center text-center">
                        <p className="text-[#39A900] text-xs font-black uppercase tracking-[0.3em] mb-4">Bahía Asignada</p>
                        <span className="text-[#003939] text-6xl font-black tracking-tighter leading-none mb-2">{lastResponse.bahia}</span>
                        <p className="text-[#39A900]/60 text-[10px] font-bold uppercase tracking-widest">Zona Autorizada</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Columna Derecha: Galería de Inspección */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="flex items-center justify-between px-4">
                    <p className="text-[#003939] text-sm font-black uppercase tracking-[0.5em] border-l-8 border-[#39A900] pl-4">
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
                      <div className="absolute top-6 left-6 z-10 bg-[#003939]/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl border border-white/20">
                        Vehículo Registrado
                      </div>
                      <div className="h-80 sm:h-96 rounded-[3.5rem] overflow-hidden border-8 border-slate-100 shadow-2xl bg-slate-100">
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
                      <div className="h-56 rounded-[3rem] overflow-hidden border-6 border-slate-100 shadow-xl bg-slate-100">
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
                      <div className="h-56 rounded-[3rem] overflow-hidden border-6 border-slate-100 shadow-xl bg-slate-100">
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
                className="w-full sm:w-auto bg-[#003939] hover:bg-[#39A900] text-white px-16 py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] text-lg shadow-[0_20px_50px_rgba(0,57,57,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 border-b-8 border-black/20"
              >
                AUTORIZAR Y CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Tarjeta pequeña de foto del vehículo para el modal de registro manual */
const FotoCard: React.FC<{ label: string; url: string | null }> = ({ label, url }) => (
  <div className="rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5">
    <div className="bg-black/40 px-3 py-2">
      <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
    <div className="h-40 bg-slate-100 flex items-center justify-center">
      {url ? (
        <img src={url} className="w-full h-full object-cover" alt={label} />
      ) : (
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sin foto</span>
      )}
    </div>
  </div>
);
