import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${variants[variant]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
        variant === 'success' ? 'bg-emerald-600' :
        variant === 'error' ? 'bg-rose-600' :
        variant === 'warning' ? 'bg-amber-600' :
        variant === 'info' ? 'bg-sky-600' :
        'bg-slate-500'
      }`}></span>
      {children}
    </span>
  );
};
