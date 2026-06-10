import React from 'react';

interface StatsProps {
  total: number;
  ocupados: number;
  disponibles: number;
  vehiculosActivos: number;
}


export const ParkingStats: React.FC<StatsProps> = ({ total, ocupados, disponibles, vehiculosActivos }) => {
  const stats = [
    { label: 'Capacidad Total', value: total, color: 'text-white', bg: 'bg-gray-800' },
    { label: 'Bahías Ocupadas', value: ocupados, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Disponibilidad', value: disponibles, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Vehículos en Sitio', value: vehiculosActivos, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const porcentajeOcupacion = total > 0 ? (ocupados / total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`${stat.bg} border border-gray-800 p-5 rounded-2xl`}>
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-wider">{stat.label}</p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
            {stat.label === 'Disponibilidad' && (
              <span className="text-[10px] text-gray-500 font-bold mb-1">UNIDADES</span>
            )}
          </div>
          
          {stat.label === 'Bahías Ocupadas' && (
            <div className="mt-3 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 h-full transition-all duration-1000"
                style={{ width: `${porcentajeOcupacion}%` }}
              ></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
