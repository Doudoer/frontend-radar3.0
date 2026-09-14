import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, ChevronRight, Truck, DollarSign, User, Package, Zap, Printer, Archive, X, AlertTriangle, CheckCircle, Download, FileSpreadsheet, Pencil, Trash2, Store, Phone, AlertCircle, Eye, Share2, Copy, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../store/AuthContext';
import Pagination from '../components/Pagination';
import { exportToExcel, exportToPDF, printOrderDirect, exportStatusRequestPDF } from '../utils/exportUtils';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { OrderStatusModal } from '../components/orders/OrderStatusModal';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  const isCreateRoute = location.pathname === '/orders/new';
  const isEditRoute = location.pathname.endsWith('/edit') && Boolean(orderId);
  const isDetailRoute = Boolean(orderId) && !isEditRoute;
  const isOrderFormRoute = isCreateRoute || isEditRoute;
  const numericOrderId = orderId ? Number(orderId) : null;
  const hydratedDetailIdRef = useRef<number | null>(null);
  const hydratedEditIdRef = useRef<number | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decoding, setDecoding] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [showStatusReportModal, setShowStatusReportModal] = useState(false);
  const [statusReportStartDate, setStatusReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [statusReportEndDate, setStatusReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [generatingStatusReport, setGeneratingStatusReport] = useState(false);

  const [formData, setFormData] = useState({
    vin_nr: '', brand: '', model: '', sub_model: '', year: '', color: '',
    product_type: '', stock_nr: '', customer_id: '',
    transmission_type: '',
    price: '', core_fee: '0', down_payment: '0',
    shipping_toggle: false, shipping_cost: '0', warranty_days: '30',
    status: 'Cotización', payment_method: 'Zelle',
    description: '', product_specs: '', shipping_address: '',
    created_at: new Date().toISOString().slice(0, 16),
    delivered_at: ''
  });

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  };

  const [coreFeeType, setCoreFeeType] = useState('No');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ first_name: '', last_name: '', phone: '', email: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);


  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quickViewOrder, setQuickViewOrder] = useState<any>(null);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimDetails, setClaimDetails] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [formStep, setFormStep] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    brand: '',
    product_type: '',
    date_from: '',
    date_to: '',
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const pageSize = 10;
  const showOrderForm = showModal || isOrderFormRoute;
  const visibleOrders = isServerPaginated
    ? orders
    : orders.slice((page - 1) * pageSize, page * pageSize);

  const handleCloseOrderForm = () => {
    closeOrderModal();
    if (isOrderFormRoute) {
      navigate('/orders');
    }
  };

  const resetOrderModalState = () => {
    setEditingOrder(null);
    setFormStep(1);
    setCoreFeeType('No');
    setShowNewCustomer(false);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setNewCustomerData({ first_name: '', last_name: '', phone: '', email: '' });
    setFormData({
      vin_nr: '',
      brand: '',
      model: '',
      sub_model: '',
      year: '',
      color: '',
      product_type: '',
      stock_nr: '',
      customer_id: '',
      transmission_type: '',
      price: '',
      core_fee: '0',
      down_payment: '0',
      shipping_toggle: false,
      shipping_cost: '0',
      warranty_days: '30',
      status: 'Cotización',
      payment_method: 'Zelle',
      description: '',
      product_specs: '',
      shipping_address: '',
      created_at: new Date().toISOString().slice(0, 16),
      delivered_at: ''
    });
  };

  const closeOrderModal = () => {
    setShowModal(false);
    resetOrderModalState();
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [page, search, showArchived, filters]);




  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchOrders();
    }, 300000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [page, search, showArchived, filters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showModal || showDeleteModal || showClaimModal || showQuickViewModal) return;
      if (isDetailRoute) {
        navigate('/orders');
        return;
      }
      if (selectedOrder) {
        setSelectedOrder(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailRoute, navigate, selectedOrder, showClaimModal, showDeleteModal, showModal, showQuickViewModal]);

  useEffect(() => {
    if (selectedOrder && !isDetailRoute) {
      const body = document.body;
      const currentCount = Number(body.dataset.modalLockCount || '0');
      if (currentCount === 0) {
        body.dataset.modalPrevOverflow = body.style.overflow || '';
        body.style.overflow = 'hidden';
        body.classList.add('modal-open');
      }
      body.dataset.modalLockCount = String(currentCount + 1);
    } else {
      const body = document.body;
      const currentCount = Number(body.dataset.modalLockCount || '0');
      const nextCount = Math.max(0, currentCount - 1);
      if (nextCount === 0) {
        body.style.overflow = body.dataset.modalPrevOverflow || '';
        body.classList.remove('modal-open');
        delete body.dataset.modalLockCount;
        delete body.dataset.modalPrevOverflow;
      } else {
        body.dataset.modalLockCount = String(nextCount);
      }
    }

    return () => {
      const body = document.body;
      const currentCount = Number(body.dataset.modalLockCount || '0');
      const nextCount = Math.max(0, currentCount - 1);
      if (nextCount === 0) {
        body.style.overflow = body.dataset.modalPrevOverflow || '';
        body.classList.remove('modal-open');
        delete body.dataset.modalLockCount;
        delete body.dataset.modalPrevOverflow;
      } else {
        body.dataset.modalLockCount = String(nextCount);
      }
    };
  }, [isDetailRoute, selectedOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { search, page, limit: pageSize };
      if (showArchived) params.status = 'Archivado';
      else if (filters.status) params.status = filters.status;
      if (filters.brand) params.brand = filters.brand;
      if (filters.product_type) params.product_type = filters.product_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const response = await api.get('/orders', { params });
      const raw = response.data;
      const payload = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.orders || [];

      const metaLastPage = Number(raw?.meta?.last_page || 0);
      const metaTotal = Number(raw?.meta?.total || 0);
      const serverPaginated = !Array.isArray(raw) && (metaLastPage > 0 || metaTotal > 0);
      setIsServerPaginated(serverPaginated);

      const sorted = [...payload].sort((a: any, b: any) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        if (db !== da) return db - da;
        return (b.id || 0) - (a.id || 0);
      });
      setOrders(sorted);

      if (serverPaginated) {
        const pages = metaLastPage > 0 ? metaLastPage : Math.ceil(metaTotal / pageSize);
        setTotalPages(Math.max(1, pages));
      } else {
        setTotalPages(Math.max(1, Math.ceil(sorted.length / pageSize)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when searching or filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  // Sync search state with URL params (Deep Linking)
  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearch(s);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isCreateRoute) return;
    resetOrderModalState();
    hydratedEditIdRef.current = null;
  }, [isCreateRoute]);

  useEffect(() => {
    if (!isDetailRoute || !numericOrderId || Number.isNaN(numericOrderId)) {
      hydratedDetailIdRef.current = null;
      if (!isDetailRoute) {
        setSelectedOrder(null);
        setSelectedOrderDetail(null);
      }
      return;
    }

    if (hydratedDetailIdRef.current === numericOrderId) return;
    hydratedDetailIdRef.current = numericOrderId;

    const localOrder = orders.find((o) => Number(o.id) === numericOrderId);
    void handleOpenDetail(localOrder || { id: numericOrderId });
  }, [isDetailRoute, numericOrderId, orders]);

  useEffect(() => {
    if (!isEditRoute || !numericOrderId || Number.isNaN(numericOrderId)) {
      hydratedEditIdRef.current = null;
      return;
    }

    if (hydratedEditIdRef.current === numericOrderId) return;
    hydratedEditIdRef.current = numericOrderId;

    const localOrder = orders.find((o) => Number(o.id) === numericOrderId);
    if (localOrder) {
      hydrateOrderFormFromOrder(localOrder);
      return;
    }

    const loadOrder = async () => {
      try {
        const response = await api.get(`/orders/${numericOrderId}`);
        const order = response.data?.order || response.data || {};
        if (!order?.id) {
          toast.error('No se encontró la orden para edición');
          navigate('/orders');
          return;
        }
        hydrateOrderFormFromOrder(order);
      } catch {
        toast.error('Error al cargar la orden para edición');
        navigate('/orders');
      }
    };

    void loadOrder();
  }, [isEditRoute, navigate, numericOrderId, orders]);

  useEffect(() => {
    if (isDetailRoute || isOrderFormRoute) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isDetailRoute, isOrderFormRoute]);

  const fetchAllForExport = async (): Promise<any[]> => {
    try {
      const params: any = { search, page: 1, limit: 5000 };
      if (showArchived) params.status = 'Archivado';
      else if (filters.status) params.status = filters.status;
      if (filters.brand) params.brand = filters.brand;
      if (filters.product_type) params.product_type = filters.product_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await api.get('/orders', { params });
      return Array.isArray(res.data) ? res.data : res.data.data || res.data.orders || [];
    } catch {
      return [];
    }
  };





  const handleExportExcel = async () => {
    toast.loading('Descargando CSV...', { id: 'export' });
    try {
      const data = await fetchAllForExport();
      if (!data.length) { toast.error('No hay datos para exportar', { id: 'export' }); return; }
      const enriched = data.map(o => ({ ...o, cliente: `${o.first_name || ''} ${o.last_name || ''}`.trim() }));
      const cols = [
        { header: 'Código', key: 'order_code' },
        { header: 'Fecha', key: 'created_at', formatter: (v: string) => v ? new Date(v).toLocaleDateString('es-ES') : '-' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Año', key: 'year' },
        { header: 'Marca', key: 'brand' },
        { header: 'Modelo', key: 'model' },
        { header: 'Tipo Pieza', key: 'product_type' },
        { header: 'Specs', key: 'product_specs' },
        { header: 'Precio', key: 'price', formatter: (v: number) => `$${v}` },
        { header: 'Abono', key: 'down_payment', formatter: (v: number) => `$${v}` },
        { header: 'Pago', key: 'payment_method' },
        { header: 'Garantía (días)', key: 'warranty_days' },
        { header: 'Estado', key: 'status' },
        { header: 'Operador', key: 'user_name' },
      ];
      exportToExcel(enriched, cols, `ordenes_${new Date().toISOString().slice(0,10)}`);
      toast.success(`✅ ${data.length} órdenes descargadas como CSV`, { id: 'export' });
    } catch (err: any) {
      console.error('[Export Excel]', err);
      toast.error('Error: ' + (err?.message || 'Error desconocido'), { id: 'export' });
    }
  };

  const handleExportPDF = async () => {
    toast.loading('Preparando reporte...', { id: 'export' });
    try {
      const data = await fetchAllForExport();
      if (!data.length) { toast.error('No hay datos para exportar', { id: 'export' }); return; }
      const enriched = data.map(o => ({ ...o, cliente: `${o.first_name || ''} ${o.last_name || ''}`.trim() }));
      const cols = [
        { header: 'Código', key: 'order_code' },
        { header: 'Fecha', key: 'created_at', formatter: (v: string) => v ? new Date(v).toLocaleDateString('es-ES') : '-' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Año', key: 'year' },
        { header: 'Marca', key: 'brand' },
        { header: 'Modelo', key: 'model' },
        { header: 'Tipo', key: 'product_type' },
        { header: 'Precio', key: 'price', formatter: (v: number) => `$${v}` },
        { header: 'Estado', key: 'status' },
        { header: 'Operador', key: 'user_name' },
      ];
      exportToPDF(enriched, cols, `ordenes_${new Date().toISOString().slice(0,10)}`, 'Reporte de Órdenes — RADAR V2');
      toast.success('✅ Reporte listo — usa Ctrl+P para guardar como PDF', { id: 'export', duration: 6000 });
    } catch (err: any) {
      console.error('[Export PDF]', err);
      toast.error('Error: ' + (err?.message || 'Error desconocido'), { id: 'export' });
    }
  };

  const handleGenerateStatusReportPDF = async () => {
    toast.loading('Generando Lista de Solicitud de Estatus...', { id: 'status-report' });
    setGeneratingStatusReport(true);

    try {
      const params: any = {
        status: 'Pagado',
        limit: 500
      };
      if (statusReportStartDate) params.date_from = statusReportStartDate;
      if (statusReportEndDate) params.date_to = statusReportEndDate;

      const resp = await api.get('/orders', { params });
      const rawOrders = resp.data?.data || resp.data?.orders || (Array.isArray(resp.data) ? resp.data : []);

      if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
        toast.error('No se encontraron órdenes con estatus "Pagado" en el rango seleccionado', { id: 'status-report' });
        return;
      }

      exportStatusRequestPDF(rawOrders, statusReportStartDate, statusReportEndDate);
      toast.success(`PDF generado con ${rawOrders.length} órdenes pendientes`, { id: 'status-report' });
      setShowStatusReportModal(false);
    } catch (err: any) {
      console.error('[Status Report PDF]', err);
      toast.error('Error al generar la lista de estatus', { id: 'status-report' });
    } finally {
      setGeneratingStatusReport(false);
    }
  };


  
  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      const payload = response.data;
      if (Array.isArray(payload)) {
        setCustomers(payload);
      } else {
        setCustomers(payload?.data || []);
      }
    } catch (error) {
      console.error(error);
      setCustomers([]);
    }
  };

  const handleOpenDetail = async (order: any) => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${order.id}`);
      const freshOrder = {
        ...order,
        ...(response.data?.order || {}),
        customer_phone: response.data?.order?.phone || order.customer_phone,
        user_name: response.data?.order?.agent_name || order.user_name
      };
      setSelectedOrderDetail(response.data);
      setSelectedOrder(freshOrder);
    } catch (error) {
      toast.error('Error al cargar detalles del cliente');
    } finally {
      setLoading(false);
    }
  };

  const hydrateOrderFormFromOrder = (order: any) => {
    setEditingOrder(order);
    if (order.brand) setMakes([{ id: 'current', name: order.brand }]);
    if (order.model) setModels([{ id: 'current', name: order.model }]);

    const parsedTransmission = order.product_type === 'Transmission'
      ? parseTransmissionSpecs(order.product_specs)
      : { transmission_type: '', drivetrain: order.product_specs || '' };

    setFormData({
      vin_nr: order.vin_nr || '',
      brand: order.brand || '',
      model: order.model || '',
      sub_model: order.sub_model || '',
      year: order.year?.toString() || '',
      color: order.color || '',
      product_type: order.product_type || '',
      stock_nr: order.stock_nr || '',
      customer_id: order.customer_id?.toString() || '',
      transmission_type: parsedTransmission.transmission_type,
      price: order.price?.toString() || '',
      core_fee: order.core_fee?.toString() || '0',
      down_payment: order.down_payment?.toString() || '0',
      shipping_toggle: order.shipping_toggle === 1,
      shipping_cost: order.shipping_cost?.toString() || '0',
      warranty_days: order.warranty_days?.toString() || '30',
      status: order.status || 'Por Validar',
      payment_method: order.payment_method || 'Zelle',
      description: order.description || '',
      product_specs: parsedTransmission.drivetrain,
      shipping_address: order.shipping_address || '',
      created_at: toDateTimeLocal(order.created_at) || new Date().toISOString().slice(0, 16),
      delivered_at: toDateTimeLocal(order.delivered_at)
    });
    setCustomerSearch(order.first_name ? `${order.first_name} ${order.last_name}` : '');
    fetchMakes();
    if (order.brand && order.year) {
      fetchModels(order.brand, order.year.toString());
    }
  };

  const goToOrderCreate = () => {
    resetOrderModalState();
    navigate('/orders/new');
  };

  const goToOrderEdit = (order: any) => {
    navigate(`/orders/${order.id}/edit`);
  };

  const goToOrderDetail = (order: any) => {
    navigate(`/orders/${order.id}`);
  };


  const fetchMakes = async () => {
    if (makes.length > 0) return;
    setLoadingMakes(true);
    try {
      const resp = await api.get('/vin/makes');
      setMakes(resp.data);
    } catch (err) {
      console.error('Error fetching makes');
    } finally {
      setLoadingMakes(false);
    }
  };

  const fetchModels = async (make: string, year: string) => {
    if (!make || !year) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    try {
      const resp = await api.get(`/vin/models/${make}/${year}`);
      setModels(resp.data);
    } catch (err) {
      console.error('Error fetching models');
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  // Helper for sequential reset
  const handleYearChange = (val: string) => {
    setFormData(prev => ({ ...prev, year: val, brand: '', model: '' }));
    setModels([]);
    if (val.length >= 4) fetchMakes();
  };

  const handleBrandChange = (val: string) => {
    setFormData(prev => ({ ...prev, brand: val, model: '' }));
    if (formData.year) fetchModels(val, formData.year);
  };

  const handleDecodeVIN = async () => {
    if (formData.vin_nr.length < 8) return;
    setDecoding(true);
    try {
      const resp = await api.get(`/vin/decode/${formData.vin_nr}`);
      const { brand, model, year } = resp.data;
      
      if (brand) {
        setMakes(prev => prev.some(m => m.name === brand) ? prev : [...prev, { id: 'decoded_make', name: brand }]);
      }
      if (model) {
        setModels(prev => prev.some(m => m.name === model) ? prev : [...prev, { id: 'decoded_model', name: model }]);
      }

      setFormData(prev => ({
        ...prev,
        brand: brand || prev.brand,
        model: model || prev.model,
        year: year || prev.year
      }));
    } catch (err) {
      console.warn('Could not decode VIN');
    } finally {
      setDecoding(false);
    }
  };

  // Trigger decode on 17 chars
  useEffect(() => {
    if (formData.vin_nr.length === 17) {
      handleDecodeVIN();
    }
  }, [formData.vin_nr]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cotización': return '#a6a6a6';
      case 'Pagado': return '#10b981';
      case 'En Preparación': return '#3b82f6';
      case 'Listo para Despacho': return '#06b6d4';
      case 'Listo para Retiro': return '#8b5cf6';

      case 'En Camino': return '#f97316';
      case 'Entregado': return '#14b8a6';
      case 'Reclamo': return '#ef4444';
      case 'Cancelado': return '#ef4444';
      case 'Reembolsado': return '#f59e0b';
      case 'Archivado': return '#64748b';
      default: return 'var(--text-secondary)';
    }
  };

  const getWorkflowBadge = (step: number = 1) => {
    switch (step) {
      case 1:
        return { text: 'Paso 1: Notificación Inicial', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
      case 2:
        return { text: 'Paso 2: Acuse & 2-3 Días', color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      case 3:
        return { text: 'Paso 3: Cita & Pieza Lista', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' };
      case 4:
        return { text: 'Paso 4: Cierre / Entregado', color: '#86efac', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      default:
        return { text: 'Paso 1: Notificación Inicial', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
    }
  };



  const handlePriceChange = (val: string) => {
    let w = '30';
    const p = parseFloat(val);
    if (!isNaN(p)) {
      if (p >= 1500) w = '90';
      else if (p >= 1000) w = '60';
    }
    setFormData(prev => ({ ...prev, price: val, warranty_days: w }));
  };

  const parseTransmissionSpecs = (specs?: string | null) => {
    const raw = String(specs || '').trim();
    if (!raw) return { transmission_type: '', drivetrain: '' };

    const byPipe = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (byPipe.length >= 2) {
      return {
        transmission_type: byPipe[0].toUpperCase(),
        drivetrain: byPipe.slice(1).join(' | ')
      };
    }

    const upper = raw.toUpperCase();
    if (upper === 'AT' || upper === 'MT') {
      return { transmission_type: upper, drivetrain: '' };
    }

    return { transmission_type: '', drivetrain: raw };
  };

  const formatMoney = (value: any) => `$${Number(value || 0).toFixed(2)}`;

  const buildQuickShareMessage = (order: any) => {
    const parsedTransmission = order?.product_type === 'Transmission'
      ? parseTransmissionSpecs(order.product_specs)
      : { transmission_type: '', drivetrain: '' };
    const transmissionType = order?.transmission_type || parsedTransmission.transmission_type || '-';
    const total = Number(order?.price || 0) + Number(order?.core_fee || 0);
    const pending = total - Number(order?.down_payment || 0);

    return [
      `RADAR - Vista rapida ${order?.order_code || ''}`,
      '',
      'Vehiculo:',
      `- ${order?.year || '-'} ${order?.brand || '-'} ${order?.model || '-'}`,
      `- Sub-modelo: ${order?.sub_model || '-'}`,
      `- Tipo pieza: ${order?.product_type || '-'}`,
      `- AT/MT: ${order?.product_type === 'Transmission' ? transmissionType : '-'}`,
      `- VIN: ${order?.vin_nr || '-'}`,
      `- Descripcion: ${order?.description || '-'}`,
      '',
      'Cliente:',
      `- Nombre: ${order?.first_name || '-'} ${order?.last_name || ''}`.trim(),
      `- Telefono: ${order?.customer_phone || '-'}`,
      `- Email: ${order?.customer_email || '-'}`,
      '',
      'Finanzas:',
      `- Precio pieza: ${formatMoney(order?.price)}`,
      `- Core fee: ${formatMoney(order?.core_fee)}`,
      `- Total: ${formatMoney(total)}`,
      `- Abono: ${formatMoney(order?.down_payment)}`,
      `- Pendiente: ${formatMoney(pending)}`,
      `- Metodo de pago: ${order?.payment_method || '-'}`,
      `- Estado: ${order?.status || '-'}`
    ].join('\n');
  };

  const handleOpenQuickView = (order: any) => {
    setQuickViewOrder(order);
    setShowQuickViewModal(true);
  };

  const handleCopyQuickView = async () => {
    if (!quickViewOrder) return;
    try {
      await navigator.clipboard.writeText(buildQuickShareMessage(quickViewOrder));
      toast.success('Resumen copiado para compartir');
    } catch {
      toast.error('No se pudo copiar el resumen');
    }
  };

  const handleWhatsAppQuickView = () => {
    if (!quickViewOrder) return;
    const text = buildQuickShareMessage(quickViewOrder);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const buildDeliveryDispatchMessage = (order: any, lang: 'en' | 'es' = 'en') => {
    if (!order) return '';
    const customerName = [order.first_name, order.last_name].filter(Boolean).join(' ') || order.customer_name || 'Cliente';
    const phone = order.customer_phone || order.phone || '-';

    const brand = (order.brand || '').trim();
    const model = (order.model || '').trim();
    const year = order.year ? String(order.year) : '';
    const vehicle = [brand, model, year].filter(Boolean).join(' ') || 'Vehículo';

    const productType = (order.product_type || 'PART').toUpperCase();
    const specs = (order.product_specs || '').trim();
    const description = (order.description || '').trim();
    const partLine = specs ? `*${productType}* ${specs}` : `*${productType}*`;

    const price = Number(order.price || 0);
    const downPayment = Number(order.down_payment || 0);
    const partRemaining = Math.max(0, price - downPayment);
    const coreFee = Number(order.core_fee || 0);

    const isDelivery = order.shipping_toggle === 1 || Boolean(order.shipping_address && order.shipping_address.trim().length > 0);
    const deliveryFee = isDelivery ? Number(order.shipping_cost || order.delivery_fee || order.shipping_fee || 0) : 0;
    const deliveryAddress = (order.shipping_address || order.address_shipping || '').trim();

    const totalPending = partRemaining + coreFee + deliveryFee;

    if (lang === 'en') {
      const enParts: string[] = [];
      if (partRemaining > 0) enParts.push(`$${partRemaining.toFixed(0)} Part`);
      if (coreFee > 0) enParts.push(`$${coreFee.toFixed(0)} Core`);
      if (deliveryFee > 0) enParts.push(`$${deliveryFee.toFixed(0)} Delivery`);

      const enBreakdown = enParts.length > 1 ? ` (${enParts.join(' + ')})` : '';

      const lines = [
        `*${customerName}*`,
        `*Phone:* ${phone}`,
        `${vehicle}`,
        `${partLine}`,
      ];
      if (description && description.toLowerCase() !== specs.toLowerCase()) {
        lines.push(description);
      }
      lines.push(`Remaining Balance: *$${totalPending.toFixed(0)}*${enBreakdown}`);

      if (isDelivery) {
        lines.push(`Deliver to: *${deliveryAddress || 'Address pending'}*`);
      }
      if (coreFee <= 0) {
        lines.push(`*Note:* Collect old core from customer upon delivery. If customer does not have core, collect an additional refundable $150 deposit.`);
      }
      return lines.join('\n');
    } else {
      const esParts: string[] = [];
      if (partRemaining > 0) esParts.push(`$${partRemaining.toFixed(0)} Pieza`);
      if (coreFee > 0) esParts.push(`$${coreFee.toFixed(0)} Core`);
      if (deliveryFee > 0) esParts.push(`$${deliveryFee.toFixed(0)} Envío`);

      const esBreakdown = esParts.length > 1 ? ` (${esParts.join(' + ')})` : '';

      const lines = [
        `*${customerName}*`,
        `*Teléfono:* ${phone}`,
        `${vehicle}`,
        `${partLine}`,
      ];
      if (description && description.toLowerCase() !== specs.toLowerCase()) {
        lines.push(description);
      }
      lines.push(`Balance Pendiente: *$${totalPending.toFixed(0)}*${esBreakdown}`);

      if (isDelivery) {
        lines.push(`Entregar en: *${deliveryAddress || 'Dirección pendiente'}*`);
      }
      if (coreFee <= 0) {
        lines.push(`*Nota:* Solicitar el core usado al cliente al entregar. En caso de no tenerlo listo, cobrar $150 de depósito extra reembolsable.`);
      }
      return lines.join('\n');
    }
  };

  const handleCopyDeliveryFormat = async (lang: 'en' | 'es') => {
    if (!quickViewOrder) return;
    try {
      const msg = buildDeliveryDispatchMessage(quickViewOrder, lang);
      await navigator.clipboard.writeText(msg);
      toast.success(lang === 'en' ? '¡Texto para Delivery (Inglés) copiado!' : '¡Texto para Delivery (Español) copiado!');
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleWhatsAppDeliveryFormat = (lang: 'en' | 'es') => {
    if (!quickViewOrder) return;
    const msg = buildDeliveryDispatchMessage(quickViewOrder, lang);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCreateCustomer = async () => {
    if(!newCustomerData.first_name || !newCustomerData.last_name || !newCustomerData.phone) {
      toast.error('Nombre, Apellido y Teléfono son obligatorios');
      return;
    }
    setCreatingCustomer(true);
    try {
      const resp = await api.post('/customers', newCustomerData);
      // Depending on API response, fallback manually if id is not directly in .customer
      const newCust = resp.data.customer || { id: resp.data.id || Date.now(), ...newCustomerData };
      setCustomers(prev => [{ ...newCust, id: newCust.id }, ...prev]);
      setFormData(prev => ({ ...prev, customer_id: newCust.id.toString() }));
      setShowNewCustomer(false);
      setNewCustomerData({ first_name: '', last_name: '', phone: '', email: '' });
      setCustomerSearch(`${newCustomerData.first_name} ${newCustomerData.last_name}`);
      setShowCustomerDropdown(false);
      toast.success('Cliente creado y asignado');
    } catch(err) {
      toast.error('Error al crear cliente');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      product_specs: formData.product_type === 'Transmission'
        ? [formData.transmission_type, formData.product_specs].filter(Boolean).join(' | ')
        : formData.product_specs,
      year: parseInt(formData.year) || 0,
      price: parseFloat(formData.price) || 0,
      core_fee: parseFloat(formData.core_fee) || 0,
      down_payment: parseFloat(formData.down_payment) || 0,
      shipping_cost: formData.shipping_toggle ? (parseFloat(formData.shipping_cost) || 0) : 0,
      warranty_days: parseInt(formData.warranty_days) || 30
    };

    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, payload);
        toast.success('Orden actualizada correctamente');
      } else {
        await api.post('/orders', payload);
        toast.success('Orden creada exitosamente');
      }
      closeOrderModal();
      fetchOrders();
    } catch (error) {
      toast.error('Error al crear orden');
    }
  };

  const handlePrint = async (orderId: number, type: 'label' | 'invoice') => {
    const orderToPrint = orders.find(o => o.id === orderId) || selectedOrder;
    if (!orderToPrint) {
      toast.error('No se pudo encontrar la información de la orden');
      return;
    }
    
    toast.loading(`Generando ${type === 'label' ? 'Etiqueta' : 'Factura'}...`, { id: 'print', duration: 1000 });
    printOrderDirect(orderToPrint, type, api, user?.id);
  };

  const handleValidatePayment = async (orderId: number) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'Pagado' });
      toast.success('Pago validado exitosamente');
      setSelectedOrder((prev: any) => prev ? {...prev, status: 'Pagado'} : null);
      fetchOrders();
    } catch (err) {
      toast.error('Error al validar pago');
    }
  };

  const handleChangeStatus = async (orderId: number, newStatus: string, skipClaimModal: boolean = false) => {
    if (newStatus.toLowerCase() === 'reclamo' && !skipClaimModal) {
      setShowClaimModal(true);
      return;
    }

    // If moving AWAY from reclamo
    if (selectedOrder?.status?.toLowerCase() === 'reclamo' && !skipClaimModal) {
      if (!confirm('Esta acción marcará el reclamo vinculado como RESUELTO. ¿Desea continuar?')) return;
    }

    await executeStatusChange(orderId, newStatus);
  };

  const executeStatusChange = async (orderId: number, newStatus: string, claimReasonStr?: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus, claim_reason: claimReasonStr });
      toast.success('Estado actualizado correctamente');
      
      if (newStatus === 'Archivado') {
        setSelectedOrder(null);
      } else {
        setSelectedOrder((prev: any) => prev ? {...prev, status: newStatus, claim_reason: claimReasonStr || prev.claim_reason} : null);
      }
      
      fetchOrders();
    } catch (err) {
      toast.error('Error al actualizar el estado');
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimDetails.trim()) {
      toast.error('Escriba el motivo del reclamo');
      return;
    }
    if (selectedOrder) {
      await executeStatusChange(selectedOrder.id, 'reclamo', claimDetails);
      setShowClaimModal(false);
      setClaimDetails('');
    }
  };

  if (isDetailRoute) {
    return (
      <div className="orders-page fade-in">
        <header className="page-header" style={{ marginBottom: '1rem' }}>
          <div className="page-header-copy">
            <h1 className="font-outfit" style={{ fontSize: '2rem' }}>Detalle de Orden</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Vista completa de seguimiento y operación de la orden.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
              Volver a Órdenes
            </button>
          </div>
        </header>

        {!selectedOrder ? (
          <div className="glass-card" style={{ padding: '1rem' }}>
            {loading ? 'Cargando orden...' : 'No se pudo cargar la orden.'}
          </div>
        ) : (
          <OrderDetailModal
            order={selectedOrder}
            detailData={selectedOrderDetail}
            user={user}
            isMobile={isMobile}
            viewMode="page"
            onClose={() => navigate('/orders')}
            onChangeStatus={(id, newStatus, skipClaimModal) => handleChangeStatus(id, newStatus, skipClaimModal)}
            onValidatePayment={(id) => handleValidatePayment(id)}
            onSaveQuickDates={async (c, d) => {
              await api.put(`/orders/${selectedOrder.id}/dates`, { created_at: c, delivered_at: d });
              await fetchOrders();
            }}
            onSaveCustomerNotification={async (formData) => {
              await api.post(`/orders/${selectedOrder.id}/customer-notification`, formData);
              if (selectedOrder) await handleOpenDetail(selectedOrder);
            }}
            onPrintOrder={(id, type) => handlePrint(id, type as 'label' | 'invoice')}
          />
        )}

        {selectedOrder && showClaimModal && (
          <OrderStatusModal
            order={selectedOrder}
            onClose={() => setShowClaimModal(false)}
            onConfirm={async (id, status, desc, reason) => {
              await executeStatusChange(id, status, reason || desc);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="orders-page fade-in">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="font-outfit" style={{ fontSize: '2rem' }}>Gestión de Órdenes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Replica del sistema RSY con soporte CRM, Logística y NHTSA.</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowStatusReportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                fontWeight: 600
              }}
              title="Generar PDF de órdenes pagadas pendientes por estatus"
            >
              <FileText size={18} />
              <span>Lista de Solicitud de Estatus</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-excel"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button
            className="btn btn-secondary btn-pdf"
            onClick={handleExportPDF}
          >
            <Download size={18} /> PDF
          </button>
          <button className="btn btn-primary btn-add-order" onClick={goToOrderCreate}>
            <Plus size={20} />
            <span>Nueva Orden</span>
          </button>
        </div>
      </header>

      <div className="glass-card actions-row" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <button 
          className={`btn ${showArchived ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setShowArchived(!showArchived)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Archive size={18} />
          <span>{showArchived ? 'Ver Activas' : 'Ver Archivadas'}</span>
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            className="input-field" 
            placeholder="Buscar por nombre, teléfono, marca, modelo, año o tipo de pieza..." 
            style={{ paddingLeft: '40px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowFilters(!showFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', whiteSpace: 'nowrap' }}
        >
          <Filter size={18} />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: 'var(--gradient-primary)', color: 'white',
              borderRadius: '50%', width: '18px', height: '18px',
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setFilters({ status: '', brand: '', product_type: '', date_from: '', date_to: '' })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', whiteSpace: 'nowrap' }}
          >
            <X size={16} /> Limpiar
          </button>
        )}
      </div>

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginBottom: '1rem' }}
          >
            <div className="glass-card filter-panel" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</label>
                <select className="input-field" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
                  <option value="">Todos</option>
                  <option value="Cotización">Cotización</option>
                  <option value="Pagado">Pagado</option>
                  <option value="En Preparación">En Preparación</option>
                  <option value="Listo para Despacho">Listo para Despacho</option>
                  <option value="Listo para Retiro">Listo para Retiro</option>
                  <option value="En Camino">En Camino</option>

                  <option value="Entregado">Entregado</option>
                  <option value="Reclamo">Reclamo</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Reembolsado">Reembolsado</option>
                </select>

              </div>
              {/* Brand */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marca</label>
                <select className="input-field" value={filters.brand} onChange={e => setFilters(f => ({...f, brand: e.target.value}))}>
                  <option value="">Todas</option>
                  {[...new Set(orders.map((o: any) => o.brand).filter(Boolean))].sort().map((b: any) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              {/* Product Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Pieza</label>
                <select className="input-field" value={filters.product_type} onChange={e => setFilters(f => ({...f, product_type: e.target.value}))}>
                  <option value="">Todos</option>
                  <option value="Engine">Engine</option>
                  <option value="Transmission">Transmission</option>
                  <option value="Transfer Case">Transfer Case</option>
                  <option value="Differential">Differential</option>
                </select>
              </div>
              {/* Date From */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desde</label>
                <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilters(f => ({...f, date_from: e.target.value}))} />
              </div>
              {/* Date To */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hasta</label>
                <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilters(f => ({...f, date_to: e.target.value}))} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card data-table-wrap">
        {!isMobile ? (
          <table className="data-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Year</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Make</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Model</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Details</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Price</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'center', padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={10} style={{ padding: '1.5rem' }}><div className="skeleton" style={{ height: '30px' }} /></td></tr>)
              ) : visibleOrders.map(order => (
                <tr 
                  key={order.id} 
                  className="clickable-row" 
                  onClick={() => goToOrderDetail(order)}
                  style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.875rem' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{order.first_name} {order.last_name}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{order.year}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{order.brand}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{order.model}</td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {order.shipping_toggle ? <Truck size={14} color="#10b981" /> : <Store size={14} color="#8b5cf6" />}
                      {order.product_type}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.product_specs || '-'}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>${order.price}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 600,
                        background: `${getStatusColor(order.status)}15`,
                        color: getStatusColor(order.status),
                        border: `1px solid ${getStatusColor(order.status)}30`
                      }}>
                        {order.status}
                      </span>
                      {!['cotización', 'cotizacion', 'entregado', 'reembolsado', 'cancelado', 'archivado'].includes((order.status || '').toLowerCase()) && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.65rem', 
                          fontWeight: 700,
                          background: getWorkflowBadge(order.workflow_step).bg,
                          color: getWorkflowBadge(order.workflow_step).color,
                          border: `1px solid ${getWorkflowBadge(order.workflow_step).border}`
                        }}>
                          {getWorkflowBadge(order.workflow_step).text}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      {order.status === 'Por Validar' && (
                        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} title="Pago pendiente" style={{ color: '#ffcc00' }}>
                          <AlertTriangle size={16} />
                        </motion.div>
                      )}
                      <button 
                        className="btn btn-secondary btn-icon" 
                        title="Editar"
                        aria-label="Editar orden"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          goToOrderEdit(order);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-secondary btn-icon" aria-label="Imprimir etiqueta" title="Imprimir etiqueta" onClick={(e) => { e.stopPropagation(); handlePrint(order.id, 'label'); }}><Printer size={14} /></button>
                      <button className="btn btn-secondary btn-icon" title="Vista rápida" aria-label="Abrir vista rápida" onClick={(e) => { e.stopPropagation(); handleOpenQuickView(order); }}><Eye size={14} /></button>
                      <button className="btn btn-secondary btn-icon" title="Ver detalle" aria-label="Ver detalle de orden" onClick={(e) => { e.stopPropagation(); goToOrderDetail(order); }}><ChevronRight size={16} /></button>
                      {user?.role === 'admin' && (
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ color: 'var(--danger)' }} 
                          title="Eliminar orden"
                          aria-label="Eliminar orden"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setOrderToDelete(order);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />)
            ) : visibleOrders.map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => goToOrderDetail(order)}
                className="glass-card"
                style={{ padding: '1.25rem', borderLeft: `4px solid ${getStatusColor(order.status)}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                   <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{order.order_code}</span>
                      <p style={{ fontSize: '1rem', fontWeight: 800, margin: '2px 0' }}>{order.brand} {order.model} {order.year}</p>
                   </div>
                   <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                     <span style={{ 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700,
                        background: `${getStatusColor(order.status)}15`, color: getStatusColor(order.status)
                     }}>{order.status}</span>
                     {!['cotización', 'cotizacion', 'entregado', 'reembolsado', 'cancelado', 'archivado'].includes((order.status || '').toLowerCase()) && (
                       <span style={{ 
                         padding: '4px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700,
                         background: getWorkflowBadge(order.workflow_step).bg,
                         color: getWorkflowBadge(order.workflow_step).color,
                         border: `1px solid ${getWorkflowBadge(order.workflow_step).border}`
                       }}>
                         {getWorkflowBadge(order.workflow_step).text}
                       </span>
                     )}
                   </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary font-black text-xs">
                         {order.first_name?.[0]}
                      </div>
                      <span className="text-sm font-medium">{order.first_name} {order.last_name}</span>
                   </div>
                   <span className="text-lg font-black">${order.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Pagination 
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
      />

      <Modal 
        isOpen={showOrderForm} 
        onClose={handleCloseOrderForm}
        title={editingOrder ? `Editar Orden ${editingOrder.order_code}` : `Nueva Orden - Paso ${formStep} de 3`} 
        maxWidth="850px"
        asPage={isOrderFormRoute}
      >
        <div className="wizard-experience">
          {/* Progress Tracker (Clickable Tabs) */}
          {!editingOrder && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {[1, 2, 3].map(s => (
                <button 
                  key={s} 
                  type="button"
                  onClick={() => setFormStep(s)}
                  style={{ 
                    flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
                    opacity: formStep === s ? 1 : 0.6,
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ 
                    height: '4px', borderRadius: '10px',
                    background: formStep >= s ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                    marginBottom: '0.5rem'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: formStep >= s ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {s === 1 ? '1. Vehículo' : s === 2 ? '2. Cliente' : '3. Finanzas'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {formStep === 1 && (
                <motion.div 
                  key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
                >
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 204, 0, 0.1)', color: '#ffcc00' }}><Package size={20}/></div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Detalles del Vehículo / Producto</h3>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label">Búsqueda VIN (Auto-decodificar)</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input-field" placeholder="Ingresa el VIN de 17 dígitos..." value={formData.vin_nr} onChange={e => setFormData({...formData, vin_nr: e.target.value.toUpperCase()})} style={{ paddingRight: '100px' }} />
                      <button type="button" onClick={handleDecodeVIN} disabled={decoding || formData.vin_nr.length < 8} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--gradient-primary)', border: 'none', borderRadius: '6px', color: 'white', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: decoding || formData.vin_nr.length < 8 ? 0.5 : 1 }}>
                        {decoding ? '...' : <Zap size={12} />} Decode
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Año</label>
                    <select className="input-field" required value={formData.year} onChange={e => handleYearChange(e.target.value)}>
                      <option value="">Seleccionar año...</option>
                      {Array.from({ length: new Date().getFullYear() - 1989 + 1 }, (_, i) => new Date().getFullYear() + 1 - i).map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Marca</label>
                    <select className="input-field" required disabled={!formData.year || parseInt(formData.year) < 1900} value={formData.brand} onChange={e => handleBrandChange(e.target.value)}>
                      <option value="">{loadingMakes ? 'Cargando marcas...' : 'Seleccionar marca...'}</option>
                      {makes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Modelo</label>
                    <select className="input-field" required disabled={!formData.brand || loadingModels} value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                      <option value="">{loadingModels ? 'Cargando modelos...' : 'Seleccionar modelo...'}</option>
                      {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sub-modelo (manual)</label>
                    <input
                      className="input-field"
                      placeholder="Ej: 1500, Sport, Limited..."
                      value={formData.sub_model}
                      onChange={e => setFormData({ ...formData, sub_model: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Stock #</label>
                    <input className="input-field" placeholder="Legacy Stock NR" value={formData.stock_nr} onChange={e => setFormData({...formData, stock_nr: e.target.value})} />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label">Descripcion</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Ej: Transmision con bajo millaje, incluye convertidor..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: formData.product_type === 'Engine' || formData.product_type === 'Transmission' ? 'span 1' : 'span 2' }}>
                    <label className="label">Tipo de Producto</label>
                    <select className="input-field" required value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value, product_specs: '', transmission_type: ''})}>
                      <option value="">Seleccionar Tipo...</option>
                      <option value="Engine">Engine</option>
                      <option value="Transmission">Transmission</option>
                      <option value="Transfer Case">Transfer Case</option>
                      <option value="Differential">Differential</option>
                    </select>
                  </div>

                  {formData.product_type === 'Engine' && (
                    <div style={{ gridColumn: 'span 1' }}>
                      <label className="label">Litraje (Engine Size)</label>
                      <input className="input-field" placeholder="Ej: 2.4L, 5.0L..." required value={formData.product_specs} onChange={e => setFormData({...formData, product_specs: e.target.value})} />
                    </div>
                  )}

                  {formData.product_type === 'Transmission' && (
                    <div style={{ gridColumn: 'span 1' }}>
                      <label className="label">Tipo de Transmisión</label>
                      <select className="input-field" required value={formData.transmission_type} onChange={e => setFormData({...formData, transmission_type: e.target.value})}>
                        <option value="">Seleccionar tipo...</option>
                        <option value="AT">AT (Automática)</option>
                        <option value="MT">MT (Manual)</option>
                      </select>

                      <label className="label">Tracción (Drivetrain)</label>
                      <select className="input-field" required value={formData.product_specs} onChange={e => setFormData({...formData, product_specs: e.target.value})}>
                        <option value="">Seleccionar Tracción...</option>
                        <option value="FWD">FWD (Delantera)</option>
                        <option value="RWD">RWD (Trasera)</option>
                        <option value="AWD">AWD (Integral)</option>
                        <option value="4x4">4x4</option>
                      </select>
                    </div>
                  )}

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-primary" onClick={() => setFormStep(2)} style={{ padding: '0.75rem 2rem' }}>
                      Continuar a Cliente <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {formStep === 2 && (
                <motion.div 
                  key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(51, 102, 255, 0.1)', color: 'var(--accent-primary)' }}><User size={20}/></div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Identificación del Cliente</h3>
                  </div>

                  {!showNewCustomer ? (
                    <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label className="label">Buscar en Base de Datos</label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                          <input 
                            className="input-field" style={{ paddingLeft: '2.75rem' }}
                            placeholder="Nombre, teléfono o email..." 
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (formData.customer_id) setFormData({...formData, customer_id: ''}); }}
                          />
                          {showCustomerDropdown && customerSearch && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', zIndex: 100, maxHeight: '250px', overflowY: 'auto', borderRadius: '12px', marginTop: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                              {customers.filter(c => `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(customerSearch.trim().toLowerCase())).map(c => (
                                <div 
                                  key={c.id} 
                                  style={{ padding: '1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', background: formData.customer_id === c.id.toString() ? 'rgba(51, 102, 255, 0.1)' : 'transparent' }}
                                  onClick={() => { setFormData({...formData, customer_id: c.id.toString()}); setCustomerSearch(`${c.first_name} ${c.last_name}`); setShowCustomerDropdown(false); }}
                                >
                                  <p style={{ fontWeight: 600, margin: 0 }}>{c.first_name} {c.last_name}</p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>{c.phone} • {c.email || 'Sin email'}</p>
                                </div>
                              ))}
                              <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ width: '100%', fontSize: '0.8rem' }}
                                  onClick={() => {
                                    setNewCustomerData({ first_name: '', last_name: '', phone: '', email: '' });
                                    setShowNewCustomer(true);
                                  }}
                                >
                                  + Crear "{customerSearch}" como nuevo cliente
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setNewCustomerData({ first_name: '', last_name: '', phone: '', email: '' });
                            setShowNewCustomer(true);
                          }}
                        ><Plus size={20}/></button>
                      </div>
                      {formData.customer_id && (() => {
                        const matchedCustomer = customers.find(c => c.id.toString() === formData.customer_id.toString());
                        return (
                          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '0.85rem' }}>
                                {matchedCustomer ? (matchedCustomer.first_name?.[0] || 'C') + (matchedCustomer.last_name?.[0] || '') : 'C'}
                              </div>
                              <div>
                                <strong style={{ color: 'white', fontSize: '0.88rem', display: 'block' }}>
                                  {matchedCustomer ? `${matchedCustomer.first_name} ${matchedCustomer.last_name}` : customerSearch}
                                </strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  📞 {matchedCustomer?.phone || 'Sin teléfono'} • 📧 {matchedCustomer?.email || 'Sin email'}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#86efac', padding: '0.2rem 0.65rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle size={14} /> Cliente Vinculado
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.5rem', background: 'rgba(51, 102, 255, 0.05)' }}>
                      <h4 style={{ margin: '0 0 1rem 0' }}>Nuevo Perfil de Cliente</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input className="input-field" placeholder="Nombre *" value={newCustomerData.first_name} onChange={e => setNewCustomerData({...newCustomerData, first_name: e.target.value})} />
                        <input className="input-field" placeholder="Apellido *" value={newCustomerData.last_name} onChange={e => setNewCustomerData({...newCustomerData, last_name: e.target.value})} />
                        <input className="input-field" placeholder="Teléfono *" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} />
                        <input className="input-field" placeholder="Email (Opcional)" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} />
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateCustomer} disabled={creatingCustomer}>{creatingCustomer ? 'Creando...' : 'Guardar y Continuar'}</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setShowNewCustomer(false)}>Cancelar</button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(1)}>Atrás</button>
                    <button type="button" className="btn btn-primary" disabled={!formData.customer_id} onClick={() => setFormStep(3)} style={{ padding: '0.75rem 2rem' }}>
                      Continuar a Finanzas <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {formStep === 3 && (
                <motion.div 
                  key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr 0.75fr', gap: '1rem' }}
                >
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><DollarSign size={18}/></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Cierre Financiero & Entrega</h3>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Configura los valores de la pieza, abono y logística</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.7rem', color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>PRECIO PIEZA ($)</label>
                        <input className="input-field" type="number" required value={formData.price} onChange={e => handlePriceChange(e.target.value)} placeholder="0.00" style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} />
                      </div>

                      <div>
                        <label className="label" style={{ fontSize: '0.7rem', color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>ABONO INICIAL ($)</label>
                        <input className="input-field" type="number" value={formData.down_payment} onChange={e => setFormData({...formData, down_payment: e.target.value})} placeholder="0.00" style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.2rem' }}>
                          💳 MÉTODO DE PAGO DEL DOWNPAYMENT
                        </label>
                        <select
                          className="input-field"
                          style={{ fontWeight: 600, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                          value={formData.payment_method || 'Zelle'}
                          onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                          <option value="Zelle">🏦 Zelle</option>
                          <option value="Link de Pago">🔗 Link de Pago (Stripe / Square)</option>
                          <option value="Tarjeta de Crédito">💳 Tarjeta de Crédito / Débito</option>
                          <option value="CashApp">📲 CashApp</option>
                          <option value="Efectivo">💵 Efectivo</option>
                          <option value="Transferencia Bancaria">🏛️ Transferencia Bancaria</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ fontSize: '0.7rem', color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>CORE FEE (FIANZA DE RETORNO)</label>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <select className="input-field" style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} value={coreFeeType} onChange={e => { setCoreFeeType(e.target.value); if(e.target.value === 'No') setFormData({...formData, core_fee: '0'}); else if(e.target.value === '150') setFormData({...formData, core_fee: '150'}); }}>
                            <option value="No">No ($0)</option>
                            <option value="150">Fijo ($150)</option>
                            <option value="Custom">Monto personalizado</option>
                          </select>
                          {coreFeeType === 'Custom' && <input className="input-field" type="number" placeholder="Monto $" style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} value={formData.core_fee} onChange={e => setFormData({...formData, core_fee: e.target.value})} />}
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ fontSize: '0.7rem', color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>LOGÍSTICA DE ENTREGA</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.25)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <input type="checkbox" id="shipping_wizard" checked={formData.shipping_toggle} onChange={e => setFormData({...formData, shipping_toggle: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          <label htmlFor="shipping_wizard" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.76rem', color: 'white' }}>
                            {formData.shipping_toggle ? '🚚 Requiere Envío a Domicilio' : '🏬 Retiro en Local / Punto de Venta'}
                          </label>
                        </div>
                      </div>

                      {formData.shipping_toggle && (
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.6rem' }}>
                          <div>
                            <label className="label" style={{ fontSize: '0.7rem', color: 'white', fontWeight: 700, marginBottom: '0.2rem' }}>DIRECCIÓN COMPLETA DE ENVÍO</label>
                            <textarea className="input-field" placeholder="Ej: 123 Main St, Miami FL 33101..." rows={2} required={formData.shipping_toggle} value={formData.shipping_address} onChange={e => setFormData({...formData, shipping_address: e.target.value})} style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} />
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.2rem' }}>COSTO DE DELIVERY ($)</label>
                            <input type="number" step="0.01" className="input-field" placeholder="Ej: 75.00" value={formData.shipping_cost} onChange={e => setFormData({...formData, shipping_cost: e.target.value})} style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', borderColor: 'rgba(96, 165, 250, 0.4)' }} />
                          </div>
                        </div>
                      )}

                      {user?.role === 'admin' && (
                        <>
                          <div>
                            <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>FECHA DE CREACIÓN</label>
                            <input
                              type="datetime-local"
                              className="input-field"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.76rem' }}
                              value={formData.created_at || ''}
                              onChange={e => setFormData({ ...formData, created_at: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>FECHA DE ENTREGA</label>
                            <input
                              type="datetime-local"
                              className="input-field"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.76rem' }}
                              value={formData.delivered_at || ''}
                              onChange={e => setFormData({ ...formData, delivered_at: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Summary Card Side (Coherente con OrderDetailModal) */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '0.85rem 0.95rem', color: 'white', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 900 }}>$</span> RESUMEN FINANCIERO DE LA ORDEN
                    </div>

                    {/* BARRA DE PROGRESO PREVIEW */}
                    {(() => {
                      const tot = Number(formData.price || 0) + Number(formData.core_fee || 0);
                      const abono = Number(formData.down_payment || 0);
                      const pct = tot > 0 ? Math.min(100, Math.round((abono / tot) * 100)) : 0;
                      const pend = Math.max(0, tot - abono);

                      return (
                        <>
                          <div style={{ marginBottom: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                              <span>Progreso de Pago</span>
                              <strong style={{ color: pct === 100 ? '#4ade80' : 'white' }}>{pct}% {pct === 100 ? '(Pago Completo)' : ''}</strong>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : 'var(--accent-primary)', borderRadius: '3px', transition: 'all 0.3s' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span>Subtotal Pieza:</span>
                              <strong style={{ color: 'white' }}>${Number(formData.price || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span>Core Fee ($):</span>
                              <strong style={{ color: 'white' }}>+${Number(formData.core_fee || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span>Abono Inicial:</span>
                              <strong style={{ color: '#10b981' }}>-${abono.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                              <span>Método de Abono:</span>
                              <strong style={{ color: '#60a5fa' }}>{formData.payment_method || 'Zelle'}</strong>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.45rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>Balance Pendiente:</span>
                              <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: pend > 0 ? '#ef4444' : '#10b981' }}>
                                ${pend.toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ 
                        background: 'var(--gradient-primary)', 
                        color: 'white', 
                        border: 'none', 
                        width: '100%', 
                        padding: '0.55rem', 
                        fontSize: '0.86rem', 
                        fontWeight: 800, 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 4px 15px rgba(51, 102, 255, 0.4)',
                        cursor: 'pointer'
                      }}
                    >
                      <Zap size={15} />
                      {editingOrder ? 'Guardar Cambios' : 'Finalizar y Crear Orden'}
                    </button>
                  </div>

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(2)} style={{ padding: '0.35rem 1rem', fontSize: '0.76rem' }}>Atrás</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={showQuickViewModal}
        onClose={() => { setShowQuickViewModal(false); setQuickViewOrder(null); }}
        title={quickViewOrder ? `Vista Rapida Compartible - ${quickViewOrder.order_code}` : 'Vista Rapida Compartible'}
        maxWidth="820px"
      >
        {quickViewOrder && (() => {
          const parsedTransmission = quickViewOrder.product_type === 'Transmission'
            ? parseTransmissionSpecs(quickViewOrder.product_specs)
            : { transmission_type: '', drivetrain: '' };
          const transmissionType = quickViewOrder.transmission_type || parsedTransmission.transmission_type || '-';
          const total = Number(quickViewOrder.price || 0) + Number(quickViewOrder.core_fee || 0);
          const pending = total - Number(quickViewOrder.down_payment || 0);
          const isDelivery = quickViewOrder.shipping_toggle === 1 || Boolean(quickViewOrder.shipping_address && quickViewOrder.shipping_address.trim().length > 0);

          const msgEn = buildDeliveryDispatchMessage(quickViewOrder, 'en');
          const msgEs = buildDeliveryDispatchMessage(quickViewOrder, 'es');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dispatch / Delivery Format Card */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck size={18} style={{ color: '#60a5fa' }} />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#93c5fd' }}>
                      Formato para Mensaje de Entrega / Delivery
                    </h3>
                  </div>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '3px 10px', 
                    borderRadius: '12px',
                    background: isDelivery ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                    color: isDelivery ? '#10b981' : '#c084fc',
                    border: `1px solid ${isDelivery ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`
                  }}>
                    {isDelivery ? '🚚 Con Envío a Domicilio' : '🏬 Retiro en Tienda (Entrega sin dirección)'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                  {/* English Format Box */}
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>🇺🇸 Format (English)</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopyDeliveryFormat('en')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Copy size={12} /> Copiar
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleWhatsAppDeliveryFormat('en')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#25D366', borderColor: '#25D366' }}>
                          <Phone size={12} /> WA
                        </button>
                      </div>
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.78rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#f3f4f6', lineHeight: 1.45, background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '6px' }}>
                      {msgEn}
                    </pre>
                  </div>

                  {/* Spanish Format Box */}
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>🇪🇸 Formato (Español)</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopyDeliveryFormat('es')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Copy size={12} /> Copiar
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleWhatsAppDeliveryFormat('es')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#25D366', borderColor: '#25D366' }}>
                          <Phone size={12} /> WA
                        </button>
                      </div>
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.78rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#f3f4f6', lineHeight: 1.45, background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '6px' }}>
                      {msgEs}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Full Summary Header Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ficha Técnica Completa de la Orden</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCopyQuickView} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                    <Share2 size={14} /> Copiar Resumen Completo
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleWhatsAppQuickView} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                    <Phone size={14} /> Compartir por WhatsApp
                  </button>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Detalles del Vehiculo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <p style={{ margin: 0 }}><strong>Unidad:</strong> {quickViewOrder.year || '-'} {quickViewOrder.brand || '-'} {quickViewOrder.model || '-'}</p>
                  <p style={{ margin: 0 }}><strong>Sub-modelo:</strong> {quickViewOrder.sub_model || '-'}</p>
                  <p style={{ margin: 0 }}><strong>Tipo de pieza:</strong> {quickViewOrder.product_type || '-'}</p>
                  <p style={{ margin: 0 }}><strong>AT/MT:</strong> {quickViewOrder.product_type === 'Transmission' ? transmissionType : '-'}</p>
                  <p style={{ margin: 0 }}><strong>VIN:</strong> {quickViewOrder.vin_nr || '-'}</p>
                  <p style={{ margin: 0 }}><strong>Stock #:</strong> {quickViewOrder.stock_nr || '-'}</p>
                  <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Descripcion:</strong> {quickViewOrder.description || '-'}</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Detalles del Cliente</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <p style={{ margin: 0 }}><strong>Nombre:</strong> {quickViewOrder.first_name || '-'} {quickViewOrder.last_name || ''}</p>
                  <p style={{ margin: 0 }}><strong>Telefono:</strong> {quickViewOrder.customer_phone || '-'}</p>
                  <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Email:</strong> {quickViewOrder.customer_email || '-'}</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Detalles de Finanzas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <p style={{ margin: 0 }}><strong>Precio pieza:</strong> {formatMoney(quickViewOrder.price)}</p>
                  <p style={{ margin: 0 }}><strong>Core fee:</strong> {formatMoney(quickViewOrder.core_fee)}</p>
                  <p style={{ margin: 0 }}><strong>Total:</strong> {formatMoney(total)}</p>
                  <p style={{ margin: 0 }}><strong>Abono:</strong> {formatMoney(quickViewOrder.down_payment)}</p>
                  <p style={{ margin: 0 }}><strong>Pendiente:</strong> {formatMoney(pending)}</p>
                  <p style={{ margin: 0 }}><strong>Metodo:</strong> {quickViewOrder.payment_method || '-'}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>


      {/* Premium Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)} title="Confirmar Eliminación" maxWidth="450px">
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <AlertCircle size={40} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>¿Estás seguro?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
            Estás a punto de eliminar la orden <strong style={{ color: 'var(--text-main)' }}>{orderToDelete?.order_code}</strong>. 
            Esta acción es irreversible y afectará los registros históricos.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancelar</button>
            <button 
              className="btn" 
              style={{ flex: 1, background: '#ef4444', color: 'white' }} 
              disabled={deleting}
              onClick={async () => {
                if (!orderToDelete) return;
                setDeleting(true);
                try {
                  await api.delete(`/orders/${orderToDelete.id}`);
                  toast.success('Orden eliminada correctamente');
                  setShowDeleteModal(false);
                  fetchOrders();
                } catch (err: any) {
                  const message = err?.response?.data?.message || 'Error al intentar eliminar la orden';
                  toast.error(message);
                } finally {
                  setDeleting(false);
                  setOrderToDelete(null);
                }
              }}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Orden'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Claim Reason Modal */}
      <Modal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} title="Reportar Reclamo en Orden">
        <form onSubmit={handleSubmitClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Escriba el detalle del reclamo o problema asociado a esta orden:</label>
            <textarea 
              className="input-field" 
              rows={4} 
              autoFocus
              required
              placeholder="Ej: Cliente informa que la pieza llegó quebrada en el envío..."
              value={claimDetails} 
              onChange={e => setClaimDetails(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowClaimModal(false); setClaimDetails(''); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none' }}>Registrar Reclamo</button>
          </div>
        </form>
      </Modal>

      {/* Modal Solicitud de Estatus (PDF) */}
      <Modal
        isOpen={showStatusReportModal}
        onClose={() => !generatingStatusReport && setShowStatusReportModal(false)}
        title="📋 Lista de Solicitud de Estatus (PDF)"
        maxWidth="500px"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.2rem', lineHeight: '1.45' }}>
            Selecciona el rango de fechas para incluir las órdenes en estado <strong style={{ color: '#10b981' }}>Pagado</strong>. Se generará un documento PDF con la estructura limpia y legible para revisión de estatus operativo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block', color: 'white' }}>
                FECHA DE INICIO
              </label>
              <input
                type="date"
                className="input-field"
                value={statusReportStartDate}
                onChange={e => setStatusReportStartDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block', color: 'white' }}>
                FECHA DE FIN
              </label>
              <input
                type="date"
                className="input-field"
                value={statusReportEndDate}
                onChange={e => setStatusReportEndDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowStatusReportModal(false)}
              disabled={generatingStatusReport}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateStatusReportPDF}
              disabled={generatingStatusReport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gradient-primary)' }}
            >
              <FileText size={18} />
              <span>{generatingStatusReport ? 'Generando...' : 'Generar PDF'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Render Single Modular Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          detailData={selectedOrderDetail}
          user={user}
          isMobile={isMobile}
          viewMode={isDetailRoute ? 'page' : 'modal'}
          onClose={() => {
            if (isDetailRoute) {
              navigate('/orders');
              return;
            }
            setSelectedOrder(null);
            setSelectedOrderDetail(null);
          }}
          onChangeStatus={(id, newStatus, skipClaimModal) => handleChangeStatus(id, newStatus, skipClaimModal)}
          onValidatePayment={(id) => handleValidatePayment(id)}
          onSaveQuickDates={async (c, d) => {
            await api.put(`/orders/${selectedOrder.id}/dates`, { created_at: c, delivered_at: d });
            await fetchOrders();
          }}
          onSaveCustomerNotification={async (formData) => {
            await api.post(`/orders/${selectedOrder.id}/customer-notification`, formData);
            if (selectedOrder) await handleOpenDetail(selectedOrder);
          }}
          onPrintOrder={(id, type) => handlePrint(id, type as 'label' | 'invoice')}
        />
      )}

      {selectedOrder && showClaimModal && (
        <OrderStatusModal
          order={selectedOrder}
          onClose={() => setShowClaimModal(false)}
          onConfirm={async (id, status, desc, reason) => {
            await executeStatusChange(id, status, reason || desc);
          }}
        />
      )}
    </div>
  );
};

export default OrdersPage;
