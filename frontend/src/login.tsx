import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import api from './api/axios';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Clock,
  Check,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  LogIn,
  Download,
  X
} from 'lucide-react';
import senaLogo from './assets/sena.registro.png';

const REQUISITOS_CONTRASENA: Array<{ id: string; label: string; falta: string; test: (p: string) => boolean }> = [
  { id: 'longitud', label: 'Mínimo 8 caracteres', falta: 'mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'mayuscula', label: 'Una letra mayúscula (A-Z)', falta: 'una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'minuscula', label: 'Una letra minúscula (a-z)', falta: 'una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'numero', label: 'Un número (0-9)', falta: 'un número', test: (p) => /[0-9]/.test(p) },
  { id: 'especial', label: 'Un carácter especial (!@#$%…)', falta: 'un carácter especial (por ejemplo ! @ # $ %)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?¿¡~`]/.test(p) },
];

const extraerMensajeError = (error: any, fallback: string): string => {
  const candidatos = [error?.response?.data?.message, error?.message, error?.mensaje];
  for (const raw of candidatos) {
    if (Array.isArray(raw)) {
      const textos = raw.filter((m: any) => typeof m === 'string' && m.trim());
      if (textos.length) return textos.join(' • ');
    }
    if (typeof raw === 'string' && raw.trim()) return raw;
  }
  return fallback;
};

function Login() {
  const { login, logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    correo: '',
    contra: '',
  });

  const [codigoOtp, setCodigoOtp] = useState('');
  const [mostrarOtp, setMostrarOtp] = useState(false);
  const [otpMode, setOtpMode] = useState<'login' | 'verificacion'>('login');

  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'solicitar' | 'verificar' | 'restablecer' | 'exito'>('solicitar');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryPass, setRecoveryPass] = useState('');
  const [recoveryConfirmPass, setRecoveryConfirmPass] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const [recoveryStatusType, setRecoveryStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showRecoveryPass, setShowRecoveryPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const perfil = user.usuario;

      if (!perfil) {
        console.error('FIX: Estructura de perfil inválida en la sesión', { user });
        return;
      }

      const idRol = parseInt(String(perfil.idTipoUsr || 0), 10);

      if (idRol === 2) {
        navigate('/appadmin');
      } else if (idRol === 3) {
        navigate('/appperop');
      } else if (idRol === 1) {
        logout();
        setStatus('Esta plataforma web es para personal administrativo y operativo. Usa la app móvil.');
        setStatusType('error');
      } else {
        console.warn('SECURITY: Acceso denegado - Usuario sin rol válido', { idRol });
        setStatus('Tu cuenta no tiene un rol asignado. Contacta al administrador.');
        setStatusType('error');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSolicitarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryStatus('');
    try {
      await api.post('/auth/recuperar/solicitar', { correo: recoveryEmail });
      setRecoveryStep('verificar');
    } catch (error: any) {
      setRecoveryStatus(extraerMensajeError(error, 'Error al solicitar recuperación'));
      setRecoveryStatusType('error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerificarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryStatus('');
    try {
      await api.post('/auth/recuperar/verificar', { correo: recoveryEmail, codigo: recoveryOtp });
      setRecoveryStep('restablecer');
    } catch (error: any) {
      setRecoveryStatus(extraerMensajeError(error, 'Código inválido'));
      setRecoveryStatusType('error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRestablecerContrasena = async (e: React.FormEvent) => {
    e.preventDefault();

    const requisitosFaltantes = REQUISITOS_CONTRASENA.filter((r) => !r.test(recoveryPass));
    if (requisitosFaltantes.length > 0) {
      setRecoveryStatus(`La contraseña no cumple las condiciones. Le falta: ${requisitosFaltantes.map((r) => r.falta).join(', ')}.`);
      setRecoveryStatusType('error');
      return;
    }

    if (recoveryPass !== recoveryConfirmPass) {
      setRecoveryStatus('Las contraseñas no coinciden');
      setRecoveryStatusType('error');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryStatus('');
    try {
      await api.post('/auth/recuperar/restablecer', {
        correo: recoveryEmail,
        codigo: recoveryOtp,
        contraNueva: recoveryPass
      });
      setRecoveryStep('exito');
    } catch (error: any) {
      setRecoveryStatus(extraerMensajeError(error, 'No se pudo restablecer la contraseña. Verifica el código e intenta de nuevo.'));
      setRecoveryStatusType('error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const resetRecovery = () => {
    setShowRecoveryModal(false);
    setRecoveryStep('solicitar');
    setRecoveryEmail('');
    setRecoveryOtp('');
    setRecoveryPass('');
    setRecoveryConfirmPass('');
    setRecoveryStatus('');
    setRecoveryStatusType('idle');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setStatus('Iniciando sesión...');
    setStatusType('loading');

    try {
      await api.post('/auth/login', formData);
      setStatus('Código OTP enviado. Revisa tu correo.');
      setStatusType('success');
      setOtpMode('login');
      setMostrarOtp(true);
    } catch (error: any) {
      console.error('Error en el login:', error);

      const backendMsg = extraerMensajeError(error, '');

      if (backendMsg.toLowerCase().includes('verificar tu correo')) {
        setOtpMode('verificacion');
        setMostrarOtp(true);
        setStatus('Tu cuenta aún no está verificada. Te enviamos un código: ingrésalo aquí para activarla.');
        setStatusType('success');
        return;
      }

      setStatus(backendMsg || 'Credenciales incorrectas. Verifica tus datos o que el backend esté corriendo.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setStatus('Verificando código...');
    setStatusType('loading');

    try {
      const endpoint = otpMode === 'verificacion' ? '/auth/verificar-registro' : '/auth/verificar-otp';
      const response = await api.post(endpoint, {
        correo: formData.correo,
        codigo: codigoOtp
      });

      if (response.status === 200 && response.data) {
        const userData = response.data.data !== undefined ? response.data.data : response.data;

        setStatus('¡Verificación exitosa! Redirigiendo...');
        setStatusType('success');

        setTimeout(() => {
          login(userData);
        }, 500);
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error: any) {
      console.error('FIX: Error al verificar OTP:', error);
      setStatus(extraerMensajeError(error, 'Código incorrecto o expirado'));
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarOtp = async () => {
    if (loading) return;

    setLoading(true);
    setStatus('Reenviando código...');
    setStatusType('loading');
    try {
      await api.post('/auth/reenviar-otp', { correo: formData.correo });
      setStatus('Nuevo código enviado. ¡Revisa tu correo!');
      setStatusType('success');
    } catch (error: any) {
      console.error('Error al reenviar OTP:', error);
      setStatus(extraerMensajeError(error, 'No se pudo reenviar el código'));
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden min-h-[600px] lg:min-h-screen shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url(${senaLogo})`,
            filter: 'brightness(0.35) contrast(1.1)'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-10" />

        <div className="absolute top-10 left-12 z-30 flex items-center gap-4">
          <img src="/logo.png" alt="SENA" className="w-14 h-14 object-contain brightness-0 invert drop-shadow-lg" />
          <div className="text-white border-l border-white/20 pl-4 py-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] leading-tight">Servicio Nacional</p>
            <p className="text-[11px] font-medium opacity-70 leading-tight">de Aprendizaje</p>
          </div>
        </div>

        <div className="relative z-30 px-12 xl:px-20 pt-24 flex-1 flex flex-col justify-center items-start text-left">
          <div className="space-y-1 mb-8">
            <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tight leading-none">
              Bienvenido
            </h1>
            <h1 className="text-5xl xl:text-6xl font-black text-[#39A900] tracking-tight leading-none">
              nuevamente
            </h1>
          </div>

          <div className="w-16 h-1.5 bg-[#39A900] mb-8 rounded-full" />

          <p className="text-lg text-white/90 max-w-sm leading-relaxed font-medium mb-12">
            Accede a la plataforma institucional y continúa tu experiencia académica.
          </p>

          <div className="space-y-4 w-full max-w-[400px]">
            <div className="flex items-center gap-5 p-5 rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 group hover:bg-white/10 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-[#39A900]/20 flex items-center justify-center flex-shrink-0 border border-[#39A900]/30 shadow-lg">
                <ShieldCheck className="text-[#39A900] w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Acceso seguro</h3>
                <p className="text-white/60 text-[11px] mt-0.5 leading-snug">Protegemos tu información con los más altos estándares.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-5 rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 group hover:bg-white/10 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-[#39A900]/20 flex items-center justify-center flex-shrink-0 border border-[#39A900]/30 shadow-lg">
                <Zap className="text-[#39A900] w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Gestión eficiente</h3>
                <p className="text-white/60 text-[11px] mt-0.5 leading-snug">Trámites de forma rápida y sencilla.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-5 rounded-[24px] bg-white/5 backdrop-blur-xl border border-white/10 group hover:bg-white/10 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-[#39A900]/20 flex items-center justify-center flex-shrink-0 border border-[#39A900]/30 shadow-lg">
                <Clock className="text-[#39A900] w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Disponible 24/7</h3>
                <p className="text-white/60 text-[11px] mt-0.5 leading-snug">Disponible cuando más la necesitas.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none overflow-hidden h-48">
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="none"
            className="absolute bottom-0 w-full h-full"
          >
            <path
              d="M0,120 C150,180 350,60 500,120 L500,200 L0,200 Z"
              fill="#39A900"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 lg:p-8 relative z-30 bg-[#F8F9FA]">

        <div className="lg:hidden flex flex-col items-center gap-5 mb-14">
          <img src="/logo.png" alt="SENA" className="h-16 object-contain drop-shadow-md" />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bienvenido</h1>
            <p className="text-sm font-bold text-[#39A900] uppercase tracking-[0.2em]">Portal de Acceso</p>
          </div>
        </div>

        <div className="absolute top-10 right-10 hidden xl:flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-md border border-gray-100">
          <ShieldCheck className="w-4 h-4 text-[#39A900]" />
          <span className="text-[11px] font-bold text-gray-600">Acceso seguro</span>
          <div className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse" />
        </div>

        <div className="w-full max-w-[500px] bg-white rounded-[40px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] p-7 lg:p-9 border border-gray-50 flex flex-col items-center transition-all hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] duration-700">

          <div className="w-16 h-16 bg-green-50 rounded-[24px] flex items-center justify-center mb-5 border border-green-100 shadow-inner">
            <Lock className="w-8 h-8 text-[#39A900]" />
          </div>

          <div className="text-center space-y-1 mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Iniciar sesión</h2>
            <p className="text-sm font-medium text-gray-400">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {!mostrarOtp ? (
            <form onSubmit={handleSubmitLogin} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Correo electrónico</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#39A900] transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    name="correo"
                    placeholder="ejemplo@correo.com"
                    value={formData.correo}
                    onChange={handleChange}
                    className="w-full pl-14 pr-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#39A900] focus:ring-4 focus:ring-green-500/5 outline-none transition-all text-sm font-semibold text-gray-800 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#39A900] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="contra"
                    placeholder="••••••••••••"
                    value={formData.contra}
                    onChange={handleChange}
                    className="w-full pl-14 pr-14 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#39A900] focus:ring-4 focus:ring-green-500/5 outline-none transition-all text-sm font-semibold text-gray-800 placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-gray-200 rounded-md peer-checked:bg-[#39A900] peer-checked:border-[#39A900] transition-all flex items-center justify-center">
                      {rememberMe && <Check className="w-3.5 h-3.5 text-white stroke-[4px]" />}
                    </div>
                  </div>
                  <span className="text-[13px] font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Recordarme</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  className="text-[13px] font-bold text-[#39A900] hover:text-[#007832] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-green-900/10 hover:shadow-green-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span className="text-base">Ingresar</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="w-full space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {otpMode === 'verificacion' ? 'Verifica tu correo' : 'Verificar código'}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed px-4">
                  {otpMode === 'verificacion'
                    ? 'Tu cuenta aún no está activada. Ingresa el código de 6 dígitos que enviamos a tu correo para verificarla e iniciar sesión.'
                    : 'Se ha enviado un código de seguridad de 6 dígitos a tu correo electrónico institucional.'}
                </p>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                value={codigoOtp}
                onChange={(e) => setCodigoOtp(e.target.value)}
                className="w-full p-5 text-center text-4xl font-black tracking-[0.5em] bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-[#39A900] outline-none transition-all text-gray-800 placeholder:text-gray-200"
              />

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-500/10 transition-all"
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Verificar identidad'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReenviarOtp}
                  className="w-full text-[#39A900] text-sm font-bold hover:text-[#007832] transition-colors disabled:opacity-50"
                >
                  ¿No recibiste el código? Reenviar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarOtp(false);
                    setOtpMode('login');
                    setCodigoOtp('');
                    setStatus('');
                    setStatusType('idle');
                  }}
                  className="w-full text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

          {status && (
            <div className={`mt-8 p-4 w-full rounded-2xl text-center text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
              statusType === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
            }`}>
              {status}
            </div>
          )}
        </div>

        <a
          href="https://github.com/martin15006/proyecto_parqueadero/releases/download/v1.0/parqueadero.apk"
          className="mt-8 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#39A900] text-white text-sm font-bold hover:bg-[#007832] transition-all duration-200 shadow-lg shadow-green-900/10 hover:-translate-y-0.5"
        >
          <Download className="w-5 h-5" />
          Descargar app para usuarios (Android)
        </a>

        <div className="mt-10 text-center space-y-4">
          <ShieldCheck className="w-6 h-6 text-[#39a900] mx-auto opacity-80" />
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Servicio Nacional de Aprendizaje SENA</p>
            <p className="text-[11px] font-medium text-gray-400">Plataforma académica institucional</p>
          </div>
        </div>
      </div>

      {showRecoveryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all" onClick={resetRecovery} />
          <div className="relative w-full max-w-[550px] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="h-1.5 w-full bg-[#39A900]" />

            <div className="p-8 lg:p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="SENA" className="w-10 h-10 object-contain" />
                  <div className="text-gray-700 border-l border-gray-200 pl-3 py-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Servicio Nacional</p>
                    <p className="text-[10px] font-medium opacity-80 leading-tight">de Aprendizaje</p>
                  </div>
                </div>
                <button onClick={resetRecovery} className="text-gray-500 hover:text-gray-800 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {recoveryStep === 'solicitar' && (
                <div className="space-y-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Lock className="w-7 h-7 text-[#39A900]" />
                    </div>
                    <div className="pt-1">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar acceso</h2>
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        Ingresa tu correo institucional para recibir un código de recuperación.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSolicitarRecuperacion} className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[13px] font-bold text-gray-700 ml-1">Correo electrónico</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#39A900]">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="ejemplo@sena.edu.co"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full pl-14 pr-5 py-4.5 rounded-2xl bg-white border border-gray-200 focus:border-[#39A900] outline-none transition-all font-semibold text-gray-800"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/10"
                    >
                      {recoveryLoading ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <span className="text-base">Enviar código</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {recoveryStep === 'verificar' && (
                <div className="space-y-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-7 h-7 text-[#39A900]" />
                    </div>
                    <div className="pt-1">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Verificar código</h2>
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        Ingresa el código enviado a <span className="font-bold text-gray-700">{recoveryEmail}</span>
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleVerificarRecuperacion} className="space-y-6">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="000000"
                      value={recoveryOtp}
                      onChange={(e) => setRecoveryOtp(e.target.value)}
                      className="w-full p-5 text-center text-4xl font-black tracking-[0.5em] bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-[#39A900] outline-none transition-all"
                    />
                    <button type="submit" disabled={recoveryLoading} className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                      {recoveryLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Verificar código'}
                    </button>
                  </form>
                </div>
              )}

              {recoveryStep === 'restablecer' && (
                <div className="space-y-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <KeyRound className="w-7 h-7 text-[#39A900]" />
                    </div>
                    <div className="pt-1">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva contraseña</h2>
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">Crea una contraseña segura para tu cuenta.</p>
                    </div>
                  </div>
                  <form onSubmit={handleRestablecerContrasena} className="space-y-4">
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#39A900] transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showRecoveryPass ? 'text' : 'password'}
                        required
                        placeholder="Nueva contraseña"
                        value={recoveryPass}
                        onChange={(e) => setRecoveryPass(e.target.value)}
                        className="w-full pl-14 pr-14 py-4.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#39A900] outline-none transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPass(!showRecoveryPass)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 p-1"
                      >
                        {showRecoveryPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#39A900] transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showRecoveryPass ? 'text' : 'password'}
                        required
                        placeholder="Confirmar contraseña"
                        value={recoveryConfirmPass}
                        onChange={(e) => setRecoveryConfirmPass(e.target.value)}
                        className="w-full pl-14 pr-5 py-4.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#39A900] outline-none transition-all font-semibold"
                      />
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-2">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">La contraseña debe tener:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {REQUISITOS_CONTRASENA.map((r) => {
                          const cumple = r.test(recoveryPass);
                          return (
                            <div key={r.id} className={`flex items-center gap-2 text-[12px] font-semibold transition-colors ${cumple ? 'text-[#39A900]' : 'text-gray-400'}`}>
                              {cumple
                                ? <Check className="w-4 h-4 stroke-[3px] shrink-0" />
                                : <X className="w-4 h-4 shrink-0 opacity-60" />}
                              {r.label}
                            </div>
                          );
                        })}
                        {recoveryConfirmPass.length > 0 && (
                          <div className={`flex items-center gap-2 text-[12px] font-semibold transition-colors ${recoveryPass === recoveryConfirmPass ? 'text-[#39A900]' : 'text-rose-500'}`}>
                            {recoveryPass === recoveryConfirmPass
                              ? <Check className="w-4 h-4 stroke-[3px] shrink-0" />
                              : <X className="w-4 h-4 shrink-0" />}
                            Las contraseñas coinciden
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={recoveryLoading} className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-5 rounded-2xl font-bold mt-4 shadow-lg shadow-green-500/10 transition-all">
                      {recoveryLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Actualizar contraseña'}
                    </button>
                  </form>
                </div>
              )}

              {recoveryStep === 'exito' && (
                <div className="text-center py-6 space-y-8">
                  <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center mx-auto border border-green-100 shadow-xl shadow-green-500/5">
                    <Check className="w-12 h-12 text-[#39A900] stroke-[3px]" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">¡Éxito!</h3>
                    <p className="text-gray-500 font-medium">Contraseña actualizada correctamente. Ya puedes acceder a tu cuenta.</p>
                  </div>
                  <button onClick={resetRecovery} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold shadow-xl transition-all hover:bg-black">
                    Volver al login
                  </button>
                </div>
              )}

              {recoveryStep !== 'exito' && (
                <div className="mt-12 pt-6 border-t border-gray-100">
                  <button
                    onClick={resetRecovery}
                    className="flex items-center gap-2.5 text-[#39A900] font-bold text-sm hover:translate-x-[-4px] transition-transform"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Volver al inicio de sesión</span>
                  </button>
                </div>
              )}

              {recoveryStatus && (
                <div className={`mt-6 p-4 rounded-2xl text-center text-xs font-bold ${
                  recoveryStatusType === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                }`}>
                  {recoveryStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
