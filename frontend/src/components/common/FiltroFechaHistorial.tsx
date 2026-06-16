import React, { useState } from 'react';
import { CalendarRange } from 'lucide-react';

export type RangoFecha = { desde?: string; hasta?: string };
type Modo = 'todo' | '24h' | 'semana' | 'dia' | 'rango';

const PRESETS: { id: Modo; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: '24h', label: 'Últimas 24 h' },
  { id: 'semana', label: 'Última semana' },
  { id: 'dia', label: 'Día específico' },
  { id: 'rango', label: 'Rango' },
];

const inicioDelDia = (f: string) => new Date(`${f}T00:00:00`).toISOString();
const finDelDia = (f: string) => new Date(`${f}T23:59:59.999`).toISOString();

interface Props {
  onChange: (rango: RangoFecha) => void;
}

export const FiltroFechaHistorial: React.FC<Props> = ({ onChange }) => {
  const [modo, setModo] = useState<Modo>('todo');
  const [dia, setDia] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const seleccionarModo = (m: Modo) => {
    setModo(m);
    if (m === 'todo') onChange({});
    else if (m === '24h') onChange({ desde: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });
    else if (m === 'semana') onChange({ desde: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() });
    else if (m === 'dia') onChange(dia ? { desde: inicioDelDia(dia), hasta: finDelDia(dia) } : {});
    else if (m === 'rango')
      onChange({
        ...(desde ? { desde: inicioDelDia(desde) } : {}),
        ...(hasta ? { hasta: finDelDia(hasta) } : {}),
      });
  };

  const cambiarDia = (v: string) => {
    setDia(v);
    onChange(v ? { desde: inicioDelDia(v), hasta: finDelDia(v) } : {});
  };

  const cambiarRango = (d: string, h: string) => {
    setDesde(d);
    setHasta(h);
    onChange({
      ...(d ? { desde: inicioDelDia(d) } : {}),
      ...(h ? { hasta: finDelDia(h) } : {}),
    });
  };

  const inputCls =
    'px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-[#012E25] dark:text-white outline-none focus:border-[#39A900]';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          <CalendarRange size={12} /> Fecha:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => seleccionarModo(p.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              modo === p.id
                ? 'bg-[#39A900] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {modo === 'dia' && (
        <input type="date" value={dia} onChange={(e) => cambiarDia(e.target.value)} className={inputCls} />
      )}

      {modo === 'rango' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Desde</label>
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => cambiarRango(e.target.value, hasta)}
            className={inputCls}
          />
          <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Hasta</label>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => cambiarRango(desde, e.target.value)}
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
};
