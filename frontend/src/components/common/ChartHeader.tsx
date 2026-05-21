import React from 'react';

interface ChartHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({ title, subtitle, icon }) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
        {icon} 
        {title}
      </h3>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
    <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-[10px] font-black uppercase">Live</span>
  </div>
);
