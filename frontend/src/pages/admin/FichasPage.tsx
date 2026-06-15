import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, GraduationCap, Pencil, Trash2, RotateCcw, MapPin, Clock } from 'lucide-react';
import { formacionService, type Ficha, type Jornada } from '../../services/formacion.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../contexts/NotificationContext';

interface FormFicha {
  ficha: string;
  nombre: string;
  ambiente: string;
  jornada: '' | Jornada;
}

const FORM_INICIAL: FormFicha = { ficha: '', nombre: '', ambiente: '', jornada: '' };

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

export const FichasPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [q, setQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [form, setForm] = useState<FormFicha>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormFicha, string>>>({});
  const [saving, setSaving] = useState(false);

  const [confirmDeleteFicha, setConfirmDeleteFicha] = useState<string | null>(null);

  const fetchFichas = async () => {
    try {
      setLoading(true);
      const res = await formacionService.listar(estado);
      setFichas(res.data || []);
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudieron cargar las fichas'), 'error');
      setFichas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const fichasFiltradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return fichas;
    return fichas.filter(
      (f) => f.ficha.toLowerCase().includes(term) || f.nombre.toLowerCase().includes(term),
    );
  }, [fichas, q]);

  const abrirCrear = () => {
    setModalMode('crear');
    setForm({ ...FORM_INICIAL });
    setErrores({});
    setModalOpen(true);
  };

  const abrirEditar = (f: Ficha) => {
    setModalMode('editar');
    setForm({ ficha: f.ficha, nombre: f.nombre, ambiente: f.ambiente || '', jornada: f.jornada || '' });
    setErrores({});
    setModalOpen(true);
  };

  const validar = (): boolean => {
    const e: Partial<Record<keyof FormFicha, string>> = {};
    if (modalMode === 'crear' && !/^[0-9]{7}$/.test(form.ficha.trim())) e.ficha = 'La ficha debe tener 7 dígitos';
    if (form.nombre.trim().length < 3) e.nombre = 'El nombre del programa es obligatorio';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        ambiente: form.ambiente.trim() || undefined,
        jornada: form.jornada || undefined,
      };
      if (modalMode === 'crear') {
        await formacionService.crear({ ficha: form.ficha.trim(), ...payload });
        showNotification('Ficha creada', 'success');
      } else {
        await formacionService.actualizar(form.ficha, payload);
        showNotification('Ficha actualizada', 'success');
      }
      setModalOpen(false);
      fetchFichas();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!confirmDeleteFicha) return;
    try {
      await formacionService.eliminar(confirmDeleteFicha);
      showNotification('Ficha desactivada', 'success');
      setConfirmDeleteFicha(null);
      fetchFichas();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo desactivar'), 'error');
    }
  };

  const reactivar = async (ficha: string) => {
    try {
      await formacionService.reactivar(ficha);
      showNotification('Ficha reactivada', 'success');
      fetchFichas();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo reactivar'), 'error');
    }
  };

  const columns = useMemo(() => ([
    {
      header: 'Ficha',
      accessor: (f: Ficha) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{f.ficha}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[220px]">{f.nombre}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Ambiente',
      accessor: (f: Ficha) => (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <MapPin size={12} className="text-slate-400" /> {f.ambiente || '—'}
        </div>
      ),
    },
    {
      header: 'Jornada',
      accessor: (f: Ficha) => (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Clock size={12} className="text-slate-400" /> {f.jornada || 'Única'}
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (f: Ficha) => (
        <Badge variant={f.activo ? 'success' : 'error'}>{f.activo ? 'Activa' : 'Desactivada'}</Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: (f: Ficha) => (
        estado === 'INACTIVO' ? (
          <button
            type="button"
            onClick={() => reactivar(f.ficha)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-widest"
            title="Reactivar"
          >
            <RotateCcw size={14} /> Reactivar
          </button>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => abrirEditar(f)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteFicha(f.ficha)}
              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
              title="Desactivar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [estado]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 -mt-20 mb-10 relative z-50">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={abrirCrear}
          className="bg-[#39A900] hover:bg-[#2F8A00] shadow-[0_8px_20px_rgba(57,169,0,0.3)] w-full md:w-auto"
        >
          <Plus size={16} className="mr-2" /> CREAR FICHA
        </Button>
      </header>

      <div className="bg-white dark:bg-[#121212] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 space-y-3">
        <Input
          icon={<Search size={20} />}
          placeholder="Buscar por número de ficha o programa..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Estado:</span>
          {([['ACTIVO', 'Activas'], ['INACTIVO', 'Desactivadas']] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={estado === value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setEstado(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={fichasFiltradas}
        isLoading={loading}
        emptyMessage="No se encontraron fichas"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'crear' ? 'Crear Ficha' : `Editar ficha ${form.ficha}`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="button" variant="primary" isLoading={saving} onClick={guardar} className="bg-[#39A900] hover:bg-[#2F8A00]">
              {modalMode === 'crear' ? 'Crear' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número de ficha"
              icon={<GraduationCap size={18} />}
              value={form.ficha}
              onChange={(e) => setForm((p) => ({ ...p, ficha: e.target.value.replace(/[^0-9]/g, '') }))}
              error={errores.ficha}
              placeholder="7 dígitos"
              disabled={modalMode === 'editar'}
            />
            <Input
              label="Ambiente"
              icon={<MapPin size={18} />}
              value={form.ambiente}
              onChange={(e) => setForm((p) => ({ ...p, ambiente: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
              inputMode="numeric"
              maxLength={4}
              placeholder="Ej: 304"
            />
            <div className="md:col-span-2">
              <Input
                label="Programa de formación"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                error={errores.nombre}
                placeholder="Nombre del programa"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jornada</label>
              <select
                value={form.jornada}
                onChange={(e) => setForm((p) => ({ ...p, jornada: e.target.value as '' | Jornada }))}
                className="w-full mt-1 p-3 border border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-xl font-medium text-sm focus:border-[#39A900] focus:outline-none"
              >
                <option value="">Única</option>
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteFicha}
        onClose={() => setConfirmDeleteFicha(null)}
        title="Desactivar ficha"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteFicha(null)}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={eliminar}>Desactivar</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-200">
          ¿Desactivar la ficha <b>{confirmDeleteFicha}</b>? Podrás reactivarla después desde la pestaña
          "Desactivadas". Pasados 3 meses sin reactivar, se eliminará definitivamente.
        </p>
      </Modal>
    </div>
  );
};
