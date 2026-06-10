import React, { useEffect, useMemo, useState } from 'react';
import { vehiculosService } from '../../services/vehiculos.service';
import { Search, AlertTriangle, Car, Hash, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useNotification } from '../../contexts/NotificationContext';
import type { AdminVehiculoItem, TipoVehiculo } from '../../types';

interface FormVehiculo {
  documentoPropietario: string;
  placa: string;
  fotoVehiculo: string;
  fotoTarjetaP: string;
  fotoPlaca: string;
  color: string;
  idTipoVehiculo: number;
}

const FORM_INICIAL: FormVehiculo = {
  documentoPropietario: '',
  placa: '',
  fotoVehiculo: '',
  fotoTarjetaP: '',
  fotoPlaca: '',
  color: '',
  idTipoVehiculo: 1,
};

export const VehiculosPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [vehiculos, setVehiculos] = useState<AdminVehiculoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [soloAdentro, setSoloAdentro] = useState(false);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);

  // Detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Editar / Crear
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'crear' | 'editar'>('crear');
  const [form, setForm] = useState<FormVehiculo>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormVehiculo, string>>>({});
  const [saving, setSaving] = useState(false);

  // Confirmar eliminación
  const [confirmEliminarPlaca, setConfirmEliminarPlaca] = useState<string | null>(null);

  // Salida emergencia (mantengo)
  const [isEmergenciaOpen, setIsEmergenciaOpen] = useState(false);
  const [placaSeleccionada, setPlacaSeleccionada] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [confirmPlaca, setConfirmPlaca] = useState('');
  const [accionLoading, setAccionLoading] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (!error || typeof error !== 'object') return fallback;
    const e = error as Record<string, unknown>;
    const raw = e.message ?? e.error ?? e.mensaje;
    if (Array.isArray(raw)) {
      const first = raw.find((v) => typeof v === 'string');
      return typeof first === 'string' && first.trim() ? first : fallback;
    }
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return fallback;
  };

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const res = await vehiculosService.listarVehiculosAdmin({ q: searchTerm.trim() || undefined });
      setVehiculos(res.data || []);
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudieron cargar los vehículos'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTipos = async () => {
    try {
      const res = await vehiculosService.listarTipos();
      setTipos(res.data || []);
    } catch {
      setTipos([]);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(fetchVehiculos, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredVehiculos = useMemo(() => {
    return soloAdentro ? vehiculos.filter((v) => v.isAdentro) : vehiculos;
  }, [vehiculos, soloAdentro]);

  const abrirDetalle = async (placa: string) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalle(null);
    try {
      const res = await vehiculosService.detalleVehiculoAdmin(placa);
      setDetalle(res.data);
    } catch (e) {
      showNotification(getErrorMessage(e, 'No se pudo cargar el detalle'), 'error');
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const abrirCrear = () => {
    setEditorMode('crear');
    setForm({ ...FORM_INICIAL, idTipoVehiculo: tipos[0]?.idTipoV || 1 });
    setErrores({});
    setEditorOpen(true);
  };

  const abrirEditar = (v: AdminVehiculoItem) => {
    setEditorMode('editar');
    setForm({
      documentoPropietario: '',
      placa: v.placa,
      fotoVehiculo: v.fotoVehiculo || '',
      fotoTarjetaP: v.fotoTarjetaP || '',
      fotoPlaca: (v as any).fotoPlaca || '',
      color: v.color || '',
      idTipoVehiculo: v.idTipoVehiculo,
    });
    setErrores({});
    setEditorOpen(true);
  };

  const validar = (): boolean => {
    const e: Partial<Record<keyof FormVehiculo, string>> = {};
    if (editorMode === 'crear') {
      if (!/^[0-9]{6,10}$/.test(form.documentoPropietario.trim())) e.documentoPropietario = 'Documento inválido';
      if (form.placa.trim().length < 5) e.placa = 'Placa inválida';
      if (!form.fotoVehiculo.trim()) e.fotoVehiculo = 'URL de foto vehículo obligatoria';
      if (!form.fotoTarjetaP.trim()) e.fotoTarjetaP = 'URL de tarjeta obligatoria';
    }
    if (!form.color.trim()) e.color = 'Color obligatorio';
    if (!form.idTipoVehiculo) e.idTipoVehiculo = 'Selecciona un tipo';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      if (editorMode === 'crear') {
        await vehiculosService.crearVehiculoAdmin({
          documentoPropietario: form.documentoPropietario.trim(),
          placa: form.placa.trim(),
          fotoVehiculo: form.fotoVehiculo.trim(),
          fotoTarjetaP: form.fotoTarjetaP.trim(),
          fotoPlaca: form.fotoPlaca.trim() || undefined,
          color: form.color.trim(),
          idTipoVehiculo: form.idTipoVehiculo,
        });
        showNotification('Vehículo creado y asignado correctamente', 'success');
      } else {
        await vehiculosService.editarVehiculoAdmin(form.placa, {
          fotoVehiculo: form.fotoVehiculo.trim() || undefined,
          fotoTarjetaP: form.fotoTarjetaP.trim() || undefined,
          fotoPlaca: form.fotoPlaca.trim() || undefined,
          color: form.color.trim() || undefined,
          idTipoVehiculo: form.idTipoVehiculo,
        });
        showNotification('Vehículo actualizado', 'success');
      }
      setEditorOpen(false);
      fetchVehiculos();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!confirmEliminarPlaca) return;
    try {
      await vehiculosService.eliminarVehiculoAdmin(confirmEliminarPlaca);
      showNotification('Vehículo eliminado', 'success');
      setConfirmEliminarPlaca(null);
      setDetalleOpen(false);
      fetchVehiculos();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo eliminar'), 'error');
    }
  };

  const openEmergencia = (placa: string) => {
    setAccionError(null);
    setPlacaSeleccionada(placa);
    setMotivo('');
    setConfirmPlaca('');
    setIsEmergenciaOpen(true);
  };

  const confirmarEmergencia = async () => {
    setAccionError(null);
    const placa = placaSeleccionada.trim().toUpperCase();
    if (confirmPlaca.trim().toUpperCase() !== placa) {
      setAccionError('La placa de confirmación no coincide');
      return;
    }
    if (motivo.trim().length < 5) {
      setAccionError('El motivo es obligatorio (5+ caracteres)');
      return;
    }
    try {
      setAccionLoading(true);
      await vehiculosService.salidaEmergenciaAdmin({ placa, motivo: motivo.trim() });
      setIsEmergenciaOpen(false);
      showNotification('Salida de emergencia registrada', 'success');
      fetchVehiculos();
    } catch (e: any) {
      setAccionError(e?.message || 'No se pudo registrar la salida de emergencia');
    } finally {
      setAccionLoading(false);
    }
  };

  const columns = useMemo(() => ([
    {
      header: 'Vehículo',
      accessor: (v: AdminVehiculoItem) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => abrirDetalle(v.placa)}>
          <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center text-blue-600">
            {v.fotoVehiculo ? <img src={v.fotoVehiculo} alt={v.placa} className="w-full h-full object-cover" /> : <Car size={18} />}
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Hash size={14} className="text-blue-600" /> {v.placa}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {typeof v.tipoVehiculo === 'string' ? v.tipoVehiculo : v.tipoVehiculo?.tipoVehiculo || 'N/A'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Color',
      accessor: (v: AdminVehiculoItem) => <span className="text-xs font-bold text-gray-700">{v.color || '—'}</span>,
    },
    {
      header: 'Estado',
      accessor: (v: AdminVehiculoItem) => (
        <Badge variant={v.isAdentro ? 'warning' : 'success'}>
          {v.isAdentro ? 'ADENTRO' : 'AFUERA'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: (v: AdminVehiculoItem) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg"
            onClick={() => abrirDetalle(v.placa)}
            title="Ver detalle"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg"
            onClick={() => abrirEditar(v)}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg"
            onClick={() => setConfirmEliminarPlaca(v.placa)}
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
          {v.isAdentro && (
            <button
              type="button"
              className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg"
              onClick={() => openEmergencia(v.placa)}
              title="Salida de emergencia"
            >
              <AlertTriangle size={16} />
            </button>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tipos]);

  return (
    <div className="space-y-8">
      {/* Cabecera de Acciones - Alineada al Layout superior */}
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 -mt-20 mb-10 relative z-50">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="md" onClick={abrirCrear} className="bg-[#39A900] hover:bg-[#2F8A00] shadow-[0_8px_20px_rgba(57,169,0,0.3)]">
            <Plus size={16} className="mr-2" /> AGREGAR VEHÍCULO
          </Button>
          <Button variant={soloAdentro ? 'primary' : 'outline'} size="md" onClick={() => setSoloAdentro((v) => !v)} className={soloAdentro ? '' : 'bg-white'}>
            {soloAdentro ? 'Solo ADENTRO' : 'Todos'}
          </Button>
          <Button variant="outline" size="md" onClick={fetchVehiculos} className="bg-white">Refrescar</Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <Input
          icon={<Search size={20} />}
          placeholder="Buscar por placa o tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        data={filteredVehiculos}
        isLoading={loading}
        emptyMessage="No se encontraron vehículos"
      />

      {/* Modal DETALLE */}
      <Modal
        isOpen={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        title={detalle ? `Vehículo · ${detalle.placa}` : 'Cargando...'}
        footer={
          detalle && (
            <>
              <Button variant="outline" onClick={() => setDetalleOpen(false)}>Cerrar</Button>
              <Button variant="primary" onClick={() => { setDetalleOpen(false); abrirEditar(detalle); }}>
                <Pencil size={16} className="mr-2" /> Editar
              </Button>
              <Button variant="danger" onClick={() => setConfirmEliminarPlaca(detalle.placa)}>
                <Trash2 size={16} className="mr-2" /> Eliminar
              </Button>
            </>
          )
        }
      >
        {detalleLoading || !detalle ? (
          <p className="text-sm text-slate-500">Cargando información...</p>
        ) : (
          <div className="space-y-5">
            {/* Datos del vehículo */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Datos del vehículo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Foto del vehículo</p>
                  {detalle.fotoVehiculo ? (
                    <img
                      src={detalle.fotoVehiculo}
                      onClick={() => setFotoAmpliada(detalle.fotoVehiculo)}
                      className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                    />
                  ) : <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">Sin foto</div>}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Tarjeta de propiedad</p>
                  {detalle.fotoTarjetaP ? (
                    <img
                      src={detalle.fotoTarjetaP}
                      onClick={() => setFotoAmpliada(detalle.fotoTarjetaP)}
                      className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                    />
                  ) : <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">Sin foto</div>}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Foto de la placa</p>
                  {detalle.fotoPlaca ? (
                    <img
                      src={detalle.fotoPlaca}
                      onClick={() => setFotoAmpliada(detalle.fotoPlaca)}
                      className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer"
                    />
                  ) : <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">Sin foto</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 bg-slate-50 p-3 rounded-xl">
                <Dato label="Placa" valor={detalle.placa} />
                <Dato label="Color" valor={detalle.color} />
                <Dato label="Tipo" valor={detalle.tipoVehiculo?.tipoVehiculo || '—'} />
                <Dato label="Última edición" valor={detalle.ultimaEdicionAt ? new Date(detalle.ultimaEdicionAt).toLocaleDateString() : '—'} />
              </div>
            </section>

            {/* Propietario */}
            {detalle.propietario && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Propietario</h3>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
                  {detalle.propietario.fotoPersona ? (
                    <img src={detalle.propietario.fotoPersona} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black">
                      {detalle.propietario.nombreCompleto?.substring(0, 2).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Dato label="Nombre" valor={detalle.propietario.nombreCompleto} />
                    <Dato label="Documento" valor={detalle.propietario.documento} />
                    <Dato label="Correo" valor={detalle.propietario.correo} />
                    <Dato label="Teléfono" valor={detalle.propietario.numTelf || '—'} />
                    {detalle.propietario.idFormacion && (
                      <Dato label="Ficha" valor={detalle.propietario.idFormacion} />
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* Modal CREAR / EDITAR */}
      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editorMode === 'crear' ? 'Agregar Vehículo' : `Editar ${form.placa}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button variant="primary" isLoading={saving} onClick={guardar} className="bg-[#39A900] hover:bg-[#2F8A00]">
              {editorMode === 'crear' ? 'Crear' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editorMode === 'crear' && (
            <Input
              label="Documento del propietario"
              value={form.documentoPropietario}
              onChange={(e) => setForm((p) => ({ ...p, documentoPropietario: e.target.value }))}
              error={errores.documentoPropietario}
              placeholder="Cédula del usuario al que se le asigna"
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Placa"
              value={form.placa}
              onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() }))}
              error={errores.placa}
              disabled={editorMode === 'editar'}
              placeholder="ABC123"
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              error={errores.color}
              placeholder="Rojo, Negro..."
            />
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</label>
              <select
                value={form.idTipoVehiculo}
                onChange={(e) => setForm((p) => ({ ...p, idTipoVehiculo: Number(e.target.value) }))}
                className="w-full mt-1 p-3 border border-slate-300 rounded-xl font-medium text-sm focus:border-[#39A900] focus:outline-none"
              >
                {tipos.map((t) => (
                  <option key={t.idTipoV} value={t.idTipoV}>{t.tipoVehiculo}</option>
                ))}
              </select>
              {errores.idTipoVehiculo && <p className="text-rose-600 text-[10px] mt-1">{errores.idTipoVehiculo}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ImageUpload
              label="Foto del vehículo"
              value={form.fotoVehiculo}
              onChange={(url) => setForm((p) => ({ ...p, fotoVehiculo: url }))}
              error={errores.fotoVehiculo}
              placeholder="Subir foto vehículo"
            />
            <ImageUpload
              label="Tarjeta de propiedad"
              value={form.fotoTarjetaP}
              onChange={(url) => setForm((p) => ({ ...p, fotoTarjetaP: url }))}
              error={errores.fotoTarjetaP}
              placeholder="Subir tarjeta"
            />
            <ImageUpload
              label="Foto de la placa (opcional)"
              value={form.fotoPlaca}
              onChange={(url) => setForm((p) => ({ ...p, fotoPlaca: url }))}
              placeholder="Subir foto placa"
            />
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        isOpen={!!confirmEliminarPlaca}
        onClose={() => setConfirmEliminarPlaca(null)}
        title="Eliminar vehículo"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmEliminarPlaca(null)}>Cancelar</Button>
            <Button variant="danger" onClick={eliminar}>Eliminar definitivamente</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          ¿Estás seguro de eliminar el vehículo con placa <b>{confirmEliminarPlaca}</b>? Esta acción notifica
          al propietario y a quienes lo tenían compartido, y lo retira del sistema.
        </p>
      </Modal>

      {/* Salida de emergencia */}
      <Modal
        isOpen={isEmergenciaOpen}
        onClose={() => setIsEmergenciaOpen(false)}
        title="Salida de Emergencia"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsEmergenciaOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmarEmergencia} disabled={accionLoading}>
              {accionLoading ? 'Procesando...' : 'Confirmar salida'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Acción crítica</p>
            <p className="text-sm font-semibold text-red-700 mt-1">
              Registrará una salida manual, cerrará el movimiento activo y generará auditoría.
            </p>
          </div>
          <Input label="Placa" value={placaSeleccionada} disabled />
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none rounded-2xl px-5 py-4 text-sm font-medium min-h-[120px]"
              placeholder="Describe el motivo (obligatorio)"
            />
          </div>
          <Input
            label="Confirmación (escribe la placa)"
            value={confirmPlaca}
            onChange={(e) => setConfirmPlaca(e.target.value)}
          />
          {accionError && <p className="text-rose-600 text-xs font-bold">{accionError}</p>}
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

const Dato: React.FC<{ label: string; valor: any }> = ({ label, valor }) => (
  <div>
    <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
    <p className="text-sm font-bold text-slate-900">{valor ?? '—'}</p>
  </div>
);
