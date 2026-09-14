import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface CustomerNotificationModalProps {
  order: any;
  onClose: () => void;
  onSend: (orderId: number, data: any) => Promise<void>;
}

export const CustomerNotificationModal: React.FC<CustomerNotificationModalProps> = ({
  order,
  onClose,
  onSend
}) => {
  const [message, setMessage] = useState<string>('');
  const [customerResponse, setCustomerResponse] = useState<string>('');
  const [contactChannel, setContactChannel] = useState<string>('WhatsApp');
  const [contactReason, setContactReason] = useState<string>('Seguimiento de Orden');
  const [contactResult, setContactResult] = useState<string>('Contactado');
  const [nextAction, setNextAction] = useState<string>('');
  const [nextActionAt, setNextActionAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await onSend(order.id, {
        message,
        customer_response: customerResponse,
        contact_channel: contactChannel,
        contact_reason: contactReason,
        contact_result: contactResult,
        next_action: nextAction,
        next_action_at: nextActionAt || null
      });
      onClose();
    } catch (err) {
      console.error('Error sending customer notification:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Registrar Comunicación con Cliente</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Canal de Contacto
              </label>
              <select
                value={contactChannel}
                onChange={(e) => setContactChannel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="SMS">SMS</option>
                <option value="Email">Correo Electrónico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Resultado de Contacto
              </label>
              <select
                value={contactResult}
                onChange={(e) => setContactResult(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="Contactado">Contactado Exitosamente</option>
                <option value="Sin Respuesta">Sin Respuesta / Buzón</option>
                <option value="Mensaje Enviado">Mensaje Enviado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Motivo del Contacto
            </label>
            <input
              type="text"
              value={contactReason}
              onChange={(e) => setContactReason(e.target.value)}
              placeholder="Motivo del contacto..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Mensaje Enviado al Cliente
            </label>
            <textarea
              required
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detalle del mensaje enviado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Respuesta u Observación del Cliente
            </label>
            <textarea
              rows={2}
              value={customerResponse}
              onChange={(e) => setCustomerResponse(e.target.value)}
              placeholder="Qué respondió el cliente..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Siguiente Acción Requerida
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Ej. Volver a llamar, Enviar guía..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Fecha/Hora Siguiente Acción
              </label>
              <input
                type="datetime-local"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Registrar Comunicación'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
