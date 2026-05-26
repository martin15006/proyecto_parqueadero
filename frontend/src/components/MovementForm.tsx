import React, { useEffect, useMemo, useRef, useState } from 'react'; // UI: hooks para estado, refs y efectos (operación en tiempo real).
import { AlertCircle, CheckCircle2, FileText, ScanLine, XCircle } from 'lucide-react'; // UI: iconos con alto contraste para feedback a distancia (WCAG).
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
  movimiento?: unknown; // RF32: el backend persiste el movimiento y lo retorna opcionalmente.
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
  aprendiz: { nombreCompleto: string }; // RF33: feedback visual (nombre del usuario).
  vehiculo: VehiculoSeleccionable; // RF31: vehículo procesado.
};

type EscaneoCodigoSeleccionResponse = {
  ok: boolean; // RF31: operación de escaneo exitosa, pero requiere selección.
  modo: 'SELECCION'; // RF31: múltiples vehículos => modal de selección obligatorio.
  aprendiz: { nombreCompleto: string }; // RF33: feedback visual.
  codigo: string; // RF31: se reenvía en la confirmación sin mantener estado server-side.
  vehiculos: VehiculoSeleccionable[]; // RF31: lista para elegir.
};

type EscaneoCodigoResponse = EscaneoCodigoAutoResponse | EscaneoCodigoSeleccionResponse;

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
  const [turnoIngresos, setTurnoIngresos] = useState<TurnoIngresoRow[]>([]);
  const [turnoLoading, setTurnoLoading] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null); // RF33: foco permanente en el input (lector emula teclado).
  const motivoRef = useRef<HTMLInputElement>(null); // RF34: referencia para el input de motivo (contingencia).
  const scannerBufferRef = useRef<string>(''); // RF33: buffer local para capturar ráfagas del lector (keyboard wedge) cuando el foco se pierde.
  const lastScanKeyAtRef = useRef<number>(0); // RF33: timestamp del último carácter recibido; permite detectar ráfagas y reconstruir el código completo.

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
        setTimeout(() => focusScanInput(), 0); // RF33: re-enfoca inmediatamente tras limpiar.
        scannerBufferRef.current = '';
        lastScanKeyAtRef.current = 0;
        return;
      } // RF33: fin ESC.

      if (showContingencia || multiVehiculos || feedback.type === 'loading') {
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

    window.addEventListener('keydown', handleGlobalKeys); // RF33: registra listener global de teclado.

    let timeout: ReturnType<typeof setTimeout> | undefined; // UX: temporizador para cerrar overlays automáticamente.
    if (feedback.type === 'success') { // RF33: éxito se puede ocultar automático tras confirmación visual.
      timeout = setTimeout(() => { // UX: auto-cierre para operación continua.
        setFeedback({ type: null, message: '' }); // RF33: limpia banner.
        setFeedbackOverlayOpen(false); // RF33: limpia overlay masivo.
      }, 4000); // UX: 4s visible para lectura a distancia sin bloquear el flujo.
    } // RF33: fin éxito.

    return () => { // UX: limpieza de listeners al desmontar.
      window.removeEventListener('focus', handleWindowFocus); // UX: cleanup.
      window.removeEventListener('keydown', handleGlobalKeys); // UX: cleanup.
      if (timeout) clearTimeout(timeout); // UX: cleanup del temporizador.
    }; // UX: fin cleanup.
  }, [feedback.type, showContingencia, multiVehiculos, handleAction]); // RF33/RF34: depende del estado actual del form.

  const clearState = () => {
    setInputValue(''); // RF33: prepara el input para el siguiente escaneo.
    setMotivo(''); // RF34: limpia motivo (contingencia).
    setShowContingencia(false); // RF34: vuelve al flujo principal por defecto.
    setFeedback({ type: null, message: '' }); // RF33: limpia feedback.
    setFeedbackOverlayOpen(false); // RF33: cierra overlay masivo.
    setMultiVehiculos(null); // RF31: cierra el modal de selección si estaba abierto.
    setCodigoPendiente(''); // RF31: limpia token pendiente para evitar confirmaciones accidentales.
    setAprendizPendiente(''); // RF31: limpia nombre mostrado en la UI.
    setTimeout(() => inputRef.current?.focus(), 50); // RF33: re-enfoca el lector tras limpiar estado.
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

    setFeedback({ type: 'loading', message: 'COMUNICANDO CON EL SERVIDOR...' }); // RF33: feedback de procesamiento.
    
    try {
      const upper = targetValue.toUpperCase(); // RF33: normalización para evaluar formatos.
      const isCodigoHex32 = /^[0-9A-F]{32}$/.test(upper); // RF31: token Code128 normalizado (32 hex sin guiones).
      const isPlaca = /^[A-Z0-9-]{4,10}$/.test(upper) && !isCodigoHex32; // RF34: permite operar por placa si no se escanea token.

      switch (action) {
        case 'entrada':
          const resEntrada: OperativoResponse = await operativoService.registrarEntrada(upper); // RF10: registra entrada por placa (normalizada).
          setFeedback({ 
            type: 'success', 
            message: `¡INGRESO AUTORIZADO! Bahía Asignada: ${resEntrada.bahia}` 
          });
          setFeedbackOverlayOpen(true); // RF33: muestra overlay verde para confirmación a distancia.
          onSuccess(`Ingreso: ${targetValue} -> ${resEntrada.bahia}`);
          loadTurnoIngresos();
          clearState();
          break;

        case 'salida':
          await operativoService.registrarSalida(upper); // RF11: registra salida por placa (normalizada).
          setFeedback({ 
            type: 'success', 
            message: `¡SALIDA REGISTRADA! Vehículo ${targetValue} retirado.` 
          });
          setFeedbackOverlayOpen(true); // RF33: muestra overlay verde para confirmación.
          onSuccess(`Salida: ${targetValue}`);
          loadTurnoIngresos();
          clearState();
          break;

        case 'manual':
          if (!motivo || motivo.length < 10) {
            throw new Error('EL MOTIVO DEBE TENER AL MENOS 10 CARACTERES');
          }
          const resManual: OperativoResponse = await operativoService.registrarIngresoManual(identificacionLimpia, motivo); // RF34: registro manual con motivo.
          setFeedback({ 
            type: 'success', 
            message: `¡CONTINGENCIA REGISTRADA! Bahía: ${resManual.bahia}` 
          });
          setFeedbackOverlayOpen(true); // RF33: overlay para confirmación.
          onSuccess(`Manual: ${targetValue} -> ${resManual.bahia}`);
          loadTurnoIngresos();
          clearState();
          break;

        case 'codigo': {
          if (isPlaca) {
            const resEntrada: OperativoResponse = await operativoService.registrarEntrada(upper); // RF10/RF14: vía alternativa por placa (backend aplica bloqueos DESHABILITADO/LLENO).
            setFeedback({
              type: 'success',
              message: `¡INGRESO AUTORIZADO! Bahía Asignada: ${resEntrada.bahia}`,
            }); // RF33: feedback verde inmediato.
            setFeedbackOverlayOpen(true); // RF33: overlay masivo.
            onSuccess(`Ingreso: ${targetValue} -> ${resEntrada.bahia}`); // RF33: notificación superior.
            loadTurnoIngresos();
            clearState(); // RF33: listo para siguiente lectura.
            break;
          }

          const resScan: EscaneoCodigoResponse = await operativoService.escanearCodigo(targetValue); // RF31/RF33: flujo unificado barras/QR (token opaco).

          if (resScan.modo === 'AUTO') {
            setFeedback({
              type: 'success',
              message: `ACCESO CONCEDIDO: ${resScan.aprendiz.nombreCompleto} — ${resScan.vehiculo.placa} → ${resScan.bahia}`,
            }); // RF33: feedback verde inmediato.
            setFeedbackOverlayOpen(true); // RF33: overlay masivo.
            onSuccess(`Ingreso: ${resScan.vehiculo.placa} -> ${resScan.bahia}`); // RF33: notificación superior.
            loadTurnoIngresos();
            clearState(); // RF33: limpia para siguiente lectura del lector.
            break;
          }

          setMultiVehiculos(resScan.vehiculos); // RF31: abre modal con lista de vehículos.
          setCodigoPendiente(resScan.codigo); // RF31: guarda el token para confirmación secundaria.
          setAprendizPendiente(resScan.aprendiz.nombreCompleto); // RF33: muestra nombre del aprendiz en el modal.
          setFeedback({
            type: 'success',
            message: `SE REQUIERE CONFIRMACIÓN: ${resScan.aprendiz.nombreCompleto} TIENE ${resScan.vehiculos.length} VEHÍCULOS`,
          }); // RF31: informa que el flujo se pausa hasta selección.
          setFeedbackOverlayOpen(false); // RF31: en selección, el overlay masivo se reemplaza por el modal dedicado.
          break;
        }
      }
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message; // RF33/RF14/RF39: backend envía mensajes semánticos y códigos.
      const backendErrorCode = error?.response?.data?.errorCode; // RF33/RF14/RF39: se muestra el errorCode exacto si existe.
      const errorMsg = backendMessage || error.message || 'ERROR EN LA OPERACIÓN'; // RF33: fallback estable.
      const printable = backendErrorCode ? `${backendErrorCode}: ${errorMsg}` : errorMsg; // RF33: muestra errorCode para diagnóstico operativo.
      setFeedback({ type: 'error', message: printable.toUpperCase() }); // RF33: feedback rojo inmediato.
      setFeedbackOverlayOpen(true); // RF33: overlay masivo rojo para lectura a distancia.
      onError(printable); // RF33: notificación superior.
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAction('codigo'); // RF31/RF33: Enter desde lector (teclado emulado) dispara siempre el escaneo unificado.
    }
  };

  const confirmarVehiculo = async (placa: string) => {
    setFeedback({ type: 'loading', message: 'CONFIRMANDO VEHÍCULO...' }); // RF31/RF33: mantiene feedback mientras se confirma el multivehículo.
    try {
      const res: OperativoResponse & { bahia?: string } =
        await operativoService.confirmarIngresoMultivehiculo(codigoPendiente, placa); // RF31: confirmación secundaria.
      setFeedback({
        type: 'success',
        message: `ACCESO CONCEDIDO: ${aprendizPendiente} — ${placa} → ${res.bahia}`,
      }); // RF33: feedback verde tras confirmación.
      setFeedbackOverlayOpen(true); // RF33: overlay masivo tras confirmación.
      onSuccess(`Ingreso: ${placa} -> ${res.bahia}`); // RF33: notificación superior.
      loadTurnoIngresos();
      clearState(); // RF33: listo para siguiente lectura.
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      const backendErrorCode = error?.response?.data?.errorCode;
      const errorMsg = backendMessage || error.message || 'ERROR EN LA CONFIRMACIÓN';
      const printable = backendErrorCode ? `${backendErrorCode}: ${errorMsg}` : errorMsg;
      setFeedback({ type: 'error', message: printable.toUpperCase() }); // RF33: feedback rojo si falla (LLENO/DESHABILITADO, etc.).
      setFeedbackOverlayOpen(true); // RF33: overlay masivo de error.
      onError(printable);
    }
  };

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

  return (
    <div className="relative"> {/* UI: wrapper para superponer overlays sin romper el layout del dashboard. */}
      {feedbackOverlayOpen && overlayTone && feedback.type && ( // RF33: overlay masivo para lectura a 3m cuando hay éxito/error/cargando.
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-16"> {/* RF33: overlay centrado con fondo oscuro semitransparente (alto contraste). */}
          <div className={`w-full max-w-3xl rounded-3xl ${overlayTone.bg} text-white shadow-2xl border border-white/10`}> {/* WCAG: alto contraste y tamaño grande. */}
            <div className="p-6 sm:p-10 flex items-start gap-6"> {/* UX: padding generoso para lectura rápida. */}
              <div className="flex-shrink-0"> {/* UX: icono grande sin empujar el texto. */}
                <overlayTone.icon className="w-16 h-16 sm:w-20 sm:h-20" /> {/* RF33: icono gigante para confirmación visual inmediata. */}
              </div> {/* UX: fin icono. */}
              <div className="flex-1"> {/* UX: bloque de texto principal. */}
                <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.28em] opacity-90">{overlayTone.label}</p> {/* RF33: encabezado institucional. */}
                <p className="mt-3 text-2xl sm:text-3xl font-black leading-tight break-words">{feedback.message}</p> {/* RF33: mensaje en tamaño “a distancia”. */}
                <p className="mt-4 text-sm sm:text-base font-bold opacity-90">F2: Enfocar lector • ESC: Limpiar</p> {/* RF33: atajos operativos mouse-free. */}
              </div> {/* UX: fin bloque texto. */}
            </div> {/* UI: fin contenido overlay. */}
            <div className="px-6 sm:px-10 pb-8 flex justify-end"> {/* UX: acciones alineadas al final. */}
              <button
                type="button"
                onClick={() => setFeedbackOverlayOpen(false)} // RF33: permite al operador cerrar manualmente.
                className="rounded-xl bg-white/15 hover:bg-white/25 px-5 py-3 text-[12px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-white/40"
              >
                Cerrar
              </button>
            </div> {/* UX: fin acciones overlay. */}
          </div> {/* UI: fin card overlay. */}
        </div> /* UI: fin overlay */
      )} {/* RF33: fin render overlay masivo. */}

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
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())} // RF33: normaliza entrada a mayúsculas.
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
                onClick={() => handleAction('codigo')}
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

      {multiVehiculos && ( // RF31: modal de selección multivehículo.
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-200 bg-[#003939] text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-90">Selección Multi-Vehículo (RF31)</p>
              <h4 className="mt-2 text-2xl sm:text-3xl font-black">{aprendizPendiente}</h4>
              <p className="mt-2 text-sm sm:text-base font-semibold opacity-90">Selecciona el vehículo observado físicamente para confirmar el ingreso.</p>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {multiVehiculos.map((v) => (
                <button
                  key={v.placa}
                  type="button"
                  onClick={() => confirmarVehiculo(v.placa)}
                  disabled={feedback.type === 'loading'}
                  className="group rounded-2xl bg-[#003939] text-white p-6 text-left shadow-sm hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#39A900]/25 disabled:opacity-60"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] opacity-85">{v.tipoVehiculo}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight">{v.placa}</p>
                  <p className="mt-2 text-sm font-semibold opacity-90">Color: {v.color}</p>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#39A900]" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Confirmar ingreso</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 sm:p-8 border-t border-slate-200 flex justify-end gap-3 bg-[#F8FAFC]">
              <button
                type="button"
                onClick={clearState}
                className="h-12 px-6 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-black uppercase tracking-widest text-[12px] hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#003939]/15"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
