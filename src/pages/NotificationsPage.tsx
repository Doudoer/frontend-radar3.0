import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, Clock, Package, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'order_ready' | 'stale_order' | 'pending_claim' | 'system';
  priority: 'low' | 'medium' | 'high';
  link: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const resp = await api.get('/notifications');
      setNotifications(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) {
      toast('No hay alertas pendientes por leer');
      return;
    }

    try {
      await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`)));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('Todas las alertas fueron marcadas como leídas');
    } catch (err) {
      toast.error('No se pudieron marcar todas las alertas');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Alerta eliminada');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      toast.success('Notificaciones borradas');
    } catch (err) {
      toast.error('Error al borrar');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order_ready': return <Package size={20} className="text-primary" />;
      case 'stale_order': return <Clock size={20} className="text-warning" />;
      case 'pending_claim': return <AlertTriangle size={20} className="text-danger" />;
      default: return <Bell size={20} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Alertas Inteligentes IA</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Seguimiento proactivo de órdenes y reclamos generados por RADAR AI.</p>
        </div>
        <div className="page-header-actions">
        <button className="btn btn-secondary" onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          Marcar Todo Leído
        </button>
        <button className="btn btn-secondary" onClick={() => setShowClearConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={18} />
          Limpiar Todo
        </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '100px' }} />)
        ) : notifications.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ color: 'var(--text-secondary)' }}>No tienes alertas pendientes. ¡Todo está bajo control!</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div 
                key={n.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card"
                style={{ 
                  padding: '1.25rem', 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '1.25rem', 
                  alignItems: 'center',
                  opacity: n.is_read ? 0.6 : 1,
                  borderLeft: `4px solid ${getPriorityColor(n.priority)}`
                }}
              >
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '0.75rem', 
                  borderRadius: '12px' 
                }}>
                  {getIcon(n.type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h3 className="font-outfit" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{n.title}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{n.message}</p>
                </div>

                <div className="actions-row" style={{ gap: '0.5rem' }}>
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      Leída
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(n.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                    title="Eliminar permanentemente"
                  >
                    <Trash2 size={14} />
                  </button>
                  {n.link && (
                    <button 
                      onClick={() => navigate(n.link)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      Ir a Orden
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Limpiar notificaciones"
        message="¿Estás seguro de que quieres borrar todas las notificaciones?"
        confirmText="Limpiar"
        danger
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          await clearAll();
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
};

export default NotificationsPage;
