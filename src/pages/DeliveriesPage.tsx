import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, MapPin, Package, User, CheckCircle, Clock, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

import Modal from '../components/Modal';

interface Delivery {
  id: number;
  delivery_code: string;
  driver_name: string;
  receiver_name: string;
  delivery_address: string;
  status: 'Pending' | 'On Route' | 'Delivered' | 'Failed';
  order_count: number;
  created_at: string;
}

const DeliveriesPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    driver_id: '',
    receiver_name: '',
    delivery_address: '',
    notes: '',
    order_ids: [] as number[]
  });

  useEffect(() => {
    fetchDeliveries();
    fetchDrivers();
    fetchAvailableOrders();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const resp = await api.get('/deliveries');
      setDeliveries(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const resp = await api.get('/users');
      setDrivers(resp.data.filter((u: any) => u.role === 'operator' || u.role === 'admin'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const resp = await api.get('/orders', { params: { status: 'Listo para Recoger' } });
      // Corrected: Accessing the .data property of the paginated response
      setOrders(Array.isArray(resp.data) ? resp.data : resp.data.data || resp.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/deliveries', formData);
      setShowModal(false);
      fetchDeliveries();
      setFormData({ driver_id: '', receiver_name: '', delivery_address: '', notes: '', order_ids: [] });
      toast.success('Envío creado correctamente');
    } catch (err) {
      toast.error('Error al crear envío');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': return <CheckCircle size={16} color="#10b981" />;
      case 'On Route': return <Truck size={16} color="#3b82f6" />;
      case 'Failed': return <XCircle size={16} color="#ef4444" />;
      default: return <Clock size={16} color="#f59e0b" />;
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/deliveries/${id}/status`, { status });
      fetchDeliveries();
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  const shareWhatsApp = (d: Delivery) => {
    const text = `Hola ${d.receiver_name}, tu pedido ${d.delivery_code} está en camino con el equipo de RADAR. Dirección: ${d.delivery_address}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Despacho y Envíos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión de choferes y entregas a domicilio.</p>
        </div>
        <div className="page-header-actions">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={18} />
          Nuevo Despacho
        </button>
        </div>
      </div>

      <div className="glass-card data-table-wrap" style={{ overflowY: 'hidden' }}>
        <table className="data-table" style={{ textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1.25rem' }}>Código</th>
              <th style={{ padding: '1.25rem' }}>Chofer</th>
              <th style={{ padding: '1.25rem' }}>Destino</th>
              <th style={{ padding: '1.25rem' }}>Items</th>
              <th style={{ padding: '1.25rem' }}>Estado</th>
              <th style={{ padding: '1.25rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="skeleton" style={{ height: '60px' }} /></tr>)
            ) : (deliveries || []).map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{d.delivery_code}</td>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} color="var(--text-secondary)" />
                    {d.driver_name || 'Sin asignar'}
                  </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{d.receiver_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={10} /> {typeof d.delivery_address === 'string' ? d.delivery_address.substring(0, 30) : 'Sin dirección'}...
                  </p>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} color="var(--text-secondary)" />
                    {d.order_count} órd.
                  </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    {getStatusIcon(d.status)}
                    {d.status}
                  </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem', color: '#3b82f6' }}
                      title="Marcar En Ruta"
                      aria-label="Marcar envío en ruta"
                      onClick={() => updateStatus(d.id, 'On Route')}
                    >
                      <Truck size={18} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', color: '#10b981' }} 
                      title="Marcar Entregado"
                      aria-label="Marcar envío entregado"
                      onClick={() => updateStatus(d.id, 'Delivered')}
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', color: '#ef4444' }} 
                      title="Marcar Fallido"
                      aria-label="Marcar envío fallido"
                      onClick={() => updateStatus(d.id, 'Failed')}
                    >
                      <XCircle size={18} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', color: '#25D366' }} 
                      title="Notificar WhatsApp"
                      aria-label="Enviar notificación por WhatsApp"
                      onClick={() => shareWhatsApp(d)}
                    >
                      <MessageSquare size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Programar Nuevo Envío" maxWidth="700px">
        <form onSubmit={handleSubmit} className="form-grid-2" style={{ gap: '1.25rem' }}>
          <div>
            <label className="label">Asignar Chofer</label>
            <select className="input-field" required value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
              <option value="">Seleccionar chofer...</option>
              {(drivers || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nombre Receptor</label>
            <input className="input-field" required value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">Dirección de Entrega</label>
            <input className="input-field" required value={formData.delivery_address} onChange={e => setFormData({...formData, delivery_address: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">Seleccionar Órdenes (Listas para Recoger)</label>
            <div className="glass-card" style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.75rem' }}>
              {!orders || orders.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No hay órdenes listas para entrega.</p>
              ) : orders.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                  <input 
                    type="checkbox" 
                    onChange={e => {
                      if (e.target.checked) setFormData({...formData, order_ids: [...formData.order_ids, o.id]});
                      else setFormData({...formData, order_ids: formData.order_ids.filter(id => id !== o.id)});
                    }} 
                  />
                  <span style={{ fontSize: '0.875rem' }}>{o.order_code} - {o.brand} {o.model}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="actions-row" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear Envío</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DeliveriesPage;
