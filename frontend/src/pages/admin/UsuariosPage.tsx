import React, { useEffect, useMemo, useState } from 'react';
import { usuariosService } from '../../services/usuarios.service';
import type { AdminUsuarioItem } from '../../types';
import { Plus, Search, User as UserIcon, Mail, Smartphone, Car, IdCard, Phone, Lock, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useNotification } from '../../contexts/NotificationContext';

type Rol = 'APRENDIZ' | 'ADMIN' | 'OPERATIVO' | 'TODOS';

interface FormUsuario {
  documento: string;
  nombreCompleto: string;
  correo: string;
  numTelf: string;
  contactoEmerg: string;
  contra: string;
  idTipoUsr: number; // 1 APRENDIZ, 2 ADMIN, 3 OPERATIVO
  fotoPersona: string;
  idFormacion: string;
}

const FORM_INICIAL: FormUsuario = {
  documento: '',
  nombreCompleto: '',
  correo: '',
  numTelf: '',
  contactoEmerg: '',
  contra: '',
  idTipoUsr: 1,
  fotoPersona: '',
  idFormacion: '',
};

export const UsuariosPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [usuarios, setUsuarios] = useState<AdminUsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<Rol>('TODOS');
  const [q, setQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [form, setForm] = useState<FormUsuario>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormUsuario, string>>>({});
  const [saving, setSaving] = useState(false);

  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);

  const [viewUser, setViewUser] = useState<AdminUsuarioItem | null>(null);

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

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await usuariosService.listarUsuariosAdmin({
        q: q.trim() || undefined,
        rol,
      });
      setUsuarios(res.data || []);
    } catch (error) {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(fetchUsuarios, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rol]);

  const abrirCrear = () => {
    setModalMode('crear');
    setForm({ ...FORM_INICIAL });
    setErrores({});
    setModalOpen(true);
  };

  const abrirEditar = (u: AdminUsuarioItem) => {
    setModalMode('editar');
    setForm({
      documento: u.documento,
      nombreCompleto: u.nombreCompleto,
      correo: u.correo,
      numTelf: u.numTelf || '',
      contactoEmerg: u.contactoEmerg || '',
      contra: '',
      idTipoUsr: u.idTipoUsr,
      fotoPersona: u.fotoPersona || '',
      idFormacion: u.idFormacion || '',
    });
    setErrores({});
    setModalOpen(true);
  };

  const cerrar = () => {
    setModalOpen(false);
    setSaving(false);
  };

  const validar = (): boolean => {
    const e: Partial<Record<keyof FormUsuario, string>> = {};
    if (!/^[0-9]{6,10}$/.test(form.documento.trim())) e.documento = 'Documento inválido (6–10 dígitos)';
    if (form.nombreCompleto.trim().length < 3) e.nombreCompleto = 'Nombre obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) e.correo = 'Correo inválido';
    if (!/^[0-9]{10}$/.test(form.numTelf.trim())) e.numTelf = 'Teléfono inválido (10 dígitos)';
    if (modalMode === 'crear') {
      if (!form.contra.trim()) e.contra = 'Contraseña obligatoria';
    }
    if (form.idTipoUsr === 1) {
      if (!form.contactoEmerg || !/^[0-9]{10}$/.test(form.contactoEmerg.trim())) {
        e.contactoEmerg = 'Contacto de emergencia obligatorio (10 dígitos)';
      }
      if (!form.idFormacion || !/^[0-9]{7}$/.test(form.idFormacion.trim())) {
        e.idFormacion = 'Ficha obligatoria (7 dígitos)';
      }
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      if (modalMode === 'crear') {
        const payload: any = {
          documento: form.documento.trim(),
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim(),
          numTelf: form.numTelf.trim(),
          contactoEmerg: form.contactoEmerg.trim() || form.numTelf.trim(),
          contra: form.contra,
          idTipoUsr: form.idTipoUsr,
          fotoPersona: form.fotoPersona || '',
        };
        if (form.idTipoUsr === 1 && form.idFormacion) payload.idFormacion = form.idFormacion.trim();
        const res = await usuariosService.crearUsuarioAdmin(payload);
        const msg = res.data?.mensaje || 'Usuario creado';
        if (form.idTipoUsr === 1) {
          showNotification(`Usuario creado. Se envió un correo de verificación a ${form.correo}`, 'success');
        } else {
          showNotification(msg, 'success');
        }
      } else {
        const payload: any = {
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim(),
          numTelf: form.numTelf.trim(),
          contactoEmerg: form.contactoEmerg.trim() || form.numTelf.trim(),
          idTipoUsr: form.idTipoUsr,
          fotoPersona: form.fotoPersona || undefined,
          idFormacion: form.idFormacion?.trim() || null,
        };
        await usuariosService.actualizarUsuarioAdmin(form.documento, payload);
        showNotification('Usuario actualizado', 'success');
      }
      cerrar();
      fetchUsuarios();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!confirmDeleteDoc) return;
    try {
      await usuariosService.eliminarUsuarioAdmin(confirmDeleteDoc);
      showNotification('Usuario eliminado', 'success');
      setConfirmDeleteDoc(null);
      fetchUsuarios();
    } catch (error) {
      showNotification(getErrorMessage(error, 'No se pudo eliminar'), 'error');
    }
  };

  const columns = useMemo(() => ([
    {
      header: 'Usuario',
      accessor: (u: AdminUsuarioItem) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center text-slate-700">
            {u.fotoPersona ? <img src={u.fotoPersona} alt={u.nombreCompleto} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-tight">{u.nombreCompleto}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">DOC: {u.documento}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Rol',
      accessor: (u: AdminUsuarioItem) => (
        <Badge variant={u.rol === 'ADMIN' ? 'info' : u.rol === 'OPERATIVO' ? 'warning' : 'success'}>
          {u.rol}
        </Badge>
      ),
    },
    {
      header: 'Contacto',
      accessor: (u: AdminUsuarioItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Mail size={12} className="text-slate-500" /> {u.correo}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Smartphone size={12} className="text-emerald-600" /> {u.numTelf || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehículos',
      accessor: (u: AdminUsuarioItem) => {
        const placas = (u.vehiculos || []).map((v) => v.placa).filter(Boolean);
        const label = placas.length <= 2 ? placas.join(', ') : `${placas.slice(0, 2).join(', ')} +${placas.length - 2}`;
        return (
          <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
            <Car size={12} className="text-slate-400" />
            <span>{placas.length ? label : '—'}</span>
          </div>
        );
      },
    },
    {
      header: 'Acciones',
      accessor: (u: AdminUsuarioItem) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); abrirEditar(u); }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteDoc(u.documento); }}
            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]), []);

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
          <Plus size={16} className="mr-2" />
          CREAR USUARIO
        </Button>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <Input
          icon={<Search size={20} />}
          placeholder="Buscar por nombre, documento o correo..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filtrar por rol:</span>
          {(['TODOS', 'APRENDIZ', 'OPERATIVO', 'ADMIN'] as Rol[]).map((r) => (
            <Button
              key={r}
              variant={rol === r ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setRol(r)}
            >
              {r === 'TODOS' ? 'Todos' : r.charAt(0) + r.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={usuarios}
        onRowClick={(u) => setViewUser(u)}
        isLoading={loading}
        emptyMessage="No se encontraron usuarios"
      />

      <Modal
        isOpen={modalOpen}
        onClose={cerrar}
        title={modalMode === 'crear' ? 'Crear Usuario' : `Editar ${form.nombreCompleto}`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              type="button"
              variant="primary"
              isLoading={saving}
              onClick={guardar}
              className="bg-[#39A900] hover:bg-[#2F8A00]"
            >
              {modalMode === 'crear' ? 'Crear' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalMode === 'crear' && form.idTipoUsr === 1 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-800">
                ℹ Al crear un aprendiz, se le enviará un código de verificación al correo indicado.
                Deberá ingresar el código en la app para activar su cuenta.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rol</label>
              <select
                value={form.idTipoUsr}
                onChange={(e) => setForm((p) => ({ ...p, idTipoUsr: Number(e.target.value) }))}
                className="w-full mt-1 p-3 border border-slate-300 rounded-xl font-medium text-sm focus:border-[#39A900] focus:outline-none"
              >
                <option value={1}>Aprendiz</option>
                <option value={3}>Operativo / Vigilante</option>
                <option value={2}>Administrador</option>
              </select>
            </div>

            <Input
              label="Documento"
              icon={<IdCard size={18} />}
              value={form.documento}
              onChange={(e) => setForm((p) => ({ ...p, documento: e.target.value }))}
              error={errores.documento}
              placeholder="Ej: 1234567890"
              disabled={modalMode === 'editar'}
            />

            <div className="md:col-span-2">
              <Input
                label="Nombre completo"
                icon={<UserIcon size={18} />}
                value={form.nombreCompleto}
                onChange={(e) => setForm((p) => ({ ...p, nombreCompleto: e.target.value }))}
                error={errores.nombreCompleto}
              />
            </div>

            <Input
              label="Correo electrónico"
              icon={<Mail size={18} />}
              value={form.correo}
              onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
              error={errores.correo}
              placeholder="ejemplo@correo.com"
            />

            <Input
              label="Teléfono"
              icon={<Phone size={18} />}
              value={form.numTelf}
              onChange={(e) => setForm((p) => ({ ...p, numTelf: e.target.value }))}
              error={errores.numTelf}
              placeholder="10 dígitos"
            />

            {form.idTipoUsr === 1 && (
              <>
                <Input
                  label="Contacto de emergencia"
                  icon={<Phone size={18} />}
                  value={form.contactoEmerg}
                  onChange={(e) => setForm((p) => ({ ...p, contactoEmerg: e.target.value }))}
                  error={errores.contactoEmerg}
                  placeholder="10 dígitos"
                />
                <Input
                  label="Ficha de formación"
                  value={form.idFormacion}
                  onChange={(e) => setForm((p) => ({ ...p, idFormacion: e.target.value }))}
                  error={errores.idFormacion}
                  placeholder="7 dígitos"
                />
              </>
            )}

            <div className="md:col-span-2">
              <ImageUpload
                label="Foto de perfil"
                value={form.fotoPersona}
                onChange={(url) => setForm((p) => ({ ...p, fotoPersona: url }))}
                placeholder="Subir foto de perfil"
                previewHeight={180}
              />
            </div>

            {modalMode === 'crear' && (
              <div className="md:col-span-2">
                <Input
                  label="Contraseña"
                  icon={<Lock size={18} />}
                  type="password"
                  value={form.contra}
                  onChange={(e) => setForm((p) => ({ ...p, contra: e.target.value }))}
                  error={errores.contra}
                  placeholder="Asigna una contraseña segura"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteDoc}
        onClose={() => setConfirmDeleteDoc(null)}
        title="Eliminar usuario"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteDoc(null)}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={eliminar}>Eliminar definitivamente</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          ¿Estás seguro de eliminar al usuario <b>{confirmDeleteDoc}</b>? Esta acción no se puede deshacer y
          eliminará todos sus datos asociados.
        </p>
      </Modal>

      <Modal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title={viewUser ? `Vehículos de ${viewUser.nombreCompleto}` : 'Vehículos'}
        footer={<Button type="button" variant="outline" onClick={() => setViewUser(null)}>Cerrar</Button>}
      >
        {viewUser && ((viewUser.vehiculos?.length ?? 0) === 0 ? (
          <div className="py-10 text-center">
            <Car size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Este usuario no tiene vehículos registrados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {viewUser.vehiculos.length} vehículo{viewUser.vehiculos.length === 1 ? '' : 's'} registrado{viewUser.vehiculos.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {viewUser.vehiculos.map((v) => {
                const tipo = typeof v.tipoVehiculo === 'string'
                  ? v.tipoVehiculo
                  : (v.tipoVehiculo as { tipoVehiculo?: string; nombre?: string } | undefined)?.tipoVehiculo
                    || (v.tipoVehiculo as { tipoVehiculo?: string; nombre?: string } | undefined)?.nombre
                    || '';
                const detalle = [tipo, v.color].filter(Boolean).join(' • ');
                return (
                  <div key={v.placa} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {v.fotoVehiculo ? (
                        <img src={v.fotoVehiculo} alt={v.placa} className="w-full h-full object-cover" />
                      ) : (
                        <Car size={28} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className="text-base font-black text-slate-900 tracking-wide truncate">{v.placa}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                        {detalle || 'Sin detalles'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
};
