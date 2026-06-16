import React, { useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Info, KeyRound, UserCircle } from 'lucide-react';
import { usuariosService } from '../../services/usuarios.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../AuthContext';

const isPasswordSecure = (value: string) => {
  const check = {
    tieneMinimo: value.length >= 8,
    tieneMayuscula: /[A-Z]/.test(value),
    tieneMinuscula: /[a-z]/.test(value),
    tieneNumero: /[0-9]/.test(value),
    tieneEspecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?¿¡~`]/.test(value),
  };
  const isValid = Object.values(check).every(Boolean);
  return { isValid, check };
};

const mensajeDeError = (e: any, fallback: string): string => {
  const raw = e?.response?.data?.message ?? e?.message;
  if (Array.isArray(raw)) {
    const textos = raw.filter((m) => typeof m === 'string' && m.trim());
    if (textos.length) return textos.join(' • ');
  }
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
};

export const ConfiguracionAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [contraActual, setContraActual] = useState('');
  const [contraNueva, setContraNueva] = useState('');
  const [contraNueva2, setContraNueva2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordSecurity = useMemo(() => isPasswordSecure(contraNueva), [contraNueva]);

  const validationError = useMemo(() => {
    if (!contraActual || !contraNueva || !contraNueva2) return null;
    if (contraNueva !== contraNueva2) return 'La confirmación no coincide';
    if (contraActual === contraNueva) return 'La nueva contraseña no puede ser igual a la anterior';
    if (!passwordSecurity.isValid) {
      const c = passwordSecurity.check;
      const faltantes: string[] = [];
      if (!c.tieneMinimo) faltantes.push('mínimo 8 caracteres');
      if (!c.tieneMayuscula) faltantes.push('una letra mayúscula');
      if (!c.tieneMinuscula) faltantes.push('una letra minúscula');
      if (!c.tieneNumero) faltantes.push('un número');
      if (!c.tieneEspecial) faltantes.push('un carácter especial (! @ # $ %…)');
      return `La contraseña no cumple las condiciones. Le falta: ${faltantes.join(', ')}.`;
    }
    return null;
  }, [contraActual, contraNueva, contraNueva2, passwordSecurity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!contraActual || !contraNueva || !contraNueva2) {
      setError('Completa todos los campos para continuar');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await usuariosService.cambiarContrasena(contraActual, contraNueva);
      setContraActual('');
      setContraNueva('');
      setContraNueva2('');
      setSuccess('Tu contraseña ha sido actualizada correctamente');
    } catch (e: any) {
      setError(mensajeDeError(e, 'No se pudo actualizar la contraseña. Verifica tus datos.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#232323] dark:bg-[#121212] rounded-[2.5rem] p-8 text-white dark:text-gray-100 shadow-2xl relative overflow-hidden group transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#39A900] opacity-10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#39A900] to-[#007832] flex items-center justify-center text-4xl font-black shadow-xl mb-6 border-2 border-white/10">
                {user?.usuario?.nombreCompleto?.charAt(0) || 'A'}
              </div>
              <h3 className="text-xl font-black tracking-tight mb-1">{user?.usuario?.nombreCompleto || 'Administrador'}</h3>
              <p className="text-[#39A900] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Administrador Principal</p>
              <div className="w-full h-px bg-white/10 my-6" />
              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <UserCircle size={16} className="text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Documento</p>
                    <p className="text-sm font-bold">{user?.usuario?.documento}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nivel de Acceso</p>
                    <p className="text-sm font-bold">Total (Super Admin)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm transition-colors duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-gray-200 flex items-center justify-center border border-slate-200 dark:border-white/10">
                <Info size={18} />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-gray-100 uppercase tracking-tight">Seguridad de la cuenta</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
              Mantener una contraseña segura es fundamental para proteger la infraestructura del parqueadero. Se recomienda cambiarla cada 90 días.
            </p>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="bg-white dark:bg-[#121212] rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#39A900] to-[#007832]" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#39A900]/10 text-[#39A900] flex items-center justify-center border border-[#39A900]/20">
                  <KeyRound size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">Gestión de Acceso</h3>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-1">Actualización de credenciales RF3</p>
                </div>
              </div>
            </div>

            {(error || success) && (
              <div className={`mb-8 p-5 rounded-[22px] border flex items-center gap-4 animate-in fade-in zoom-in duration-300 ${
                error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}>
                {error ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                <p className="text-[11px] font-black uppercase tracking-widest">{error || success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              <div className="md:col-span-2">
                <Input
                  label="Contraseña actual"
                  type="password"
                  value={contraActual}
                  onChange={(e) => setContraActual(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-50/50 dark:bg-black/20 border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 transition-all"
                />
              </div>

              <div className="space-y-8">
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={contraNueva}
                  onChange={(e) => setContraNueva(e.target.value)}
                  placeholder="Nueva clave segura"
                  className="bg-slate-50/50 dark:bg-black/20 border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 transition-all"
                />
                <Input
                  label="Repetir contraseña"
                  type="password"
                  value={contraNueva2}
                  onChange={(e) => setContraNueva2(e.target.value)}
                  placeholder="Confirma tu clave"
                  className="bg-slate-50/50 dark:bg-black/20 border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 transition-all"
                />
              </div>

              <div className="bg-slate-50/50 dark:bg-black/20 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Requisitos de Seguridad</p>
                <div className="space-y-4">
                  {[
                    { label: '8 caracteres mínimo', met: passwordSecurity.check.tieneMinimo },
                    { label: 'Una letra mayúscula', met: passwordSecurity.check.tieneMayuscula },
                    { label: 'Una letra minúscula', met: passwordSecurity.check.tieneMinuscula },
                    { label: 'Al menos un número', met: passwordSecurity.check.tieneNumero },
                    { label: 'Carácter especial (!@#$)', met: passwordSecurity.check.tieneEspecial },
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {req.met ? (
                        <CheckCircle2 size={16} className="text-[#39A900]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-white/10" />
                      )}
                      <span className={`text-[11px] font-bold tracking-tight ${req.met ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 pt-6">
                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  isLoading={loading}
                  className="w-full md:w-auto px-12 py-5 rounded-[22px] shadow-[0_12px_24px_rgba(57,169,0,0.25)] hover:shadow-[0_12px_30px_rgba(57,169,0,0.35)]"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

