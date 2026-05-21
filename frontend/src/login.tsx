import React, { useEffect, useState } from 'react';
import api from './api/axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

/**
 * Componente de Login Profesional.
 * Implementa una interfaz moderna con Tailwind CSS y flujo de autenticación en dos pasos (Credenciales + OTP).
 * FEATURE: Diseño responsivo, estados de carga y manejo de errores semántico.
 */
function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    correo: '',
    contra: '',
  });
  
  const [mostrarOtp, setMostrarOtp] = useState<boolean>(false);
  const [codigoOtp, setCodigoOtp] = useState<string>('');
  const [status, setStatus] = useState<{ msg: string; tipo: 'error' | 'success' | 'info' | null }>({ msg: '', tipo: null });
  const [loading, setLoading] = useState(false);

  // 🔄 Redirección automática al detectar la sesión activa
  useEffect(() => {
    if (isAuthenticated && user) {
      const datosReales = user?.user || user?.usuario || user;
      const rol = parseInt(datosReales?.idtipousr || datosReales?.idTipoUsr || '1', 10);

      if (rol === 1) navigate('/app');
      else if (rol === 3) navigate('/appperop'); // Rol 3 es Operativo según DB
      else if (rol === 2) navigate('/appadmin'); // Rol 2 es Admin según DB
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: 'Iniciando sesión...', tipo: 'info' });
    try {
      await api.post('/auth/login', formData);
      setStatus({ msg: 'Código de verificación generado. ¡Búscalo en la terminal del backend!', tipo: 'success' });
      setMostrarOtp(true);
    } catch (error: any) {
      console.error('Error en el login:', error);
      setStatus({ msg: `Error: ${error.response?.data?.message || 'Credenciales incorrectas'}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: 'Verificando código...', tipo: 'info' });
    try {
      const response = await api.post('/auth/verificar-otp', {
        correo: formData.correo,
        codigo: codigoOtp
      });
      login(response.data);
    } catch (error: any) {
      console.error('Error al verificar OTP:', error);
      setStatus({ msg: `Error: ${error.response?.data?.message || 'Código incorrecto'}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="max-w-md w-full space-y-8 bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-600/20 mb-6 group transition-transform hover:scale-105 duration-500">
            {mostrarOtp ? (
              <ShieldCheck className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <LogIn className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            {mostrarOtp ? 'Seguridad OTP' : 'Login - Sistema'}
          </h1>
          <p className="mt-2 text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
            {mostrarOtp ? 'Verificación de Identidad' : 'Gestión de Parqueadero Institucional'}
          </p>
        </div>

        {!mostrarOtp ? (
          <form onSubmit={handleSubmitLogin} className="mt-8 space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  name="correo"
                  type="email"
                  required
                  value={formData.correo}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-slate-600"
                  placeholder="Correo Electrónico"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  name="contra"
                  type="password"
                  required
                  value={formData.contra}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-slate-600"
                  placeholder="Contraseña"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <a href="/registro" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest">
                ¿No tienes cuenta? Regístrate
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar al Sistema'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitOtp} className="mt-8 space-y-6 relative z-10">
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-400">
                Hemos enviado un código a tu terminal. Por favor ingrésalo para continuar.
              </p>
              <input
                type="text"
                maxLength={6}
                required
                value={codigoOtp}
                onChange={(e) => setCodigoOtp(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white py-5 rounded-2xl focus:ring-2 focus:ring-green-500 text-center text-3xl font-black tracking-[0.5em] transition-all outline-none placeholder:text-slate-700"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Identidad'}
            </button>

            <button
              type="button"
              onClick={() => setMostrarOtp(false)}
              className="w-full text-slate-500 hover:text-slate-300 font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Volver al Login
            </button>
          </form>
        )}

        {status.msg && (
          <div className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all animate-in fade-in slide-in-from-top-2 ${
            status.tipo === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 
            status.tipo === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' :
            'bg-blue-500/10 border-blue-500/50 text-blue-500'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${
                status.tipo === 'error' ? 'bg-red-500 animate-pulse' : 
                status.tipo === 'success' ? 'bg-green-500' : 'bg-blue-500 animate-spin'
              }`}></div>
              {status.msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
