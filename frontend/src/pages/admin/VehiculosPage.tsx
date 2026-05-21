import React, { useState, useEffect } from 'react';
import { vehiculosService } from '../../services/vehiculos.service';
import { Search, Plus, Edit2, Trash2, Car, CreditCard, Palette, Hash } from 'lucide-react';

/**
 * Gestión de Vehículos (Admin/Operativo).
 * Permite visualizar y administrar la flota de vehículos registrados.
 */
export const VehiculosPage: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      // El backend actual permite listar todos si eres admin o solo los propios.
      // Asumimos que estamos en vista administrativa
      const res = await vehiculosService.listarMios(); // Temporalmente usamos mios hasta tener un findAll de vehiculos
      setVehiculos(res);
    } catch (error) {
      console.error('Error cargando vehículos', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const filteredVehiculos = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tipoVehiculo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Vehículos</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Control de Flota Institucional</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95">
          <Plus size={18} /> REGISTRAR VEHÍCULO
        </button>
      </header>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por placa o tipo..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
            Sincronizando flota...
          </div>
        ) : filteredVehiculos.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
            No se encontraron vehículos registrados
          </div>
        ) : filteredVehiculos.map((v) => (
          <div key={v.placa} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:translate-y-[-4px] transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 overflow-hidden">
                {v.fotoVehiculo ? <img src={v.fotoVehiculo} alt={v.placa} className="w-full h-full object-cover" /> : <Car size={32} />}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors">
                  <Edit2 size={16} />
                </button>
                <button className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Placa Identificadora</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Hash size={20} className="text-blue-500" /> {v.placa}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                    <Car size={10} /> Tipo
                  </p>
                  <p className="text-xs font-bold text-gray-700">{v.tipoVehiculo}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                    <Palette size={10} /> Color
                  </p>
                  <p className="text-xs font-bold text-gray-700">{v.color || 'N/A'}</p>
                </div>
              </div>

              {v.fotoTarjetaP && (
                <div className="pt-4 border-t border-gray-50">
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                    <CreditCard size={12} /> Ver Tarjeta de Propiedad
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
