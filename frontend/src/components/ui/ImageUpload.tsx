import React, { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { subirImagen } from '../../services/upload.service';

interface Props {
  /** URL actual de la imagen (puede venir del servidor) */
  value: string;
  /** Callback que devuelve la URL pública tras subir */
  onChange: (url: string) => void;
  /** Texto del label */
  label?: string;
  /** Mensaje de error a mostrar */
  error?: string;
  /** Texto pequeño debajo del label */
  hint?: string;
  /** Alto del preview (px) */
  previewHeight?: number;
  /** Texto del placeholder cuando no hay imagen */
  placeholder?: string;
}

/**
 * Componente de carga de imagen con preview.
 * Sube directamente a Cloudinary y devuelve la URL segura.
 */
export const ImageUpload: React.FC<Props> = ({
  value,
  onChange,
  label,
  error,
  hint,
  previewHeight = 160,
  placeholder = 'Click para subir imagen',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErrorLocal(null);
    setSubiendo(true);
    try {
      const url = await subirImagen(file);
      onChange(url);
    } catch (e: any) {
      setErrorLocal(e?.message || 'Error al subir imagen');
    } finally {
      setSubiendo(false);
    }
  };

  const onPick = () => {
    if (subiendo) return;
    inputRef.current?.click();
  };

  const onClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const errMsg = error || errorLocal;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      {hint && <p className="text-[11px] text-slate-500 ml-1">{hint}</p>}

      <button
        type="button"
        onClick={onPick}
        disabled={subiendo}
        className={`relative w-full rounded-xl border-2 border-dashed overflow-hidden transition-all flex items-center justify-center
          ${errMsg ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-slate-50 hover:border-[#39A900] hover:bg-emerald-50'}
          ${subiendo ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
        style={{ height: previewHeight }}
      >
        {value ? (
          <>
            <img src={value} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-bold uppercase tracking-widest">Cambiar</span>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 bg-white/95 rounded-full p-1.5 shadow-md hover:bg-rose-100"
              title="Quitar imagen"
            >
              <X size={14} className="text-rose-600" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
            {subiendo ? (
              <>
                <Loader2 size={28} className="animate-spin text-[#39A900]" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={28} />
                <span className="text-xs font-bold uppercase tracking-widest">{placeholder}</span>
                <span className="text-[10px] text-slate-400">JPG / PNG · máx 8 MB</span>
              </>
            )}
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {errMsg && <p className="text-[11px] font-semibold text-rose-600 ml-1">{errMsg}</p>}
    </div>
  );
};
