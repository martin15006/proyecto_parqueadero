import React from 'react';
import type { Movement } from '../types';
import { Table } from './ui/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Clock, Car } from 'lucide-react';

interface ActiveVehiclesTableProps {
  vehiculos: Movement[];
  onSalida: (placa: string) => void;
}

export const ActiveVehiclesTable: React.FC<ActiveVehiclesTableProps> = ({ vehiculos, onSalida }) => {
  const columns = [
    {
      header: 'Vehículo',
      accessor: (v: Movement) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-xl text-blue-500">
            <Car size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-blue-500 font-black tracking-widest text-lg leading-none">{v.placa}</span>
            <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">{v.usuario || 'Usuario General'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Ingreso',
      accessor: (v: Movement) => (
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
          <Clock size={14} className="text-gray-600" />
          {new Date(v.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      ),
    },
    {
      header: 'Bahía',
      accessor: (v: Movement) => (
        <Badge variant="info">{v.bahia}</Badge>
      ),
    },
    {
      header: 'Acción',
      className: 'text-right',
      accessor: (v: Movement) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onSalida(v.placa)}
          className="!border-blue-500/30 !text-blue-500 hover:!bg-blue-600 hover:!text-white"
        >
          REGISTRAR SALIDA
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[3rem] overflow-hidden flex flex-col h-full shadow-2xl">
      <header className="px-8 py-6 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
        <div>
          <h3 className="text-white text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            Vehículos en Sitio
          </h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Monitoreo de Activos</p>
        </div>
        <Badge variant="neutral" className="!bg-black !border-gray-800">
          {vehiculos.length} TOTAL
        </Badge>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <div className="bg-transparent rounded-[2rem] overflow-hidden border border-gray-800">
          <Table 
            columns={columns}
            data={vehiculos}
            emptyMessage="No hay registros activos en este momento"
          />
        </div>
      </div>
    </div>
  );
};
