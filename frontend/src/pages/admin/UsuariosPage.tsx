import React, { useState, useEffect } from 'react';
import { usuariosService } from '../../services/usuarios.service';
import type { User } from '../../types';
import { UserRole } from '../../constants/enums';
import { Search, Plus, Edit2, Trash2, Shield, User as UserIcon, Mail, Smartphone } from 'lucide-react';

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

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Administración de Cuentas Institucionales</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95">
          <Plus size={18} /> NUEVO USUARIO
        </button>
      </header>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, documento o correo..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Usuarios Pro */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Sincronizando con el servidor...</td></tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No se encontraron usuarios</td></tr>
              ) : filteredUsuarios.map((u) => (
                <tr key={u.documento} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-gray-400">
                        {u.fotoPersona ? <img src={u.fotoPersona} alt={u.nombreCompleto} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight">{u.nombreCompleto}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">DOC: {u.documento}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Mail size={12} className="text-blue-500" /> {u.correo}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Smartphone size={12} className="text-green-500" /> {u.numTelf || 'No registrado'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      u.idTipoUsr === UserRole.ADMIN ? 'bg-purple-50 text-purple-600' :
                      u.idTipoUsr === UserRole.OPERATIVO ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      <Shield size={10} /> {u.idTipoUsr === UserRole.ADMIN ? 'Administrador' : u.idTipoUsr === UserRole.OPERATIVO ? 'Operativo' : 'Aprendiz'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-[10px] font-black text-gray-500 uppercase">Activo</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mostrando {filteredUsuarios.length} de {total} registros</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Anterior
            </button>
            <button 
              disabled={page * 10 >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
