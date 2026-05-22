import React, { useState, useEffect } from 'react';
import { usuariosService } from '../../services/usuarios.service';
import type { User } from '../../types';
import { UserRole } from '../../constants/enums';
import { Search, Plus, Edit2, Trash2, User as UserIcon, Mail, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

/**
 * Gestión de Usuarios (Admin).
 * Permite listar, filtrar y administrar las cuentas institucionales.
 */
export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await usuariosService.findAll(page, 10);
      setUsuarios(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Error cargando usuarios', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [page]);

  const filteredUsuarios = usuarios.filter(u => 
    u.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.documento.includes(searchTerm) ||
    u.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Usuario',
      accessor: (u: User) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-blue-600">
            {u.fotoPersona ? <img src={u.fotoPersona} alt={u.nombreCompleto} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-tight">{u.nombreCompleto}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">DOC: {u.documento}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Contacto',
      accessor: (u: User) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Mail size={12} className="text-blue-500" /> {u.correo}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Smartphone size={12} className="text-green-500" /> {u.numTelf || 'No registrado'}
          </div>
        </div>
      ),
    },
    {
      header: 'Rol / Tipo',
      accessor: (u: User) => (
        <Badge variant={u.idTipoUsr === UserRole.ADMIN ? 'warning' : u.idTipoUsr === UserRole.OPERATIVO ? 'info' : 'success'}>
          {u.idTipoUsr === UserRole.ADMIN ? 'Administrador' : u.idTipoUsr === UserRole.OPERATIVO ? 'Operativo' : 'Aprendiz'}
        </Badge>
      ),
    },
    {
      header: 'Estado',
      accessor: () => <Badge variant="success">Activo</Badge>,
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: () => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Editar">
            <Edit2 size={16} />
          </button>
          <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Administración de Cuentas Institucionales</p>
        </div>
        <Button variant="primary" size="md">
          <Plus size={18} className="mr-2" /> NUEVO USUARIO
        </Button>
      </header>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
        <Input 
          icon={<Search size={20} />}
          placeholder="Buscar por nombre, documento o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de Usuarios Pro */}
      <Table 
        columns={columns}
        data={filteredUsuarios}
        isLoading={loading}
        emptyMessage="No se encontraron usuarios"
      />

      {/* Paginación */}
      <div className="flex justify-between items-center px-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Mostrando {filteredUsuarios.length} de {total} registros
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page * 10 >= total}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
};
