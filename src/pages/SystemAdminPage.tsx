import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldCheck, Zap, Database, Download, RefreshCcw, Activity, FileText, LayoutTemplate } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { useSystemSettings } from '../store/SystemSettingsContext';

const SystemAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings, resetSettings } = useSystemSettings();
  const [activeTab, setActiveTab] = useState<'ai' | 'backups' | 'modules'>('modules');
  const [aiStatus, setAIStatus] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (activeTab === 'ai') fetchAIStatus();
    if (activeTab === 'backups') fetchBackups();
  }, [activeTab]);

  const fetchAIStatus = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/system/ai-status', { skipGlobalErrorToast: true } as any);
      setAIStatus(resp.data);
    } catch (err) {
      setAIStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/system/backups');
      setBackups(resp.data);
    } catch (err) {
      toast.error('Error al obtener respaldos');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    toast.loading('Generando respaldo SQL...', { id: 'backup' });
    try {
      await api.post('/system/backups');
      fetchBackups();
      toast.success('Respaldo generado exitosamente', { id: 'backup' });
    } catch (err) {
      toast.error('Error al generar respaldo', { id: 'backup' });
    } finally {
      setBackingUp(false);
    }
  };

  const downloadBackup = (filename: string) => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/system/backups/download/${filename}`, '_blank');
  };

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="font-outfit" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={32} color="var(--accent-primary)" /> Gestión del Sistema
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configuración avanzada de IA y resguardo de datos críticos del servidor.</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ai')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Zap size={18} /> Inteligencia Artificial
        </button>
        <button 
          className={`btn ${activeTab === 'backups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('backups')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Database size={18} /> Respaldos (Backups)
        </button>
        <button
          className={`btn ${activeTab === 'modules' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('modules')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LayoutTemplate size={18} /> Módulos
        </button>
      </div>

      {activeTab === 'modules' ? (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 className="font-outfit" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Control de módulos operativos</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Activa o desactiva los módulos de Alertas IA y Reportes IA desde esta sección.
          </p>

          {!isAdmin && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--warning)', fontSize: '0.85rem' }}>
              Solo usuarios admin pueden cambiar esta configuración.
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.9rem' }}>

            <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Alertas IA</p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Habilita acceso a la ruta y menú de alertas automáticas.
                </p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  disabled={!isAdmin}
                  onChange={(e) => {
                    updateSettings({ notificationsEnabled: e.target.checked });
                    toast.success(`Alertas IA ${e.target.checked ? 'habilitadas' : 'deshabilitadas'}`);
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: settings.notificationsEnabled ? '#10b981' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {settings.notificationsEnabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </label>
            </div>

            <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Reportes IA</p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Habilita acceso a la ruta y menú de reportes de inteligencia artificial.
                </p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  checked={settings.aiReportsEnabled}
                  disabled={!isAdmin}
                  onChange={(e) => {
                    updateSettings({ aiReportsEnabled: e.target.checked });
                    toast.success(`Reportes IA ${e.target.checked ? 'habilitados' : 'deshabilitados'}`);
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: settings.aiReportsEnabled ? '#10b981' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {settings.aiReportsEnabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </label>
            </div>
          </div>

          <div className="actions-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!isAdmin}
              onClick={() => {
                resetSettings();
                toast.success('Configuración de módulos restablecida');
              }}
            >
              Restablecer valores
            </button>
          </div>
        </div>
      ) : activeTab === 'ai' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 className="font-outfit" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#10b981" /> Estado de Conexión
            </h3>
            {aiStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Motor:</span>
                  <span style={{ fontWeight: 600 }}>{aiStatus.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estatus:</span>
                  <span style={{ 
                    color: aiStatus.status === 'Active' ? '#10b981' : '#ef4444', 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    {aiStatus.status === 'Active' ? <CheckCircle size={14} /> : <X size={14} />}
                    {aiStatus.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Último Check:</span>
                  <span style={{ fontSize: '0.85rem' }}>{new Date(aiStatus.lastUpdated).toLocaleString()}</span>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={fetchAIStatus}>
                  <RefreshCcw size={16} /> Re-validar Conexión
                </button>
              </div>
            ) : <div className="skeleton" style={{ height: '150px' }} />}
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 className="font-outfit" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutTemplate size={20} color="var(--accent-primary)" /> Funciones de IA
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                <span style={{ fontSize: '0.9rem' }}>Detección de Órdenes Estancadas</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVO</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                <span style={{ fontSize: '0.9rem' }}>Redacción de Alertas Mentenimiento</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVO</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5 }}>
                <span style={{ fontSize: '0.9rem' }}>Reconocimiento de VIN (OCR)</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>DESACTIVADO</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 className="font-outfit" style={{ fontSize: '1.25rem' }}>Historial de Respaldos</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Los respaldos se almacenan de forma segura en el servidor.</p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleBackup} 
              disabled={backingUp}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {backingUp ? <RefreshCcw className="spin" size={18} /> : <Database size={18} />}
              Generar Respaldo Ahora
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Archivo SQL</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Fecha Creación</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Tamaño</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && !backups.length ? (
                Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={4} style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '30px' }} /></td></tr>)
              ) : backups.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No se han generado respaldos todavía.</td></tr>
              ) : backups.map(b => (
                <tr key={b.filename} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={18} color="var(--text-secondary)" />
                      <span style={{ fontWeight: 500 }}>{b.filename}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(b.date).toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{b.size}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn btn-secondary" onClick={() => downloadBackup(b.filename)} title="Descargar">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const CheckCircle: React.FC<{ size?: number }> = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const X: React.FC<{ size?: number }> = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default SystemAdminPage;
