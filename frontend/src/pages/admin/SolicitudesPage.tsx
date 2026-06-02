import React, { useEffect, useMemo, useState } from 'react';
import { vehiculosService } from '../../services/vehiculos.service';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Check, X, Clock, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import type { SolicitudVehiculoAdmin, EstadoSolicitudVehiculo } from '../../types';

/**
 * Gestión de solicitudes de registro de vehículo (Admin).
 * Permite aprobar o rechazar las solicitudes enviadas por los aprendices desde el móvil.
 *  - Si se aprueba: el vehículo queda registrado y aparece en "Mis Vehículos" del usuario.
 *  - Si se rechaza: el usuario recibe una notificación con el motivo.
 */
export const SolicitudesPage: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudVehiculoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitudVehiculo | 'TODOS'>('PENDIENTE');

  // Modal de detalle / acción
  const [seleccionada, setSeleccionada] = useState<SolicitudVehiculoAdmin | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Modal de rechazo
  const [rechazoOpen, setRechazoOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [feedbackOk, setFeedbackOk] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      setError(null);
      const estado = filtroEstado === 'TODOS' ? undefined : filtroEstado;
      const res = await vehiculosService.listarSolicitudes(estado);
      setSolicitudes(res.data || []);
    } catch (err) {
      const msg = (err as any)?.message || 'No se pudieron cargar las solicitudes';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const contadores = useMemo(() => {
    return {
      pendientes: solicitudes.filter((s) => s.estado === 'PENDIENTE').length,
      aprobadas: solicitudes.filter((s) => s.estado === 'APROBADO').length,
      rechazadas: solicitudes.filter((s) => s.estado === 'RECHAZADO').length,
    };
  }, [solicitudes]);

  const handleAprobar = async (solicitud: SolicitudVehiculoAdmin) => {
    setProcesando(true);
    setError(null);
    try {
      await vehiculosService.resolverSolicitud(solicitud.idSolicitud, 'APROBADO');
      setFeedbackOk(`Solicitud #${solicitud.idSolicitud} aprobada. El vehículo fue registrado.`);
      setSeleccionada(null);
      await cargarSolicitudes();
      setTimeout(() => setFeedbackOk(null), 4000);
    } catch (err) {
      setError((err as any)?.message || 'Error al aprobar');
    } finally {
      setProcesando(false);
    }
  };

  const abrirRechazo = () => {
    setMotivoRechazo('');
    setRechazoOpen(true);
  };

  const confirmarRechazo = async () => {
    if (!seleccionada) return;
    if (!motivoRechazo.trim() || motivoRechazo.trim().length < 5) {
      setError('Debes indicar un motivo de al menos 5 caracteres');
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      await vehiculosService.resolverSolicitud(
        seleccionada.idSolicitud,
        'RECHAZADO',
        motivoRechazo.trim(),
      );
      setFeedbackOk(`Solicitud #${seleccionada.idSolicitud} rechazada. El usuario fue notificado.`);
      setRechazoOpen(false);
      setSeleccionada(null);
      setMotivoRechazo('');
      await cargarSolicitudes();
      setTimeout(() => setFeedbackOk(null), 4000);
    } catch (err) {
      setError((err as any)?.message || 'Error al rechazar');
    } finally {
      setProcesando(false);
    }
  };

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderEstadoBadge = (estado: EstadoSolicitudVehiculo) => {
    if (estado === 'PENDIENTE') return <Badge variant="warning">Pendiente</Badge>;
    if (estado === 'APROBADO') return <Badge variant="success">Aprobado</Badge>;
    return <Badge variant="error">Rechazado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header con contadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pendientes</p>
              <p className="text-3xl font-black text-slate-900">{contadores.pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Aprobadas</p>
              <p className="text-3xl font-black text-slate-900">{contadores.aprobadas}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <X size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Rechazadas</p>
              <p className="text-3xl font-black text-slate-900">{contadores.rechazadas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filtrar:</span>
        {(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'TODOS'] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filtroEstado === estado
                ? 'bg-[#39A900] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {estado === 'TODOS' ? 'Todas' : estado.toLowerCase()}
          </button>
        ))}
        <button
          onClick={cargarSolicitudes}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Feedback */}
      {feedbackOk && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="text-emerald-700" size={20} />
          <p className="text-sm font-semibold text-emerald-800">{feedbackOk}</p>
        </div>
      )}
      {error && !rechazoOpen && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-rose-700" size={20} />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </div>
      )}

      {/* Lista de solicitudes */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-sm font-bold text-slate-500">Cargando solicitudes...</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Clock size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-black text-slate-700">No hay solicitudes</p>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Las solicitudes enviadas desde el móvil aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {solicitudes.map((sol) => (
            <div
              key={sol.idSolicitud}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex">
                <img
                  src={sol.fotoVehiculo}
                  alt={sol.placa}
                  className="w-32 h-32 object-cover cursor-pointer"
                  onClick={() => setFotoAmpliada(sol.fotoVehiculo)}
                />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-black tracking-widest text-slate-900">{sol.placa}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                        #{sol.idSolicitud} · {formatFecha(sol.creadoEn)}
                      </p>
                    </div>
                    {renderEstadoBadge(sol.estado)}
                  </div>
                  <div className="mt-3 space-y-1 text-xs font-semibold text-slate-700">
                    <p>
                      <span className="text-slate-500">Color:</span> {sol.color}
                    </p>
                    <p>
                      <span className="text-slate-500">Tipo:</span>{' '}
                      {sol.tipoVehiculo?.tipoVehiculo || `ID ${sol.idTipoVehiculo}`}
                    </p>
                    <p>
                      <span className="text-slate-500">Usuario:</span>{' '}
                      {sol.usuario?.nombreCompleto || sol.documento}
                    </p>
                  </div>
                </div>
              </div>
              {sol.estado === 'RECHAZADO' && sol.motivoRechazo && (
                <div className="bg-rose-50 border-t border-rose-200 px-4 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Motivo del rechazo</p>
                  <p className="text-xs font-semibold text-rose-800 mt-1">{sol.motivoRechazo}</p>
                </div>
              )}
              <div className="border-t border-slate-200 p-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSeleccionada(sol)}
                  className="flex-1"
                >
                  <Eye size={14} className="mr-1" /> Ver detalle
                </Button>
                {sol.estado === 'PENDIENTE' && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleAprobar(sol)}
                      isLoading={procesando}
                      className="flex-1"
                    >
                      <Check size={14} className="mr-1" /> Aprobar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setSeleccionada(sol);
                        abrirRechazo();
                      }}
                      className="flex-1"
                    >
                      <X size={14} className="mr-1" /> Rechazar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      <Modal
        isOpen={!!seleccionada && !rechazoOpen}
        onClose={() => setSeleccionada(null)}
        title={`Solicitud #${seleccionada?.idSolicitud ?? ''} · ${seleccionada?.placa ?? ''}`}
      >
        {seleccionada && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Foto vehículo</p>
                <img
                  src={seleccionada.fotoVehiculo}
                  className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                  onClick={() => setFotoAmpliada(seleccionada.fotoVehiculo)}
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Tarjeta propiedad</p>
                <img
                  src={seleccionada.fotoTarjetaP}
                  className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                  onClick={() => setFotoAmpliada(seleccionada.fotoTarjetaP)}
                />
              </div>
              {seleccionada.fotoPlaca && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Foto placa</p>
                  <img
                    src={seleccionada.fotoPlaca}
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                    onClick={() => setFotoAmpliada(seleccionada.fotoPlaca!)}
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <p><b>Placa:</b> {seleccionada.placa}</p>
              <p><b>Color:</b> {seleccionada.color}</p>
              <p><b>Tipo:</b> {seleccionada.tipoVehiculo?.tipoVehiculo || `ID ${seleccionada.idTipoVehiculo}`}</p>
              <p><b>Usuario:</b> {seleccionada.usuario?.nombreCompleto || seleccionada.documento}</p>
              <p><b>Correo:</b> {seleccionada.usuario?.correo || '—'}</p>
              <p><b>Documento:</b> {seleccionada.documento}</p>
              <p><b>Fecha solicitud:</b> {formatFecha(seleccionada.creadoEn)}</p>
              <p><b>Estado:</b> {renderEstadoBadge(seleccionada.estado)}</p>
              {seleccionada.motivoRechazo && (
                <p><b>Motivo rechazo:</b> {seleccionada.motivoRechazo}</p>
              )}
            </div>

            {seleccionada.estado === 'PENDIENTE' && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="success"
                  onClick={() => handleAprobar(seleccionada)}
                  isLoading={procesando}
                  className="flex-1"
                >
                  <Check size={16} className="mr-2" /> Aprobar registro
                </Button>
                <Button
                  variant="danger"
                  onClick={abrirRechazo}
                  className="flex-1"
                >
                  <X size={16} className="mr-2" /> Rechazar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de rechazo (motivo) */}
      <Modal
        isOpen={rechazoOpen}
        onClose={() => {
          setRechazoOpen(false);
          setMotivoRechazo('');
          setError(null);
        }}
        title={`Rechazar solicitud #${seleccionada?.idSolicitud ?? ''}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Indica el motivo del rechazo. El usuario recibirá una notificación con este
            mensaje y podrá hacer las correcciones necesarias antes de volver a solicitar.
          </p>
          <textarea
            value={motivoRechazo}
            onChange={(e) => {
              setMotivoRechazo(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            maxLength={500}
            placeholder="Ej: La foto del vehículo no es clara. La placa no coincide con la tarjeta de propiedad..."
            className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <p className="text-[10px] font-bold text-slate-500 text-right">
            {motivoRechazo.length}/500
          </p>
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-rose-800">{error}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setRechazoOpen(false);
                setMotivoRechazo('');
                setError(null);
              }}
              className="flex-1"
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={confirmarRechazo}
              isLoading={procesando}
              className="flex-1"
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setFotoAmpliada(null)}
        >
          <img src={fotoAmpliada} className="max-w-full max-h-full rounded-2xl" />
          <button
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-6 right-6 bg-white/20 hover:bg-white/30 text-white rounded-xl p-2"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
