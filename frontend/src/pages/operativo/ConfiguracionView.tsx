import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  User, Shield,
  ChevronRight, Save, RotateCcw,
  Key, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { usuariosService } from '../../services/usuarios.service';

const isPasswordSecure = (value: string) => {
  const check = {
    tieneMinimo: value.length >= 8,
    tieneMayuscula: /[A-Z]/.test(value),
    tieneMinuscula: /[a-z]/.test(value),
    tieneNumero: /[0-9]/.test(value),
    tieneEspecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?¿¡~`]/.test(value),
  };
  return { isValid: Object.values(check).every(Boolean), check };
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

export const ConfiguracionView: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>(
    (location.state as { section?: string } | null)?.section ?? 'perfil',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const requested = (location.state as { section?: string } | null)?.section;
    if (requested) setActiveSection(requested);
  }, [location.key]);

  const [profileData, setProfileData] = useState({
    nombre: user?.usuario?.nombreCompleto || 'Juan Carlos Operativo',
    correo: user?.usuario?.correo || 'j.operativo@misena.edu.co',
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    if (activeSection !== 'seguridad') {
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        showNotification('Configuración actualizada correctamente', 'success');
      }, 1000);
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = securityData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('Completa todos los campos de contraseña', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('La nueva contraseña y su confirmación no coinciden', 'error');
      return;
    }
    if (currentPassword === newPassword) {
      showNotification('La nueva contraseña no puede ser igual a la actual', 'error');
      return;
    }
    const { isValid, check } = isPasswordSecure(newPassword);
    if (!isValid) {
      const faltantes: string[] = [];
      if (!check.tieneMinimo) faltantes.push('mínimo 8 caracteres');
      if (!check.tieneMayuscula) faltantes.push('una mayúscula');
      if (!check.tieneMinuscula) faltantes.push('una minúscula');
      if (!check.tieneNumero) faltantes.push('un número');
      if (!check.tieneEspecial) faltantes.push('un carácter especial');
      showNotification(`La contraseña requiere: ${faltantes.join(', ')}`, 'error');
      return;
    }

    try {
      setSaving(true);
      await usuariosService.cambiarContrasena(currentPassword, newPassword);
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showNotification('Contraseña actualizada correctamente', 'success');
    } catch (e: any) {
      showNotification(mensajeDeError(e, 'No se pudo cambiar la contraseña. Verifica tus datos.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (window.confirm('¿Estás seguro de revertir los cambios?')) {
      showNotification('Cambios revertidos', 'info');
    }
  };

  const sections = [
    { id: 'perfil', label: 'Perfil de Usuario', icon: <User size={16} />, sub: 'Datos institucionales' },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield size={16} />, sub: 'Claves y accesos' },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'perfil':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-[#39B000]/10 flex items-center justify-center border-2 border-dashed border-[#39B000]/30 text-[#39B000] text-2xl font-black">
                {profileData.nombre.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-center sm:text-left pt-2">
                <p className="text-sm font-bold text-[#012E25] dark:text-white uppercase tracking-widest">{profileData.nombre}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">SENA • Centro de Industria y Construcción</p>
                <button className="mt-3 text-[10px] font-bold text-[#39B000] hover:underline uppercase tracking-widest">Cambiar Foto</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 max-w-md">
              <InputGroup
                label="Nombre del Operador"
                value={profileData.nombre}
                onChange={(e) => setProfileData({...profileData, nombre: e.target.value})}
              />
              <InputGroup
                label="Correo"
                value={profileData.correo}
                type="email"
                onChange={(e) => setProfileData({...profileData, correo: e.target.value})}
              />
            </div>
          </div>
        );

      case 'seguridad':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex gap-4 items-start mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-orange-600 shrink-0">
                <Key size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-1">Recomendación de Seguridad</p>
                <p className="text-[10px] text-orange-700/70 dark:text-orange-400/60 leading-relaxed font-medium">
                  Se recomienda cambiar su contraseña cada 90 días para mantener la integridad de su cuenta institucional.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 max-w-md">
              <div className="relative">
                <InputGroup
                  label="Contraseña Actual"
                  type={showPass ? "text" : "password"}
                  value={securityData.currentPassword}
                  onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 bottom-3 text-gray-400 hover:text-[#39B000]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <InputGroup
                  label="Nueva Contraseña"
                  type={showNew ? "text" : "password"}
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                />
                <button
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 bottom-3 text-gray-400 hover:text-[#39B000]"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <InputGroup
                  label="Confirmar Nueva Contraseña"
                  type={showConfirm ? "text" : "password"}
                  value={securityData.confirmPassword}
                  onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                />
                <button
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 bottom-3 text-gray-400 hover:text-[#39B000]"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden p-2 transition-colors duration-300">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group
                ${activeSection === section.id
                  ? 'bg-gray-50 dark:bg-white/5 text-[#012E25] dark:text-[#39B000]'
                  : 'text-gray-400 hover:bg-gray-50/50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${activeSection === section.id
                    ? 'bg-[#39B000] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-white/10'}
                `}>
                  {section.icon}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold tracking-tight uppercase">{section.label}</p>
                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">{section.sub}</p>
                </div>
              </div>
              <ChevronRight size={14} className={`transition-all ${activeSection === section.id ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="bg-white dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-300">
          <div className="px-6 py-4 border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5">
            <h2 className="text-[10px] font-bold text-[#012E25] dark:text-white uppercase tracking-[0.2em]">{activeSection}</h2>
          </div>

          <div className="p-6 lg:p-10 flex-1 overflow-y-auto">
            {renderSectionContent()}
          </div>

          <div className="px-6 py-5 bg-gray-50/30 dark:bg-white/5 border-t border-gray-50 dark:border-white/5 flex items-center justify-end gap-3">
            <button
              onClick={handleRevert}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
            >
              <RotateCcw size={14} />
              Revertir
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`
                flex items-center gap-2 px-8 py-3 bg-[#39B000] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#39B000]/20
                ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#007832] active:scale-95'}
              `}
            >
              <Save size={14} className={saving ? 'animate-spin' : ''} />
              {saving ? 'Guardando' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InputGroupProps {
  label: string;
  placeholder?: string;
  value?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, placeholder, value, type = 'text', onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-[#39B000] outline-none transition-all text-xs font-bold text-[#012E25] dark:text-white"
    />
  </div>
);


