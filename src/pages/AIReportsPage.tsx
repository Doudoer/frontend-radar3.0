import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CalendarDays, Download, RefreshCcw, Sparkles, Trash2, TrendingUp, TriangleAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

interface ReportPayload {
  highlights?: string[];
  risks?: string[];
  actions?: string[];
  reportSuggestions?: string[];
  dataset?: {
    kpis?: {
      ordersCurrent?: number;
      revenueCurrent?: number;
      claimsOpen?: number;
      callsTotal?: number;
      avgDeliveryHours?: number;
      deliveredCount?: number;
      deliveredRevenue?: number;
      collectedAmount?: number;
      pendingBalance?: number;
      deliveriesWithPending?: number;
      avgTicket?: number;
      homeDelivery?: number;
      storePickup?: number;
      trackedOrders?: number;
      paidOrders?: number;
      preparingOrders?: number;
      trackedRevenue?: number;
      oldestOrderDate?: string;
      newestOrderDate?: string;
    };
    financialByPaymentMethod?: Array<{
      paymentMethod: string;
      deliveries: number;
      grossAmount: number;
      collectedAmount: number;
      pendingAmount: number;
    }>;
    deliveryDetails?: Array<{
      id: number;
      orderCode: string;
      deliveredAt: string;
      vehicle: string;
      productType: string;
      productSpecs: string;
      customerName: string;
      customerPhone?: string | null;
      price: number;
      coreFee: number;
      downPayment: number;
      paymentMethod: string;
    }>;
    statusRequestDetails?: Array<{
      id: number;
      orderCode: string;
      status: string;
      createdAt: string;
      vehicle: string;
      year?: number;
      brand?: string;
      model?: string;
      subModel?: string;
      vin?: string;
      stockNr?: string;
      productType?: string;
      productSpecs?: string;
      description?: string;
      customerName: string;
      customerPhone?: string | null;
      price: number;
      coreFee: number;
      total: number;
    }>;
  };
}

interface WeeklyReport {
  id: number;
  reportType?: string;
  title: string;
  summary: string;
  weekStart: string;
  weekEnd: string;
  model?: string;
  createdAt: string;
  payload?: ReportPayload | null;
}

const AIReportsPage: React.FC = () => {
  const [reportMode, setReportMode] = useState<'weekly' | 'deliveries-weekly' | 'status-request'>('weekly');
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [statusRequestRange, setStatusRequestRange] = useState(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      date_from: start.toISOString().slice(0, 10),
      date_to: end,
    };
  });

  const fetchReports = async () => {
    try {
      const endpoint =
        reportMode === 'weekly'
          ? '/ai/reports/weekly'
          : reportMode === 'deliveries-weekly'
            ? '/ai/reports/deliveries-weekly'
            : '/ai/reports/status-request';
      const resp = await api.get(endpoint, { params: { limit: 12 } });
      const list = Array.isArray(resp.data) ? resp.data : [];
      setReports(list);
      setSelectedId(list[0]?.id || null);
    } catch (error) {
      toast.error('No se pudieron cargar los reportes IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    fetchReports();
  }, [reportMode]);

  const handleGenerate = async () => {
    if (isStatusRequestMode && (!statusRequestRange.date_from || !statusRequestRange.date_to)) {
      toast.error('Debes seleccionar desde y hasta para generar la solicitud de estatus');
      return;
    }

    setGenerating(true);
    toast.loading('Analizando datos y generando reporte IA...', { id: 'ai-report' });
    try {
      const endpoint =
        reportMode === 'weekly'
          ? '/ai/reports/weekly/generate'
          : reportMode === 'deliveries-weekly'
            ? '/ai/reports/deliveries-weekly/generate'
            : '/ai/reports/status-request/generate';
      const resp = await api.post(
        endpoint,
        isStatusRequestMode ? statusRequestRange : undefined
      );
      const created = resp.data;

      await fetchReports();
      if (created?.id) {
        setSelectedId(created.id);
      }
      toast.success('Reporte semanal generado', { id: 'ai-report' });
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error al generar reporte semanal';
      toast.error(msg, { id: 'ai-report' });
    } finally {
      setGenerating(false);
    }
  };

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedId) || reports[0] || null,
    [reports, selectedId]
  );

  const kpis = selectedReport?.payload?.dataset?.kpis;
  const suggestions = selectedReport?.payload?.reportSuggestions || [];
  const deliveryDetails = selectedReport?.payload?.dataset?.deliveryDetails || [];
  const financeByMethod = selectedReport?.payload?.dataset?.financialByPaymentMethod || [];
  const statusRequestDetails = selectedReport?.payload?.dataset?.statusRequestDetails || [];
  const isDeliveriesMode = reportMode === 'deliveries-weekly';
  const isStatusRequestMode = reportMode === 'status-request';

  const handleDeleteReport = async (reportId: number) => {
    try {
      await api.delete(`/ai/reports/${reportId}`);
      toast.success('Reporte eliminado');
      await fetchReports();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo eliminar el reporte');
    }
  };

  const escapeHtml = (value: any) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const fmtMoney = (value: any) => Number(value || 0).toFixed(2);

  const handleExportDetailedPDF = (mode: 'full' | 'status-list' = 'full') => {
    if (!selectedReport) {
      toast.error('Selecciona un reporte para exportar');
      return;
    }

    const highlights = selectedReport.payload?.highlights || [];
    const risks = selectedReport.payload?.risks || [];
    const actions = selectedReport.payload?.actions || [];
    const suggestionsList = selectedReport.payload?.reportSuggestions || [];
    const now = new Date().toLocaleString('es-ES');

    const kpiRows = isDeliveriesMode
      ? [
          ['Entregas', kpis?.deliveredCount || 0],
          ['Ingresos Entregados', `$${fmtMoney(kpis?.deliveredRevenue)}`],
          ['Cobrado', `$${fmtMoney(kpis?.collectedAmount)}`],
          ['Pendiente', `$${fmtMoney(kpis?.pendingBalance)}`],
          ['Ticket Promedio', `$${fmtMoney(kpis?.avgTicket)}`],
          ['Entrega a Domicilio', kpis?.homeDelivery || 0],
          ['Retiro en Tienda', kpis?.storePickup || 0],
        ]
      : isStatusRequestMode
        ? [
            ['Ordenes a solicitar estatus', kpis?.trackedOrders || 0],
            ['Pagadas', kpis?.paidOrders || 0],
            ['En Preparacion', kpis?.preparingOrders || 0],
            ['Monto Total', `$${fmtMoney(kpis?.trackedRevenue)}`],
            ['Mas antigua', kpis?.oldestOrderDate || 'N/A'],
            ['Mas reciente', kpis?.newestOrderDate || 'N/A'],
          ]
      : [
          ['Ordenes', kpis?.ordersCurrent || 0],
          ['Ingresos', `$${fmtMoney(kpis?.revenueCurrent)}`],
          ['Reclamos Abiertos', kpis?.claimsOpen || 0],
          ['Llamadas', kpis?.callsTotal || 0],
          ['Tiempo Entrega (h)', kpis?.avgDeliveryHours || 0],
        ];

    const kpiHtml = kpiRows
      .map(([label, val]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(val)}</td></tr>`)
      .join('');

    const listToHtml = (items: string[]) =>
      items.length
        ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '<p class="muted">Sin datos.</p>';

    const financeTableHtml = isDeliveriesMode
      ? `
        <h3>Detalle Financiero por Metodo de Pago</h3>
        ${financeByMethod.length === 0 ? '<p class="muted">Sin detalle financiero para esta semana.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Metodo</th>
                <th>Entregas</th>
                <th>Monto Bruto</th>
                <th>Cobrado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${financeByMethod.map((row) => `
                <tr>
                  <td>${escapeHtml(row.paymentMethod)}</td>
                  <td>${escapeHtml(row.deliveries)}</td>
                  <td>$${escapeHtml(fmtMoney(row.grossAmount))}</td>
                  <td>$${escapeHtml(fmtMoney(row.collectedAmount))}</td>
                  <td>$${escapeHtml(fmtMoney(row.pendingAmount))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      `
      : '';

    const deliveriesTableHtml = isDeliveriesMode
      ? `
        <h3>Detalle de Entregas de la Semana</h3>
        ${deliveryDetails.length === 0 ? '<p class="muted">Sin entregas para esta semana.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha Entrega</th>
                <th>Vehiculo</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Total</th>
                <th>Cobrado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${deliveryDetails.map((d) => {
                const total = Number(d.price || 0) + Number(d.coreFee || 0);
                const pending = total - Number(d.downPayment || 0);
                return `
                  <tr>
                    <td>${escapeHtml(d.orderCode)}</td>
                    <td>${escapeHtml(d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString('es-ES') : '-')}</td>
                    <td>${escapeHtml(d.vehicle || '-')}</td>
                    <td>${escapeHtml(d.customerName || '-')}</td>
                    <td>${escapeHtml(d.productType || '-')}</td>
                    <td>$${escapeHtml(fmtMoney(total))}</td>
                    <td>$${escapeHtml(fmtMoney(d.downPayment || 0))}</td>
                    <td>$${escapeHtml(fmtMoney(pending))}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      `
      : '';

    const statusRequestTableHtml = isStatusRequestMode
      ? `
        <h3>Ordenes para Solicitud de Estatus</h3>
        ${statusRequestDetails.length === 0 ? '<p class="muted">Sin ordenes en Pagado o En Preparacion.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha Creacion</th>
                <th>Vehiculo</th>
                <th>Descripcion</th>
                <th>Cliente</th>
                <th>Telefono</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              ${statusRequestDetails.map((d) => `
                <tr>
                  <td>${escapeHtml(d.orderCode)}</td>
                  <td>${escapeHtml(d.createdAt ? new Date(d.createdAt).toLocaleDateString('es-ES') : '-')}</td>
                  <td>${escapeHtml(d.vehicle || '-')}</td>
                  <td>${escapeHtml(d.description || '-')}</td>
                  <td>${escapeHtml(d.customerName || '-')}</td>
                  <td>${escapeHtml(d.customerPhone || '-')}</td>
                  <td>$${escapeHtml(fmtMoney(d.total || d.price || 0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      `
      : '';

    if (mode === 'status-list' && isStatusRequestMode) {
      const listOnlyHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(selectedReport.title)} - Lista de Ordenes</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 18px; font-size: 11px; }
    h1 { margin: 0 0 6px 0; font-size: 20px; color: #1d4ed8; }
    .meta { color: #475569; font-size: 10px; margin-bottom: 10px; }
    h3 { margin: 12px 0 6px 0; font-size: 12px; color: #1e293b; }
    .muted { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #1d4ed8; color: white; text-align: left; padding: 6px; font-size: 9px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px; font-size: 9px; vertical-align: top; }
    .footer { margin-top: 14px; color: #64748b; font-size: 9px; text-align: center; }
    @media print { @page { size: landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(selectedReport.title)} - Solo Lista</h1>
  <div class="meta">
    Rango: ${escapeHtml(new Date(selectedReport.weekStart).toLocaleDateString('es-ES'))} - ${escapeHtml(new Date(selectedReport.weekEnd).toLocaleDateString('es-ES'))}<br/>
    Generado: ${escapeHtml(now)}
  </div>
  ${statusRequestTableHtml}
  <div class="footer">RADAR V2 - Solicitud de estatus (solo lista)</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

      const listBlob = new Blob([listOnlyHtml], { type: 'text/html;charset=utf-8' });
      const listUrl = URL.createObjectURL(listBlob);
      const listWin = window.open(listUrl, '_blank', 'width=1280,height=900');

      if (!listWin) {
        toast.error('El navegador bloqueo la ventana del PDF');
        URL.revokeObjectURL(listUrl);
        return;
      }

      setTimeout(() => URL.revokeObjectURL(listUrl), 15000);
      toast.success('PDF de solo lista preparado para imprimir/guardar');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(selectedReport.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 18px; font-size: 11px; }
    h1 { margin: 0 0 6px 0; font-size: 20px; color: #1d4ed8; }
    h2 { margin: 16px 0 8px 0; font-size: 14px; color: #0f172a; }
    h3 { margin: 14px 0 6px 0; font-size: 12px; color: #1e293b; }
    .meta { color: #475569; font-size: 10px; margin-bottom: 10px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .muted { color: #64748b; }
    ul { margin: 6px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #1d4ed8; color: white; text-align: left; padding: 6px; font-size: 9px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px; font-size: 9px; vertical-align: top; }
    .footer { margin-top: 14px; color: #64748b; font-size: 9px; text-align: center; }
    @media print { @page { size: landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(selectedReport.title)}</h1>
  <div class="meta">
    Semana: ${escapeHtml(new Date(selectedReport.weekStart).toLocaleDateString('es-ES'))} - ${escapeHtml(new Date(selectedReport.weekEnd).toLocaleDateString('es-ES'))}<br/>
    Tipo: ${escapeHtml(isDeliveriesMode ? 'Entregas Semanales' : isStatusRequestMode ? 'Solicitud de Estatus' : 'Reporte Operativo Semanal')}<br/>
    Modelo IA: ${escapeHtml(selectedReport.model || 'N/A')}<br/>
    Generado: ${escapeHtml(now)}
  </div>

  <div class="card">
    <h2>Resumen Ejecutivo</h2>
    <p>${escapeHtml(selectedReport.summary || '-')}</p>
  </div>

  <div class="card">
    <h2>KPIs</h2>
    <table>
      <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
      <tbody>${kpiHtml}</tbody>
    </table>
  </div>

  <div class="grid-3">
    <div class="card">
      <h3>Hallazgos</h3>
      ${listToHtml(highlights)}
    </div>
    <div class="card">
      <h3>Riesgos</h3>
      ${listToHtml(risks)}
    </div>
    <div class="card">
      <h3>Acciones Recomendadas</h3>
      ${listToHtml(actions)}
    </div>
  </div>

  <div class="card">
    <h2>Sugerencias de Reportes</h2>
    ${listToHtml(suggestionsList)}
  </div>

  ${financeTableHtml}
  ${deliveriesTableHtml}
  ${statusRequestTableHtml}

  <div class="footer">RADAR V2 - Reporte IA detallado</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=1280,height=900');

    if (!win) {
      toast.error('El navegador bloqueo la ventana del PDF');
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 15000);
    toast.success('PDF detallado preparado para imprimir/guardar');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            Reportes Generados por IA
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Analisis semanal de operacion, riesgo y oportunidades para decisiones de direccion.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => setReportMode('weekly')}
              style={{
                background: reportMode === 'weekly' ? 'var(--gradient-primary)' : 'var(--input-bg)',
                color: reportMode === 'weekly' ? 'white' : 'var(--text-main)',
                border: '1px solid var(--glass-border)'
              }}
            >
              Reporte Operativo Semanal
            </button>
            <button
              className="btn"
              onClick={() => setReportMode('deliveries-weekly')}
              style={{
                background: reportMode === 'deliveries-weekly' ? 'var(--gradient-primary)' : 'var(--input-bg)',
                color: reportMode === 'deliveries-weekly' ? 'white' : 'var(--text-main)',
                border: '1px solid var(--glass-border)'
              }}
            >
              Entregas Semanales
            </button>
            <button
              className="btn"
              onClick={() => setReportMode('status-request')}
              style={{
                background: reportMode === 'status-request' ? 'var(--gradient-primary)' : 'var(--input-bg)',
                color: reportMode === 'status-request' ? 'white' : 'var(--text-main)',
                border: '1px solid var(--glass-border)'
              }}
            >
              Solicitud de Estatus
            </button>
          </div>
          {isStatusRequestMode && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Desde
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={statusRequestRange.date_from}
                  onChange={(e) => setStatusRequestRange((prev) => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Hasta
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={statusRequestRange.date_to}
                  onChange={(e) => setStatusRequestRange((prev) => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
        <div className="page-header-actions">
          {isStatusRequestMode ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => handleExportDetailedPDF('full')}
                disabled={!selectedReport}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} />
                PDF Completo
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExportDetailedPDF('status-list')}
                disabled={!selectedReport}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} />
                Solo Lista de Ordenes
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => handleExportDetailedPDF('full')}
              disabled={!selectedReport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              PDF Detallado
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={fetchReports}
            disabled={loading || generating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || (isStatusRequestMode && (!statusRequestRange.date_from || !statusRequestRange.date_to))}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            {generating ? 'Generando...' : isDeliveriesMode ? 'Generar Reporte de Entregas' : isStatusRequestMode ? 'Generar Solicitud de Estatus' : 'Generar Reporte Semanal'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <aside className="glass-card" style={{ padding: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 className="font-outfit" style={{ fontSize: '1rem', margin: '0.5rem 0.6rem 0.75rem 0.6rem' }}>
            {isDeliveriesMode ? 'Historial de Entregas' : isStatusRequestMode ? 'Historial de Solicitudes' : 'Historial Semanal'}
          </h3>

          {loading ? (
            <div className="skeleton" style={{ height: '120px' }} />
          ) : reports.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No hay reportes aun. Genera el primero para iniciar el historial.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reports.map((report) => {
                const active = report.id === selectedReport?.id;
                return (
                  <div
                    key={report.id}
                    style={{
                      border: active ? '1px solid rgba(51,102,255,0.45)' : '1px solid var(--glass-border)',
                      background: active ? 'rgba(51,102,255,0.08)' : 'var(--input-bg)',
                      borderRadius: '10px',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <button
                        onClick={() => setSelectedId(report.id)}
                        style={{
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      {new Date(report.weekStart).toLocaleDateString()} - {new Date(report.weekEnd).toLocaleDateString()}
                    </p>
                    <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>{report.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Generado: {new Date(report.createdAt).toLocaleString()}
                    </p>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportToDelete(report.id);
                        }}
                        style={{ padding: '0.35rem', color: '#ef4444', flexShrink: 0 }}
                        title="Eliminar reporte"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <section className="glass-card" style={{ padding: '1.25rem' }}>
          {!selectedReport ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Selecciona un reporte del historial para ver detalle.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <h2 className="font-outfit" style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{selectedReport.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Semana {new Date(selectedReport.weekStart).toLocaleDateString()} - {new Date(selectedReport.weekEnd).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Modelo: {selectedReport.model || 'N/A'}
                </div>
              </div>

              {kpis && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.65rem',
                  marginBottom: '1rem'
                }}>
                  {isDeliveriesMode ? (
                    <>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Entregas</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.deliveredCount || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ingresos Entregados</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.deliveredRevenue || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cobrado</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.collectedAmount || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pendiente</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.pendingBalance || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ticket Promedio</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.avgTicket || 0}</p>
                      </div>
                    </>
                  ) : isStatusRequestMode ? (
                    <>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ordenes</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.trackedOrders || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pagadas</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.paidOrders || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>En Preparacion</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.preparingOrders || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monto Total</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.trackedRevenue || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mas Antigua</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.oldestOrderDate || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ordenes</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.ordersCurrent || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ingresos</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${kpis.revenueCurrent || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reclamos Abiertos</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.claimsOpen || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Llamadas</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.callsTotal || 0}</p>
                      </div>
                      <div className="glass-card" style={{ padding: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tiempo Entrega (h)</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{kpis.avgDeliveryHours || 0}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isDeliveriesMode && (
                <>
                  <div className="glass-card" style={{ padding: '1rem', marginBottom: '0.9rem' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.6rem' }}>Detalle Financiero por Metodo de Pago</p>
                    {financeByMethod.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay datos financieros de entregas para esta semana.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: '620px' }}>
                          <thead>
                            <tr>
                              <th>Metodo</th>
                              <th>Entregas</th>
                              <th>Monto Bruto</th>
                              <th>Cobrado</th>
                              <th>Pendiente</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financeByMethod.map((row, idx) => (
                              <tr key={`${row.paymentMethod}-${idx}`}>
                                <td>{row.paymentMethod}</td>
                                <td>{row.deliveries}</td>
                                <td>${row.grossAmount}</td>
                                <td>${row.collectedAmount}</td>
                                <td>${row.pendingAmount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: '1rem', marginBottom: '0.9rem' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.6rem' }}>Detalle de Entregas de la Semana</p>
                    {deliveryDetails.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay entregas registradas para esta semana.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: '840px' }}>
                          <thead>
                            <tr>
                              <th>Orden</th>
                              <th>Fecha Entrega</th>
                              <th>Vehiculo</th>
                              <th>Cliente</th>
                              <th>Tipo</th>
                              <th>Total</th>
                              <th>Cobrado</th>
                              <th>Pendiente</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveryDetails.map((d) => {
                              const total = Number(d.price || 0) + Number(d.coreFee || 0);
                              const pending = total - Number(d.downPayment || 0);
                              return (
                                <tr key={d.id}>
                                  <td>{d.orderCode}</td>
                                  <td>{d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '-'}</td>
                                  <td>{d.vehicle || '-'}</td>
                                  <td>{d.customerName || '-'}</td>
                                  <td>{d.productType || '-'}</td>
                                  <td>${total}</td>
                                  <td>${Number(d.downPayment || 0)}</td>
                                  <td>${pending}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isStatusRequestMode && (
                <div className="glass-card" style={{ padding: '1rem', marginBottom: '0.9rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.6rem' }}>Ordenes para Solicitud de Estatus</p>
                  {statusRequestDetails.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay ordenes en Pagado o En Preparacion.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ minWidth: '1250px' }}>
                        <thead>
                          <tr>
                            <th>Orden</th>
                            <th>Fecha Creacion</th>
                            <th>Vehiculo</th>
                            <th>Descripcion</th>
                            <th>Cliente</th>
                            <th>Telefono</th>
                            <th>Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statusRequestDetails.map((row) => (
                            <tr key={row.id}>
                              <td>{row.orderCode}</td>
                              <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-ES') : '-'}</td>
                              <td>{row.vehicle || '-'}</td>
                              <td>{row.description || '-'}</td>
                              <td>{row.customerName || '-'}</td>
                              <td>{row.customerPhone || '-'}</td>
                              <td>${row.total || row.price || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="glass-card" style={{ padding: '1rem', marginBottom: '0.9rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Bot size={16} /> Resumen Ejecutivo
                </p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>{selectedReport.summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.8rem' }}>
                <div className="glass-card" style={{ padding: '0.9rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <TrendingUp size={15} /> Hallazgos
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
                    {(selectedReport.payload?.highlights || []).map((item, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card" style={{ padding: '0.9rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <TriangleAlert size={15} /> Riesgos
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
                    {(selectedReport.payload?.risks || []).map((item, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card" style={{ padding: '0.9rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.45rem' }}>Acciones Recomendadas</p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
                    {(selectedReport.payload?.actions || []).map((item, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem', marginTop: '0.9rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.55rem' }}>Sugerencias de reportes semanales a crear</p>
                {suggestions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Genera un nuevo reporte IA para recibir sugerencias dinamicas.
                  </p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
                    {suggestions.map((item, i) => (
                      <li key={i} style={{ marginBottom: '0.3rem' }}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={reportToDelete !== null}
        title="Eliminar reporte IA"
        message="¿Eliminar este reporte del historial?"
        confirmText="Eliminar"
        danger
        onClose={() => setReportToDelete(null)}
        onConfirm={async () => {
          if (reportToDelete === null) return;
          await handleDeleteReport(reportToDelete);
          setReportToDelete(null);
        }}
      />
    </div>
  );
};

export default AIReportsPage;
