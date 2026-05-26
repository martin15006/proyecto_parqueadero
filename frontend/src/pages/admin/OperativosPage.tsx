import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Power, KeyRound } from 'lucide-react';
import { usuariosService } from '../../services/usuarios.service';
import type { CreateOperativoAdminDto, UpdateOperativoAdminDto, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

/**
 * Normaliza el error proveniente de la capa HTTP (Axios interceptor + backend NestJS)
 * para que la UI siempre pueda mostrar una notificación limpia sin romper la pantalla.
 */
const getUiErrorMessage = (error: unknown, fallback: string): string => {
  const maybeAny = error as any;
  const rawMessage = maybeAny?.message ?? maybeAny?.error ?? maybeAny?.mensaje;

  if (Array.isArray(rawMessage)) {
    const first = rawMessage.find((m) => typeof m === 'string');
    return first || fallback;
  }

  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    const msg = rawMessage.trim();
    const lower = msg.toLowerCase();

    if (lower.includes('documento') && lower.includes('registr')) {
      return 'Ya existe un operativo con ese documento';
    }
    if (lower.includes('correo') && lower.includes('registr')) {
      return 'Ya existe un operativo con ese correo';
    }
    return msg;
  }

  return fallback;
};

/**
 * Panel Admin: Gestión de Personal Operativo (RF41).
 * Incluye CRUD de operativos, activación/desactivación (soft delete) y restablecimiento de contraseña (RF28).
 */
export const OperativosPage: React.FC = () => {
  const [operativos, setOperativos] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const [createData, setCreateData] = useState<CreateOperativoAdminDto>({
    documento: '',
    nombreCompleto: '',
    correo: '',
    numTelf: '',
    contra: '',
  });

  const [editData, setEditData] = useState<UpdateOperativoAdminDto>({
    nombreCompleto: '',
    correo: '',
    numTelf: '',
    contactoEmerg: '',
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetContra, setResetContra] = useState('');
  const [resetContraConfirm, setResetContraConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  /**
   * Sincroniza la tabla desde el backend.
   * El endpoint retorna operativos incluyendo inactivos (withDeleted) para permitir activación/desactivación.
   */
  const fetchOperativos = async () => {
    try {
      setLoading(true);
      const res = await usuariosService.listarOperativosAdmin();
      setOperativos(res.data);
    } catch (e: any) {
      setActionError(getUiErrorMessage(e, 'No se pudo cargar el personal operativo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperativos();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return operativos;
    return operativos.filter((u) =>
      (u.nombreCompleto || '').toLowerCase().includes(q)
      || (u.documento || '').includes(q)
      || (u.correo || '').toLowerCase().includes(q),
    );
  }, [operativos, searchTerm]);

  const openCreate = () => {
    setActionError(null);
    setActionSuccess(null);
    setCreateData({ documento: '', nombreCompleto: '', correo: '', numTelf: '', contra: '' });
    setIsCreateOpen(true);
  };

  const openEdit = (u: User) => {
    setActionError(null);
    setActionSuccess(null);
    setSelected(u);
    setEditData({
      nombreCompleto: u.nombreCompleto || '',
      correo: u.correo || '',
      numTelf: u.numTelf || '',
      contactoEmerg: u.contactoEmerg || '',
    });
    setIsEditOpen(true);
  };

  /**
   * Abre el modal de restablecimiento de contraseña (RF28) para un Operativo.
   * El backend aplica RF3: contraseña segura y no reutilización de la anterior.
   */
  const openResetPassword = (u: User) => {
    setActionError(null);
    setActionSuccess(null);
    setResetError(null);
    setResetTarget(u);
    setResetContra('');
    setResetContraConfirm('');
    setIsResetOpen(true);
  };

  /**
   * Crea un nuevo Operativo (RF41).
   * Nota: el backend fuerza de forma estricta idTipoUsr=3 (OPERATIVO) y rechaza duplicados (correo/documento).
   */
  const handleCreate = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await usuariosService.crearOperativoAdmin({
        documento: createData.documento.trim(),
        nombreCompleto: createData.nombreCompleto.trim(),
        correo: createData.correo.trim(),
        numTelf: createData.numTelf.trim(),
        contra: createData.contra,
      });

       if (res.data?.idTipoUsr !== 3) {
         setActionError('No se pudo completar la creación: el rol asignado no corresponde a OPERATIVO (idTipoUsr=3)');
         return;
       }

      setOperativos((prev) => [res.data, ...prev].sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || '')));
      setIsCreateOpen(false);
      setActionSuccess('Operativo creado correctamente');
    } catch (e: any) {
      setActionError(getUiErrorMessage(e, 'No se pudo crear el operativo'));
    }
  };

  /**
   * Actualiza datos básicos del Operativo seleccionado.
   * El backend valida cambios de correo para evitar colisiones con otros usuarios.
   */
  const handleUpdate = async () => {
    if (!selected) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await usuariosService.actualizarOperativoAdmin(selected.documento, {
        nombreCompleto: editData.nombreCompleto?.trim() || undefined,
        correo: editData.correo?.trim() || undefined,
        numTelf: editData.numTelf?.trim() || undefined,
        contactoEmerg: editData.contactoEmerg?.trim() || undefined,
      });
      setOperativos((prev) => prev.map((u) => (u.documento === selected.documento ? res.data : u)));
      setIsEditOpen(false);
      setSelected(null);
      setActionSuccess('Operativo actualizado correctamente');
    } catch (e: any) {
      setActionError(getUiErrorMessage(e, 'No se pudo actualizar el operativo'));
    }
  };

  /**
   * Activa/Desactiva el Operativo usando soft-delete.
   * Esto permite mantener trazabilidad sin eliminar físicamente la cuenta.
   */
  const toggleEstado = async (u: User) => {
    setActionError(null);
    setActionSuccess(null);
    const activo = !u.deletedAt;
    try {
      const res = await usuariosService.cambiarEstadoOperativoAdmin(u.documento, !activo);
      setOperativos((prev) => prev.map((x) => (x.documento === u.documento ? res.data : x)));
      setActionSuccess(!activo ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (e: any) {
      setActionError(getUiErrorMessage(e, 'No se pudo cambiar el estado'));
    }
  };

  /**
   * Restablece la contraseña del Operativo seleccionado.
   * La UI exige confirmación de la contraseña para evitar errores de digitación.
   */
  const handleResetPassword = async () => {
    const documento = resetTarget?.documento?.trim();
    if (!documento) {
      setResetError('No se detectó el documento del operativo');
      return;
    }

    if (!resetContra.trim()) {
      setResetError('La nueva contraseña es obligatoria');
      return;
    }

    if (resetContra !== resetContraConfirm) {
      setResetError('La confirmación no coincide');
      return;
    }

    setResetError(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      setResetLoading(true);
      const res = await usuariosService.resetPasswordOperativoAdmin(documento, resetContra);
      setIsResetOpen(false);
      setResetTarget(null);
      setResetContra('');
      setResetContraConfirm('');
      setActionSuccess(res?.data?.mensaje || 'Contraseña restablecida exitosamente');
    } catch (e: any) {
      setResetError(getUiErrorMessage(e, 'No se pudo restablecer la contraseña'));
    } finally {
      setResetLoading(false);
    }
  };

  const columns = [
    {
      header: 'Operativo',
      accessor: (u: User) => (
        <div>
          <p className="text-sm font-black text-gray-900 leading-tight">{u.nombreCompleto}</p>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">DOC: {u.documento}</p>
        </div>
      ),
    },
    {
      header: 'Contacto',
      accessor: (u: User) => (
        <div className="space-y-1">
          <p className="text-xs text-gray-600 font-semibold">{u.correo}</p>
          <p className="text-xs text-gray-500 font-medium">{u.numTelf || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (u: User) => (
        <Badge variant={!u.deletedAt ? 'success' : 'error'}>
          {!u.deletedAt ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: (u: User) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-2 hover:bg-amber-50 text-amber-700 rounded-lg transition-colors"
            title="Restablecer contraseña"
            onClick={(e) => {
              e.stopPropagation();
              openResetPassword(u);
            }}
          >
            <KeyRound size={16} />
          </button>
          <button
            className="p-2 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(u);
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${u.deletedAt ? 'hover:bg-green-50 text-green-700' : 'hover:bg-red-50 text-red-600'}`}
            title={u.deletedAt ? 'Activar' : 'Desactivar'}
            onClick={(e) => {
              e.stopPropagation();
              toggleEstado(u);
            }}
          >
            <Power size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Personal Operativo</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">RF41 • Administración de Operativos</p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={18} className="mr-2" /> CREAR OPERATIVO
        </Button>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <Input
          icon={<Search size={20} />}
          placeholder="Buscar por nombre, documento o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {(actionError || actionSuccess) && (
        <div className={`p-4 rounded-xl border text-xs font-bold uppercase tracking-widest ${
          actionError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {actionError || actionSuccess}
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyMessage="No se encontraron operativos"
      />

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear Operativo"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreate}>Crear</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Documento"
            value={createData.documento}
            onChange={(e) => setCreateData((p) => ({ ...p, documento: e.target.value }))}
            placeholder="Solo números"
            inputMode="numeric"
          />
          <Input
            label="Teléfono"
            value={createData.numTelf}
            onChange={(e) => setCreateData((p) => ({ ...p, numTelf: e.target.value }))}
            placeholder="10 dígitos"
            inputMode="numeric"
          />
          <div className="md:col-span-2">
            <Input
              label="Nombre Completo"
              value={createData.nombreCompleto}
              onChange={(e) => setCreateData((p) => ({ ...p, nombreCompleto: e.target.value }))}
              placeholder="Nombres y apellidos"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Correo"
              value={createData.correo}
              onChange={(e) => setCreateData((p) => ({ ...p, correo: e.target.value }))}
              placeholder="correo@dominio.com"
              type="email"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Contraseña Inicial"
              value={createData.contra}
              onChange={(e) => setCreateData((p) => ({ ...p, contra: e.target.value }))}
              type="password"
              placeholder="RF3: segura (8+, mayus, minus, número, especial)"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setSelected(null); }}
        title="Editar Operativo"
        footer={(
          <>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelected(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleUpdate}>Guardar</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Documento"
              value={selected?.documento || ''}
              disabled
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Nombre Completo"
              value={editData.nombreCompleto || ''}
              onChange={(e) => setEditData((p) => ({ ...p, nombreCompleto: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Correo"
              value={editData.correo || ''}
              onChange={(e) => setEditData((p) => ({ ...p, correo: e.target.value }))}
              type="email"
            />
          </div>
          <Input
            label="Teléfono"
            value={editData.numTelf || ''}
            onChange={(e) => setEditData((p) => ({ ...p, numTelf: e.target.value }))}
            inputMode="numeric"
          />
          <Input
            label="Contacto Emergencia"
            value={editData.contactoEmerg || ''}
            onChange={(e) => setEditData((p) => ({ ...p, contactoEmerg: e.target.value }))}
            inputMode="numeric"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isResetOpen}
        onClose={() => { setIsResetOpen(false); setResetTarget(null); setResetContra(''); setResetContraConfirm(''); setResetError(null); }}
        title="Restablecer Contraseña (Operativo)"
        footer={(
          <>
            <Button
              variant="outline"
              onClick={() => { setIsResetOpen(false); setResetTarget(null); setResetContra(''); setResetContraConfirm(''); setResetError(null); }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleResetPassword} disabled={resetLoading}>
              {resetLoading ? 'Procesando...' : 'Restablecer'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Acción crítica</p>
            <p className="text-sm font-semibold text-amber-800 mt-1">
              Esto asigna una nueva contraseña al operativo seleccionado y registra auditoría (RF37).
            </p>
          </div>

          {resetError && (
            <div className="p-4 rounded-2xl border text-xs font-bold uppercase tracking-widest bg-red-50 border-red-200 text-red-700">
              {resetError}
            </div>
          )}

          <Input
            label="Documento"
            value={resetTarget?.documento || ''}
            disabled
          />
          <Input
            label="Nueva contraseña"
            value={resetContra}
            onChange={(e) => setResetContra(e.target.value)}
            type="password"
            placeholder="RF3: segura (8+, mayus, minus, número, especial)"
          />
          <Input
            label="Confirmar contraseña"
            value={resetContraConfirm}
            onChange={(e) => setResetContraConfirm(e.target.value)}
            type="password"
            placeholder="Repite la contraseña"
          />
        </div>
      </Modal>
    </div>
  );
};
