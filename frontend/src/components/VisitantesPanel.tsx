import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, LogOut, Clock, X, Car, ShieldCheck } from 'lucide-react';
import { visitasService, type Visita, type RegistrarVisitaPayload } from '../services/visitas.service';
import { useNotification } from '../contexts/NotificationContext';

interface VisitantesPanelProps {
  /** Se invoca tras registrar o cerrar una visita para refrescar los KPIs del panel. */
  onChange?: () => void;
}

const FORM_INICIAL: RegistrarVisitaPayload = {
  nombreVisitante: '',
  documentoVisitante: '',
  placa: '',
  tipoVehiculo: 'Carro',
  motivo: '',
  duracionMinutos: 240,
};

/** Extrae el mensaje real del backend (class-validator envía `message` como array). */
const mensajeDeError = (e: any, fallback: string): string => {
  const raw = e?.response?.data?.message ?? e?.message;
  if (Array.isArray(raw)) {
    const textos = raw.filter((m) => typeof m === 'string' && m.trim());
    if (textos.length) return textos.join(' • ');
  }
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
};

const horaCorta = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const VisitantesPanel: React.FC<VisitantesPanelProps> = ({ onChange }) => {
  const { showNotification } = useNotification();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cerrandoId, setCerrandoId] = useState<number | null>(null);
  const [form, setForm] = useState<RegistrarVisitaPayload>(FORM_INICIAL);

  const cargarActivas = useCallback(async () => {
    try {
      const data = await visitasService.listarActivas();
      setVisitas(data);
    } catch {
      /* fallo silencioso: el panel principal ya reporta errores de conexión */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarActivas();
    // Refresco periódico para detectar visitas vencidas sin recargar la página.
    const t = window.setInterval(cargarActivas, 15000);
    return () => window.clearInterval(t);
  }, [cargarActivas]);

  const abrirModal = () => {
    setForm(FORM_INICIAL);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.nombreVisitante.trim() || !form.documentoVisitante.trim() || !form.placa.trim()) {
      showNotification('Completa nombre, documento y placa', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const creada = await visitasService.registrar({
        ...form,
        nombreVisitante: form.nombreVisitante.trim(),
        documentoVisitante: form.documentoVisitante.trim(),
        placa: form.placa.trim().toUpperCase(),
        motivo: form.motivo?.trim() || undefined,
      });
      showNotification(`Visitante registrado • ${creada.codigo} (${creada.placa})`, 'success');
      setModalOpen(false);
      await cargarActivas();
      onChange?.();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo registrar la visita'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSalida = async (visita: Visita) => {
    if (cerrandoId) return;
    try {
      setCerrandoId(visita.idVisita);
      await visitasService.registrarSalida(visita.idVisita);
      showNotification(`Salida de visitante registrada • ${visita.placa}`, 'success');
      await cargarActivas();
      onChange?.();
    } catch (e) {
      showNotification(mensajeDeError(e, 'No se pudo registrar la salida'), 'error');
    } finally {
      setCerrandoId(null);
    }
  };

  const vencidas = visitas.filter((v) => v.vencida).length;

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Visitantes</h3>
          <p className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest mt-0.5">Registro temporal</p>
        </div>
        <span className="text-[9px] font-bold text-[#39B000] uppercase tracking-widest">
          {visitas.length} activos{vencidas > 0 ? ` • ${vencidas} vencidos` : ''}
        </span>
      </div>

      <button
        onClick={abrirModal}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#39B000]/20 bg-[#39B000]/5 hover:bg-[#39B000]/10 transition-all text-left group mb-4"
      >
        <div className="w-10 h-10 rounded-lg bg-[#39B000]/10 flex items-center justify-center text-[#39B000] group-hover:bg-[#39B000] group-hover:text-white transition-all">
          <UserPlus size={18} />
        </div>
        <div>
          <p className="text-xs font-bold text-[#012E25] dark:text-white">Registrar Visitante</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">Ingreso rápido con placa</p>
        </div>
      </button>

      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading ? (
          Array(2).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />)
        ) : visitas.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-gray-100 dark:border-white/5 rounded-xl">
            <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sin visitantes activos</p>
          </div>
        ) : (
          visitas.map((v) => (
            <div
              key={v.idVisita}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                v.vencida
                  ? 'border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-900/10'
                  : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#012E25] dark:text-white tracking-widest truncate">{v.placa}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{v.codigo}</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{v.nombreVisitante}</p>
                <p className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest mt-0.5 ${v.vencida ? 'text-orange-600 dark:text-orange-400' : 'text-gray-300 dark:text-gray-600'}`}>
                  <Clock size={10} />
                  {v.vencida ? 'Vencido' : `Hasta ${horaCorta(v.expiraEn)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSalida(v)}
                disabled={cerrandoId === v.idVisita}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#012E25] dark:bg-[#39B000] text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-black dark:hover:bg-[#007832] transition-all active:scale-95 disabled:opacity-60"
              >
                <LogOut size={12} />
                {cerrandoId === v.idVisita ? '...' : 'Salida'}
              </button>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] bg-[#012E25]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-[#121212] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#39B000]/10 flex items-center justify-center text-[#39B000]">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#012E25] dark:text-white uppercase tracking-widest">Registrar Visitante</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ingreso temporal</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Campo label="Nombre del visitante">
                <input
                  type="text"
                  value={form.nombreVisitante}
                  onChange={(e) => setForm({ ...form, nombreVisitante: e.target.value })}
                  autoFocus
                  className={inputClass}
                  placeholder="Nombre y apellido"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Documento">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.documentoVisitante}
                    onChange={(e) => setForm({ ...form, documentoVisitante: e.target.value.replace(/[^0-9]/g, '') })}
                    className={inputClass}
                    placeholder="Cédula"
                  />
                </Campo>
                <Campo label="Placa">
                  <input
                    type="text"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                    className={`${inputClass} tracking-widest`}
                    placeholder="ABC123"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Tipo de vehículo">
                  <select
                    value={form.tipoVehiculo}
                    onChange={(e) => setForm({ ...form, tipoVehiculo: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Carro">Carro</option>
                    <option value="Moto">Moto</option>
                    <option value="Bicicleta">Bicicleta</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Campo>
                <Campo label="Duración">
                  <select
                    value={form.duracionMinutos}
                    onChange={(e) => setForm({ ...form, duracionMinutos: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value={120}>2 horas</option>
                    <option value={240}>4 horas</option>
                    <option value={480}>8 horas</option>
                  </select>
                </Campo>
              </div>

              <Campo label="Motivo (opcional)">
                <input
                  type="text"
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  className={inputClass}
                  placeholder="Reunión, entrega, trámite…"
                />
              </Campo>

              <div className="flex items-center gap-2 pt-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-[#39B000]" />
                <Car size={12} />
                Se valida el aforo y queda en auditoría
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded-xl border border-gray-100 dark:border-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#39B000] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#39B000]/20 hover:bg-[#007832] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <UserPlus size={14} />
                  {submitting ? 'Registrando' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const inputClass =
  'w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl focus:bg-white dark:focus:bg-white/10 focus:border-[#39B000] outline-none transition-all text-xs font-bold text-[#012E25] dark:text-white';

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">{label}</label>
    {children}
  </div>
);
