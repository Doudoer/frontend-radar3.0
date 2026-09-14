export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (val: any) => string;
}

// ─── Helper: force-download any Blob ─────────────────────────────────────────

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
};

// ─── Excel via CSV (opens natively in Excel/Sheets) ──────────────────────────

export const exportToExcel = (data: any[], columns: ExportColumn[], filename: string) => {
  const escape = (val: any): string => {
    const str = val == null ? '' : String(val);
    // Wrap in quotes if contains comma, newline or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = columns.map(c => escape(c.header)).join(',');
  const dataRows = data.map(row =>
    columns.map(col => {
      const raw = row[col.key];
      const val = col.formatter ? col.formatter(raw) : (raw ?? '');
      return escape(val);
    }).join(',')
  );

  const csv = [headerRow, ...dataRows].join('\r\n');
  // BOM for UTF-8 so Excel opens accented chars correctly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

// ─── PDF via Print Window ────────────────────────────────────────────────────

export const exportToPDF = (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title: string
) => {
  const headerCells = columns.map(c => `<th>${c.header}</th>`).join('');
  const rows = data.map(row => {
    const cells = columns.map(col => {
      const raw = row[col.key];
      const val = col.formatter ? col.formatter(raw) : (raw ?? '-');
      return `<td>${val != null ? String(val) : '-'}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const now = new Date().toLocaleString('es-ES');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; padding: 20px; }
    .header { margin-bottom: 16px; border-bottom: 2px solid #3366ff; padding-bottom: 10px; }
    .header h1 { font-size: 20px; color: #3366ff; font-weight: 700; }
    .header p { font-size: 10px; color: #64748b; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #3366ff; color: white; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eff6ff; }
    .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: center; }
    @media print {
      body { padding: 10px; }
      @page { size: landscape; margin: 10mm; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Sistema de Gestión RADAR V2</p>
  </div>
  <div class="meta">
    <span>Total registros: <strong>${data.length}</strong></span>
    <span>Generado: ${now}</span>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">RADAR V2 &mdash; Reporte generado automáticamente</div>
  <script>
    window.onload = function() {
      document.title = '${filename}';
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const getLabelHTML = (order: any) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 10mm; text-align: center; color: #1e293b; }
        .wrap { border: 2px dashed #cbd5e1; padding: 20px; border-radius: 8px; }
        .logo { font-size: 24px; font-weight: 800; color: #3366ff; margin-bottom: 5px; }
        .sub-logo { font-size: 10px; color: #64748b; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
        .code { font-size: 32px; font-weight: 900; margin: 15px 0; padding: 10px; background: #f1f5f9; border-radius: 6px; }
        .vin { font-size: 14px; color: #475569; font-family: monospace; margin-bottom: 5px; }
        .vehicle { font-size: 18px; font-weight: 700; margin-bottom: 30px; }
        .dest { margin-top: 40px; font-weight: 500; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .dest strong { font-size: 18px; display: block; margin-bottom: 5px; color: #0f172a; }
        @media print {
            body { padding: 0; }
            @page { size: 4in 6in; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="logo">RADAR V2</div>
        <div class="sub-logo">Rodriguez Salvage Yard</div>
        <div class="code"># ${order.order_code}</div>
        <div class="vin">VIN: ${order.vin_nr || 'N/A'}</div>
        <div class="vehicle">${order.year || ''} ${order.brand || ''} ${order.model || ''}</div>
        <div class="dest">
            PARA: <strong>${order.first_name || ''} ${order.last_name || ''}</strong>
            ${order.address_shipping || 'Recoger en Tienda'}
        </div>
        <div style="margin-top: 50px; font-size: 9px; color: #94a3b8;">Generado: ${new Date().toLocaleString()}</div>
    </div>
    <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
</body>
</html>
`;

const getInvoiceHTML = (order: any, mode: 'downpayment' | 'final' | 'standard' = 'standard') => {
    const price = Number(order.price || 0);
    const coreFee = Number(order.core_fee || 0);
    const downPayment = Number(order.down_payment || 0);
    const subtotal = price + coreFee;
    const total = subtotal;
    const paid = downPayment;
    
    // Si es Down Payment, el total a mostrar es solo el abono
    const displayTotal = mode === 'downpayment' ? downPayment : total;
    const balanceDue = mode === 'final' ? 0 : Math.max(0, total - downPayment);
    
    const formatDate = (val: any) => val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-';
    
    const invoiceTitle = mode === 'downpayment' ? 'DOWN PAYMENT INVOICE' : mode === 'final' ? 'FINAL INVOICE' : 'INVOICE';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #334155; background: #fff; }
        
        .header-bg { 
            background: linear-gradient(135deg, #8b0000 0%, #b30000 100%); 
            color: white; 
            padding: 40px 50px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
        }
        
        .logo-area { display: flex; align-items: center; gap: 15px; }
        .logo-box { background: white; padding: 10px; border-radius: 4px; width: 140px; text-align: center; color: #b30000; font-weight: 900; font-size: 14px; border: 1px solid #ddd; }
        
        .brand-text { font-size: 16px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        
        .invoice-body { padding: 40px 50px; }
        
        .invoice-title-block { text-align: center; margin-bottom: 40px; }
        .invoice-title-block h1 { margin: 0; font-size: 56px; font-weight: 900; color: #1e293b; letter-spacing: -2px; line-height: 1; }
        .invoice-title-block p { margin: 10px 0 0; font-size: 24px; color: #94a3b8; font-weight: 600; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .meta-col h3 { font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; font-weight: 700; }
        .meta-col p { margin: 2px 0; font-size: 15px; color: #475569; font-weight: 600; }
        
        .table-header { background: #8b0000; color: white; display: grid; grid-template-columns: 3fr 1fr 1fr 1fr; padding: 12px 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; border-radius: 4px 4px 0 0; }
        .table-row { display: grid; grid-template-columns: 3fr 1fr 1fr 1fr; padding: 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .table-row .desc { font-weight: 800; color: #1e293b; font-size: 16px; }
        .table-row .sub-desc { color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 500; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-section { display: flex; justify-content: flex-end; margin-top: 30px; }
        .totals-grid { width: 340px; }
        .total-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; font-weight: 700; color: #475569; text-transform: uppercase; }
        .total-item span:last-child { color: #1e293b; }
        
        .balance-due-bar { background: #1e293b; color: white; padding: 15px 20px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 24px; font-weight: 800; border-radius: 4px; }
        
        @media print {
            body { padding: 0; }
            .invoice-body { padding: 30px 40px; }
        }
    </style>
</head>
<body>
    <div class="header-bg">
        <div class="logo-area">
            <img src="${window.location.origin}/assets/logo-rsy.png" style="height: 100px; width: auto; border-radius: 8px; background: white; padding: 5px;" alt="Logo RSY" onerror="this.src='https://via.placeholder.com/150?text=RSY+Logo'" />
        </div>
        <div class="brand-text">RODRÍGUEZ SALVAGE YARD</div>
    </div>

    <div class="invoice-body">
        <div class="invoice-title-block">
            <h1>INVOICE</h1>
            <p>${invoiceTitle}</p>
            <p style="font-size: 18px;">${formatDate(order.created_at)}</p>
        </div>

        <div class="meta-grid">
            <div class="meta-col">
                <h3>BILL TO:</h3>
                <p>${order.first_name || ''} ${order.last_name || ''}</p>
                <p style="font-weight: 400;">${order.customer_phone || '-'}</p>
            </div>
            <div class="meta-col text-right">
                <p><strong>NUMBER:</strong> <span style="color:#94a3b8">${order.order_code || '-'}</span></p>
                <p><strong>DATE:</strong> <span style="color:#94a3b8">${formatDate(order.created_at)}</span></p>
                <p><strong>TYPE:</strong> <span style="color:#94a3b8">${invoiceTitle}</span></p>
            </div>
        </div>

        <div class="table-header">
            <div>Description</div>
            <div class="text-center">Quantity</div>
            <div class="text-right">Unit price</div>
            <div class="text-right">Amount</div>
        </div>
        <div class="table-row">
            <div>
                <div class="desc">${order.year || ''} ${order.brand || ''} ${order.model || ''}</div>
                <div class="sub-desc">${mode === 'downpayment' ? 'Down payment' : 'Final payment'} ${order.product_type || 'part'}</div>
                ${mode === 'final' ? `<div style="margin-top: 8px; color: #10b981; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">✓ Warranty included: ${order.warranty_days || 30} Days</div>` : ''}
            </div>
            <div class="text-center">1</div>
            <div class="text-right">$${displayTotal.toFixed(2)}</div>
            <div class="text-right">$${displayTotal.toFixed(2)}</div>
        </div>

        <div class="totals-section">
            <div class="totals-grid">
                <div class="total-item"><span>Subtotal:</span> <span>$${displayTotal.toFixed(2)}</span></div>
                <div class="total-row">
                    <div class="total-item"><span>Total:</span> <span>$${displayTotal.toFixed(2)}</span></div>
                    <div class="total-item"><span>Paid:</span> <span>$${paid.toFixed(2)}</span></div>
                </div>
                <div class="balance-due-bar">
                    <span>BALANCE DUE</span>
                    <span>$${balanceDue.toFixed(2)}</span>
                </div>
            </div>
        </div>
    </div>
    <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
</body>
</html>
    `;
};

export const printOrderDirect = (order: any, type: 'label' | 'invoice', apiInstance?: any, userId?: number) => {
  let mode: 'downpayment' | 'final' | 'standard' = 'standard';
  
  if (type === 'invoice') {
    if (order.status === 'Pagado') mode = 'downpayment';
    else if (order.status === 'Entregado') mode = 'final';
    
    // Registro legal en segundo plano
    if (apiInstance) {
        apiInstance.post('/invoices', {
            order_id: order.id,
            invoice_number: order.order_code,
            type: mode === 'downpayment' ? 'Down Payment' : mode === 'final' ? 'Final' : 'Standard',
            amount: mode === 'downpayment' ? Number(order.down_payment || 0) : (Number(order.price || 0) + Number(order.core_fee || 0)),
            customer_name: `${order.first_name || ''} ${order.last_name || ''}`,
            user_id: userId
        }).catch((err: any) => console.error('Error al registrar factura legal:', err));
    }
  }

  const html = type === 'label' ? getLabelHTML(order) : getInvoiceHTML(order, mode);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=900,height=800');
  
  if (!win) {
    alert('El navegador bloqueó la ventana de impresión. Por favor, permite las ventanas emergentes.');
  }
  
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const exportStatusRequestPDF = (
  orders: any[],
  startDateStr: string,
  endDateStr: string
) => {
  const formatPartTypeAbbr = (type?: string) => {
    if (!type) return 'PIEZA';
    const t = type.toLowerCase();
    if (t.includes('transmission') || t.includes('transmisión')) return 'TRA';
    if (t.includes('engine') || t.includes('motor')) return 'ENG';
    if (t.includes('transfer')) return 'TC';
    if (t.includes('core')) return 'CORE';
    return type.slice(0, 3).toUpperCase();
  };

  const formatDateShort = (dStr?: string) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatInputDateDisplay = (dStr?: string) => {
    if (!dStr) return '-';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return formatDateShort(dStr);
  };

  const getCustomerName = (o: any) => {
    const full = [o.first_name, o.last_name].filter(Boolean).join(' ');
    return full || o.customer_name || 'Cliente';
  };

  const getSpecsOrDesc = (o: any) => {
    const specs = (o.product_specs || '').trim();
    const desc = (o.description || '').trim();
    if (specs && desc && specs.toLowerCase() !== desc.toLowerCase()) {
      return `${specs}, ${desc}`;
    }
    return specs || desc || '-';
  };

  const rowsHtml = orders.map((o, idx) => {
    const dateFormatted = formatDateShort(o.created_at || o.purchase_date);
    const customer = getCustomerName(o);
    const year = o.year || '-';
    const brand = (o.brand || '-').toUpperCase();
    const model = o.model || '-';
    const typeAbbr = formatPartTypeAbbr(o.product_type);
    const specs = getSpecsOrDesc(o);
    const bg = idx % 2 === 0 ? '#b9e0f2' : '#ffffff';

    return `<tr style="background: ${bg};">
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; font-weight: 500; font-family: Arial, sans-serif;">${dateFormatted}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; font-weight: 600; font-family: Arial, sans-serif;">${customer}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; text-align: center; font-family: Arial, sans-serif;">${year}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; font-weight: 700; font-family: Arial, sans-serif;">${brand}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; font-family: Arial, sans-serif;">${model}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; font-weight: 700; text-align: center; font-family: Arial, sans-serif;">${typeAbbr}</td>
      <td style="padding: 7px 9px; border: 1px solid #111; font-size: 11px; line-height: 1.35; font-family: Arial, sans-serif;">${specs}</td>
    </tr>`;
  }).join('');

  const displayStart = formatInputDateDisplay(startDateStr);
  const displayEnd = formatInputDateDisplay(endDateStr);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PENDIENTES POR STATUS</title>
  <style>
    @page {
      size: letter portrait;
      margin: 10mm 10mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; padding: 12px; }
    .title { text-align: center; font-size: 24px; font-weight: 900; margin-bottom: 6px; letter-spacing: 0.8px; font-family: Arial, sans-serif; text-transform: uppercase; }
    .subtitle { text-align: center; font-size: 11px; color: #475569; margin-bottom: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; border: 1.5px solid #111; }
    th { background: #1e6091; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 700; border: 1px solid #111; }
    td { color: #000000; }
    @media print {
      body { padding: 0; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="title">PENDIENTES POR STATUS</div>
  <div class="subtitle">Rango: ${displayStart} al ${displayEnd} | Total Registros: ${orders.length}</div>
  <table>
    <thead>
      <tr>
        <th style="width: 11%;">Fecha</th>
        <th style="width: 24%;">Cliente</th>
        <th style="width: 8%; text-align: center;">Año</th>
        <th style="width: 11%;">Marca</th>
        <th style="width: 13%;">Modelo</th>
        <th style="width: 7%; text-align: center;">Tipo</th>
        <th style="width: 26%;">Specs</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  }
};
