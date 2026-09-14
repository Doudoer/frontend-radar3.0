import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  Bell,
  Bot,
  Clock,
  HeartHandshake,
  Loader2,
  Package,
  RefreshCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

type PeriodKey = 'day' | 'week' | 'month';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'day', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const PIE_COLORS = ['#2e90fa', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

const normalizeNotificationsPayload = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  return [];
};

const normalizeDashboardPayload = (payload: any, period: PeriodKey) => {
  const stats = payload?.stats || {};
  const latestOrders = Array.isArray(payload?.latestOrders) ? payload.latestOrders : [];

  const orders = Number(stats.orders || 0);
  const customers = Number(stats.customers || 0);
  const warranties = Number(stats.warranties || 0);
  const invoices = Number(stats.invoices || 0);

  return {
    currentPeriodSales: 0,
    weeklySales: 0,
    activeOrders: orders,
    newLeads: customers,
    pendingClaims: warranties,
    avgProcessingTime: 0,
    conversionRate: 0,
    retentionRate: 0,
    chartData: [],
    statusDistribution: [],
    statusDistributionAll: [],
    legacyOverview: {
      totalCustomers: customers,
      totalInvoices: invoices,
      totalWarranties: warranties,
    },
    topBrands: [],
    qualityMetrics: [],
    periodLabel: period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes',
    latestOrders,
  };
};

const formatCurrency = (value: number) => {
  const safe = Number(value || 0);
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(safe);
};

const formatCompactCurrency = (value: number) => {
  const safe = Number(value || 0);
  if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`;
  if (safe >= 1_000) return `$${(safe / 1_000).toFixed(1)}k`;
  return `$${safe}`;
};

const StatCard = ({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) => (
  <article className={`dashboard-stat dashboard-stat-${tone}`}>
    <div className="dashboard-stat-head">
      <span className="dashboard-stat-label">{label}</span>
      <span className="dashboard-stat-icon">{icon}</span>
    </div>
    <p className="dashboard-stat-value">{value}</p>
  </article>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(normalizeNotificationsPayload(response.data));
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    try {
      let executedScan = false;

      for (const endpoint of ['/notifications/mock-stale', '/notifications/trigger-scan']) {
        try {
          await api.get(endpoint);
          executedScan = true;
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            throw error;
          }
        }
      }

      await fetchNotifications();
      if (executedScan) {
        toast.success('Análisis completado. Se actualizaron las alertas internas.');
      } else {
        toast('Escaneo IA no disponible en este entorno. Se recargaron las alertas actuales.');
      }
    } catch (_err) {
      toast.error('No se pudo ejecutar el análisis IA.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/dashboard/stats', { params: { period } });
        setStats(response.data);
      } catch (fetchError: any) {
        const status = fetchError?.response?.status;

        if (status === 404) {
          try {
            const fallbackResponse = await api.get('/dashboard', { params: { period } });
            setStats(normalizeDashboardPayload(fallbackResponse.data, period));
            return;
          } catch (fallbackError) {
            console.error('Error fetching fallback dashboard data:', fallbackError);
          }
        }

        console.error('Error fetching dashboard stats:', fetchError);
        setError('No se pudo cargar el dashboard. Revisa la conexión con API y base de datos.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchNotifications();
  }, [period]);

  const realStatusOptions = useMemo(
    () => [
      'Cotización',
      'Pagado',
      'En Preparación',
      'Listo para Despacho',
      'Listo para Retiro',
      'Entregado',
      'Cancelado',
      'Reembolsado',
    ],
    []
  );

  if (loading) {
    return (
      <section className="dashboard-root dashboard-center">
        <Loader2 size={36} color="var(--accent-primary)" />
        <p className="dashboard-muted">Cargando métricas...</p>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="dashboard-root dashboard-center">
        <div className="glass-card dashboard-error-card">
          <AlertCircle size={34} color="var(--danger)" />
          <h2 className="font-outfit">No fue posible cargar el dashboard</h2>
          <p className="dashboard-muted">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  const {
    currentPeriodSales,
    weeklySales,
    activeOrders,
    newLeads,
    pendingClaims,
    avgProcessingTime,
    conversionRate,
    retentionRate,
    chartData,
    statusDistribution,
    statusDistributionAll,
    legacyOverview,
    topBrands,
    qualityMetrics,
    periodLabel,
  } = stats;

  const getRealStatusCount = (statusName: string) => {
    const found = (statusDistributionAll || []).find(
      (row: any) => String(row?.name || '').toLowerCase() === statusName.toLowerCase()
    );
    return Number(found?.value || 0);
  };

  return (
    <section className="dashboard-root">
      <header className="dashboard-header glass-card">
        <div>
          <h1 className="font-outfit">Radar Overview</h1>
          <p className="dashboard-muted">Diseño minimalista con foco en decisiones rápidas y lectura clara.</p>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-period-toggle" role="tablist" aria-label="Filtro de periodo">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={period === item.key}
                className={period === item.key ? 'is-active' : ''}
                onClick={() => setPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-secondary" disabled={scanning} onClick={triggerScan}>
            {scanning ? <Loader2 size={15} /> : <RefreshCcw size={15} />}
            Actualizar IA
          </button>
        </div>
      </header>

      <div className="dashboard-stats-grid">
        <StatCard
          label={`Ventas (${periodLabel})`}
          value={formatCurrency(Number(currentPeriodSales || 0))}
          icon={<TrendingUp size={18} />}
          tone="default"
        />
        <StatCard
          label="Ventas semana"
          value={formatCurrency(Number(weeklySales || 0))}
          icon={<TrendingUp size={18} />}
          tone="success"
        />
        <StatCard
          label="Órdenes activas"
          value={Number(activeOrders || 0)}
          icon={<Package size={18} />}
          tone="default"
        />
        <StatCard
          label={`Leads ${period === 'day' ? 'hoy' : period === 'week' ? 'semana' : 'mes'}`}
          value={Number(newLeads || 0)}
          icon={<Users size={18} />}
          tone="warning"
        />
        <StatCard
          label="Reclamos pendientes"
          value={Number(pendingClaims || 0)}
          icon={<AlertCircle size={18} />}
          tone="danger"
        />
        <StatCard
          label="Retención"
          value={`${Number(retentionRate || 0)}%`}
          icon={<HeartHandshake size={18} />}
          tone="success"
        />
      </div>

      <div className="dashboard-panels-grid">
        <article className="glass-card dashboard-panel panel-large">
          <div className="dashboard-panel-head">
            <h3 className="font-outfit">Tendencia de ventas</h3>
            <span className="dashboard-muted">Ingresos en el periodo</span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2e90fa" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#2e90fa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft-divider)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--text-secondary)"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  color: 'var(--text-main)',
                }}
                formatter={(value: any) => formatCurrency(Number(value || 0))}
              />
              <Area type="monotone" dataKey="sales" stroke="#2e90fa" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="glass-card dashboard-panel">
          <div className="dashboard-panel-head">
            <h3 className="font-outfit">Distribución de órdenes</h3>
            <span className="dashboard-muted">Estatus actual</span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={statusDistribution || []} cx="50%" cy="50%" innerRadius={58} outerRadius={86} dataKey="value">
                {(statusDistribution || []).map((_item: any, index: number) => (
                  <Cell key={`slice-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  color: 'var(--text-main)',
                }}
              />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </div>

      <div className="dashboard-panels-grid">
        <article className="glass-card dashboard-panel">
          <div className="dashboard-panel-head">
            <h3 className="font-outfit">Marcas más vendidas</h3>
            <span className="dashboard-muted">Top por volumen</span>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={topBrands || []} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft-divider)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={95} />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  color: 'var(--text-main)',
                }}
              />
              <Bar dataKey="orders" fill="#16a34a" radius={[0, 8, 8, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="glass-card dashboard-panel">
          <div className="dashboard-panel-head">
            <h3 className="font-outfit">Índice de calidad</h3>
            <span className="dashboard-muted">Relación entre órdenes y reclamos</span>
          </div>

          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={qualityMetrics || []}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft-divider)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis yAxisId="left" stroke="var(--text-secondary)" />
              <YAxis yAxisId="right" orientation="right" stroke="#ef4444" unit="%" />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  color: 'var(--text-main)',
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="total" name="Órdenes" fill="#2e90fa" opacity={0.35} barSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="rate" name="% Reclamo" stroke="#ef4444" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </article>
      </div>

      <div className="dashboard-kpi-row">
        <article className="glass-card dashboard-mini-kpi">
          <Clock size={18} />
          <div>
            <span className="dashboard-muted">Tiempo promedio</span>
            <strong>{Number(avgProcessingTime || 0)} días</strong>
          </div>
        </article>
        <article className="glass-card dashboard-mini-kpi">
          <Target size={18} />
          <div>
            <span className="dashboard-muted">Conversión</span>
            <strong>{Number(conversionRate || 0)}%</strong>
          </div>
        </article>
        <article className="glass-card dashboard-mini-kpi">
          <Users size={18} />
          <div>
            <span className="dashboard-muted">Clientes</span>
            <strong>{Number(legacyOverview?.totalCustomers || 0)}</strong>
          </div>
        </article>
      </div>

      <article className="glass-card dashboard-panel">
        <div className="dashboard-panel-head">
          <h3 className="font-outfit">Órdenes por estatus</h3>
          <span className="dashboard-muted">Vista rápida operativa</span>
        </div>

        <div className="dashboard-status-grid">
          {realStatusOptions.map((statusName) => (
            <div key={statusName} className="dashboard-status-chip">
              <span>{statusName}</span>
              <strong>{getRealStatusCount(statusName)}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="glass-card dashboard-panel">
        <div className="dashboard-panel-head">
          <h3 className="font-outfit" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="var(--accent-primary)" />
            Alertas inteligentes
          </h3>
          <span className="dashboard-muted">Lectura clara para acción inmediata</span>
        </div>

        {notifications.length === 0 ? (
          <div className="dashboard-empty-state">
            <ShieldCheck size={24} color="var(--success)" />
            <p className="dashboard-muted">No hay alertas críticas en este momento.</p>
          </div>
        ) : (
          <div className="dashboard-alerts-grid">
            {notifications.map((notif) => (
              <article key={notif.id} className="dashboard-alert-card">
                <div className="dashboard-alert-icon">
                  <Bell size={16} color={notif.priority === 'high' ? '#ef4444' : 'var(--accent-primary)'} />
                </div>

                <div>
                  <div className="dashboard-alert-top">
                    <h4>{notif.title}</h4>
                    <span className="dashboard-alert-owner">
                      <Bot size={11} /> {notif.specialist || 'system'}
                    </span>
                  </div>
                  <p className="dashboard-muted">{notif.message}</p>
                  {notif.link && (
                    <button type="button" className="dashboard-link-btn" onClick={() => navigate(notif.link)}>
                      Ver detalle
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
};

export default Dashboard;
