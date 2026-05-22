import React, { useState, useEffect } from 'react';
import { vehiculosService } from '../../services/vehiculos.service';
import { Search, Plus, Edit2, Trash2, Car, CreditCard, Palette, Hash } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Vehiculo } from '../../types';

/**
 * Gestión de Vehículos (Admin/Operativo).
 * Permite visualizar y administrar la flota de vehículos registrados.
 */
export const VehiculosPage: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const res = await vehiculosService.findAll(1, 50); 
      setVehiculos(res.data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error cargando vehículos', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const filteredVehiculos = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (
      (typeof v.tipoVehiculo === 'string'
        ? v.tipoVehiculo
        : v.tipoVehiculo?.tipoVehiculo || '')
    ).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Vehículos</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Control de Flota Institucional</p>
        </div>
        <Button variant="primary" size="md">
          <Plus size={18} className="mr-2" /> REGISTRAR VEHÍCULO
        </Button>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <Input 
          icon={<Search size={20} />}
          placeholder="Buscar por placa o tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
          <div key={v.placa} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-blue-600 overflow-hidden">
                {v.fotoVehiculo ? <img src={v.fotoVehiculo} alt={v.placa} className="w-full h-full object-cover" /> : <Car size={32} />}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Placa Identificadora</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Hash size={20} className="text-blue-600" /> {v.placa}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                    <Car size={10} /> Tipo
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    {typeof v.tipoVehiculo === 'string'
                      ? v.tipoVehiculo
                      : v.tipoVehiculo?.tipoVehiculo || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                    <Palette size={10} /> Color
                  </p>
                  <p className="text-xs font-bold text-gray-700">{v.color || 'N/A'}</p>
                </div>
              </div>

              {v.fotoTarjetaP && (
                <div className="pt-4 border-t border-gray-100">
                  <Button variant="secondary" size="sm" className="w-full">
                    <CreditCard size={12} className="mr-2" /> Ver Tarjeta de Propiedad
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
