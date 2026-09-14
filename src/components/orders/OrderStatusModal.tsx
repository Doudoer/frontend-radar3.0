import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface OrderStatusModalProps {
  order: any;
  onClose: () => void;
  onConfirm: (id: number, status: string, description: string, claimReason?: string) => Promise<void>;
}

const VALID_STATUSES = [
  'Cotización',
  'Pagado',
  'En Preparación',
  'Listo para Despacho',
  'Listo para Retiro',
  'En Camino',
  'Entregado',
  'Reclamo',
  'Cancelado',
  'Reembolsado',
  'Archivado'
];

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  order,
  onClose,
  onConfirm
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status || 'Cotización');
  const [description, setDescription] = useState<string>('');
  const [claimReason, setClaimReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsSubmitting(true);
    try {
      await onConfirm(order.id, selectedStatus, description, claimReason);
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white">Actualizar Estatus de Orden</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Nuevo Estatus
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              {VALID_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {selectedStatus === 'Reclamo' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Motivo del Reclamo (Obligatorio)</span>
              </label>
              <textarea
                required
                rows={2}
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="Describe el motivo del reclamo o problema con la pieza..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Observaciones u Notas Internas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre el cambio de estado (opcional)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambio'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
