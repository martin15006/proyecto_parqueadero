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

  // 🔄 Redirección automática al detectar la sesión activa con validación estricta
  useEffect(() => {
    if (isAuthenticated && user) {
      // REFACTOR: Uso de tipado estricto y normalización de datos
      const perfil = user.usuario;
      
      if (!perfil) {
        console.error('FIX: Estructura de perfil inválida en la sesión', { user });
        return;
      }

      // NORMALIZACIÓN: Priorizamos 'idTipoUsr' (camelCase tras interceptor)
      const idRol = parseInt(String(perfil.idTipoUsr || 0), 10);
      
      // Mapeo lógico manual basado en TipoUsuarioEnum
      const rolNombre = idRol === 1 ? 'APRENDIZ' : (idRol === 2 ? 'ADMIN' : (idRol === 3 ? 'OPERATIVO' : ''));

      console.log('Validando acceso para:', { rolNombre, idRol, perfil });

      // Lógica de redirección basada en roles definidos
      if (idRol === 2) {
        navigate('/appadmin');
      } else if (idRol === 3) {
        navigate('/appperop');
      } else if (idRol === 1) {
        navigate('/app');
      } else {
        console.warn('SECURITY: Acceso denegado - Usuario sin rol válido', { idRol });
        setStatus({ msg: 'Tu cuenta no tiene un rol asignado. Contacta al administrador.', tipo: 'error' });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setStatus({ msg: 'Iniciando sesión...', tipo: 'info' });
    try {
      await api.post('/auth/login', formData);
      setStatus({ msg: 'Código de verificación generado. ¡Búscalo en la terminal del backend!', tipo: 'success' });
      setMostrarOtp(true);
    } catch (error: any) {
      console.error('Error en el login:', error);
      
      // Manejo robusto de errores de red/CORS
      if (error.code === 'ERR_NETWORK' || !error.response) {
        setStatus({ msg: 'Error de conexión con el servidor. Verifica que el backend esté corriendo.', tipo: 'error' });
      } else {
        setStatus({ msg: `Error: ${error.response?.data?.message || 'Credenciales incorrectas'}`, tipo: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setStatus({ msg: 'Verificando código...', tipo: 'info' });
    try {
      const response = await api.post('/auth/verificar-otp', {
        correo: formData.correo,
        codigo: codigoOtp
      });
      
      // Validar que la respuesta sea exitosa y contenga datos
      if (response.status === 200 && response.data) {
        // NORMALIZACIÓN: El backend usa un ResponseInterceptor que envuelve la data en { success, data, ... }
        const userData = response.data.data !== undefined ? response.data.data : response.data;
        
        setStatus({ msg: '¡Verificación exitosa! Redirigiendo...', tipo: 'success' });
        
        // Pequeña pausa para que el usuario vea el éxito antes de la redirección
        setTimeout(() => {
          login(userData);
        }, 500);
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
      
    } catch (error: any) {
      console.error('FIX: Error al verificar OTP:', error);
      setStatus({ msg: `Error: ${error.message || 'Código incorrecto o expirado'}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarOtp = async () => {
    if (loading) return;
    
    setLoading(true);
    setStatus({ msg: 'Reenviando código...', tipo: 'info' });
    try {
      await api.post('/auth/reenviar-otp', { correo: formData.correo });
      setStatus({ msg: 'Nuevo código enviado. ¡Revisa tu correo!', tipo: 'success' });
    } catch (error: any) {
      console.error('Error al reenviar OTP:', error);
      setStatus({ msg: `Error: ${error.response?.data?.message || 'No se pudo reenviar el código'}`, tipo: 'error' });
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

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleReenviarOtp}
                className="w-full text-blue-400 hover:text-blue-300 font-bold text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50 py-2"
              >
                {loading ? 'Procesando...' : '¿No recibiste el código? Reenviar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarOtp(false);
                  setStatus({ msg: '', tipo: null });
                }}
                className="w-full text-slate-500 hover:text-slate-300 font-bold text-[10px] uppercase tracking-widest transition-colors"
              >
                Volver al Login
              </button>
            </div>
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
