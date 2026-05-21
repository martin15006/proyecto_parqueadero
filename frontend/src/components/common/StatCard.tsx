import React from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  trend?: string;
  isCritical?: boolean;
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  trend, 
  isCritical, 
  subValue 
}) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-lg shadow-gray-200/40 border border-gray-100 flex flex-col gap-4 hover:translate-y-[-4px] transition-transform duration-300">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
      {trend && (
        <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
          isCritical ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        }`}>
          {isCritical ? <AlertTriangle size={12} /> : <ArrowUpRight size={12} />}
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tighter">{value ?? 0}</p>
      {subValue && <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{subValue}</p>}
    </div>
  </div>
);
