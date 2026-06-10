import React, { useCallback, useEffect, useMemo, useState } from 'react'; // UI/WCAG: hooks para estado, efectos (carga inicial), memoización y callbacks estables sin re-render innecesario.
import { // UI/WCAG: iconografía (lucide-react) de alto contraste, reconocible y consistente con dashboards ejecutivos.
  CalendarRange, // UI: refuerza visualmente el concepto de “rango de fechas” (reduce carga cognitiva).
  Download, // UI: comunica acción de exportación (RF23) sin depender solo de texto (mejor para escaneo).
  Filter, // UI: señala el panel colapsable de filtros avanzados (UX limpia).
  Loader2, // UI/WCAG: spinner sutil para estados de carga, evitando animaciones agresivas (sensibilidad al movimiento).
  Search, // UI: guía a la acción “buscar/filtrar” y a la barra principal (patrón estándar).
  ShieldCheck, // UI: KPI de auditoría/seguridad (accesos registrados) con semántica de “verificación”.
  Timer, // UI: KPI de tiempo medio (duración/estancia) con icono inmediato.
  TrendingUp, // UI: KPI de pico/ocupación (tendencia/alto impacto gerencial).
  TriangleAlert, // UI: KPI de incidencias/alertas (prioridad operativa).
} from 'lucide-react'; // UI: librería ya presente en el proyecto (evita dependencias extra).
import { Badge } from '../../components/ui/Badge'; // UI: reutiliza componente existente para etiqueta ADMIN (consistencia visual en el proyecto).
import { reportesService, type HistoricoItem, type HistoricoMeta } from '../../services/reportes.service'; // RF21/RF22/RF23: servicio real del backend + tipos TypeScript (contrato explícito).

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10); // UX: convierte Date -> yyyy-mm-dd para <input type="date"> sin librerías externas.

type TecnologiaAcceso = 'TODAS' | 'OPERATIVO' | 'SISTEMA'; // UX: filtro UI que clasifica por la presencia de operador responsable (proxy razonable si falta un campo explícito).
type TipoUsuario = 'TODOS' | 'APRENDIZ' | 'OPERATIVO'; // UX: filtro UI “Tipo de Usuario” solicitado; se deriva con una heurística (documentada) hasta que el backend exponga rol.
type EstadoAuditoria = 'EXITO' | 'CONTINGENCIA' | 'RECHAZO'; // UX: estado semántico para “pills” (verde/naranja/rojo) solicitado en la tabla.

const safeJsonParse = (raw: string | null) => { // RNF2/robustez: parse defensivo sin lanzar excepciones que rompan la UI.
  if (!raw) return null; // Robustez: si no hay contenido, se retorna null explícito.
  try { // Robustez: JSON.parse puede fallar si el storage está corrupto.
    return JSON.parse(raw) as unknown; // TypeScript: se retorna unknown para forzar acceso seguro a propiedades.
  } catch { // Robustez: evita que errores de parse bloqueen exportación/UX.
    return null; // Robustez: fallback limpio.
  } // Robustez: fin try/catch.
}; // Robustez: fin helper.

const downloadBlob = (blob: Blob, filename: string) => { // UX: utilitario de descarga sin dependencias (cumple directriz de no añadir librerías).
  const url = window.URL.createObjectURL(blob); // UX: crea URL temporal (ObjectURL) para descarga local.
  const link = document.createElement('a'); // UX: anchor programático compatible con navegadores modernos.
  link.href = url; // UX: asigna destino de descarga.
  link.setAttribute('download', filename); // UX: sugiere nombre de archivo legible (institucional).
  document.body.appendChild(link); // UX: necesario para que algunos navegadores permitan click programático.
  link.click(); // UX: dispara descarga del archivo.
  link.parentNode?.removeChild(link); // UX: limpia DOM para evitar nodos huérfanos.
  window.URL.revokeObjectURL(url); // Rendimiento: libera memoria del ObjectURL.
}; // UX: fin helper descarga.

const buildFallbackCsv = (rows: HistoricoItem[]) => { // RF23: simulación de exportación CSV si el endpoint no está disponible (UI funcional).
  const headers = [ // RF23: encabezados claros para análisis gerencial (orden consistente con la tabla).
    'idMovimiento', // RF23: identificador técnico.
    'placa', // RF23: placa del vehículo.
    'tipoVehiculo', // RF23: clasificación.
    'idUsuario', // RF23: documento/ID (no se loguea, solo se exporta como dato autorizado en UI admin).
    'propietario', // RF23: nombre asociado al registro.
    'horaIngreso', // RF23: marca temporal.
    'horaSalida', // RF23: marca temporal.
    'bahiaAsignada', // RF23: ubicación.
    'operadorResponsable', // RF23: actor responsable.
    'estanciaMinutos', // RF23: métrica.
  ]; // RF23: fin headers.
  const escapeCsv = (value: unknown) => { // RF23: escape mínimo para CSV compatible (comillas, saltos, comas).
    const s = value === null || value === undefined ? '' : String(value); // RF23: normaliza valores nulos/undefined a cadena vacía.
    const needsQuotes = /[",\n\r]/.test(s); // RF23: CSV requiere comillas si hay coma, comilla o salto de línea.
    const escaped = s.replaceAll('"', '""'); // RF23: CSV dobla comillas internas.
    return needsQuotes ? `"${escaped}"` : escaped; // RF23: aplica comillas solo si es necesario (archivos más legibles).
  }; // RF23: fin escape.
  const lines = [ // RF23: construye líneas del CSV en memoria (suficiente para fallback pequeño).
    headers.join(','), // RF23: primera línea con encabezados.
    ...rows.map((r) => [ // RF23: filas de datos (mismo orden que headers).
      r.idMovimiento, // RF23: id.
      r.placa, // RF23: placa.
      r.tipoVehiculo, // RF23: tipo.
      r.idUsuario, // RF23: ID.
      r.propietario, // RF23: propietario.
      r.horaIngreso, // RF23: ingreso.
      r.horaSalida ?? '', // RF23: salida (vacío si no existe).
      r.bahiaAsignada, // RF23: bahía.
      r.operadorResponsable, // RF23: operador (vacío si no hay).
      r.estanciaMinutos ?? '', // RF23: estancia.
    ].map(escapeCsv).join(',')), // RF23: aplica escape y forma línea CSV.
  ]; // RF23: fin lines.
  const withBom = `\uFEFF${lines.join('\n')}`; // RF23: BOM UTF-8 para abrir correctamente en Excel sin romper tildes.
  return new Blob([withBom], { type: 'text/csv;charset=utf-8' }); // RF23: retorna Blob descargable.
}; // RF23: fin helper.

export const InformesPage: React.FC = () => { // UI: componente principal de la “Suite Ejecutiva de Auditoría”.
  const [historicoDesde, setHistoricoDesde] = useState(() => { // RF21: estado para fecha “desde” con valor inicial calculado.
    const d = new Date(); // RF21: base (hoy).
    d.setDate(d.getDate() - 14); // RF21/UX: rango por defecto de 14 días (análisis útil sin sobrecargar).
    return toIsoDate(d); // UX: formato requerido por input date.
  }); // RF21: fin inicialización “desde”.
  const [historicoHasta, setHistoricoHasta] = useState(() => toIsoDate(new Date())); // RF21: “hasta” por defecto = hoy (reduce fricción).

  const [busqueda, setBusqueda] = useState<string>(''); // UX: búsqueda principal por documento/ID (campo visible sin abrir filtros).
  const [tipoVehiculo, setTipoVehiculo] = useState<string>(''); // RF21: filtro opcional por tipoVehiculo.
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('TODOS'); // UX: selector “Tipo de Usuario” solicitado (derivado en frontend).
  const [tecnologiaAcceso, setTecnologiaAcceso] = useState<TecnologiaAcceso>('TODAS'); // UX: selector “Tecnología de acceso” solicitado (derivado en frontend).

  const [filtrosAbiertos, setFiltrosAbiertos] = useState<boolean>(false); // UX: panel colapsable (reduce ruido visual por defecto).
  const [page, setPage] = useState<number>(1); // RF21: página actual de la tabla.
  const [limit] = useState<number>(20); // RF21/UX: tamaño de página fijo para estabilidad visual (evita saltos de layout).

  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false); // UX: estado de carga para feedback y bloqueo de acciones.
  const [isExporting, setIsExporting] = useState<boolean>(false); // RF23: estado de exportación para evitar doble clic/peticiones duplicadas.

  const [historico, setHistorico] = useState<HistoricoItem[]>([]); // RF21: dataset histórico (tabla).
  const [meta, setMeta] = useState<HistoricoMeta | null>(null); // RF21: metadatos (paginación + stats para KPIs).

  const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : 'http://localhost:3000/api/v1'; // RF23: base URL coherente con el resto del frontend (fallback local).

  const csvHistoricoUrl = useMemo(() => { // RF23: construye URL de exportación según filtros activos (export “lo que ves”).
    const qs = new URLSearchParams(); // RF23: query string segura y legible.
    qs.set('desde', new Date(historicoDesde).toISOString()); // RF23: backend espera ISO (precisión horaria).
    qs.set('hasta', new Date(historicoHasta).toISOString()); // RF23: backend espera ISO (precisión horaria).
    if (tipoVehiculo.trim()) qs.set('tipoVehiculo', tipoVehiculo.trim()); // RF23: incluye filtro si hay valor.
    if (busqueda.trim()) qs.set('idUsuario', busqueda.trim()); // RF23: nombre de filtro en backend (idUsuario).
    return `${apiBase}/reportes/exportar/csv?${qs.toString()}`; // RF23: endpoint de exportación CSV (stream en backend).
  }, [apiBase, busqueda, historicoDesde, historicoHasta, tipoVehiculo]); // RF23: recalcula solo cuando cambia una dependencia.

  const formatDateTime = (value?: string | null) => { // UX/WCAG: formatea fechas para lectura rápida sin perder accesibilidad.
    if (!value) return '—'; // UX: guion largo como placeholder consistente (mejor que “-” en tablas).
    const d = new Date(value); // UX: parse de string ISO.
    if (Number.isNaN(d.getTime())) return value; // Robustez: si el backend manda string no ISO, se muestra literal.
    return d.toLocaleString('es-CO'); // UX: formato local Colombia (consistencia institucional).
  }; // UX: fin formatter.

  const isValidDate = (value?: string | null) => { // Robustez: detector de fechas inválidas para clasificar “rechazo”.
    if (!value) return false; // Robustez: sin valor, no es fecha válida.
    const d = new Date(value); // Robustez: intenta parse.
    return !Number.isNaN(d.getTime()); // Robustez: true si el Date es válido.
  }; // Robustez: fin helper.

  const tecnologiaFromRow = (row: HistoricoItem): TecnologiaAcceso => { // UX: clasificación de “tecnología” basada en presencia de operador responsable (proxy estable).
    return row.operadorResponsable ? 'OPERATIVO' : 'SISTEMA'; // UX: si no hay operador, se asume sistema/automatización/contingencia.
  }; // UX: fin clasificación.

  const tipoUsuarioFromRow = (row: HistoricoItem): TipoUsuario => { // UX: heurística local para “Tipo de Usuario” (hasta exponer rol real en API).
    return row.operadorResponsable ? 'OPERATIVO' : 'APRENDIZ'; // UX: si hay operador responsable, el actor que procesó fue OPERATIVO; si no, se asume APRENDIZ (placeholder razonable).
  }; // UX: fin heurística.

  const estadoFromRow = (row: HistoricoItem): EstadoAuditoria => { // UX: estado semántico solicitado (verde/naranja/rojo) a partir de datos disponibles.
    if (!isValidDate(row.horaIngreso)) return 'RECHAZO'; // UX: si la fecha de ingreso no es válida, se marca como “rechazo” (dato inconsistente/anómalo).
    if (row.horaSalida) return 'EXITO'; // UX: si hay salida, el flujo se completó correctamente.
    return 'CONTINGENCIA'; // UX: sin salida, se interpreta como incidencia/flujo abierto (contingencia operativa).
  }; // UX: fin estado.

  const badgeTipoVehiculo = (tipo: string) => { // UX/WCAG: estilos para pill de “Tipo” con contraste y semántica por categoría.
    const t = String(tipo || '').toUpperCase(); // UX: normaliza para comparaciones robustas.
    if (t.includes('MOTO')) return 'bg-[#39A900]/10 text-[#003939] border-[#39A900]/30'; // Paleta SENA: verde de acento (consistencia).
    if (t.includes('CAR')) return 'bg-[#003939]/10 text-[#003939] border-[#003939]/30'; // Paleta SENA: verde oscuro como base.
    if (t.includes('BICI')) return 'bg-slate-100 text-slate-700 border-slate-200'; // Neutral: mantiene contraste sin competir con estados críticos.
    return 'bg-slate-100 text-slate-700 border-slate-200'; // Default: seguro si backend cambia valores.
  }; // UX: fin pill tipo.

  const badgeTecnologia = (tec: TecnologiaAcceso) => { // UX/WCAG: estilos para pill de “Tecnología” con códigos de color solicitados.
    if (tec === 'OPERATIVO') return 'bg-[#39A900] text-white'; // Verde SENA: éxito / intervención operativa (alto contraste sobre blanco).
    if (tec === 'SISTEMA') return 'bg-[#FF6B00] text-white'; // Naranja: contingencia/sistema (advertencia sin ser bloqueo).
    return 'bg-slate-200 text-slate-700'; // Gris: “TODAS” (solo UI, no semántica de estado).
  }; // UX: fin pill tecnología.

  const badgeEstado = (estado: EstadoAuditoria) => { // UX/WCAG: estilos para pill de “Estado” (verde/naranja/rojo) solicitado.
    if (estado === 'EXITO') return 'bg-[#39A900] text-white'; // Verde: éxito (cumple contraste AA con texto blanco).
    if (estado === 'CONTINGENCIA') return 'bg-[#FF6B00] text-white'; // Naranja: contingencia (alto contraste).
    return 'bg-[#D32F2F] text-white'; // Rojo: rechazo/bloqueo (color de severidad, alto contraste).
  }; // UX: fin pill estado.

  const cargarHistorico = useCallback(async (targetPage: number) => { // RF21/RF22: consulta paginada del histórico (suite analítica).
    setLoadingHistorico(true); // UX: activa estado de carga para deshabilitar botones y evitar acciones duplicadas.
    try { // RF21: bloque principal de consulta.
      const res = await reportesService.historico({ // RF21: llama al servicio real del backend.
        desde: new Date(historicoDesde).toISOString(), // RF21: fecha desde en ISO.
        hasta: new Date(historicoHasta).toISOString(), // RF21: fecha hasta en ISO.
        tipoVehiculo: tipoVehiculo.trim() || undefined, // RF21: filtro opcional; undefined evita enviar string vacío.
        idUsuario: busqueda.trim() || undefined, // RF21: filtro opcional por documento/ID.
        page: targetPage, // RF21: página solicitada.
        limit, // RF21: tamaño de página.
      }); // RF21: fin request.

      const data = Array.isArray(res.data) ? res.data : []; // Robustez: garantiza arreglo (evita crashes si backend cambia envelope).
      const metaRes = (res.meta as HistoricoMeta) || null; // RF21: meta puede venir o no; se normaliza a null.

      setHistorico(data); // RF21: actualiza filas.
      setMeta(metaRes); // RF21: actualiza KPIs/paginación.
      setPage(targetPage); // RF21: actualiza página actual.
    } catch { // Directriz: si no hay endpoint o falla red, mantener UI funcional con datos simulados.
      const now = new Date(); // UX: base temporal para mock consistente.
      const mock: HistoricoItem[] = [ // UX: 3 filas para demostrar los 3 estados semánticos (verde/naranja/rojo).
        { // UX: fila éxito (completado) para mostrar pill verde.
          idMovimiento: 1, // UX: id local.
          placa: 'ABC123', // UX: ejemplo realista.
          tipoVehiculo: 'Carro', // UX: para pill tipo.
          idUsuario: busqueda.trim() || '1020304050', // UX: usa búsqueda si existe para que el usuario vea impacto.
          propietario: 'Aprendiz SENA', // UX: texto institucional.
          horaIngreso: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // UX: 45 min atrás.
          horaSalida: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // UX: 10 min atrás (finalizado).
          bahiaAsignada: 'B-01', // UX: bahía.
          operadorResponsable: 'Operativo', // UX: marca presencia de actor operativo.
          estanciaMinutos: 35, // UX: ejemplo numérico.
        }, // UX: fin fila éxito.
        { // UX: fila contingencia (abierto) para mostrar pill naranja.
          idMovimiento: 2, // UX: id local.
          placa: 'XYZ789', // UX: ejemplo realista.
          tipoVehiculo: 'Moto', // UX: para pill verde suave de moto.
          idUsuario: busqueda.trim() || '1098765432', // UX: ejemplo documento.
          propietario: 'Aprendiz SENA', // UX: nombre genérico.
          horaIngreso: new Date(now.getTime() - 25 * 60 * 1000).toISOString(), // UX: 25 min atrás.
          horaSalida: null, // UX: sin salida => contingencia.
          bahiaAsignada: 'M-07', // UX: bahía.
          operadorResponsable: '', // UX: vacío => se interpreta como sistema/contingencia.
          estanciaMinutos: null, // UX: desconocido si sigue activo.
        }, // UX: fin fila contingencia.
        { // UX: fila rechazo (dato anómalo) para mostrar pill rojo.
          idMovimiento: 3, // UX: id local.
          placa: 'REJ001', // UX: ejemplo identificable.
          tipoVehiculo: 'Bici', // UX: para pill neutral de bici.
          idUsuario: busqueda.trim() || '0000000000', // UX: ejemplo.
          propietario: 'Registro inválido', // UX: etiqueta clara del estado.
          horaIngreso: 'INVALID_DATE', // UX: provoca estado “RECHAZO” por fecha inválida (simulación segura).
          horaSalida: null, // UX: sin salida.
          bahiaAsignada: '—', // UX: sin asignación.
          operadorResponsable: '', // UX: sin operador.
          estanciaMinutos: null, // UX: sin métrica.
        }, // UX: fin fila rechazo.
      ]; // UX: fin mock.

      setHistorico(mock); // UX: set de filas simuladas.
      setMeta({ // UX: meta simulada (para KPIs y paginación).
        pagination: { total: mock.length, page: 1, lastPage: 1, limit }, // UX: paginación mínima.
        stats: { totalIngresos: mock.length, promedioEstanciaMinutos: 32.5, picoMaximoOcupacion: 9 }, // UX: números plausibles para un dashboard.
      }); // UX: fin meta mock.
      setPage(1); // UX: reset a página 1 (coherente con mock).
    } finally { // UX: este bloque siempre corre.
      setLoadingHistorico(false); // UX: apaga estado de carga para re-habilitar controles.
    } // UX: fin try/catch/finally.
  }, [busqueda, historicoDesde, historicoHasta, limit, tipoVehiculo]); // RF21: dependencias reales del request.

  const descargarCsv = useCallback(async () => { // RF23: descarga CSV con estado interno “isExporting”.
    if (isExporting) return; // RF23: evita duplicados (doble clic o repetición accidental).
    setIsExporting(true); // RF23: activa spinner + deshabilita botón.
    try { // RF23: bloque de exportación.
      const rawUser = localStorage.getItem('user'); // RF23: token almacenado por el login (no se imprime ni se loguea).
      const parsed = safeJsonParse(rawUser) as any; // RNF2: acceso defensivo; se evita fallar por JSON corrupto.
      const token = parsed?.accessToken || parsed?.access_token || parsed?.token; // RF23: soporta variantes comunes de naming.

      const response = await fetch(csvHistoricoUrl, { // RF23: fetch directo para blob (streaming server-side).
        headers: token ? { Authorization: `Bearer ${token}` } : undefined, // RNF2: se usa header sin exponer secretos en UI/logs.
      }); // RF23: fin fetch.

      if (!response.ok) { // RF23: si el endpoint falla, se activa fallback para mantener UI funcional.
        throw new Error('EXPORT_FAILED'); // RF23: dispara fallback controlado (sin mostrar detalles sensibles).
      } // RF23: fin guard.

      const blob = await response.blob(); // RF23: descarga como blob para no depender de librerías.
      downloadBlob(blob, `reporte_historico_${Date.now()}.csv`); // RF23: nombre estable si el backend no provee Content-Disposition parseado.
    } catch { // RF23: fallback simulado (directriz: UI funcional aun sin endpoint).
      const blob = buildFallbackCsv(historico.length ? historico : []); // RF23: genera CSV con lo cargado (o vacío si no hay datos).
      downloadBlob(blob, `reporte_historico_fallback_${Date.now()}.csv`); // RF23: distingue el archivo para trazabilidad del usuario.
    } finally { // RF23: siempre se ejecuta.
      setIsExporting(false); // RF23: re-habilita botón y oculta spinner.
    } // RF23: fin try/catch/finally.
  }, [csvHistoricoUrl, historico, isExporting]); // RF23: dependencias (url + dataset para fallback + lock).

  useEffect(() => { // UX: carga inicial para que la “suite ejecutiva” muestre data sin requerir primer clic.
    void cargarHistorico(1); // UX: ejecuta consulta inicial (ignora resultado, UI maneja estados).
  }, [cargarHistorico]); // UX: dependencia segura (callback memoizado).

  const rowsFiltradas = useMemo(() => { // UX: aplica filtros UI locales sin exigir cambios de API (especialmente TipoUsuario/Tecnología).
    let base = historico; // UX: base mutable local para aplicar filtros secuenciales.
    if (tipoUsuario !== 'TODOS') base = base.filter((r) => tipoUsuarioFromRow(r) === tipoUsuario); // UX: filtro “Tipo de Usuario” (heurístico, pero funcional).
    if (tecnologiaAcceso !== 'TODAS') base = base.filter((r) => tecnologiaFromRow(r) === tecnologiaAcceso); // UX: filtro “Tecnología de acceso” (proxy).
    return base; // UX: retorna el dataset filtrado listo para render.
  }, [historico, tecnologiaAcceso, tipoUsuario]); // UX: dependencias (recalcula al cambiar filas o filtros).

  const statsKpi = useMemo(() => { // RF21/RF22: KPIs volumétricos (cards premium) para lectura ejecutiva.
    const totalAccesos = meta?.stats?.totalIngresos ?? 0; // RF21: total ingresos del período.
    const tiempoMedio = meta?.stats?.promedioEstanciaMinutos ?? null; // RF21: promedio estancia (min).
    const pico = meta?.stats?.picoMaximoOcupacion ?? 0; // RF21: pico máximo de ocupación.
    const incidencias = rowsFiltradas.filter((r) => estadoFromRow(r) !== 'EXITO').length; // RF22: incidencias = no éxito (contingencia + rechazo).
    return { totalAccesos, tiempoMedio, pico, incidencias }; // RF21/RF22: estructura compacta para render.
  }, [meta?.stats?.picoMaximoOcupacion, meta?.stats?.promedioEstanciaMinutos, meta?.stats?.totalIngresos, rowsFiltradas]); // RF21: dependencias.

  return ( // UI: inicio de layout “Suite Ejecutiva de Auditoría”.
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900"> {/* Paleta SENA/WCAG: fondo gris institucional y texto oscuro con contraste alto. */}
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-6"> {/* Layout: ancho amplio sin forzar scroll horizontal; padding responsive. */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end -mt-20 mb-10 relative z-50">
          <div className="flex items-center gap-3">
            <Badge variant="info" className="bg-white/80 backdrop-blur-sm border-slate-200 text-slate-600">ADMIN</Badge>
            <button
              type="button"
              onClick={descargarCsv}
              disabled={isExporting}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3',
                'bg-[#39A900] text-[11px] font-black uppercase tracking-widest text-white',
                'hover:bg-[#2F8A00] shadow-[0_8px_20px_rgba(57,169,0,0.3)]',
                'focus:outline-none focus:ring-4 focus:ring-[#39A900]/20',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ].join(' ')}
              aria-busy={isExporting}
              aria-label={isExporting ? 'Procesando reporte para exportación' : 'Exportar reporte histórico a CSV'}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{isExporting ? 'Exportando...' : 'Descargar reporte (CSV)'}</span>
            </button>
          </div>
        </header>

        {/* KPIs Analíticos — Cards de alto impacto solicitado */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"> {/* UI: grilla de KPIs (4) solicitada; responsive sin overflow. */}
          <KpiCard title="Total accesos" value={String(statsKpi.totalAccesos)} subtitle="Ingresos en el período" gradient="bg-gradient-to-br from-[#003939] to-[#004d4d]" Icon={ShieldCheck} /> {/* KPI: volumen total. */}
          <KpiCard title="Pico ocupación" value={String(statsKpi.pico)} subtitle="Máximo simultáneo" gradient="bg-gradient-to-br from-[#003939] to-[#004d4d]" Icon={TrendingUp} /> {/* KPI: pico (impacto capacidad). */}
          <KpiCard title="Tiempo medio" value={statsKpi.tiempoMedio === null ? '—' : `${statsKpi.tiempoMedio.toFixed(1)} min`} subtitle="Estancia promedio" gradient="bg-gradient-to-br from-[#003939] to-[#004d4d]" Icon={Timer} /> {/* KPI: eficiencia/rotación. */}
          <KpiCard title="Incidencias" value={String(statsKpi.incidencias)} subtitle="Contingencias + rechazos" gradient="bg-gradient-to-br from-[#003939] to-[#004d4d]" Icon={TriangleAlert} /> {/* KPI: calidad operativa (riesgo). */}
        </section> {/* UI: fin KPIs. */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]"> {/* UI: contenedor premium (card) para filtros+tabla; sombras suaves, bordes sutiles. */}
          <div className="border-b border-slate-200 p-6"> {/* UI: header de filtros separado por borde (mejor escaneo). */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"> {/* Layout: stack en móvil, fila en pantallas grandes. */}
              <div className="flex-1"> {/* UI: búsqueda principal ocupa el espacio disponible. */}
                <label className="sr-only" htmlFor="busqueda">Búsqueda principal</label> {/* WCAG: label accesible sin saturar la UI. */}
                <div className="relative"> {/* UI: contenedor relativo para icono dentro del input. */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"> {/* UI: icono decorativo (no interactivo). */}
                    <Search className="h-4 w-4 text-slate-400" /> {/* UI: icono tenue para no competir con el texto. */}
                  </div> {/* UI: fin icono. */}
                  <input
                    id="busqueda" // WCAG: vincula input con label sr-only.
                    value={busqueda} // React: input controlado.
                    onChange={(e) => setBusqueda(e.target.value)} // React: actualiza estado.
                    placeholder="Buscar por documento / ID de usuario..." // UX: placeholder guía (no sustituye el label).
                    className={[ // Tailwind: input con alto contraste y foco visible.
                      'w-full rounded-2xl border-2 border-slate-200 bg-[#F8FAFC]', // Paleta: fondo gris claro institucional.
                      'py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-500', // Tipografía: peso suficiente para legibilidad.
                      'focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15', // WCAG: foco verde SENA con halo suave.
                    ].join(' ')} // UI: fin className.
                  /> {/* UI: fin input. */}
                </div> {/* UI: fin wrapper del input. */}
              </div> {/* UI: fin búsqueda. */}

              <div className="flex flex-wrap items-center gap-3"> {/* UI: botones de acción; wrap para evitar overflow en móviles. */}
                <button
                  type="button" // HTML: semántica correcta.
                  onClick={() => setFiltrosAbiertos((v) => !v)} // UX: alterna panel de filtros avanzados.
                  className={[ // Tailwind: botón secundario (borde) con foco visible.
                    'inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-3', // UI: hit-area amplia.
                    'border-[#003939]/20 bg-white text-[11px] font-black uppercase tracking-widest text-[#003939]', // Paleta: verde oscuro en texto/borde.
                    'hover:bg-[#F8FAFC]', // UX: hover sutil.
                    'focus:outline-none focus:ring-4 focus:ring-[#003939]/15', // WCAG: foco visible.
                  ].join(' ')} // UI: fin className.
                  aria-expanded={filtrosAbiertos} // WCAG: comunica si el panel está abierto.
                  aria-controls="panel-filtros-avanzados" // WCAG: enlaza el botón con el panel colapsable.
                >
                  <Filter className="h-4 w-4" /> {/* UI: icono de filtros. */}
                  Filtros avanzados {/* UX: texto claro; evita jerga técnica. */}
                </button> {/* UI: fin botón filtros. */}

                <button
                  type="button" // HTML: semántica correcta.
                  onClick={() => cargarHistorico(1)} // RF21: busca desde la página 1 para consistencia.
                  disabled={loadingHistorico} // UX: evita spam de requests y comunica estado.
                  className={[ // Tailwind: botón primario SENA (verde principal).
                    'inline-flex items-center gap-2 rounded-2xl px-5 py-3', // UI: tamaño premium.
                    'bg-[#39A900] text-[11px] font-black uppercase tracking-widest text-white', // Paleta: verde principal SENA.
                    'hover:brightness-95', // UX: feedback hover (oscurece levemente).
                    'focus:outline-none focus:ring-4 focus:ring-[#39A900]/25', // WCAG: foco visible en el color principal.
                    'disabled:cursor-not-allowed disabled:opacity-60', // WCAG/UX: deshabilitado evidente.
                  ].join(' ')} // UI: fin className.
                  aria-busy={loadingHistorico} // WCAG: comunica que la sección está ocupada cargando.
                >
                  {loadingHistorico ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {/* UX: spinner durante carga. */}
                  {loadingHistorico ? 'Buscando...' : 'Buscar / Filtrar'} {/* UX: texto cambia para explicar estado. */}
                </button> {/* UI: fin botón buscar. */}
              </div> {/* UI: fin acciones. */}
            </div> {/* UI: fin fila superior de filtros. */}

            {filtrosAbiertos && ( // UX: panel colapsable solo se muestra cuando el usuario lo solicita.
              <div
                id="panel-filtros-avanzados" // WCAG: id para aria-controls.
                className="mt-5 animate-in slide-in-from-top-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 duration-200" // UX: animación suave desde arriba; fondo gris institucional; bordes sutiles.
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5"> {/* Layout: 5 columnas en desktop para incluir “Tipo de Usuario” sin saturar. */}
                  <div className="flex flex-col gap-2"> {/* UI: filtro “Desde”. */}
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600"> {/* WCAG: label visible con tracking para legibilidad. */}
                      <CalendarRange className="h-4 w-4 text-slate-500" /> {/* UI: icono contextual. */}
                      Desde {/* UX: texto directo. */}
                    </label> {/* UI: fin label. */}
                    <input
                      type="date" // HTML: control nativo (accesible por defecto).
                      value={historicoDesde} // React: controlado.
                      onChange={(e) => setHistoricoDesde(e.target.value)} // React: actualiza estado.
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15" // WCAG: foco visible verde SENA.
                    /> {/* UI: fin input date. */}
                  </div> {/* UI: fin filtro desde. */}

                  <div className="flex flex-col gap-2"> {/* UI: filtro “Hasta”. */}
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Hasta</label> {/* WCAG: label visible. */}
                    <input
                      type="date" // HTML: control nativo.
                      value={historicoHasta} // React: controlado.
                      onChange={(e) => setHistoricoHasta(e.target.value)} // React: actualiza estado.
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15" // WCAG: foco visible.
                    /> {/* UI: fin input. */}
                  </div> {/* UI: fin filtro hasta. */}

                  <div className="flex flex-col gap-2"> {/* UI: filtro tipo vehículo. */}
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Tipo de vehículo</label> {/* WCAG: label visible. */}
                    <input
                      type="text" // HTML: texto libre para no imponer catálogo inexistente.
                      value={tipoVehiculo} // React: controlado.
                      onChange={(e) => setTipoVehiculo(e.target.value)} // React: actualiza estado.
                      placeholder="Ej: Moto / Carro" // UX: ejemplo.
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15" // WCAG: foco visible.
                    /> {/* UI: fin input. */}
                  </div> {/* UI: fin filtro tipo vehículo. */}

                  <div className="flex flex-col gap-2"> {/* UI: filtro “Tipo de Usuario” solicitado. */}
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Tipo de usuario</label> {/* WCAG: label visible. */}
                    <select
                      value={tipoUsuario} // React: controlado.
                      onChange={(e) => setTipoUsuario(e.target.value as TipoUsuario)} // React: set tipo usuario.
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15" // WCAG: foco visible.
                    >
                      <option value="TODOS">Todos</option> {/* UX: opción por defecto. */}
                      <option value="APRENDIZ">Aprendiz</option> {/* UX: rol típico del propietario (heurística). */}
                      <option value="OPERATIVO">Operativo</option> {/* UX: actor operativo si hay operadorResponsable (heurística). */}
                    </select> {/* UI: fin select. */}
                  </div> {/* UI: fin filtro tipo usuario. */}

                  <div className="flex flex-col gap-2"> {/* UI: filtro “Tecnología de acceso” solicitado. */}
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Tecnología de acceso</label> {/* WCAG: label visible. */}
                    <select
                      value={tecnologiaAcceso} // React: controlado.
                      onChange={(e) => setTecnologiaAcceso(e.target.value as TecnologiaAcceso)} // React: set tecnología.
                      className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#39A900] focus:outline-none focus:ring-4 focus:ring-[#39A900]/15" // WCAG: foco visible.
                    >
                      <option value="TODAS">Todas</option> {/* UX: sin filtro. */}
                      <option value="OPERATIVO">Operativo</option> {/* UX: intervención manual/operativa (proxy). */}
                      <option value="SISTEMA">Sistema / Contingencia</option> {/* UX: automatizado o sin actor operativo (proxy). */}
                    </select> {/* UI: fin select. */}
                  </div> {/* UI: fin filtro tecnología. */}
                </div> {/* UI: fin grilla de filtros. */}

                <div className="mt-4 flex items-center justify-between"> {/* UI: fila de ayuda + cerrar. */}
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-600"> {/* WCAG: texto auxiliar con contraste y tamaño legible. */}
                    <Filter className="h-4 w-4 text-slate-500" /> {/* UI: icono de apoyo. */}
                    Sin scroll horizontal masivo; textos largos se truncan en la tabla. {/* UX: recordatorio de comportamiento. */}
                  </p> {/* UI: fin texto auxiliar. */}
                  <button
                    type="button" // HTML: semántica correcta.
                    onClick={() => setFiltrosAbiertos(false)} // UX: cierra panel.
                    className="rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#003939] hover:underline focus:outline-none focus:ring-4 focus:ring-[#003939]/15" // WCAG: foco visible.
                  >
                    Cerrar {/* UX: acción clara. */}
                  </button> {/* UI: fin botón cerrar. */}
                </div> {/* UI: fin fila ayuda/cerrar. */}
              </div> // UX: fin panel colapsable.
            )} {/* UX: fin condicional filtros. */}
          </div> {/* UI: fin bloque filtros. */}

          <div className="p-6"> {/* UI: bloque de tabla. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"> {/* UI: header de tabla. */}
              <div> {/* UI: títulos de sección. */}
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Auditoría histórica</p> {/* UX: microtítulo para jerarquía. */}
                <p className="mt-1 text-lg font-black text-[#003939]">Resultados</p> {/* Paleta: verde oscuro como título. */}
              </div> {/* UI: fin títulos. */}
              <div className="text-sm font-semibold text-slate-600" aria-live="polite"> {/* WCAG: aria-live para anunciar cambios de paginación/total. */}
                {meta?.pagination ? `Página ${meta.pagination.page} de ${meta.pagination.lastPage} • Total ${meta.pagination.total}` : '—'} {/* UX: resumen ejecutivo. */}
              </div> {/* UI: fin resumen. */}
            </div> {/* UI: fin header tabla. */}

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"> {/* UX: overflow-x solo como fallback; truncación reduce necesidad de scroll. */}
              <table className="w-full table-fixed text-sm"> {/* UX: table-fixed para controlar anchos y evitar desbordes inesperados. */}
                <thead className="bg-[#F8FAFC]"> {/* Paleta: cabecera gris claro institucional solicitada. */}
                  <tr className="text-left"> {/* UI: alineación a la izquierda para lectura en listas. */}
                    <th className="w-[7rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Placa</th> {/* UX: ancho fijo para estabilidad. */}
                    <th className="w-[7rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Tipo</th> {/* UX: pill corto. */}
                    <th className="w-[14rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Propietario</th> {/* UX: columna con truncación. */}
                    <th className="w-[12rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Ingreso</th> {/* UX: fecha/hora en nowrap. */}
                    <th className="w-[12rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Salida</th> {/* UX: fecha/hora en nowrap. */}
                    <th className="w-[7rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Bahía</th> {/* UX: corto. */}
                    <th className="w-[9rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Tecnología</th> {/* UX: pill. */}
                    <th className="w-[9rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#003939]">Estado</th> {/* UX: pill semántica (verde/naranja/rojo). */}
                  </tr> {/* UI: fin header row. */}
                </thead> {/* UI: fin thead. */}
                <tbody> {/* UI: cuerpo de tabla. */}
                  {rowsFiltradas.length === 0 ? ( // UX: estado vacío consistente.
                    <tr> {/* HTML: fila única. */}
                      <td colSpan={8} className="px-4 py-10 text-center font-semibold text-slate-600"> {/* WCAG: texto centrado con contraste. */}
                        {loadingHistorico ? 'Cargando...' : 'Sin resultados. Ajusta filtros y presiona Buscar.'} {/* UX: instrucción accionable. */}
                      </td> {/* UI: fin celda. */}
                    </tr> // UX: fin estado vacío.
                  ) : ( // UX: hay filas.
                    rowsFiltradas.map((r, idx) => { // React: render de filas.
                      const tec = tecnologiaFromRow(r); // UX: tecnología por fila (proxy).
                      const estado = estadoFromRow(r); // UX: estado por fila (semántico).
                      return ( // React: retorno de fila.
                        <tr key={r.idMovimiento} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}> {/* WCAG: zebra stripes mejoran seguimiento visual. */}
                          <td className="px-4 py-3 font-black text-slate-900"> {/* UI: placa con alto peso para lectura rápida. */}
                            {r.placa} {/* UI: valor. */}
                          </td> {/* UI: fin celda placa. */}
                          <td className="px-4 py-3"> {/* UI: tipo (pill). */}
                            <span className={['inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest', badgeTipoVehiculo(r.tipoVehiculo)].join(' ')}> {/* WCAG: pill con borde para definición. */}
                              {r.tipoVehiculo || 'N/D'} {/* UX: fallback si falta dato. */}
                            </span> {/* UI: fin pill tipo. */}
                          </td> {/* UI: fin celda tipo. */}
                          <td className="truncate px-4 py-3 font-semibold text-slate-800 max-w-xs" title={r.propietario}> {/* UX: truncate para evitar scroll; title conserva info completa. */}
                            {r.propietario} {/* UI: valor. */}
                          </td> {/* UI: fin celda propietario. */}
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700"> {/* UX: nowrap para fechas evita saltos de línea desordenados. */}
                            {formatDateTime(r.horaIngreso)} {/* UX: formatter local. */}
                          </td> {/* UI: fin celda ingreso. */}
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700"> {/* UX: nowrap. */}
                            {formatDateTime(r.horaSalida)} {/* UX: formatter. */}
                          </td> {/* UI: fin celda salida. */}
                          <td className="truncate px-4 py-3 font-semibold text-slate-700 max-w-[10rem]" title={r.bahiaAsignada}> {/* UX: truncación para bahía. */}
                            {r.bahiaAsignada} {/* UI: valor. */}
                          </td> {/* UI: fin celda bahía. */}
                          <td className="px-4 py-3"> {/* UI: tecnología (pill). */}
                            <span className={['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest', badgeTecnologia(tec)].join(' ')}> {/* WCAG: pill consistente con “Estado”. */}
                              {tec === 'OPERATIVO' ? 'Operativo' : 'Sistema'} {/* UX: texto directo (sin jerga). */}
                            </span> {/* UI: fin pill tecnología. */}
                          </td> {/* UI: fin celda tecnología. */}
                          <td className="px-4 py-3"> {/* UI: estado (pill). */}
                            <span className={['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest', badgeEstado(estado)].join(' ')}> {/* WCAG: alto contraste y semántica color. */}
                              {estado === 'EXITO' ? 'Éxito' : estado === 'CONTINGENCIA' ? 'Contingencia' : 'Rechazo'} {/* UX: etiquetas solicitadas (verde/naranja/rojo). */}
                            </span> {/* UI: fin pill estado. */}
                          </td> {/* UI: fin celda estado. */}
                        </tr> // UI: fin fila.
                      ); // React: fin return fila.
                    }) // React: fin map.
                  )} {/* UI: fin condicional. */}
                </tbody> {/* UI: fin tbody. */}
              </table> {/* UI: fin tabla. */}
            </div> {/* UI: fin contenedor tabla. */}

            {meta?.pagination && ( // RF21: paginación solo si el backend entrega meta.
              <div className="mt-5 flex items-center justify-between gap-3"> {/* UI: barra de paginación. */}
                <button
                  type="button" // HTML: semántica.
                  onClick={() => cargarHistorico(Math.max(1, page - 1))} // RF21: página anterior (con mínimo 1).
                  disabled={loadingHistorico || page <= 1} // UX: deshabilita si no aplica.
                  className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#003939] hover:bg-[#F8FAFC] focus:outline-none focus:ring-4 focus:ring-[#003939]/15 disabled:cursor-not-allowed disabled:opacity-50" // WCAG: foco visible + estados claros.
                >
                  Anterior {/* UX: etiqueta estándar. */}
                </button> {/* UI: fin anterior. */}
                <button
                  type="button" // HTML: semántica.
                  onClick={() => cargarHistorico(page + 1)} // RF21: siguiente.
                  disabled={loadingHistorico || page >= meta.pagination.lastPage} // UX: deshabilita si es última página.
                  className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#003939] hover:bg-[#F8FAFC] focus:outline-none focus:ring-4 focus:ring-[#003939]/15 disabled:cursor-not-allowed disabled:opacity-50" // WCAG: foco visible.
                >
                  Siguiente {/* UX: etiqueta estándar. */}
                </button> {/* UI: fin siguiente. */}
              </div> // UI: fin paginación.
            )} {/* RF21: fin condicional paginación. */}
          </div> {/* UI: fin bloque tabla. */}
        </section> {/* UI: fin contenedor suite. */}
      </div> {/* UI: fin contenedor ancho. */}
    </div> // UI: fin página.
  ); // UI: fin return.
}; // UI: fin componente.

const KpiCard: React.FC<{ // UI: tarjeta KPI reutilizable, reduce duplicación y asegura consistencia visual.
  title: string; // UI: etiqueta del KPI (microtítulo).
  value: string; // UI: valor principal (macro).
  subtitle: string; // UI: aclaración (contexto).
  gradient: string; // Paleta: gradiente institucional solicitado para look “premium”.
  Icon: React.FC<{ className?: string }>; // UI: icono lucide para marca visual (fondo, opacidad baja).
}> = ({ title, value, subtitle, gradient, Icon }) => ( // UI: función pura (render determinista).
  <div className={`relative overflow-hidden rounded-3xl ${gradient} border border-white/10 text-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]`}> {/* UI: gradiente + borde sutil + sombra suave (ejecutivo). */}
    <Icon className="absolute -bottom-6 -right-6 h-28 w-28 opacity-10" /> {/* UI: icono grande semitransparente (opacity-10) como marca de dashboard. */}
    <div className="p-6"> {/* UI: padding consistente (múltiplos de 8) para ritmo visual. */}
      <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-90">{title}</p> {/* WCAG: texto blanco con opacidad moderada, mantiene contraste. */}
      <p className="mt-3 text-4xl font-black tracking-tight">{value}</p> {/* UI: valor grande, lectura rápida desde distancia. */}
      <p className="mt-2 text-sm font-semibold opacity-90">{subtitle}</p> {/* UI: contexto sin competir con el valor. */}
    </div> {/* UI: fin contenido. */}
  </div> // UI: fin KPI card.
); // UI: fin componente.
