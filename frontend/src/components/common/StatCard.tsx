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
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 transition-all duration-200 hover:shadow-md/5">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">{icon}</div>
      {trend && (
        <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${
          isCritical ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {isCritical ? <AlertTriangle size={12} /> : <ArrowUpRight size={12} />}
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{value ?? 0}</p>
      {subValue && <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">{subValue}</p>}
    </div>
  </div>
);
