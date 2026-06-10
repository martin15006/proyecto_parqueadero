import React, { useState } from 'react';
import { 
  User, Shield, Bell, Smartphone, 
  ChevronRight, Save, RotateCcw, Headphones,
  Key, Volume2, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const ConfiguracionView: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [activeSection, setActiveSection] = useState('perfil');
  const [saving, setSaving] = useState(false);
  
  // Estado para Perfil
  const [profileData, setProfileData] = useState({
    nombre: user?.usuario?.nombreCompleto || 'Juan Carlos Operativo',
    correo: user?.usuario?.correo || 'j.operativo@misena.edu.co',
    cargo: 'Operador de Turno'
  });

  // Estado para Seguridad
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);

  // Estado para Preferencias
  const [prefs, setPrefs] = useState({
    sonido: true,
    alertasOcupacion: true,
    notificacionesCriticas: true,
    autoRefresh: true
  });

  // Estado para Periféricos
  const [peripherals, setPeripherals] = useState({
    scannerPort: 'COM3',
    baudRate: '9600',
    autoConnect: true
  });

  const handleSave = () => {
    setSaving(true);
    // Simular guardado
    setTimeout(() => {
      setSaving(false);
      showNotification('Configuración actualizada correctamente', 'success');
    }, 1000);
  };

  const handleRevert = () => {
    if (window.confirm('¿Estás seguro de revertir los cambios?')) {
      // En una app real, aquí volveríamos a pedir los datos al backend
      showNotification('Cambios revertidos', 'info');
    }
  };

  const sections = [
    { id: 'perfil', label: 'Perfil de Usuario', icon: <User size={16} />, sub: 'Datos institucionales' },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield size={16} />, sub: 'Claves y accesos' },
    { id: 'notificaciones', label: 'Preferencias', icon: <Bell size={16} />, sub: 'Alertas del sistema' },
    { id: 'dispositivo', label: 'Periféricos', icon: <Smartphone size={16} />, sub: 'Lector de códigos' },
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
                label="Correo MiSena" 
                value={profileData.correo} 
                type="email"
                onChange={(e) => setProfileData({...profileData, correo: e.target.value})}
              />
              <InputGroup 
                label="Cargo / Rol" 
                value={profileData.cargo} 
                onChange={(e) => setProfileData({...profileData, cargo: e.target.value})}
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
              <InputGroup 
                label="Nueva Contraseña" 
                type="password" 
                value={securityData.newPassword}
                onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
              />
              <InputGroup 
                label="Confirmar Nueva Contraseña" 
                type="password" 
                value={securityData.confirmPassword}
                onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
        );

      case 'notificaciones':
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Preferencias de Operación</p>
            <ToggleGroup 
              label="Confirmación Sonora" 
              sub="Emitir sonido al escanear exitosamente" 
              active={prefs.sonido} 
              onToggle={() => setPrefs({...prefs, sonido: !prefs.sonido})}
              icon={<Volume2 size={16} />}
            />
            <ToggleGroup 
              label="Alertas de Ocupación" 
              sub="Notificar cuando el nivel supere el 80%" 
              active={prefs.alertasOcupacion} 
              onToggle={() => setPrefs({...prefs, alertasOcupacion: !prefs.alertasOcupacion})}
              icon={<LayoutGrid size={16} />}
            />
            <ToggleGroup 
              label="Notificaciones Críticas" 
              sub="Alertar sobre fallos en periféricos o sistema" 
              active={prefs.notificacionesCriticas} 
              onToggle={() => setPrefs({...prefs, notificacionesCriticas: !prefs.notificacionesCriticas})}
              icon={<Shield size={16} />}
            />
            <ToggleGroup 
              label="Actualización Automática" 
              sub="Sincronizar datos en tiempo real cada 30s" 
              active={prefs.autoRefresh} 
              onToggle={() => setPrefs({...prefs, autoRefresh: !prefs.autoRefresh})}
              icon={<RotateCcw size={16} />}
            />
          </div>
        );

      case 'dispositivo':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-6 rounded-2xl text-center mb-6">
               <div className="w-16 h-16 bg-[#39B000]/10 text-[#39B000] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#39B000]/20">
                 <Smartphone size={32} />
               </div>
               <p className="text-xs font-bold text-[#012E25] dark:text-white uppercase tracking-widest">Lector QR Institucional</p>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Conectado vía USB • Puerto {peripherals.scannerPort}</p>
             </div>
             <div className="grid grid-cols-2 gap-4 max-w-md">
                <InputGroup 
                  label="Puerto COM" 
                  value={peripherals.scannerPort} 
                  onChange={(e) => setPeripherals({...peripherals, scannerPort: e.target.value})}
                />
                <InputGroup 
                  label="Baud Rate" 
                  value={peripherals.baudRate} 
                  onChange={(e) => setPeripherals({...peripherals, baudRate: e.target.value})}
                />
             </div>
             <div className="mt-4">
               <ToggleGroup 
                  label="Conexión Automática" 
                  sub="Reconectar periférico al iniciar sesión" 
                  active={peripherals.autoConnect} 
                  onToggle={() => setPeripherals({...peripherals, autoConnect: !peripherals.autoConnect})}
                />
             </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Menú de Configuración */}
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

        <div className="bg-[#012E25] rounded-xl p-6 text-white relative overflow-hidden shadow-lg shadow-[#012E25]/20">
           <div className="absolute top-0 right-0 w-20 h-20 bg-[#39B000]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
           <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-3">Asistencia</p>
           <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Headphones className="w-4 h-4 text-[#39B000]" />
              </div>
              <div>
                <p className="text-[10px] font-bold">Soporte Técnico</p>
                <p className="text-[9px] text-white/50">Lunes a Viernes</p>
              </div>
           </div>
        </div>
      </div>

      {/* Formulario de Configuración */}
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

interface ToggleGroupProps {
  label: string;
  sub: string;
  active: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}

const ToggleGroup: React.FC<ToggleGroupProps> = ({ label, sub, active, onToggle, icon }) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 cursor-pointer hover:border-[#39B000]/30 transition-all group"
  >
    <div className="flex items-center gap-4">
      {icon && (
        <div className={`p-2 rounded-lg transition-all ${active ? 'bg-[#39B000]/10 text-[#39B000]' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-[#012E25] dark:text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
      </div>
    </div>
    <div className={`
      w-10 h-5 rounded-full relative p-0.5 transition-all duration-300
      ${active ? 'bg-[#39B000]' : 'bg-gray-200 dark:bg-white/10'}
    `}>
      <div className={`
        w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform
        ${active ? 'translate-x-5' : 'translate-x-0'}
      `} />
    </div>
  </div>
);

const LayoutGrid: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

