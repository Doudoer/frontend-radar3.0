import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Search, Phone, Mail, MapPin, Trash2, User, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';
import { useAuth } from '../store/AuthContext';
import { toast } from 'react-hot-toast';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address_shipping: string;
  zip_code: string;
}

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerDetailStep, setCustomerDetailStep] = useState<1 | 2>(1);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [detailFormData, setDetailFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address_shipping: '',
    zip_code: '',
    notes: ''
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address_shipping: '',
    zip_code: '',
    notes: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/customers', {
        params: {
          search,
          page,
          limit: 12,
        },
      });

      const payload = resp.data;
      if (Array.isArray(payload)) {
        setCustomers(payload);
        setTotalPages(1);
      } else {
        setCustomers(payload?.data || []);
        setTotalPages(payload?.meta?.last_page || 1);
      }
    } catch (err) {
      console.error(err);
      setCustomers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openCustomerDetail = async (id: number) => {
    try {
      setCustomerDetailLoading(true);
      const resp = await api.get(`/customers/${id}`);
      const customer = resp.data;
      setSelectedCustomer(customer);
      setDetailFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        email: customer.email || '',
        address_shipping: customer.address_shipping || '',
        zip_code: customer.zip_code || '',
        notes: customer.notes || ''
      });
      setIsEditingCustomer(false);
      setCustomerDetailStep(1);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Error al cargar detalle del cliente');
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setSavingCustomer(true);
      await api.put(`/customers/${selectedCustomer.id}`, detailFormData);
      toast.success('Cliente actualizado');
      setSelectedCustomer({ ...selectedCustomer, ...detailFormData });
      setIsEditingCustomer(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Error al actualizar cliente');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', formData);
      setShowModal(false);
      fetchCustomers();
      setFormData({
        first_name: '', last_name: '', phone: '', whatsapp: '',
        email: '', address_shipping: '', zip_code: '', notes: ''
      });
      toast.success('Cliente creado correctamente');
    } catch (err) {
      toast.error('Error al crear cliente');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Clientes (CRM)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona tu base de datos de contactos y envíos.</p>
        </div>
        <div className="page-header-actions">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} />
          Nuevo Cliente
        </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} style={{ color: 'var(--text-secondary)' }} />
        <input 
          type="text" 
          placeholder="Buscar por nombre, teléfono o email..." 
          className="input-field" 
          style={{ border: 'none', background: 'transparent', padding: '0.5rem' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-responsive">
        {loading ? (
          Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '150px' }} />)
        ) : (
          customers.map(customer => (
            <motion.div 
              key={customer.id} 
              className="glass-card" 
              whileHover={{ y: -5 }}
              onClick={() => openCustomerDetail(customer.id)}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {customer.first_name[0]}{customer.last_name ? customer.last_name[0] : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="font-outfit">{customer.first_name} {customer.last_name}</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID: #{customer.id}</span>
                </div>
                {user?.role === 'admin' && (
                  <button 
                    className="btn btn-secondary" 
                    title="Eliminar Cliente"
                    style={{ padding: '0.4rem', color: 'var(--danger)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToDelete(customer);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} /> {customer.phone}
                </div>
                {customer.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} /> {customer.email}
                  </div>
                )}
                {customer.address_shipping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> {customer.address_shipping}, {customer.zip_code}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleSubmit} className="form-grid-2">
          <div style={{ gridColumn: 'span 1' }}>
            <label className="label">Nombre</label>
            <input className="input-field" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <label className="label">Apellido</label>
            <input className="input-field" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input-field" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input className="input-field" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">Email</label>
            <input className="input-field" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">Dirección de Envío</label>
            <input className="input-field" value={formData.address_shipping} onChange={e => setFormData({...formData, address_shipping: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">Notas</label>
            <textarea className="input-field" style={{ minHeight: '100px' }} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
          <div className="actions-row" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
          setIsEditingCustomer(false);
          setCustomerDetailStep(1);
        }}
        title={selectedCustomer ? `Cliente #${selectedCustomer.id}` : 'Detalle de Cliente'}
        maxWidth="760px"
      >
        {customerDetailLoading ? (
          <div className="skeleton" style={{ height: '180px' }} />
        ) : !selectedCustomer ? (
          <p style={{ color: 'var(--text-secondary)' }}>No se pudo cargar el cliente.</p>
        ) : (
          <div className="wizard-experience">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.1rem' }}>
              {[1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCustomerDetailStep(s as 1 | 2)}
                  style={{ flex: 1, opacity: 1, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                >
                  <div
                    style={{
                      height: '4px',
                      borderRadius: '10px',
                      background: customerDetailStep === s ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.08)',
                      marginBottom: '0.45rem'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: customerDetailStep === s ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  >
                    {s === 1 ? '1. Perfil' : '2. Contacto y Envío'}
                  </span>
                </button>
              ))}
            </div>

            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>
                  {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0] || ''}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    ID: #{selectedCustomer.id}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateCustomer} className="form-grid-2">
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <User size={16} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{customerDetailStep === 1 ? 'Datos del Cliente' : 'Contacto y Envío'}</h3>
              </div>

              {!isEditingCustomer ? (
                <>
                  <div className="glass-card" style={{ gridColumn: 'span 2', padding: '0.95rem', background: 'rgba(255,255,255,0.02)' }}>
                    {customerDetailStep === 1 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Nombre</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.first_name || '-'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Apellido</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.last_name || '-'}</p>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Notas</p>
                          <p style={{ margin: 0, color: 'var(--text-main)' }}>{detailFormData.notes || 'Sin notas'}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Teléfono</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.phone || '-'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>WhatsApp</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.whatsapp || '-'}</p>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Email</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.email || '-'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Código Postal</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.zip_code || '-'}</p>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Dirección</p>
                          <p style={{ margin: 0, fontWeight: 600 }}>{detailFormData.address_shipping || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {customerDetailStep === 1 ? (
                    <>
                      <div>
                        <label className="label">Nombre</label>
                        <input
                          className="input-field"
                          value={detailFormData.first_name}
                          onChange={(e) => setDetailFormData({ ...detailFormData, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Apellido</label>
                        <input
                          className="input-field"
                          value={detailFormData.last_name}
                          onChange={(e) => setDetailFormData({ ...detailFormData, last_name: e.target.value })}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Notas</label>
                        <textarea
                          className="input-field"
                          style={{ minHeight: '120px' }}
                          value={detailFormData.notes}
                          onChange={(e) => setDetailFormData({ ...detailFormData, notes: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="label">Teléfono</label>
                        <input
                          className="input-field"
                          value={detailFormData.phone}
                          onChange={(e) => setDetailFormData({ ...detailFormData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">WhatsApp</label>
                        <input
                          className="input-field"
                          value={detailFormData.whatsapp}
                          onChange={(e) => setDetailFormData({ ...detailFormData, whatsapp: e.target.value })}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Email</label>
                        <input
                          className="input-field"
                          type="email"
                          value={detailFormData.email}
                          onChange={(e) => setDetailFormData({ ...detailFormData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Código Postal</label>
                        <input
                          className="input-field"
                          value={detailFormData.zip_code}
                          onChange={(e) => setDetailFormData({ ...detailFormData, zip_code: e.target.value })}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Dirección de Envío</label>
                        <input
                          className="input-field"
                          value={detailFormData.address_shipping}
                          onChange={(e) => setDetailFormData({ ...detailFormData, address_shipping: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="actions-row" style={{ gridColumn: 'span 2', marginTop: '1rem', justifyContent: 'space-between' }}>
                <div className="actions-row" style={{ flex: 1 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCustomerDetailStep(1)}
                    disabled={customerDetailStep === 1}
                    style={{ minWidth: '150px' }}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCustomerDetailStep(2)}
                    disabled={customerDetailStep === 2}
                    style={{ minWidth: '150px' }}
                  >
                    Siguiente
                  </button>
                </div>

                <div className="actions-row" style={{ flex: 1, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (isEditingCustomer) {
                      setDetailFormData({
                        first_name: selectedCustomer.first_name || '',
                        last_name: selectedCustomer.last_name || '',
                        phone: selectedCustomer.phone || '',
                        whatsapp: selectedCustomer.whatsapp || '',
                        email: selectedCustomer.email || '',
                        address_shipping: selectedCustomer.address_shipping || '',
                        zip_code: selectedCustomer.zip_code || '',
                        notes: (selectedCustomer as any).notes || ''
                      });
                    }
                    setIsEditingCustomer(!isEditingCustomer);
                  }}
                  style={{ flex: 1 }}
                >
                  <Pencil size={16} />
                  {isEditingCustomer ? 'Cancelar Edición' : 'Editar Cliente'}
                </button>

                {isEditingCustomer && (
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingCustomer}>
                    {savingCustomer ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                )}
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={customerToDelete !== null}
        title="Eliminar cliente"
        message={customerToDelete ? `¿Seguro que deseas eliminar a ${customerToDelete.first_name}? Esta acción borrará sus órdenes asociadas también.` : ''}
        confirmText="Eliminar"
        danger
        onClose={() => setCustomerToDelete(null)}
        onConfirm={async () => {
          if (!customerToDelete) return;
          try {
            await api.delete(`/customers/${customerToDelete.id}`);
            toast.success('Cliente eliminado');
            fetchCustomers();
          } catch (err) {
            toast.error('Error al eliminar cliente');
          } finally {
            setCustomerToDelete(null);
          }
        }}
      />
    </div>
  );
};

export default CustomersPage;
