import React from 'react';

interface ChartHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({ title, subtitle, icon }) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
        {icon} 
        {title}
      </h3>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
    <span className="px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-[10px] font-black uppercase">
      Live
    </span>
  </div>
);
