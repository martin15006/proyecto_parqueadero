import React, { useEffect, useMemo, useState } from 'react';
import { usuariosService } from '../../services/usuarios.service';
import type { AdminUsuarioItem, CreateOperativoAdminDto } from '../../types';
import { Plus, Search, User as UserIcon, Mail, Smartphone, Car, IdCard, Phone, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Gestión de Usuarios (Admin).
 * Permite listar, filtrar y administrar las cuentas institucionales.
 */
export const UsuariosPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [usuarios, setUsuarios] = useState<AdminUsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<'ACTIVO' | 'INACTIVO' | 'TODOS'>('TODOS');
  const [q, setQ] = useState('');

  const [isCreateOperativoOpen, setIsCreateOperativoOpen] = useState(false);
  const [createOperativoLoading, setCreateOperativoLoading] = useState(false);
  const [createOperativoData, setCreateOperativoData] = useState<CreateOperativoAdminDto>({
    documento: '',
    nombreCompleto: '',
    correo: '',
    numTelf: '',
    contra: '',
  });
  const [createOperativoErrors, setCreateOperativoErrors] = useState<Partial<Record<keyof CreateOperativoAdminDto, string>>>({});

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

  const fetchUsuarios = async (params: { q?: string; estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS' }) => {
    try {
      setLoading(true);
      const res = await usuariosService.listarUsuariosAdmin(params);
      setUsuarios(res.data || []);
    } catch (error) {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchUsuarios({ q: q.trim() || undefined, estado });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, estado]);

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
      header: 'Estado',
      accessor: (u: AdminUsuarioItem) => (
        <Badge variant={u.estadoCuenta === 'ACTIVO' ? 'success' : 'error'}>
          {u.estadoCuenta}
        </Badge>
      ),
    },
  ]), []);

  const openCreateOperativo = () => {
    setCreateOperativoErrors({});
    setCreateOperativoData({ documento: '', nombreCompleto: '', correo: '', numTelf: '', contra: '' });
    setIsCreateOperativoOpen(true);
  };

  const closeCreateOperativo = () => {
    setIsCreateOperativoOpen(false);
    setCreateOperativoErrors({});
    setCreateOperativoLoading(false);
  };

  const validateCreateOperativo = () => {
    const next: Partial<Record<keyof CreateOperativoAdminDto, string>> = {};

    const documento = createOperativoData.documento.trim();
    const nombre = createOperativoData.nombreCompleto.trim();
    const correo = createOperativoData.correo.trim();
    const tel = createOperativoData.numTelf.trim();
    const contra = createOperativoData.contra;

    if (!/^[0-9]{6,10}$/.test(documento)) next.documento = 'Documento inválido (6–10 dígitos)';
    if (nombre.length < 3) next.nombreCompleto = 'Nombre completo obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) next.correo = 'Correo inválido';
    if (!/^[0-9]{10}$/.test(tel)) next.numTelf = 'Teléfono inválido (10 dígitos)';
    if (!contra.trim()) next.contra = 'Contraseña temporal obligatoria';

    setCreateOperativoErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateOperativo = async () => {
    if (!validateCreateOperativo()) return;
    setCreateOperativoLoading(true);
    try {
      const res = await usuariosService.crearOperativoAdmin({
        documento: createOperativoData.documento.trim(),
        nombreCompleto: createOperativoData.nombreCompleto.trim(),
        correo: createOperativoData.correo.trim(),
        numTelf: createOperativoData.numTelf.trim(),
        contra: createOperativoData.contra,
      });

      if (res.data?.idTipoUsr !== 3) {
        showNotification('No se pudo crear el operativo: rol inválido retornado por el servidor', 'error');
        return;
      }

      showNotification('Operativo creado correctamente', 'success');
      closeCreateOperativo();
      fetchUsuarios({ q: q.trim() || undefined, estado });
    } catch (error: unknown) {
      showNotification(getErrorMessage(error, 'No se pudo crear el operativo'), 'error');
    } finally {
      setCreateOperativoLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#232323] tracking-tight">Usuarios</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">RF19 • Administración de cuentas</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreateOperativo}
            className="bg-[#39A900] hover:bg-[#2F8A00] shadow-sm"
          >
            <Plus size={16} className="mr-2" />
            Registrar Vigilante
          </Button>
          <Button variant={estado === 'TODOS' ? 'primary' : 'outline'} size="sm" onClick={() => setEstado('TODOS')}>Todos</Button>
          <Button variant={estado === 'ACTIVO' ? 'primary' : 'outline'} size="sm" onClick={() => setEstado('ACTIVO')}>Activos</Button>
          <Button variant={estado === 'INACTIVO' ? 'primary' : 'outline'} size="sm" onClick={() => setEstado('INACTIVO')}>Inactivos</Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <Input 
          icon={<Search size={20} />}
          placeholder="Buscar por nombre, documento o correo..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Table 
        columns={columns}
        data={usuarios}
        isLoading={loading}
        emptyMessage="No se encontraron usuarios"
      />

      <Modal
        isOpen={isCreateOperativoOpen}
        onClose={closeCreateOperativo}
        title="Nuevo Operativo"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeCreateOperativo}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={createOperativoLoading}
              onClick={handleCreateOperativo}
              className="bg-[#39A900] hover:bg-[#2F8A00]"
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-[#232323] tracking-tight">Registrar Vigilante</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Se creará una cuenta con rol OPERATIVO. La autorización se valida por JWT del Administrador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Documento (Cédula)"
              icon={<IdCard size={18} />}
              value={createOperativoData.documento}
              onChange={(e) => setCreateOperativoData((p) => ({ ...p, documento: e.target.value }))}
              error={createOperativoErrors.documento}
              placeholder="Ej: 123456789"
              className="focus:border-[#39A900]"
              inputMode="numeric"
              autoComplete="off"
            />

            <Input
              label="Teléfono"
              icon={<Phone size={18} />}
              value={createOperativoData.numTelf}
              onChange={(e) => setCreateOperativoData((p) => ({ ...p, numTelf: e.target.value }))}
              error={createOperativoErrors.numTelf}
              placeholder="10 dígitos"
              className="focus:border-[#39A900]"
              inputMode="numeric"
              autoComplete="off"
            />

            <div className="md:col-span-2">
              <Input
                label="Nombre Completo"
                icon={<UserIcon size={18} />}
                value={createOperativoData.nombreCompleto}
                onChange={(e) => setCreateOperativoData((p) => ({ ...p, nombreCompleto: e.target.value }))}
                error={createOperativoErrors.nombreCompleto}
                placeholder="Nombres y apellidos"
                className="focus:border-[#39A900]"
                autoComplete="name"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Correo Electrónico"
                icon={<Mail size={18} />}
                value={createOperativoData.correo}
                onChange={(e) => setCreateOperativoData((p) => ({ ...p, correo: e.target.value }))}
                error={createOperativoErrors.correo}
                placeholder="vigilante@sena.edu.co"
                className="focus:border-[#39A900]"
                autoComplete="email"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Contraseña Temporal"
                icon={<Lock size={18} />}
                value={createOperativoData.contra}
                onChange={(e) => setCreateOperativoData((p) => ({ ...p, contra: e.target.value }))}
                error={createOperativoErrors.contra}
                placeholder="Asignar una contraseña segura"
                className="focus:border-[#39A900]"
                autoComplete="new-password"
                type="password"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
