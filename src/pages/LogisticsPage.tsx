import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, Copy, ListFilter, User, ExternalLink, Package, MapPin, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';

interface LogisticsList {
  id: number;
  name: string;
  operator_name: string;
  item_count: number;
  found_count: number;
  language: string;
  secure_hash: string;
  created_at: string;
}

const LogisticsPage: React.FC = () => {
  const [lists, setLists] = useState<LogisticsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    operator_id: '',
    language: 'es',
    order_ids: [] as number[]
  });

  const fetchLists = async () => {
    try {
      const resp = await api.get('/logistics');
      setLists(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const resp = await api.get('/users');
      setOperators((resp.data || []).filter((u: any) => u.role === 'operator' || u.role === 'admin'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      // Fetch active orders (backend defaults to status != 'Archivado')
      const resp = await api.get('/orders', { params: { limit: 100 } });
      const orders = Array.isArray(resp.data) ? resp.data : resp.data.data || resp.data.orders || [];
      const filtered = orders.filter((o: any) => {
        const isActive = !['Archivado', 'Cancelado', 'Entregado', 'entregada'].includes(o.status);
        const hasShipping = Boolean(o.shipping_toggle) || (o.shipping_address && String(o.shipping_address).trim().length > 0);
        return isActive && hasShipping;
      });
      setAvailableOrders(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLists();
    fetchOperators();
    fetchAvailableOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.order_ids.length === 0) {
      toast.error('Selecciona al menos una orden');
      return;
    }
    try {
      await api.post('/logistics', formData);
      setShowModal(false);
      fetchLists();
      setFormData({ name: '', operator_id: '', language: 'es', order_ids: [] });
      toast.success('Ruta logística creada correctamente');
    } catch (err) {
      toast.error('Error al crear la lista');
    }
  };

  const copyPublicLink = (hash: string) => {
    const link = `${window.location.origin}/track/${hash}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace de seguimiento copiado al portapapeles');
  };

  const shareWhatsApp = (list: LogisticsList) => {
    const link = `${window.location.origin}/track/${list.secure_hash}`;
    const message = `Hola ${list.operator_name || 'Operador'}, aquí tienes la ruta de hoy "${list.name}": ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Logística y Rutas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Organiza órdenes en rutas de entrega y asigna operadores.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ListFilter size={18} />
          Crear Nueva Lista
        </button>
      </div>

      <div className="grid-responsive">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '200px' }} />)
        ) : (
          (lists || []).map(list => (
            <motion.div 
              key={list.id} 
              className="glass-card" 
              whileHover={{ y: -5 }}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <Truck size={24} color="#3b82f6" />
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem' }}>
                  {list.language.toUpperCase()}
                </div>
              </div>

              <div>
                <h3 className="font-outfit" style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{list.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <User size={14} />
                <span>Op: {list.operator_name || 'Sin asignar'}</span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Progreso de Ruta</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: Number(list.found_count) === Number(list.item_count) ? '#10b981' : 'var(--text-main)' }}>
                    {list.found_count || 0} / {list.item_count}
                  </p>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Number(list.found_count || 0) / Number(list.item_count)) * 100}%` }}
                    style={{ 
                      height: '100%', 
                      background: Number(list.found_count) === Number(list.item_count) ? '#10b981' : 'var(--gradient-primary)' 
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => shareWhatsApp(list)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}
                  title="Compartir por WhatsApp"
                >
                  <MessageSquare size={18} color="#25D366" />
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => copyPublicLink(list.secure_hash)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                  <Copy size={14} /> Link
                </button>
                <a href={`/track/${list.secure_hash}`} className="btn btn-primary" style={{ padding: '0.5rem' }} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={18} />
                </a>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {!loading && (lists || []).length === 0 && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No hay rutas de logística activas.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Comenzar primera ruta</button>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Crear Nueva Ruta de Logística" maxWidth="600px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Nombre de la Ruta</label>
                <input 
                  className="input-field" 
                  placeholder="Ej: Ruta Norte - Lunes" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Chofer / Operador</label>
                  <select 
                    className="input-field" 
                    required 
                    value={formData.operator_id} 
                    onChange={e => setFormData({...formData, operator_id: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Idioma de la Lista</label>
                  <select 
                    className="input-field" 
                    value={formData.language} 
                    onChange={e => setFormData({...formData, language: e.target.value})}
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="label" style={{ marginBottom: 0 }}>Seleccionar Órdenes</label>
                  {availableOrders.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        if (formData.order_ids.length === availableOrders.length) setFormData({...formData, order_ids: []});
                        else setFormData({...formData, order_ids: availableOrders.map(o => o.id)});
                      }}
                      style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {formData.order_ids.length === availableOrders.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                    </button>
                  )}
                </div>
                <div className="glass-card" style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {availableOrders.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Package size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.2 }} />
                      <p style={{ fontSize: '0.875rem' }}>No hay órdenes con envío configurado.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {availableOrders.map(o => (
                        <div 
                          key={o.id} 
                          onClick={() => {
                            if (formData.order_ids.includes(o.id)) setFormData({...formData, order_ids: formData.order_ids.filter(id => id !== o.id)});
                            else setFormData({...formData, order_ids: [...formData.order_ids, o.id]});
                          }}
                          style={{ 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            background: formData.order_ids.includes(o.id) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                            border: formData.order_ids.includes(o.id) ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={formData.order_ids.includes(o.id)}
                            readOnly
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.order_code}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.brand} {o.model}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                              <User size={12} />
                              <span>{o.first_name || o.customer_name || 'Cliente'} {o.last_name || ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#10b981' }}>
                              <MapPin size={12} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                {o.shipping_address || 'Recogida en Tienda'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear Lista</button>
              </div>
        </form>
      </Modal>
    </div>
  );
};

export default LogisticsPage;
