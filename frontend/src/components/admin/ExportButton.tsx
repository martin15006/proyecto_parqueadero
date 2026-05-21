import React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  label: string;
  url: string;
  color: string;
}

/**
 * Botón de Exportación de Datos.
 * FEATURE: Descarga de reportes administrativos (Excel/PDF).
 * API: Consume endpoints de exportación del DashboardController.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ label, url, color }) => {
  const handleExport = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.access_token || user.token;
    
    // FEATURE: Inyectar token en la URL para descargas seguras si es necesario, 
    // o usar fetch con blob si el backend requiere cabeceras.
    // Por simplicidad en este flujo, usamos window.open con el token como query param si el backend lo soporta,
    // pero lo ideal es un fetch con cabeceras de autorización.
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `reporte_${label.toLowerCase()}_${Date.now()}.${label === 'EXCEL' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    })
    .catch(error => console.error('Error exportando datos:', error));
  };

  return (
    <button 
      onClick={handleExport}
      className={`flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 ${color}`}
    >
      <Download size={14} /> {label}
    </button>
  );
};
