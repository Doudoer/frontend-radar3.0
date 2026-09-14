import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Search, Printer, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { printOrderDirect } from '../utils/exportUtils';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const filteredInvoices = invoices.filter((invoice) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      invoice.invoice_number,
      invoice.customer_name,
      invoice.user_name,
      invoice.type,
      invoice.amount,
      invoice.created_at
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  useEffect(() => {
    fetchInvoices();
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/invoices', { params: { page, limit: 15 } });
      setInvoices(response.data.data);
      setTotalPages(response.data.meta.last_page);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Error al sincronizar el historial');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAgain = async (invoice: any) => {
    toast.loading('Recuperando datos oficiales...', { id: 'reprint' });
    try {
      const response = await api.get(`/orders/${invoice.order_id}`);
      // FIX: El backend devuelve { order: {...} }
      const order = response.data.order;
      
      if (!order) throw new Error('Orden no encontrada');
      
      toast.success('Factura lista para impresión', { id: 'reprint' });
      printOrderDirect(order, 'invoice', api, user?.id);
    } catch (error) {
      console.error('Reprint error:', error);
      toast.error('Error al recuperar datos de la orden', { id: 'reprint' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Registro eliminado');
      fetchInvoices();
    } catch (error) {
      toast.error('Acceso denegado o error de red');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mobile Card Component
  const MobileInvoiceCard = ({ invoice }: { invoice: any }) => (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card"
      style={{ 
        padding: '1.25rem', 
        marginBottom: '1rem', 
        position: 'relative', 
        overflow: 'hidden',
        borderLeft: `4px solid ${invoice.type === 'Down Payment' ? 'var(--warning)' : 'var(--success)'}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '2px' }}>Folio Digital</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>#{invoice.invoice_number}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handlePrintAgain(invoice)}
            className="btn-secondary"
            style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
            aria-label="Imprimir factura"
          >
            <Printer size={16} />
          </button>
          {isAdmin && (
            <button 
              onClick={() => setDeleteInvoiceId(invoice.id)}
              className="btn-secondary"
              style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, color: 'var(--danger)' }}
              aria-label="Eliminar factura"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '2px' }}>Cliente</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>{invoice.customer_name}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '2px' }}>Monto</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>${Number(invoice.amount).toLocaleString('en-US')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(51,102,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>
            {invoice.user_name?.charAt(0)}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{invoice.user_name}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{formatDate(invoice.created_at)}</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="page-container fade-in">
      {/* Header Premium */}
      <header className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="page-header-copy">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--primary-glow)' }}>
              <FileText size={24} color="white" />
            </div>
            <h1 className="font-outfit" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Registro de Facturación</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginLeft: '61px' }}>Historial legal de transacciones emitidas y control de auditoría.</p>
        </div>
        
        {!isMobile && (
          <div className="page-header-actions">
            <div style={{ position: 'relative' }}>
               <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
               <input
                 className="input-field"
                 style={{ paddingLeft: '40px', width: '300px' }}
                 placeholder="Buscar transacción..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="app-main-card glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Wizard Top Line Decoration */}
        <div className="warranty-wizard-topline" style={{ margin: '0 0 2rem 0' }}></div>

        {isMobile && (
          <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
             <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Buscar factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        )}

        {/* Content Table/Cards */}
        <div style={{ minHeight: '400px', padding: isMobile ? '0 1rem' : '0 2rem 2rem 2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1.5rem' }}>
              <div className="loader-neon"></div>
              <p className="font-outfit" style={{ color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.2em', animation: 'pulse 2s infinite' }}>SINCRONIZANDO...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', color: 'rgba(255,255,255,0.1)' }}>
              <FileText size={64} style={{ marginBottom: '1rem', strokeWidth: 1 }} />
              <p className="font-outfit" style={{ fontSize: '1.25rem', fontWeight: 500 }}>Historial vacío</p>
            </div>
          ) : isMobile ? (
            /* MOBILE APP VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <AnimatePresence>
                {filteredInvoices.map(invoice => (
                  <MobileInvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* DESKTOP PREMIUM VIEW */
            <div className="data-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Factura</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cliente</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tipo</th>
                    <th style={{ textAlign: 'right', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monto Total</th>
                    <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Emitido por</th>
                    <th style={{ textAlign: 'center', padding: '1.25rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, idx) => (
                    <motion.tr 
                      key={invoice.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="clickable-row"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                    >
                      <td style={{ padding: '1.25rem 1rem', fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>#{invoice.invoice_number}</td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>{formatDate(invoice.created_at)}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textTransform: 'uppercase' }}>{formatTime(invoice.created_at)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{invoice.customer_name}</td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          fontSize: '9px', 
                          fontWeight: 900, 
                          textTransform: 'uppercase',
                          background: invoice.type === 'Down Payment' ? 'rgba(255,204,0,0.1)' : 'rgba(16,185,129,0.1)',
                          color: invoice.type === 'Down Payment' ? 'var(--warning)' : 'var(--success)',
                          border: `1px solid ${invoice.type === 'Down Payment' ? 'rgba(255,204,0,0.2)' : 'rgba(16,185,129,0.2)'}`
                        }}>
                          {invoice.type}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem' }}>
                        ${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(51,102,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', border: '1px solid rgba(51,102,255,0.2)' }}>
                            {invoice.user_name?.charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{invoice.user_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handlePrintAgain(invoice)}
                            className="btn-secondary"
                            style={{ padding: '0.5rem', borderRadius: '10px' }}
                            title="Imprimir Copia"
                            aria-label="Imprimir copia de factura"
                          >
                            <Printer size={16} />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => setDeleteInvoiceId(invoice.id)}
                              className="btn-secondary"
                              style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--danger)' }}
                              title="Borrar Registro"
                              aria-label="Borrar registro de factura"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Card Footer / Pagination */}
        <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', margin: 0 }}>
            Audit logs - Page {page} of {totalPages}
          </p>
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteInvoiceId !== null}
        title="Eliminar registro de factura"
        message="¿Eliminar este registro legal de forma permanente?"
        confirmText="Eliminar"
        danger
        onClose={() => setDeleteInvoiceId(null)}
        onConfirm={async () => {
          if (deleteInvoiceId === null) return;
          await handleDelete(deleteInvoiceId);
          setDeleteInvoiceId(null);
        }}
      />
    </div>
  );
};

export default InvoicesPage;
