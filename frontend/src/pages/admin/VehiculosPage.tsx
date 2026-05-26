import React, { useEffect, useMemo, useState } from 'react';
import { vehiculosService } from '../../services/vehiculos.service';
import { Search, AlertTriangle, Car, Hash } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { AdminVehiculoItem } from '../../types';

/**
 * Gestión de Vehículos (Admin/Operativo).
 * Permite visualizar y administrar la flota de vehículos registrados.
 */
export const VehiculosPage: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<AdminVehiculoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [soloAdentro, setSoloAdentro] = useState(false);

  const [isEmergenciaOpen, setIsEmergenciaOpen] = useState(false);
  const [placaSeleccionada, setPlacaSeleccionada] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [confirmPlaca, setConfirmPlaca] = useState('');
  const [accionLoading, setAccionLoading] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionOk, setAccionOk] = useState<string | null>(null);

  /**
   * Sincroniza la lista de vehículos desde el backend.
   * Se evita usar logs de consola para no contaminar la demo y se prioriza una notificación visual limpia.
   */
  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      setAccionError(null);
      const res = await vehiculosService.listarVehiculosAdmin({ q: searchTerm.trim() || undefined });
      setVehiculos(res.data || []);
    } catch (error) {
      const maybeAny = error as any;
      const msg = typeof maybeAny?.message === 'string' ? maybeAny.message : 'No se pudo cargar la lista de vehículos';
      setAccionError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchVehiculos();
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const filteredVehiculos = useMemo(() => {
    const base = vehiculos;
    if (!soloAdentro) return base;
    return base.filter((v) => v.isAdentro);
  }, [vehiculos, soloAdentro]);

  const openEmergencia = (placa: string) => {
    setAccionError(null);
    setAccionOk(null);
    setPlacaSeleccionada(placa);
    setMotivo('');
    setConfirmPlaca('');
    setIsEmergenciaOpen(true);
  };

  const confirmarEmergencia = async () => {
    setAccionError(null);
    setAccionOk(null);

    const placa = placaSeleccionada.trim().toUpperCase();
    if (!placa) {
      setAccionError('Selecciona una placa');
      return;
    }
    if (confirmPlaca.trim().toUpperCase() !== placa) {
      setAccionError('La placa de confirmación no coincide');
      return;
    }
    if (motivo.trim().length < 5) {
      setAccionError('El motivo es obligatorio');
      return;
    }

    try {
      setAccionLoading(true);
      await vehiculosService.salidaEmergenciaAdmin({ placa, motivo: motivo.trim() });
      setIsEmergenciaOpen(false);
      setAccionOk('Salida de emergencia registrada');
      await fetchVehiculos();
    } catch (e: any) {
      setAccionError(e?.message || 'No se pudo registrar la salida de emergencia');
    } finally {
      setAccionLoading(false);
    }
  };

  const columns = useMemo(() => ([
    {
      header: 'Vehículo',
      accessor: (v: AdminVehiculoItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-blue-600">
            <Car size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Hash size={14} className="text-blue-600" /> {v.placa}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {typeof v.tipoVehiculo === 'string' ? v.tipoVehiculo : v.tipoVehiculo?.tipoVehiculo || 'N/A'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Color',
      accessor: (v: AdminVehiculoItem) => <span className="text-xs font-bold text-gray-700">{v.color || '—'}</span>,
    },
    {
      header: 'Estado',
      accessor: (v: AdminVehiculoItem) => (
        <Badge variant={v.isAdentro ? 'warning' : 'success'}>
          {v.isAdentro ? 'ADENTRO' : 'AFUERA'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: (v: AdminVehiculoItem) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {v.isAdentro && (
            <button
              type="button"
              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openEmergencia(v.placa);
              }}
              title="Salida de emergencia"
            >
              <AlertTriangle size={16} />
            </button>
          )}
        </div>
      ),
    },
  ]), []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Vehículos</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">RF20 • Control de flota y contingencias</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={soloAdentro ? 'primary' : 'outline'} size="sm" onClick={() => setSoloAdentro((v) => !v)}>
            {soloAdentro ? 'Solo ADENTRO' : 'Todos'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchVehiculos()}>
            Refrescar
          </Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <Input 
          icon={<Search size={20} />}
          placeholder="Buscar por placa o marca/tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {(accionError || accionOk) && (
        <div className={`p-4 rounded-xl border text-xs font-bold uppercase tracking-widest ${
          accionError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {accionError || accionOk}
        </div>
      )}

      <Table
        columns={columns}
        data={filteredVehiculos}
        isLoading={loading}
        emptyMessage="No se encontraron vehículos"
      />

      <Modal
        isOpen={isEmergenciaOpen}
        onClose={() => setIsEmergenciaOpen(false)}
        title="Salida de Emergencia"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsEmergenciaOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmarEmergencia} disabled={accionLoading}>
              {accionLoading ? 'Procesando...' : 'Confirmar salida'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Acción crítica</p>
            <p className="text-sm font-semibold text-red-700 mt-1">
              Esto registrará una salida manual, cerrará el movimiento activo y generará auditoría inmutable.
            </p>
          </div>

          <Input label="Placa" value={placaSeleccionada} disabled />

          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
              Motivo de la salida
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none rounded-2xl px-5 py-4 text-sm font-medium transition-all placeholder:text-gray-400 min-h-[120px]"
              placeholder="Describe claramente el motivo (obligatorio)"
            />
          </div>

          <Input
            label="Confirmación secundaria"
            value={confirmPlaca}
            onChange={(e) => setConfirmPlaca(e.target.value)}
            placeholder="Escribe la placa para confirmar"
          />
        </div>
      </Modal>
    </div>
  );
};
