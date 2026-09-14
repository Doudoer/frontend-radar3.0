import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Truck, Phone, CheckCircle, Clock, Package, AlertCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const PublicTrackPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [list, setList] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListData();
  }, [hash]);

  const fetchListData = async () => {
    try {
      const resp = await api.get(`/logistics/public/${hash}`);
      setList(resp.data.list);
      setItems(resp.data.items);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la lista de seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Found' ? 'Search' : 'Found';
    try {
      await api.patch(`/logistics/public/item/${itemId}`, { status: nextStatus });
      setItems(items.map(item => item.id === itemId ? { ...item, status: nextStatus } : item));
      toast.success(nextStatus === 'Found' ? 'Pieza marcada como lista' : 'Estado actualizado');
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  if (loading) return <div className="loading-screen">Cargando ruta...</div>;
  if (!list) return <div className="error-screen">Ruta no encontrada.</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', padding: '1.5rem' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          width: '60px', 
          height: '60px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <Truck size={32} color="#3b82f6" />
        </div>
        <h1 className="font-outfit" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{list.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {list.language === 'en' ? 'Delivery Task List' : 'Lista de Tareas de Entrega'}
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
              style={{ 
                padding: '1.25rem',
                borderLeft: item.status === 'Found' ? '4px solid #10b981' : '4px solid #f59e0b',
                background: item.status === 'Found' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.order_code}</p>
                  <h3 className="font-outfit" style={{ fontSize: '1.1rem' }}>{item.brand} {item.model}</h3>
                </div>
                {item.status === 'Found' ? (
                  <CheckCircle color="#10b981" fill="rgba(16, 185, 129, 0.1)" />
                ) : (
                  <Clock color="#f59e0b" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <User size={14} color="var(--text-secondary)" />
                  <span>{item.first_name} {item.last_name}</span>
                </div>
                {item.customer_phone && (
                  <a 
                    href={`tel:${item.customer_phone}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      fontSize: '0.875rem', 
                      color: 'var(--primary)', 
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    <Phone size={14} />
                    <span>{item.customer_phone}</span>
                  </a>
                )}
                {item.vin_nr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <Package size={14} />
                    <span>VIN: {item.vin_nr}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleStatusUpdate(item.id, item.status)}
                className={`btn ${item.status === 'Found' ? 'btn-secondary' : 'btn-primary'}`}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {item.status === 'Found' 
                  ? (list.language === 'en' ? 'Mark as Pending' : 'Marcar como Pendiente')
                  : (list.language === 'en' ? 'Item Available / Found' : 'Pieza Lista / Encontrada')
                }
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
          <p>No hay piezas en esta lista.</p>
        </div>
      )}

      <footer style={{ marginTop: '3rem', textAlign: 'center', paddingBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Powered by RADAR Logistics System
        </p>
      </footer>
    </div>
  );
};

export default PublicTrackPage;
