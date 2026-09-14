import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Phone, PhoneOutgoing, User, AlertTriangle, Calendar, Shield, Sparkles, CheckCircle, Package, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../store/AuthContext';

interface CallRecord {
  id: number;
  phone: string;
  contact_name: string;
  description: string;
  is_claim: boolean;
  user_name: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

const CallsPage: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    contact_name: '',
    description: '',
    is_claim: false,
    customer_id: ''
  });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [callToDelete, setCallToDelete] = useState<number | null>(null);

  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isQuickOrder, setIsQuickOrder] = useState(false);
  const [quickOrderData, setQuickOrderData] = useState({
    brand: '', model: '', year: '', product_type: '', product_specs: '', purchase_date: '', description: ''
  });

  const years = Array.from({ length: 2025 - 1990 + 1 }, (_, i) => (2025 - i).toString());

  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const selectedCustomer = customers.find((customer) => String(customer.id) === formData.customer_id);
  const selectedOrder = Array.isArray(customerOrders)
    ? customerOrders.find((order) => String(order.id) === selectedOrderId)
    : undefined;
  const filteredCalls = calls.filter((call) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const dateText = new Date(call.created_at).toLocaleDateString().toLowerCase();
    return (
      (call.contact_name || '').toLowerCase().includes(term) ||
      (call.phone || '').toLowerCase().includes(term) ||
      (call.description || '').toLowerCase().includes(term) ||
      (call.user_name || '').toLowerCase().includes(term) ||
      (call.is_claim ? 'reclamo' : 'seguimiento').includes(term) ||
      dateText.includes(term)
    );
  });

  useEffect(() => {
    fetchCalls();
    fetchCustomers();
  }, []);

  const fetchCalls = async () => {
    try {
      const resp = await api.get('/calls');
      setCalls(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const resp = await api.get('/customers');
      setCustomers(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomerOrders = async (cid: string) => {
    if (!cid) {
      setCustomerOrders([]);
      return;
    }
    try {
      const resp = await api.get('/orders', { params: { customer_id: cid } });
      setCustomerOrders(Array.isArray(resp.data?.data) ? resp.data.data : Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error('Error fetching customer orders');
      setCustomerOrders([]);
    }
  };

  const fetchMakes = async () => {
    if (makes.length > 0) return;
    setLoadingMakes(true);
    try {
      const resp = await api.get('/vin/makes');
      setMakes(resp.data);
    } catch (err) {
      console.error('Error fetching makes');
    } finally {
      setLoadingMakes(false);
    }
  };

  const fetchModels = async (make: string, year: string) => {
    if (!make || !year) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    try {
      const resp = await api.get(`/vin/models/${make}/${year}`);
      setModels(resp.data);
    } catch (err) {
      console.error('Error fetching models');
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleQuickYearChange = (val: string) => {
    setQuickOrderData(prev => ({ ...prev, year: val, brand: '', model: '' }));
    setModels([]);
    if (val.length >= 4) fetchMakes();
  };

  const handleQuickBrandChange = (val: string) => {
    setQuickOrderData(prev => ({ ...prev, brand: val, model: '' }));
    if (quickOrderData.year) fetchModels(val, quickOrderData.year);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: If it's a claim, we need a target
    if (formData.is_claim && !isQuickOrder && !selectedOrderId) {
      toast.error('Debes seleccionar una orden para vincular el reclamo.');
      return;
    }

    try {
      // 1. If it's a claim, handle the order/claim creation first
      let finalOrderId = selectedOrderId;

      if (formData.is_claim) {
        if (isQuickOrder) {
          // Create Quick Order
          const orderResp = await api.post('/orders', {
            ...quickOrderData,
            customer_id: formData.customer_id || null,
            status: 'reclamo',
            claim_reason: formData.description,
            price: 0,
            core_fee: 0,
            down_payment: 0
          });
          finalOrderId = orderResp.data.id;
        } else if (selectedOrderId) {
          // Update existing order status to reclamo
          await api.patch(`/orders/${selectedOrderId}/status`, { 
            status: 'reclamo', 
            claim_reason: formData.description 
          });
        }
      }

      // 2. Register Call
      try {
        await api.post('/calls', { ...formData, order_id: finalOrderId });
      } catch (callErr) {
        toast.error('La orden se creó pero falló el registro de la llamada');
        throw callErr;
      }
      
      setShowModal(false);
      setFormStep(1);
      fetchCalls();
      toast.success('Llamada registrada correctamente');
      
      // Reset form
      setFormData({ phone: '', contact_name: '', description: '', is_claim: false, customer_id: '' });
      setIsQuickOrder(false);
      setSelectedOrderId('');
      setQuickOrderData({ brand: '', model: '', year: '', product_type: '', product_specs: '', purchase_date: '', description: '' });
      
    } catch (err: any) {
      if (err.response?.config?.url?.includes('/orders')) {
        toast.error('Error al crear la orden de reclamo');
      } else if (!err.response?.config?.url?.includes('/calls')) {
        toast.error('Error al procesar el reclamo');
      }
      console.error(err);
    }
  };

  const handleSummarize = async () => {
    if (!formData.description || formData.description.length < 10) {
      toast.error('El texto es demasiado corto para resumir.');
      return;
    }

    setIsSummarizing(true);
    try {
      const resp = await api.post('/ai/summarize', { text: formData.description });
      setFormData(prev => ({ ...prev, description: resp.data.summary }));
      toast.success('Resumen generado con éxito');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al conectar con el servicio de IA');
    } finally {
      setIsSummarizing(false);
    }
  };

  const canDeleteCalls = user?.role?.toLowerCase() === 'admin';

  const handleDeleteCall = async (callId: number) => {
    if (!canDeleteCalls) return;

    try {
      await api.delete(`/calls/${callId}`);
      if (selectedCall?.id === callId) {
        setSelectedCall(null);
      }
      toast.success('Llamada eliminada correctamente');
      fetchCalls();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo eliminar la llamada');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Registro de Llamadas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Historial de interacciones telefónicas y prospectos.</p>
        </div>
        <div className="page-header-actions">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PhoneOutgoing size={18} />
          Registrar Llamada
        </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por contacto, teléfono, descripción, operador o fecha..."
          style={{ border: 'none', background: 'transparent', padding: '0.45rem' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-responsive">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '180px' }} />)
        ) : (
          filteredCalls.map(call => (
            <motion.div 
              key={call.id} 
              className="glass-card" 
              whileHover={{ y: -5 }}
              onClick={() => setSelectedCall(call)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCall(call);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Ver detalle de llamada ${call.id}`}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: call.is_claim ? '4px solid var(--danger)' : '1px solid var(--glass-border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '12px' }}>
                  <Phone size={20} color={call.is_claim ? 'var(--danger)' : 'var(--primary)'} />
                </div>
                {call.is_claim && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 700 }}>
                    <AlertTriangle size={14} /> RECLAMO
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-outfit" style={{ marginBottom: '0.25rem' }}>{call.contact_name || 'Anónimo'}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{call.phone}</p>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                "{call.description}"
              </p>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={12} /> {call.user_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={12} /> {new Date(call.created_at).toLocaleDateString()}
                </div>
              </div>

              {canDeleteCalls && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCallToDelete(call.id);
                    }}
                    style={{ padding: '0.35rem', color: 'var(--danger)' }}
                    title="Eliminar llamada"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <p style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tocar para ver detalle
              </p>
            </motion.div>
          ))
        )}
      </div>

      {!loading && filteredCalls.length === 0 && (
        <div className="glass-card" style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No se encontraron llamadas con ese criterio de búsqueda.
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setFormStep(1); }} title={`Registrar Llamada - Paso ${formStep} de 2`} maxWidth="980px">
        <div className="wizard-experience">
          <div className="actions-row" style={{ marginBottom: '2.5rem' }}>
            {[1, 2].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setFormStep(step)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  opacity: formStep === step ? 1 : 0.6,
                  transition: 'all 0.3s'
                }}
              >
                <div
                  style={{
                    height: '4px',
                    borderRadius: '10px',
                    background: formStep >= step ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                    marginBottom: '0.5rem'
                  }}
                />
                <span style={{ fontSize: '0.65rem', color: formStep >= step ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {step === 1 ? '1. Contacto' : '2. Seguimiento'}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {formStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-grid-sidebar"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(51, 102, 255, 0.1)', color: 'var(--accent-primary)' }}><Phone size={20} /></div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Datos de Contacto</h3>
                      </div>

                      <div className="form-grid-2" style={{ gap: '1.25rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="label">Teléfono</label>
                          <input className="input-field" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div>
                          <label className="label">Nombre de Contacto</label>
                          <input className="input-field" placeholder="Ej: Juan Pérez" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
                        </div>
                        <div>
                          <label className="label">Cliente Existente (Opcional)</label>
                          <select
                            className="input-field"
                            value={formData.customer_id}
                            onChange={e => {
                              const selectedId = e.target.value;
                              const customer = customers.find(c => c.id.toString() === selectedId);
                              setFormData(prev => ({
                                ...prev,
                                customer_id: selectedId,
                                contact_name: customer ? `${customer.first_name} ${customer.last_name || ''}`.trim() : prev.contact_name,
                                phone: customer && customer.phone ? customer.phone : prev.phone
                              }));
                              if (selectedId) fetchCustomerOrders(selectedId);
                            }}
                          >
                            <option value="">Vincular a cliente...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: formData.is_claim ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: formData.is_claim ? '#ef4444' : '#10b981' }}><Shield size={20} /></div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Clasificación de la Interacción</h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <input type="checkbox" id="call_is_claim" checked={formData.is_claim} onChange={e => setFormData({...formData, is_claim: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                        <label htmlFor="call_is_claim" style={{ fontWeight: 600, cursor: 'pointer' }}>¿Esta llamada debe tratarse como reclamo?</label>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--gradient-primary)', borderRadius: '20px', padding: '1.75rem', color: 'white', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 20px 40px rgba(51, 102, 255, 0.3)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}><CheckCircle size={20} /> Resumen Inicial</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Teléfono</p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '1.1rem', fontWeight: 800 }}>{formData.phone || 'Sin capturar'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Contacto</p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>{formData.contact_name || 'Sin nombre'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Modo</p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>{formData.is_claim ? 'Reclamo' : 'Seguimiento general'}</p>
                      </div>
                    </div>
                    <button type="button" className="btn" disabled={!formData.phone.trim()} onClick={() => setFormStep(2)} style={{ background: 'white', color: '#3366ff', border: 'none', width: '100%', marginTop: '2rem', height: '54px', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      Continuar a Seguimiento
                    </button>
                    <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '1rem', opacity: 0.7 }}>Primero capturamos contacto; luego notas y gestión operativa.</p>
                  </div>
                </motion.div>
              )}

              {formStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-grid-sidebar"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {formData.is_claim && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
                        {!formData.customer_id ? (
                          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                            <AlertTriangle size={24} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>Se requiere vincular un cliente</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Selecciona un cliente en el paso anterior para habilitar las opciones de reclamo.</p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.95rem', margin: 0 }}>
                                <Shield size={16} /> Configuración del Reclamo
                              </h4>
                              <button
                                type="button"
                                className={`btn ${isQuickOrder ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setIsQuickOrder(!isQuickOrder)}
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                              >
                                {isQuickOrder ? 'Vincular a Orden Existente' : 'Crear Orden Rápida'}
                              </button>
                            </div>

                            {isQuickOrder ? (
                              <div className="form-grid-2">
                                <div>
                                  <label className="label">Año</label>
                                  <select className="input-field" required value={quickOrderData.year} onChange={e => handleQuickYearChange(e.target.value)}>
                                    <option value="">Seleccionar año...</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="label">Marca {loadingMakes && <span style={{fontSize: '0.7rem', color: 'var(--accent-primary)'}}>(Cargando...)</span>}</label>
                                  <select className="input-field" required disabled={!quickOrderData.year} value={quickOrderData.brand} onChange={e => handleQuickBrandChange(e.target.value)}>
                                    <option value="">Seleccionar marca...</option>
                                    {makes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="label">Modelo {loadingModels && <span style={{fontSize: '0.7rem', color: 'var(--accent-primary)'}}>(Cargando...)</span>}</label>
                                  <select className="input-field" required disabled={!quickOrderData.brand} value={quickOrderData.model} onChange={e => setQuickOrderData({...quickOrderData, model: e.target.value})}>
                                    <option value="">Seleccionar modelo...</option>
                                    {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="label">Día de Compra</label>
                                  <input className="input-field" type="date" required value={quickOrderData.purchase_date} onChange={e => setQuickOrderData({...quickOrderData, purchase_date: e.target.value})} />
                                </div>
                                <div style={{ gridColumn: quickOrderData.product_type === 'Engine' || quickOrderData.product_type === 'Transmission' ? 'span 1' : 'span 2' }}>
                                  <label className="label">Tipo de Pieza / Producto</label>
                                  <select className="input-field" required value={quickOrderData.product_type} onChange={e => setQuickOrderData({...quickOrderData, product_type: e.target.value, product_specs: ''})}>
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="Engine">Motor (Engine)</option>
                                    <option value="Transmission">Transmisión</option>
                                    <option value="Transfer Case">Transfer Case</option>
                                    <option value="Differential">Diferencial</option>
                                  </select>
                                </div>

                                {quickOrderData.product_type === 'Engine' && (
                                  <div>
                                    <label className="label">Litraje (Engine Size)</label>
                                    <input className="input-field" placeholder="Ej: 5.3L..." required value={quickOrderData.product_specs} onChange={e => setQuickOrderData({...quickOrderData, product_specs: e.target.value})} />
                                  </div>
                                )}

                                {quickOrderData.product_type === 'Transmission' && (
                                  <div>
                                    <label className="label">Tracción (Drivetrain)</label>
                                    <select className="input-field" required value={quickOrderData.product_specs} onChange={e => setQuickOrderData({...quickOrderData, product_specs: e.target.value})}>
                                      <option value="">Seleccionar...</option>
                                      <option value="FWD">FWD</option>
                                      <option value="RWD">RWD</option>
                                      <option value="AWD">AWD</option>
                                      <option value="4x4">4x4</option>
                                    </select>
                                  </div>
                                )}

                                <div style={{ gridColumn: 'span 2' }}>
                                  <label className="label">Descripción de la Pieza (Venta)</label>
                                  <textarea className="input-field" rows={2} placeholder="Detalles de la pieza vendida..." value={quickOrderData.description} onChange={e => setQuickOrderData({...quickOrderData, description: e.target.value})} />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="label">Seleccionar Orden de Venta</label>
                                <select className="input-field" required={!isQuickOrder} value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}>
                                  <option value="">Escoger orden del historial...</option>
                                  {customerOrders.map(o => (
                                    <option key={o.id} value={o.id}>{o.order_code} - {o.brand} {o.model} ({o.year})</option>
                                  ))}
                                </select>
                                {customerOrders.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No se encontraron órdenes para este cliente.</p>}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 204, 0, 0.1)', color: '#ffcc00' }}><PhoneOutgoing size={20} /></div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Notas de la Conversación</h3>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleSummarize}
                          disabled={isSummarizing || !formData.description}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                        >
                          {isSummarizing ? 'Resumiendo...' : <><Sparkles size={14} /> Resumir con IA</>}
                        </button>
                      </div>
                      <textarea className="input-field" required style={{ minHeight: '150px' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div>
                      <button type="button" className="btn btn-secondary" onClick={() => setFormStep(1)}>Atrás</button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--gradient-primary)', borderRadius: '20px', padding: '1.75rem', color: 'white', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 20px 40px rgba(51, 102, 255, 0.3)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}><Package size={20} /> Resumen de Gestión</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Cliente</p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>{selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim() : 'Sin vincular'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Orden objetivo</p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>{selectedOrder?.order_code || (isQuickOrder && formData.is_claim ? 'Se creará una orden rápida' : 'No aplica')}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>Cobertura</p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>{formData.description ? `${formData.description.length} caracteres registrados` : 'Sin notas todavía'}</p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn"
                      style={{ background: 'white', color: '#3366ff', border: 'none', width: '100%', marginTop: '2rem', height: '54px', fontSize: '1.05rem', fontWeight: 800, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                      Guardar Registro
                    </button>
                    <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '1rem', opacity: 0.7 }}>Si está marcado como reclamo, el flujo operativo se actualiza automáticamente.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
        title={selectedCall ? `Detalle de Llamada #${selectedCall.id}` : 'Detalle de Llamada'}
        maxWidth="920px"
      >
        {selectedCall && (
          <div className="wizard-experience">
            <div className="form-grid-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                  <h3 className="font-outfit" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Identificación</h3>
                  <div className="form-grid-2">
                    <div>
                      <p className="label">Contacto</p>
                      <p style={{ fontWeight: 700 }}>{selectedCall.contact_name || 'Anónimo'}</p>
                    </div>
                    <div>
                      <p className="label">Teléfono</p>
                      <p style={{ fontWeight: 700 }}>{selectedCall.phone || 'Sin teléfono'}</p>
                    </div>
                    <div>
                      <p className="label">Tipo</p>
                      <p style={{ fontWeight: 700, color: selectedCall.is_claim ? 'var(--danger)' : 'var(--success)' }}>
                        {selectedCall.is_claim ? 'Reclamo' : 'Seguimiento'}
                      </p>
                    </div>
                    <div>
                      <p className="label">Operador</p>
                      <p style={{ fontWeight: 700 }}>{selectedCall.user_name}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="font-outfit" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Descripción Completa</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedCall.description || 'Sin descripción registrada.'}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--gradient-primary)', borderRadius: '20px', padding: '1.6rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content', boxShadow: '0 20px 40px rgba(51, 102, 255, 0.28)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
                  <Phone size={18} /> Resumen Operativo
                </h4>

                <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: '12px', padding: '0.95rem' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.85, textTransform: 'uppercase' }}>Fecha</p>
                  <p style={{ marginTop: '0.35rem', fontWeight: 800 }}>
                    {new Date(selectedCall.created_at).toLocaleString()}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: '12px', padding: '0.95rem' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.85, textTransform: 'uppercase' }}>Prioridad sugerida</p>
                  <p style={{ marginTop: '0.35rem', fontWeight: 800 }}>
                    {selectedCall.is_claim ? 'Alta (Reclamo)' : 'Normal (Seguimiento)'}
                  </p>
                </div>

                <button type="button" className="btn" onClick={() => setSelectedCall(null)} style={{ background: 'white', color: '#3366ff', fontWeight: 800, marginTop: '0.5rem' }}>
                  Cerrar Detalle
                </button>
                {canDeleteCalls && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCallToDelete(selectedCall.id)}
                    style={{ background: '#ef4444', color: 'white', fontWeight: 800 }}
                  >
                    Eliminar Llamada
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={callToDelete !== null}
        title="Eliminar llamada"
        message="¿Eliminar esta llamada del registro?"
        confirmText="Eliminar"
        danger
        onClose={() => setCallToDelete(null)}
        onConfirm={async () => {
          if (callToDelete === null) return;
          await handleDeleteCall(callToDelete);
          setCallToDelete(null);
        }}
      />
    </div>
  );
};

export default CallsPage;
