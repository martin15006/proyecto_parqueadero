import React from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  trend?: string;
  isCritical?: boolean;
  subValue?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  trend, 
  isCritical, 
  subValue,
  className = ''
}) => (
  <div className={`bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4 transition-all duration-200 hover:shadow-md/5 ${className}`}>
    <div className="flex justify-between items-start">
      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">{icon}</div>
      {trend && (
        <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${
          isCritical ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
        }`}>
          {isCritical ? <AlertTriangle size={12} /> : <ArrowUpRight size={12} />}
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{value ?? 0}</p>
      {subValue && <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 mt-1 uppercase">{subValue}</p>}
    </div>
  </div>
);
