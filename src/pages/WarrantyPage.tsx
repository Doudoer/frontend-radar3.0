import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Search, AlertCircle, CheckCircle, Clock, ArrowRight, Phone, Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Warranty {
  id: number;
  order_id: number;
  order_code: string;
  product_type: string;
  warranty_days: number;
  start_date: string;
  end_date: string;
  days_left: number;
  first_name: string;
  last_name: string;
  phone: string;
  brand: string;
  model: string;
  year: number;
}

interface Meta {
  total: number;
  page: number;
  last_page: number;
}

const WarrantyPage: React.FC = () => {
  const navigate = useNavigate();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    fetchWarranties();
  }, [page]);

  const fetchWarranties = async (resetPage = false) => {
    setLoading(true);
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const response = await api.get('/warranties', {
        params: {
          page: targetPage,
          limit: 4,
          search: searchTerm
        }
      });
      setWarranties(response.data.data);
      setMeta(response.data.meta);
    } catch (error) {
      console.error('Error fetching warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWarranties(true);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Control de Garantías
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Seguimiento detallado de piezas en camino o entregadas.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Buscar por orden, cliente o vehículo (Presiona Enter)..."
            className="modern-input"
            style={{ paddingLeft: '3rem', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Clock className="spin" size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p>Cargando registros de garantía...</p>
        </div>
      ) : (
        <>
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {warranties.map((warranty) => {
              const isExpired = warranty.days_left <= 0;
              const isCritical = warranty.days_left > 0 && warranty.days_left <= 7;

              return (
                <div key={warranty.id} className="glass-card card-hover warranty-wizard-card" style={{ padding: '1.5rem' }}>
                  <div className="warranty-wizard-topline" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' }}>
                    <div>
                      <div className="actions-row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="warranty-chip warranty-chip-primary" style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {warranty.order_code}
                        </span>
                        <span className="warranty-chip warranty-chip-soft" style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {warranty.product_type || 'Repuesto'}
                        </span>
                      </div>
                      <h3 className="font-outfit" style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginTop: '0.5rem', marginBottom: '0.35rem' }}>
                        {warranty.first_name} {warranty.last_name}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {warranty.brand ? `${warranty.year} ${warranty.brand} ${warranty.model}` : 'Vehículo no especificado'}
                      </p>
                    </div>
                    <div className="warranty-status-orb" style={{
                      padding: '0.5rem',
                      borderRadius: '12px',
                      background: isExpired ? 'rgba(239, 68, 68, 0.1)' : (isCritical ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                      color: isExpired ? 'var(--danger)' : (isCritical ? 'var(--warning)' : 'var(--success)')
                    }}>
                      {isExpired ? <AlertCircle size={24} /> : (isCritical ? <Clock size={24} /> : <CheckCircle size={24} />)}
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                    <div className="warranty-info-tile" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ color: 'var(--primary)' }}><Phone size={16} /></div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Teléfono</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>{warranty.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="warranty-info-tile" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ color: 'var(--primary)' }}><Car size={16} /></div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Vehículo</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                          {warranty.brand ? `${warranty.year} ${warranty.brand} ${warranty.model}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="warranty-progress-shell" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Días restantes:</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: isExpired ? 'var(--danger)' : (isCritical ? 'var(--warning)' : 'var(--success)') 
                      }}>
                        {isExpired ? 'EXPIRADA' : `${warranty.days_left} días`}
                      </span>
                    </div>
                    <div className="warranty-progress-track" style={{ height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.max(0, Math.min(100, (warranty.days_left / warranty.warranty_days) * 100))}%`,
                        background: isExpired ? 'var(--danger)' : (isCritical ? 'var(--warning)' : 'var(--success)'),
                        transition: 'width 0.5s ease-out'
                      }} />
                    </div>
                  </div>

                  <div className="warranty-date-band" style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Inicio</p>
                      <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {format(new Date(warranty.start_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <ArrowRight size={16} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Vence</p>
                      <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {format(new Date(warranty.end_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  <div className="actions-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      onClick={() => navigate(`/orders?search=${warranty.order_code}`)}
                    >
                      Ver Detalles de Orden
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {meta && meta.last_page > 1 && (
            <div className="actions-row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`modern-button secondary ${page === 1 ? 'disabled' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
              >
                <ChevronLeft size={18} /> Anterior
              </button>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                Página {page} de {meta.last_page}
              </span>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                className={`modern-button secondary ${page === meta.last_page ? 'disabled' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
              >
                Siguiente <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {!loading && warranties.length === 0 && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Calendar size={60} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No se encontraron garantías</h2>
          <p style={{ color: 'var(--text-secondary)' }}>No hay coincidencias para tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};

export default WarrantyPage;
