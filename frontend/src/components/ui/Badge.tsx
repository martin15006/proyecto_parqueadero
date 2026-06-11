import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30',
    error: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/30',
    info: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/30',
    neutral: 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/10',
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
