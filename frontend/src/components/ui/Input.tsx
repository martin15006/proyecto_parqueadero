import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white outline-none rounded-xl px-5 py-4 text-sm font-medium transition-all duration-200 placeholder:text-slate-400 ${
              icon ? 'pl-12' : ''
            } ${error ? 'border-red-500 bg-red-50' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
