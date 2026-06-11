import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Content */}
      <div className="relative bg-white dark:bg-[#121212] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-modal-in border border-slate-200 dark:border-white/5 transition-colors duration-500">
        <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-black text-[#232323] dark:text-gray-100 uppercase tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
          >
            ✕
          </button>
        </div>

        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-8 py-6 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5 flex justify-end gap-4 transition-colors duration-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
