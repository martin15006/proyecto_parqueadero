import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'bg-green-100 text-green-700 border-green-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${variants[variant]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
        variant === 'success' ? 'bg-green-500' :
        variant === 'error' ? 'bg-red-500' :
        variant === 'warning' ? 'bg-yellow-500' :
        variant === 'info' ? 'bg-blue-500' :
        'bg-gray-500'
      }`}></span>
      {children}
    </span>
  );
};
