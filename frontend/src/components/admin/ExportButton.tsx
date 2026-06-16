import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface ExportButtonProps {
  label: string;
  url: string;
  color: string;
  filename?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ label, url, color, filename }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;

    let token: string | undefined;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      token = user.accessToken || user.access_token || user.token;
    } catch {
      token = undefined;
    }

    if (!token) {
      showNotification('Tu sesión expiró. Inicia sesión nuevamente para exportar.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const extension = label === 'EXCEL' ? 'xlsx' : label === 'CSV' ? 'csv' : 'pdf';
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        filename || `reporte_${label.toLowerCase()}_${Date.now()}.${extension}`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      showNotification('No se pudo generar el reporte. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-200 shadow-sm hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${color}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {label}
    </button>
  );
};
