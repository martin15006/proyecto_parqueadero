import React, { useState } from 'react';
import api from './api/axios';
import { UserPlus, Mail, Lock, Phone, User, Camera, GraduationCap, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Componente de Registro Profesional.
 * Interfaz moderna para el alta de nuevos usuarios (Aprendices, Operativos, Admin).
 * FEATURE: Validación de campos, selección de roles y diseño responsivo.
 */
const Registro: React.FC = () => {
  const [formData, setFormData] = useState({
    documento: '',
    fotoPersona: '',
    nombreCompleto: '',
    numTelf: '',
    contactoEmerg: '',
    correo: '',
    contra: '',
    idFormacion: '',
  });

  const [status, setStatus] = useState<{ msg: string; tipo: 'error' | 'success' | null }>({ msg: '', tipo: null });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: 'Procesando registro...', tipo: null });
    try {
      const payload: {
        documento: string;
        fotoPersona: string;
        nombreCompleto: string;
        numTelf: string;
        contactoEmerg: string;
        correo: string;
        contra: string;
        idFormacion?: string;
      } = {
        documento: formData.documento,
        fotoPersona: formData.fotoPersona,
        nombreCompleto: formData.nombreCompleto,
        numTelf: formData.numTelf,
        contactoEmerg: formData.contactoEmerg,
        correo: formData.correo,
        contra: formData.contra,
      };

      const idFormacionTrim = formData.idFormacion?.trim();
      if (idFormacionTrim) {
        payload.idFormacion = idFormacionTrim;
      }

      await api.post('/usuarios', payload);
      setStatus({ msg: '¡Usuario registrado con éxito! Ya puedes iniciar sesión.', tipo: 'success' });
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      // REFACTOR: Extraer mensaje de error de forma robusta soportando arrays de validación
      let mensajeError = 'No se pudo completar el registro';
      
      if (error.message) {
        if (Array.isArray(error.message)) {
          mensajeError = error.message.join(', ');
        } else {
          mensajeError = error.message;
        }
      }
      
      setStatus({ msg: `Error: ${mensajeError}`, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen min-h-screen bg-[#F4F7F6] flex items-center justify-center p-6 font-sans selection:bg-[#39A900]/20">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-2xl border border-black/5 shadow-xl relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -top-28 -right-24 w-72 h-72 bg-[#39A900]/16 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#007832]/10 rounded-full blur-3xl"></div>

        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#39A900] rounded-2xl shadow-xl shadow-[#39A900]/25 mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#232323] tracking-tight">Registro de Usuario</h1>
          <p className="mt-2 text-[#232323]/70 font-semibold uppercase tracking-[0.2em] text-[10px]">Crea tu cuenta institucional</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Documento */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="documento" placeholder="Documento de Identidad" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* Nombre Completo */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="nombreCompleto" placeholder="Nombre Completo" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* Correo */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="correo" type="email" placeholder="Correo Electrónico" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* Contraseña */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input 
                name="contra" 
                type="password" 
                placeholder="Contraseña" 
                onChange={handleChange} 
                required 
                className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" 
              />
              <p className="mt-1 text-[8px] text-black/45 font-semibold px-2 uppercase tracking-tighter">
                Mínimo 8 caracteres, una mayúscula, un número y un carácter especial
              </p>
            </div>

            {/* Teléfono */}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="numTelf" placeholder="Número de Teléfono" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* Contacto Emergencia */}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="contactoEmerg" placeholder="Contacto de Emergencia" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* URL Foto */}
            <div className="relative group md:col-span-2">
              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input name="fotoPersona" placeholder="URL de Fotografía (Cloudinary/Avatar)" onChange={handleChange} required className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40" />
            </div>

            {/* Ficha Formación */}
            <div className="relative group">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 group-focus-within:text-[#39A900] transition-colors" />
              <input
                name="idFormacion"
                placeholder="Ficha de Formación (7 dígitos, opcional)"
                inputMode="numeric"
                maxLength={7}
                onChange={handleChange}
                className="w-full bg-white border border-black/10 text-[#232323] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] outline-none text-sm transition-all placeholder:text-black/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#39A900] hover:bg-[#007832] text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#39A900]/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar Nuevo Usuario'}
            </button>
            
            <a href="/login" className="flex items-center justify-center gap-2 text-[10px] font-black text-black/45 hover:text-[#39A900] uppercase tracking-widest transition-colors">
              <ArrowLeft className="w-3 h-3" />
              ¿Ya tienes cuenta? Inicia sesión aquí
            </a>
          </div>
        </form>

        {status.msg && (
          <div className={`mt-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border animate-in fade-in slide-in-from-top-2 ${
            status.tipo === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500'
          }`}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default Registro;
