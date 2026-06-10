import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';


export const OperativoHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

 
  const userData = user?.usuario;
  const nombre = userData?.nombreCompleto || 'Operador';

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-blue-500 uppercase tracking-tight">Sistema Parqueadero</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Estado: Online</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center">
        <span className="text-lg font-mono font-bold text-white tracking-widest">
          {now.toLocaleTimeString()}
        </span>
        <span className="text-[10px] text-gray-500 uppercase font-bold">
          {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-white leading-none">{nombre}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase">Operador de Turno</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.href = '/'}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Volver al inicio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <button 
            onClick={logout}
            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-red-600/20"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
};
