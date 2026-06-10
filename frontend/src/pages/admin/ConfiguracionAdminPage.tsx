import React, { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { usuariosService } from '../../services/usuarios.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const isPasswordSecure = (value: string) => {
  const tieneMinimo = value.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(value);
  const tieneMinuscula = /[a-z]/.test(value);
  const tieneNumero = /[0-9]/.test(value);
  const tieneEspecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?¿¡~`]/.test(value);
  return tieneMinimo && tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
};

export const ConfiguracionAdminPage: React.FC = () => {
  const [contraActual, setContraActual] = useState('');
  const [contraNueva, setContraNueva] = useState('');
  const [contraNueva2, setContraNueva2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (!contraActual || !contraNueva || !contraNueva2) return null;
    if (contraNueva !== contraNueva2) return 'La confirmación no coincide';
    if (contraActual === contraNueva) return 'La nueva contraseña no puede ser igual a la anterior';
    if (!isPasswordSecure(contraNueva)) {
      return 'RF3: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
    }
    return null;
  }, [contraActual, contraNueva, contraNueva2]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!contraActual || !contraNueva || !contraNueva2) {
      setError('Completa todos los campos');
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
      setSuccess('Contraseña actualizada exitosamente');
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
      </header>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Cambiar contraseña</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RF3 aplicado en cliente y servidor</p>
          </div>
        </div>

        {(error || success) && (
          <div className={`mb-6 p-4 rounded-2xl border text-xs font-bold uppercase tracking-widest ${
            error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {error || success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Contraseña actual"
            type="password"
            value={contraActual}
            onChange={(e) => setContraActual(e.target.value)}
            placeholder="Tu contraseña actual"
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={contraNueva}
            onChange={(e) => setContraNueva(e.target.value)}
            placeholder="Nueva contraseña (RF3)"
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={contraNueva2}
            onChange={(e) => setContraNueva2(e.target.value)}
            placeholder="Repite la nueva contraseña"
          />

          <div className="pt-2">
            <Button variant="primary" size="md" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
