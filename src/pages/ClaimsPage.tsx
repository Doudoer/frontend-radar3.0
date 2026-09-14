import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertCircle, CheckCircle2, Clock, Plus, Check, X, User, Package, Zap, CheckCircle, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../store/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

interface Claim {
  id: number;
  order_id: number;
  order_code: string;
  brand: string;
  model: string;
  year: number;
  product_type: string;
  product_specs: string;
  price: number;
  first_name: string;
  last_name: string;
  description: string;
  status: 'Pending' | 'In Process' | 'Resolved' | 'Denied';
  assigned_user_name: string;
  created_at: string;
}

const ClaimsPage: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimToDelete, setClaimToDelete] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState({
    order_id: '',
    description: '',
    assigned_user_id: ''
  });

  const selectedOrder = orders.find((order) => String(order.id) === formData.order_id);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/claims', { params: { page, limit: 10 } });
      setClaims(resp.data.data);
      setTotalPages(resp.data.meta.last_page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // For the dropdown, we still need orders (last 50 or so)
      const resp = await api.get('/orders', { params: { limit: 50 } });
      setOrders(Array.isArray(resp.data) ? resp.data : resp.data.data || resp.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchOrders();
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/claims', formData);
      setShowModal(false);
      fetchClaims();
      setFormData({ order_id: '', description: '', assigned_user_id: '' });
      toast.success('Reclamo creado correctamente');
    } catch (err) {
      toast.error('Error al crear reclamo');
    }
  };

  const handleResolveClaim = async (claimId: number) => {
    try {
      await api.patch(`/claims/${claimId}/status`, { status: 'Resolved' });
      toast.success('Reclamo resuelto exitosamente');
      fetchClaims();
      if (selectedClaim?.id === claimId) setSelectedClaim(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al resolver reclamo';
      console.error('[ClaimsPage] Error resolving claim:', err?.response?.data || err);
      toast.error(msg);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved': return <CheckCircle2 size={16} color="#10b981" />;
      case 'Pending': return <Clock size={16} color="#f59e0b" />;
      default: return <AlertCircle size={16} color="#ef4444" />;
    }
  };

  const handleRowClick = (claim: Claim) => {
    setSelectedClaim(claim);
  };
  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gestión de Reclamos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Seguimiento de garantías y problemas técnicos reportados.</p>
        </div>
        <div className="page-header-actions">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Nuevo Reclamo
        </button>
        </div>
      </div>

      <div className="glass-card data-table-wrap">
        <table className="data-table" style={{ minWidth: '1200px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Customer</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Year</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Make</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Model</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Type</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Details</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Claim Description</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Price</th>
              <th style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={11} className="skeleton" style={{ height: '60px', margin: '10px 0' }} /></tr>
              ))
            ) : (
              claims.map(claim => (
                <tr 
                  key={claim.id} 
                  onClick={() => handleRowClick(claim)}
                  className="clickable-row"
                  style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s', cursor: 'pointer' }}
                >
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.875rem' }}>
                    {new Date(claim.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{claim.first_name} {claim.last_name}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{claim.year}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{claim.brand}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{claim.model}</td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>{claim.product_type}</td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {claim.product_specs || '-'}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.875rem', color: 'var(--accent-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={claim.description}>
                    {claim.description}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>${claim.price}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 500 }}>
                      {getStatusIcon(claim.status)}
                      <span style={{ color: claim.status === 'Resolved' ? '#10b981' : '#ef4444' }}>{claim.status}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      {claim.status !== 'Resolved' && (
                        <button 
                          className="btn btn-primary" 
                          onClick={(e) => { e.stopPropagation(); handleResolveClaim(claim.id); }}
                          style={{ padding: '0.4rem', borderRadius: '8px', background: '#10b981' }}
                          title="Marcar como Resuelto"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={(e) => { e.stopPropagation(); setSelectedClaim(claim); }}><ChevronRight size={16} /></button>
                      {user?.role === 'admin' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', color: 'var(--danger)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClaimToDelete(claim.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && claims.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay reclamos registrados actualmente.
          </div>
        )}
      </div>

      <Pagination 
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
      />

      {/* Linked Order Detail Drawer */}
      <AnimatePresence>
        {selectedClaim && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClaim(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Detalle del reclamo"
              style={{ 
                position: 'fixed', top: '50%', left: '50%', width: '95%', maxWidth: '900px', maxHeight: '95vh',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px',
                backdropFilter: 'blur(20px)', zIndex: 101, padding: '2rem', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="font-outfit" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  Detalle del Reclamo <span style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>#{selectedClaim.id}</span>
                </h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {selectedClaim.status !== 'Resolved' && (
                    <button className="btn btn-primary" onClick={() => handleResolveClaim(selectedClaim.id)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#10b981', color: 'white', border: 'none' }}>
                      <CheckCircle size={16}/> Marcar Resuelto
                    </button>
                  )}
                  <button onClick={() => setSelectedClaim(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Column 1: Claim Info */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                  <h3 className="font-outfit" style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
                    <AlertCircle size={20} /> Información del Reclamo
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Problema Reportado</label>
                      <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{selectedClaim.description}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Fecha de Registro</label>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {new Date(selectedClaim.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Asignado a</label>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {selectedClaim.assigned_user_name || 'Sin asignar'}</p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Linked Order Info */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
                  <h3 className="font-outfit" style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                    <Package size={20} /> Orden Vinculada
                  </h3>
                  <div className="form-grid-2" style={{ gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Código</label>
                      <p style={{ fontWeight: 600 }}>{selectedClaim.order_code}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cliente</label>
                      <p>{selectedClaim.first_name} {selectedClaim.last_name}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Vehículo</label>
                      <p>{selectedClaim.year} {selectedClaim.brand} {selectedClaim.model}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tipo de Pieza</label>
                      <p style={{ fontSize: '0.85rem' }}><Zap size={14} style={{ display: 'inline', marginRight: '4px' }} /> {selectedClaim.product_type}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Especificaciones</label>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedClaim.product_specs || 'Sin especificaciones extra'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Precio Original</label>
                      <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#10b981' }}>${selectedClaim.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Reclamo" maxWidth="980px">
        <form onSubmit={handleSubmit} className="form-grid-sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(51, 102, 255, 0.12)', color: 'var(--accent-primary)' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Orden Vinculada</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecciona la orden sobre la que se abrirá el reclamo.</p>
                </div>
              </div>

              <label className="label">Seleccionar Orden</label>
              <select className="input-field" required value={formData.order_id} onChange={e => setFormData({...formData, order_id: e.target.value})}>
                <option value="">Buscar orden por código o vehículo...</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.order_code} - {o.brand} {o.model}</option>)}
              </select>

              {selectedOrder && (
                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Código</label>
                    <p style={{ margin: 0, fontWeight: 700 }}>{selectedOrder.order_code}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Cliente</label>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedOrder.first_name} {selectedOrder.last_name}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Vehículo</label>
                    <p style={{ margin: 0 }}>{selectedOrder.year} {selectedOrder.brand} {selectedOrder.model}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Pieza</label>
                    <p style={{ margin: 0 }}>{selectedOrder.product_type || 'Sin tipo definido'}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Detalle del Problema</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Describe el fallo, condición de la pieza y contexto del reclamo.</p>
                </div>
              </div>

              <label className="label">Descripción Detallada del Problema</label>
              <textarea className="input-field" required style={{ minHeight: '180px', resize: 'vertical' }} placeholder="Ej: La pieza llegó dañada, presenta fuga o no coincide con la especificación esperada..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'linear-gradient(145deg, #3366ff, #5b7cff)', borderRadius: '20px', padding: '1.75rem', color: 'white', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 20px 40px rgba(51, 102, 255, 0.28)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Resumen del Reclamo</h3>
                <p style={{ margin: '0.2rem 0 0', opacity: 0.82, fontSize: '0.8rem' }}>Mismo estilo visual que el alta de órdenes, con foco operativo.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado Inicial</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '1.1rem', fontWeight: 800 }}>Pending</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orden Seleccionada</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '1rem', fontWeight: 700 }}>{selectedOrder?.order_code || 'Sin seleccionar'}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cobertura del Reporte</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.95rem', lineHeight: 1.5 }}>{formData.description ? `${formData.description.length} caracteres redactados` : 'Aún no se ha redactado el detalle del reclamo.'}</p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', opacity: 0.92 }}>
                <User size={16} />
                <span style={{ fontSize: '0.85rem' }}>El reclamo quedará disponible para seguimiento interno inmediato.</span>
              </div>
              <button type="submit" className="btn" style={{ background: 'white', color: '#3366ff', border: 'none', width: '100%', height: '54px', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                Crear Reclamo
              </button>
              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.85rem', background: 'rgba(255,255,255,0.14)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </motion.div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={claimToDelete !== null}
        title="Eliminar reclamo"
        message="¿Seguro que deseas eliminar este reclamo?"
        confirmText="Eliminar"
        danger
        onClose={() => setClaimToDelete(null)}
        onConfirm={async () => {
          if (claimToDelete === null) return;
          try {
            await api.delete(`/claims/${claimToDelete}`);
            toast.success('Reclamo eliminado');
            fetchClaims();
          } catch (err) {
            toast.error('Error al eliminar');
          } finally {
            setClaimToDelete(null);
          }
        }}
      />
    </div>
  );
};

export default ClaimsPage;
