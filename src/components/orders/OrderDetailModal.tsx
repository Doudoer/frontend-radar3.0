import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, FileText, Download, Printer, Package, Calendar, MessageSquare, Copy, Globe, AlertTriangle, Upload, Lock, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface OrderDetailModalProps {
  order: any;
  detailData: any;
  user: any;
  isMobile: boolean;
  viewMode?: 'modal' | 'page';
  onClose: () => void;
  onChangeStatus: (orderId: number, newStatus: string, skipClaimModal?: boolean) => void;
  onValidatePayment: (orderId: number) => void;
  onSaveQuickDates: (created_at: string, delivered_at: string) => Promise<void>;
  onSaveCustomerNotification: (formData: any) => Promise<void>;
  onPrintOrder: (orderId: number, type: string) => void;
  onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Cotización': return '#94a3b8';
    case 'Pagado': return '#3b82f6';
    case 'En Preparación': return '#8b5cf6';
    case 'Listo para Despacho': return '#ec4899';
    case 'Listo para Retiro': return '#a855f7';
    case 'En Camino': return '#06b6d4';
    case 'Entregado': return '#10b981';
    case 'Reclamo': return '#ef4444';
    case 'Cancelado': return '#64748b';
    case 'Reembolsado': return '#f59e0b';
    case 'Archivado': return '#475569';
    default: return '#3b82f6';
  }
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  detailData,
  user,
  isMobile,
  viewMode = 'modal',
  onClose,
  onChangeStatus,
  onValidatePayment,
  onSaveCustomerNotification,
  onPrintOrder,
  onRefresh
}) => {
  if (!order) return null;

  const getFileUrl = (pathStr: string) => {
    if (!pathStr) return '#';
    if (pathStr.startsWith('http')) return pathStr;
    const cleanPath = pathStr.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    const envApiUrl = import.meta.env.VITE_API_URL || '/api';
    const apiBase = envApiUrl.replace(/\/$/, '');
    
    if (apiBase.startsWith('http')) {
      const hostBase = apiBase.replace(/\/api$/, '');
      return `${hostBase}/uploads/${cleanPath}`;
    }
    return `${apiBase}/uploads/${cleanPath}`;
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current active step in the Call Center Guided Workflow (1..4)
  const initialWorkflowStep = order.status === 'Entregado' ? 4 : (order.workflow_step || 1);
  const [unlockedStep, setUnlockedStep] = useState<number>(initialWorkflowStep);
  const [activeStep, setActiveStep] = useState<number>(initialWorkflowStep);
  const [msgLang, setMsgLang] = useState<'es' | 'en'>('es');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(true);
  const [isStepperExpanded, setIsStepperExpanded] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  const handleToggleSummary = () => {
    if (!isSummaryExpanded) {
      setIsSummaryExpanded(true);
      setIsStepperExpanded(false);
      setIsHistoryExpanded(false);
    } else {
      setIsSummaryExpanded(false);
      setIsStepperExpanded(true);
    }
  };

  const handleToggleStepper = () => {
    if (!isStepperExpanded) {
      setIsStepperExpanded(true);
      setIsSummaryExpanded(false);
      setIsHistoryExpanded(false);
    } else {
      setIsStepperExpanded(false);
    }
  };

  const handleToggleHistory = () => {
    if (!isHistoryExpanded) {
      setIsHistoryExpanded(true);
      setIsSummaryExpanded(false);
      setIsStepperExpanded(false);
    } else {
      setIsHistoryExpanded(false);
      setIsStepperExpanded(true);
    }
  };

  // Screenshot upload state for Step 1
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // CRM Form
  const [notifyForm, setNotifyForm] = useState({
    message: '',
    customer_response: '',
    contact_channel: 'WhatsApp',
    contact_reason: 'Notificación de creación de orden',
    contact_result: '',
    next_action: '',
    next_action_at: ''
  });
  const [savingNotify, setSavingNotify] = useState(false);
  const [voiceCallMade, setVoiceCallMade] = useState(false);

  // Step 3 Scheduling & Prorogation & Reschedule State
  const [scheduledPickupAt, setScheduledPickupAt] = useState<string>(toDateTimeLocal(order.scheduled_pickup_at));
  const [prorogationUntil, setProrogationUntil] = useState<string>(toDateTimeLocal(order.prorogation_until));
  const [prorogationReason, setProrogationReason] = useState<string>('');
  const [showProrogationModal, setShowProrogationModal] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState<string>(toDateTimeLocal(order.scheduled_pickup_at) || toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
  const [rescheduleCallMade, setRescheduleCallMade] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Step 4 Delivery Checklist State
  const [checkReceived, setCheckReceived] = useState<boolean>(order.status === 'Entregado');
  const [checkInvoice, setCheckInvoice] = useState<boolean>(Boolean(order.invoice_sent));
  const [coreStatus, setCoreStatus] = useState<string>(order.core_status || 'Entregado');

  // Claim & Warranty State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimReason, setClaimReason] = useState('');
  const [savingClaim, setSavingClaim] = useState(false);
  const [claimSolutionNotes, setClaimSolutionNotes] = useState('');
  const [processingClaimSolution, setProcessingClaimSolution] = useState(false);

  // Claim Communications State
  const [showClaimCommForm, setShowClaimCommForm] = useState(false);
  const [claimCommChannel, setClaimCommChannel] = useState('WhatsApp');
  const [claimCommMessage, setClaimCommMessage] = useState('');
  const [claimCommCustomerResponse, setClaimCommCustomerResponse] = useState('');
  const [claimCommResult, setClaimCommResult] = useState('En Evaluación Técnica');
  const [savingClaimComm, setSavingClaimComm] = useState(false);

  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<'all' | 'notif' | 'reschedule' | 'claims' | 'status'>('all');

  // Warranty Calculations
  const deliveryDate = order.delivered_at ? new Date(order.delivered_at) : new Date(order.created_at || Date.now());
  const warrantyDaysTotal = Number(order.warranty_days || 30);
  const warrantyExpiryDate = new Date(deliveryDate.getTime() + warrantyDaysTotal * 24 * 60 * 60 * 1000);
  const daysWarrantyLeft = Math.max(0, Math.ceil((warrantyExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isWarrantyActive = daysWarrantyLeft > 0;
  const warrantyProgressPercent = Math.min(100, Math.max(0, Math.round(((warrantyDaysTotal - daysWarrantyLeft) / warrantyDaysTotal) * 100)));

  const createdDate = order.created_at ? new Date(order.created_at) : new Date();
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
  const daysCreated = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const createdDateFormatted = createdDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });

  const isOrderClosed = order.status === 'Entregado';
  const isCoreFeePaidPending = coreStatus === 'Pagado_Pendiente' || coreStatus === 'Fianza_150' || coreStatus === 'Pendiente' || order.core_status === 'Pagado_Pendiente' || order.core_status === 'Fianza_150' || order.core_status === 'Pendiente';
  const showCoreBadgeInHeader = isOrderClosed && isCoreFeePaidPending;

  const getCoreInfo = (status: string) => {
    const st = status || order.core_status || 'Entregado';
    if (st === 'Entregado') {
      return {
        label: 'CORE Entregado Físicamente',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: 'rgba(16, 185, 129, 0.35)',
        color: '#86efac',
        icon: '✅',
        desc: 'El cliente entregó la pieza vieja (CORE) en tienda al momento del retiro. No hay montos pendientes.'
      };
    }
    if (st === 'Pagado_Pendiente' || st === 'Fianza_150' || st === 'Pendiente') {
      const startDate = new Date(order.delivered_at || order.scheduled_pickup_at || order.created_at || Date.now());
      const deadline = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return {
          label: `Depósito $150 Cobrado (${diffDays} días restantes para reembolso)`,
          badgeBg: 'rgba(245, 158, 11, 0.18)',
          badgeBorder: 'rgba(245, 158, 11, 0.4)',
          color: '#fcd34d',
          icon: '⏳',
          daysLeft: diffDays,
          deadlineStr: deadline.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
          desc: `El cliente pagó $150 de depósito. Tiene hasta el ${deadline.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} (${diffDays} días restantes) para entregar la pieza vieja y recibir su reembolso completo de $150.`
        };
      } else {
        return {
          label: `Plazo de CORE Vencido (14 Días Expirados)`,
          badgeBg: 'rgba(239, 68, 68, 0.18)',
          badgeBorder: 'rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          icon: '⚠️',
          daysLeft: 0,
          desc: 'Han transcurrido más de 14 días desde la entrega/orden. El plazo legal para devolver el CORE y reclamar el reembolso de $150 ha expirado.'
        };
      }
    }
    if (st === 'Reembolsado') {
      return {
        label: 'CORE Devuelto & $150 Reembolsados',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeBorder: 'rgba(59, 130, 246, 0.35)',
        color: '#93c5fd',
        icon: '💵',
        desc: 'El cliente devolvió el CORE viejo posteriormente y se le reembolsó el total de $150.'
      };
    }
    return {
      label: 'No Aplica CORE',
      badgeBg: 'rgba(255, 255, 255, 0.05)',
      badgeBorder: 'rgba(255, 255, 255, 0.1)',
      color: 'var(--text-secondary)',
      icon: '⚪',
      desc: 'Esta orden no requiere devolución de pieza vieja.'
    };
  };

  const coreInfo = getCoreInfo(coreStatus);

  const updateWorkflowStepInBackend = async (nextStep: number, extraData: any = {}) => {
    try {
      await api.patch(`/orders/${order.id}/workflow`, {
        workflow_step: nextStep,
        ...extraData
      });
      order.workflow_step = nextStep;
      setUnlockedStep(nextStep);
      setActiveStep(nextStep);
    } catch (err) {
      console.error('Error updating workflow step:', err);
    }
  };

  // BILINGUAL CREATION NOTIFICATION MESSAGE (STEP 1)
  const getCreationMessage = (lang: 'es' | 'en') => {
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US') : 'N/A';
    const vehicleStr = `${order.brand || ''} ${order.model || ''} ${order.year || ''}`.trim();
    const partStr = order.product_type || 'Pieza';
    const totalCost = (Number(order.price || 0) + Number(order.core_fee || 0)).toFixed(2);
    const downPayment = Number(order.down_payment || 0).toFixed(2);
    const warrantyDays = order.warranty_days || 30;

    if (lang === 'es') {
      return `Fecha de la orden: ${dateStr}\n` +
        `Vehículo: ${vehicleStr}\n` +
        `Pieza: ${partStr}\n` +
        `Costo: $${totalCost}\n` +
        `Depósito: $${downPayment}\n` +
        `Métodos de pago: Zelle, CashApp, Efectivo.\n` +
        `Términos y condiciones: Al agendar con nosotros, está aceptando que cancela dentro de los métodos de pago establecidos.\n` +
        `Para poder retirar la pieza se debe entregar el CORE (pieza vieja). De no tenerla en el momento, deberá cancelar 150$ por el CORE. Con eso tendrá dos semanas para traer la pieza vieja, y una vez entregada nosotros le devolveremos los 150$.\n` +
        `Garantía: ${warrantyDays} días de garantía.\n` +
        `¡Tan pronto como su pieza esté lista, le dejaremos saber de inmediato!\n` +
        `¡Gracias por su compra!`;
    } else {
      return `Order Date: ${dateStr}\n` +
        `Vehicle: ${vehicleStr}\n` +
        `Part: ${partStr}\n` +
        `Total Cost: $${totalCost}\n` +
        `Deposit: $${downPayment}\n` +
        `Payment Methods: Zelle, CashApp, Cash.\n` +
        `Terms & Conditions: By scheduling with us, you agree to make payments using the established payment methods.\n` +
        `To pick up the part, the CORE (old part) must be turned in. If you do not have it at the moment, a $150 CORE deposit is required, giving you 2 weeks to return the old part for a full $150 refund.\n` +
        `Warranty: ${warrantyDays} days warranty.\n` +
        `As soon as your part is ready, we will notify you immediately!\n` +
        `Thank you for your purchase!`;
    }
  };

  // BILINGUAL PART READY MESSAGE (STEP 3)
  const getReadyMessage = (lang: 'es' | 'en') => {
    const code = order.order_code || '';
    const vehicleStr = `${order.brand || ''} ${order.model || ''}`.trim();
    const partStr = order.product_type || 'Pieza';
    const balance = (Number(order.price || 0) + Number(order.core_fee || 0) - Number(order.down_payment || 0)).toFixed(2);
    const pickupType = order.shipping_toggle ? 'despacho' : 'retiro en local';

    if (lang === 'es') {
      return `¡Hola ${order.first_name || ''}! Tu orden #${code} (${partStr} para ${vehicleStr}) ya está LISTA para ${pickupType}.\n` +
        `Saldo pendiente: $${balance}.\n` +
        `Recuerda traer la pieza vieja (CORE) o la fianza de $150 para validar la garantía.\n` +
        `Por favor indícanos a qué hora pasarás a retirar o estarás disponible para la entrega.`;
    } else {
      return `Hello ${order.first_name || ''}! Your order #${code} (${partStr} for ${vehicleStr}) is now READY for ${order.shipping_toggle ? 'delivery' : 'pickup'}.\n` +
        `Pending balance: $${balance}.\n` +
        `Please remember to bring the old part (CORE) or $150 deposit to activate your warranty.\n` +
        `Please reply with your expected arrival time or delivery availability.`;
    }
  };

  const currentMsgText = activeStep === 1 
    ? (notifyForm.message || getCreationMessage(msgLang))
    : activeStep === 3
    ? (notifyForm.message || getReadyMessage(msgLang))
    : notifyForm.message;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Mensaje copiado al portapapeles');
  };

  const rawPhone = order.customer_phone || order.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(currentMsgText)}` : null;

  // Open Screenshot modal when clicking "Mensaje Enviado"
  const handleOpenScreenshotModal = () => {
    setShowScreenshotModal(true);
  };

  // Upload screenshot & unlock Step 2
  const handleUploadScreenshotAndAdvance = async () => {
    if (!selectedFile) {
      toast.error('Debes seleccionar o adjuntar la captura de pantalla del mensaje enviado.');
      return;
    }

    setUploadingScreenshot(true);
    try {
      // 1. Upload file as attachment
      const formData = new FormData();
      formData.append('files', selectedFile);
      await api.post(`/orders/${order.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 2. Save notification log
      await onSaveCustomerNotification({
        message: currentMsgText,
        contact_channel: 'WhatsApp / Texto',
        contact_reason: 'Notificación de creación de orden',
        contact_result: 'Captura de pantalla adjuntada y enviada'
      });

      // 3. Unlock Step 2
      await updateWorkflowStepInBackend(2);
      setShowScreenshotModal(false);
      setSelectedFile(null);
      toast.success('📸 Captura de pantalla verificada. ¡Paso 2 Desbloqueado!');
    } catch (err) {
      console.error('Error uploading screenshot:', err);
      toast.error('Error al subir la captura de pantalla.');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleStep2Complete = async () => {
    setSavingNotify(true);
    try {
      await onSaveCustomerNotification({
        message: 'Acuse de recepción verificado',
        customer_response: notifyForm.customer_response || (voiceCallMade ? 'Confirmado vía llamada de voz' : 'Cliente notificado por texto'),
        contact_channel: voiceCallMade ? 'Llamada de voz' : 'WhatsApp / Texto',
        contact_reason: 'Acuse de recepción de orden',
        contact_result: 'Cliente Notificado y Confirmado'
      });
      await updateWorkflowStepInBackend(3);
      toast.success('Paso 2 completado. ¡Paso 3 Desbloqueado!');
    } finally {
      setSavingNotify(false);
    }
  };

  const handleProrogationSave = async () => {
    if (!prorogationUntil) {
      toast.error('Selecciona la nueva fecha de prórroga.');
      return;
    }
    try {
      await api.patch(`/orders/${order.id}/workflow`, {
        prorogation_until: prorogationUntil
      });
      await onSaveCustomerNotification({
        message: `Prórroga acordada con cliente hasta ${new Date(prorogationUntil).toLocaleString('es-ES')}. Motivo: ${prorogationReason || 'Retraso de pieza'}`,
        contact_channel: 'Llamada de voz / WhatsApp',
        contact_reason: 'Notificación de retraso',
        contact_result: 'Cliente solicita cambio de fecha'
      });
      setShowProrogationModal(false);
      toast.success('Prórroga registrada correctamente');
    } catch (err) {
      toast.error('Error al guardar prórroga');
    }
  };

  const handleStep3Complete = async () => {
    if (!scheduledPickupAt) {
      toast.error('Por favor selecciona la fecha y hora de la cita en el calendario.');
      return;
    }
    setSavingNotify(true);
    try {
      await api.patch(`/orders/${order.id}/workflow`, {
        scheduled_pickup_at: scheduledPickupAt,
        workflow_step: 4
      });
      await onSaveCustomerNotification({
        message: currentMsgText,
        customer_response: `Cita agendada para: ${new Date(scheduledPickupAt).toLocaleString('es-ES')}`,
        contact_channel: 'WhatsApp / Llamada',
        contact_reason: 'Confirmación de retiro/entrega',
        contact_result: 'Cliente confirmó recepción/retiro',
        next_action_at: scheduledPickupAt
      });
      setUnlockedStep(4);
      setActiveStep(4);
      toast.success('Cita agendada en calendario. ¡Paso 4 Desbloqueado!');
    } finally {
      setSavingNotify(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleDate) {
      toast.error('Por favor selecciona la nueva fecha y hora para la cita.');
      return;
    }
    if (!rescheduleReason.trim()) {
      toast.error('Escribe el motivo por el cual el cliente no asistió o solicitó reprogramar.');
      return;
    }
    setSavingReschedule(true);
    try {
      await api.patch(`/orders/${order.id}/workflow`, {
        scheduled_pickup_at: rescheduleDate
      });

      await onSaveCustomerNotification({
        message: `🔄 Cita Reprogramada por Inasistencia / Cambio. Motivo: ${rescheduleReason}`,
        customer_response: rescheduleReason,
        contact_channel: rescheduleCallMade ? 'Llamada de Voz' : 'WhatsApp / Llamada',
        contact_reason: 'Reprogramación de Cita (Inasistencia del cliente)',
        contact_result: `Nueva cita agendada para: ${new Date(rescheduleDate).toLocaleString('es-ES')}`,
        next_action_at: rescheduleDate
      });

      setScheduledPickupAt(rescheduleDate);
      order.scheduled_pickup_at = rescheduleDate;
      setShowRescheduleModal(false);
      toast.success('🔄 Cita reprogramada exitosamente y registrada en el historial.');
    } catch (err) {
      console.error('Error al reprogramar la cita:', err);
      toast.error('Error al guardar la reprogramación de la cita.');
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleCreateClaim = async () => {
    if (!claimReason.trim()) {
      toast.error('Por favor escribe la falla o motivo del reclamo reportado por el cliente.');
      return;
    }
    setSavingClaim(true);
    try {
      await onChangeStatus(order.id, 'Reclamo', true);
      await onSaveCustomerNotification({
        message: `🚨 Reclamo Abierto por Garantía / Falla. Motivo: ${claimReason}`,
        customer_response: claimReason,
        contact_channel: 'Llamada de Voz / WhatsApp',
        contact_reason: 'Apertura de Reclamo por Garantía',
        contact_result: 'Orden cambiada a estado RECLAMO para atención técnica'
      });
      setShowClaimModal(false);
      order.status = 'Reclamo';
      toast.success('🚨 Reclamo registrado correctamente. La orden cambió a estado RECLAMO.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error al abrir reclamo:', err);
      toast.error('Error al registrar el reclamo.');
    } finally {
      setSavingClaim(false);
    }
  };

  const handleResolveClaim = async (solutionType: 'replacement' | 'refund' | 'closed') => {
    setProcessingClaimSolution(true);
    try {
      if (solutionType === 'replacement') {
        await onChangeStatus(order.id, 'En Preparación', true);
        await onSaveCustomerNotification({
          message: `📦 Reclamo Resuelto: Se aprobó el reemplazo de la pieza. Notas: ${claimSolutionNotes || 'Reemplazo en garantía'}`,
          customer_response: 'Cliente aceptó sustitución de pieza bajo garantía.',
          contact_channel: 'Sistema Interno',
          contact_reason: 'Resolución de Reclamo - Reemplazo de Pieza',
          contact_result: 'Pieza enviada nuevamente a preparación'
        });
        order.status = 'En Preparación';
        toast.success('📦 Reemplazo de pieza aprobado. La orden pasó a "En Preparación".');
      } else if (solutionType === 'refund') {
        await onChangeStatus(order.id, 'Reembolsado', true);
        await onSaveCustomerNotification({
          message: `💵 Reclamo Resuelto: Se aprobó el reembolso por garantía al cliente. Notas: ${claimSolutionNotes || 'Reembolso por garantía'}`,
          customer_response: 'Cliente aceptó reembolso total por garantía.',
          contact_channel: 'Sistema Interno',
          contact_reason: 'Resolución de Reclamo - Reembolso por Garantía',
          contact_result: 'Reembolso aprobado y procesado'
        });
        order.status = 'Reembolsado';
        toast.success('💵 Reembolso por garantía aprobado.');
      } else if (solutionType === 'closed') {
        await onChangeStatus(order.id, 'Entregado', true);
        await onSaveCustomerNotification({
          message: `✅ Reclamo Cerrado: Solución/Diagnóstico finalizado. Notas: ${claimSolutionNotes || 'Cierre de reclamo sin cambio'}`,
          customer_response: 'Reclamo atendido y solucionado.',
          contact_channel: 'Sistema Interno',
          contact_reason: 'Resolución de Reclamo - Cierre Final',
          contact_result: 'Orden retornada a estado ENTREGADO'
        });
        order.status = 'Entregado';
        toast.success('✅ Reclamo cerrado. La orden retornó a estado "Entregado".');
      }
      setClaimSolutionNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error al resolver reclamo:', err);
      toast.error('Error al procesar la resolución del reclamo.');
    } finally {
      setProcessingClaimSolution(false);
    }
  };

  const handleSaveClaimCommunication = async () => {
    if (!claimCommMessage.trim() && !claimCommCustomerResponse.trim()) {
      toast.error('Por favor escribe una nota de la conversación o respuesta del cliente.');
      return;
    }
    setSavingClaimComm(true);
    try {
      await onSaveCustomerNotification({
        message: `💬 Avance de Reclamo: ${claimCommMessage.trim() || 'Seguimiento con el cliente.'}`,
        customer_response: claimCommCustomerResponse.trim() || 'Información compartida con el cliente.',
        contact_channel: claimCommChannel,
        contact_reason: 'Seguimiento de Reclamo',
        contact_result: claimCommResult
      });
      toast.success('💬 Seguimiento de comunicación registrado en la bitácora del reclamo.');
      setClaimCommMessage('');
      setClaimCommCustomerResponse('');
      setShowClaimCommForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error al registrar comunicación del reclamo:', err);
      toast.error('Error al guardar el seguimiento.');
    } finally {
      setSavingClaimComm(false);
    }
  };

  const handleFinalizeDelivery = async () => {
    if (!checkReceived || !checkInvoice) {
      toast.error('Debes confirmar los puntos del checklist antes de finalizar la orden.');
      return;
    }
    try {
      await onChangeStatus(order.id, 'Entregado');
      await api.patch(`/orders/${order.id}/workflow`, {
        workflow_step: 4,
        core_status: coreStatus,
        invoice_sent: 1
      });
      toast.success('🎉 ¡Orden marcada como ENTREGADA Y FINALIZADA exitosamente!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error('Error al finalizar la orden.');
    }
  };

  const handleProcessCoreRefund = async () => {
    try {
      await api.patch(`/orders/${order.id}/workflow`, {
        core_status: 'Reembolsado'
      });
      setCoreStatus('Reembolsado');
      toast.success('💵 Reembolso de $150 registrado y CORE marcado como Reembolsado.');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Error al registrar el reembolso del CORE.');
    }
  };

  const attachments = detailData?.attachments || [];

  const steps = [
    { id: 1, title: '1. Creación & Términos', subtitle: 'Mensaje Inicial + Capture', icon: Package },
    { id: 2, title: '2. Acuse & 2-3 Días', subtitle: 'Confirmación o Llamada', icon: Clock },
    { id: 3, title: '3. Pieza Lista & Cita', subtitle: 'Notificación y Calendario', icon: Calendar },
    { id: 4, title: '4. Cierre & Facturación', subtitle: 'Checklist y Entrega Total', icon: CheckCircle }
  ];

  const subtotalPrice = Number(order.price || 0);
  const coreFee = Number(order.core_fee || 0);
  const totalAmount = subtotalPrice + coreFee;
  const initialDownPayment = Number(order.down_payment || 0);
  const isDelivered = order.status === 'Entregado';
  const actualPaidAmount = isDelivered ? totalAmount : initialDownPayment;
  const balancePending = Math.max(0, totalAmount - actualPaidAmount);
  const paymentProgressPercent = totalAmount > 0 
    ? Math.min(100, Math.round((actualPaidAmount / totalAmount) * 100)) 
    : 0;

  const drawerContent = (
      <motion.div
        initial={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.985 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="orders-detail-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de orden"
        style={{ 
          position: 'relative',
          width: isMobile ? '100%' : '95%', 
          height: isMobile ? '100dvh' : 'auto',
          maxWidth: isMobile ? 'none' : '960px', 
          maxHeight: isMobile ? '100dvh' : 'calc(100dvh - 2rem)',
          margin: isMobile ? 0 : 'auto',
          padding: isMobile ? '1rem' : '1.75rem', 
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 1301
        }}
      >
        {/* Fixed Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="font-outfit" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              Orden <span style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{order.order_code}</span>
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Flujo Guiado Estricto de Call Center - Paso {activeStep} de 4
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {order.status === 'Por Validar' && user?.role === 'admin' && (
              <button 
                className="btn btn-primary" 
                onClick={() => onValidatePayment(order.id)} 
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.85rem' }}
              >
                <CheckCircle size={16}/> Validar Pago
              </button>
            )}
            
            <select 
              value={order.status}
              onChange={(e) => onChangeStatus(order.id, e.target.value)}
              style={{ 
                padding: '6px 32px 6px 16px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600,
                background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status),
                border: `1px solid ${getStatusColor(order.status)}40`,
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="Cotización" style={{ background: '#1f1f2e', color: 'white' }}>Cotización</option>
              <option value="Pagado" style={{ background: '#1f1f2e', color: 'white' }}>Pagado</option>
              <option value="En Preparación" style={{ background: '#1f1f2e', color: 'white' }}>En Preparación</option>
              <option value="Listo para Despacho" style={{ background: '#1f1f2e', color: 'white' }}>Listo para Despacho</option>
              <option value="Listo para Retiro" style={{ background: '#1f1f2e', color: 'white' }}>Listo para Retiro</option>
              <option value="En Camino" style={{ background: '#1f1f2e', color: 'white' }}>En Camino</option>
              <option value="Entregado" style={{ background: '#1f1f2e', color: 'white' }}>Entregado</option>
              <option value="Reclamo" style={{ background: '#1f1f2e', color: 'white' }}>Reclamo</option>
              <option value="Cancelado" style={{ background: '#1f1f2e', color: 'white' }}>Cancelado</option>
              <option value="Reembolsado" style={{ background: '#1f1f2e', color: 'white' }}>Reembolsado</option>
              <option value="Archivado" style={{ background: '#1f1f2e', color: 'white' }}>Archivado</option>
            </select>

            <button 
              className="btn btn-secondary" 
              onClick={() => onPrintOrder(order.id, 'receipt')}
              title="Imprimir Recibo"
              style={{ padding: '0.5rem' }}
            >
              <Printer size={18} />
            </button>

            <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ACCORDION ORDER SUMMARY HEADER WITH FULL 3-CARD DETAILED LAYOUT FROM IMAGE 1 */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          marginBottom: '1.25rem',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* ACCORDION TOGGLE BAR */}
          <button
            type="button"
            onClick={handleToggleSummary}
            style={{
              width: '100%',
              padding: '0.85rem 1.15rem',
              background: 'rgba(255,255,255,0.03)',
              border: 'none',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#60a5fa' }}>
                <FileText size={18} />
                <span>Resumen & Detalles de la Orden</span>
              </div>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                • <strong>{order.first_name} {order.last_name}</strong> • {order.brand} {order.model} {order.year} • Total: ${(Number(order.price || 0) + Number(order.core_fee || 0)).toFixed(2)}
              </span>

              {showCoreBadgeInHeader ? (
                <span style={{
                  padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                  background: coreInfo.badgeBg, border: `1px solid ${coreInfo.badgeBorder}`, color: coreInfo.color
                }}>
                  {coreInfo.icon} {coreInfo.label}
                </span>
              ) : (
                <span style={{
                  padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.18)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fcd34d'
                }}>
                  📌 Creada: {createdDateFormatted} ({daysCreated === 0 ? 'Hoy' : `${daysCreated} día${daysCreated === 1 ? '' : 's'} creada`}) • Estado: {order.status}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isSummaryExpanded ? 'Ocultar Detalles' : 'Ver Todos los Detalles'}
              {isSummaryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {/* ACCORDION CONTENT BODY (EXPANDABLE) */}
          {isSummaryExpanded && (
            <div style={{ padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* 3 TOP METRIC CARDS MATCHING IMAGE 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.55rem' }}>
                
                {/* Card 1: Resumen Financiero */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontWeight: 900 }}>$</span> RESUMEN FINANCIERO
                  </div>
                  
                  <div style={{ marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                      <span>Progreso de Pago</span>
                      <strong style={{ color: paymentProgressPercent === 100 ? '#4ade80' : 'white' }}>
                        {paymentProgressPercent}% {isDelivered ? '(Pago Completo)' : ''}
                      </strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${paymentProgressPercent}%`,
                        height: '100%',
                        background: paymentProgressPercent === 100 ? '#10b981' : 'var(--accent-primary)',
                        borderRadius: '3px',
                        transition: 'all 0.4s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                      <strong style={{ color: 'white' }}>${subtotalPrice.toFixed(2)}</strong>
                    </div>

                    {coreFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Core Fee:</span>
                        <strong style={{ color: 'white' }}>+${coreFee.toFixed(2)}</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Abono Inicial:</span>
                      <strong style={{ color: '#10b981' }}>-${actualPaidAmount.toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'white', fontWeight: 700 }}>Balance Pendiente:</span>
                      <strong style={{ color: balancePending > 0 ? '#ef4444' : '#10b981', fontSize: '0.88rem' }}>${balancePending.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Perfil del Cliente */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} /> PERFIL DEL CLIENTE
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                      {(order.first_name?.[0] || 'C') + (order.last_name?.[0] || '')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '0.86rem', color: 'white', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.first_name} {order.last_name}</strong>
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
                        <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', padding: '0.08rem 0.35rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>NUEVO CLIENTE</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>TELÉFONO</span>
                      <strong style={{ fontSize: '0.82rem', color: 'white', fontFamily: 'monospace' }}>{order.customer_phone || order.phone || 'Sin teléfono'}</strong>
                    </div>
                    {(order.customer_phone || order.phone) && (
                      <button
                        type="button"
                        onClick={() => {
                          const rawPhone = (order.customer_phone || order.phone || '').replace(/\D/g, '');
                          if (rawPhone) window.open(`https://wa.me/${rawPhone}`, '_blank');
                          else toast.error('Teléfono no válido para WhatsApp');
                        }}
                        style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#4ade80', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        💬 WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 3: Logística y Garantía */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Package size={14} /> LOGÍSTICA Y GARANTÍA
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', flexShrink: 0 }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'white', display: 'block' }}>{order.shipping_toggle ? '🚚 Envío a Domicilio' : '🏬 Retiro en Local'}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Punto de Venta Principal</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Protección / Garantía:</span>
                    <strong style={{ fontSize: '0.82rem', color: 'white' }}>{order.warranty_days || 30} Días</strong>
                  </div>
                </div>

              </div>

              {/* VEHÍCULO, PIEZA, VIN, STOCK BLOCK */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.55rem', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>VEHÍCULO</span>
                    <strong style={{ fontSize: '0.84rem', color: 'white', display: 'block' }}>{order.brand} {order.model} {order.year}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Sub-modelo: {order.sub_model || 'N/A'}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>PIEZA / TIPO</span>
                    <strong style={{ fontSize: '0.84rem', color: 'white', display: 'block' }}>{order.product_type}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{order.product_specs || 'AT/MT: AT'}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>VIN</span>
                      {order.vin_nr && (
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(order.vin_nr); toast.success('VIN copiado'); }}
                          style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}
                          title="Copiar VIN"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                    <strong style={{ fontSize: '0.82rem', color: 'white', fontFamily: 'monospace', display: 'block' }}>{order.vin_nr || 'Sin VIN'}</strong>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>STOCK #</span>
                      {order.stock_nr && (
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(order.stock_nr); toast.success('Stock # copiado'); }}
                          style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 0 }}
                          title="Copiar Stock #"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                    <strong style={{ fontSize: '0.84rem', color: '#f59e0b', display: 'block' }}>{order.stock_nr || 'N/A'}</strong>
                  </div>
                </div>

                {/* DESCRIPCIÓN & FECHAS COMPACTAS */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '0.55rem', marginTop: '0.45rem', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                      Descripción de la Orden
                    </span>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'white', lineHeight: 1.35, background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {order.description || 'Sin descripción adicional.'}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>CREADA</span>
                    <strong style={{ fontSize: '0.76rem', color: 'white' }}>{order.created_at ? new Date(order.created_at).toLocaleString('es-ES') : '-'}</strong>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>ENTREGADA</span>
                    <strong style={{ fontSize: '0.76rem', color: order.delivered_at ? '#10b981' : 'var(--text-secondary)' }}>
                      {order.delivered_at ? new Date(order.delivered_at).toLocaleString('es-ES') : 'Aún no entregada'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CORE / TRACKING STATUS BANNER */}
              {showCoreBadgeInHeader ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem',
                  padding: '0.45rem 0.75rem', borderRadius: '8px',
                  background: coreInfo.badgeBg, border: `1px solid ${coreInfo.badgeBorder}`, color: coreInfo.color,
                  fontSize: '0.76rem', lineHeight: 1.35
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                    <span style={{ fontSize: '0.88rem' }}>{coreInfo.icon}</span>
                    <span>Estado del CORE: {coreInfo.label}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>{coreInfo.desc}</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem',
                  padding: '0.45rem 0.75rem', borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fcd34d',
                  fontSize: '0.76rem', lineHeight: 1.35
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                    <span style={{ fontSize: '0.88rem' }}>📌</span>
                    <span>Seguimiento de la Orden: Creada el {createdDateFormatted} ({daysCreated === 0 ? 'Hoy' : `${daysCreated} día${daysCreated === 1 ? '' : 's'} de creada`})</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                    Estado Actual: <strong>{order.status}</strong> • Flujo de Trabajo: Paso {unlockedStep} de 4
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACCORDION 2: FLUJO GUIADO DE SEGUIMIENTO (CALL CENTER STEPPER) */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '1rem',
          transition: 'all 0.3s ease'
        }}>
          {/* ACCORDION STEPPER TOGGLE BAR */}
          <button
            type="button"
            onClick={handleToggleStepper}
            style={{
              width: '100%',
              padding: '0.85rem 1.15rem',
              background: 'rgba(255,255,255,0.03)',
              border: 'none',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {order.status === 'Reclamo' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#ef4444' }}>
                    <AlertTriangle size={18} />
                    <span>Centro de Gestión de Reclamos & Garantía</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: '#fca5a5', background: 'rgba(239,68,68,0.18)',
                    border: '1px solid rgba(239,68,68,0.35)', padding: '0.18rem 0.6rem', borderRadius: '10px', fontWeight: 700
                  }}>
                    🚨 Reclamo Activo (Atención Prioritaria)
                  </span>
                </>
              ) : order.status === 'Reembolsado' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#fcd34d' }}>
                    <CheckCircle size={18} />
                    <span>Panel de Orden Reembolsada & Tramitación Finalizada</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: '#fcd34d', background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.3)', padding: '0.18rem 0.6rem', borderRadius: '10px', fontWeight: 700
                  }}>
                    💵 Estado: REEMBOLSADO
                  </span>
                </>
              ) : order.status === 'Entregado' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#10b981' }}>
                    <CheckCircle size={18} />
                    <span>Panel de Post-Venta & Garantía Activa</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: isWarrantyActive ? '#86efac' : '#fca5a5',
                    background: isWarrantyActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${isWarrantyActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    padding: '0.18rem 0.6rem', borderRadius: '10px', fontWeight: 700
                  }}>
                    {isWarrantyActive ? `🟢 Garantía Vigente (${daysWarrantyLeft} días)` : '🔴 Garantía Expirada'}
                  </span>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    <Clock size={18} />
                    <span>Flujo Guiado de Seguimiento (Call Center)</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: '#86efac', background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)', padding: '0.18rem 0.6rem', borderRadius: '10px', fontWeight: 700
                  }}>
                    ⚡ Paso {activeStep} de 4: {steps[activeStep - 1]?.title}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isStepperExpanded ? 'Ocultar Flujo' : 'Abrir Flujo / Acciones'}
              {isStepperExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {/* EXPANDABLE STEPPER / POST-DELIVERY / CLAIMS CONTENT */}
          {isStepperExpanded && (
            <div style={{ padding: '0.75rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', maxHeight: '440px', overflowY: 'auto', paddingRight: '0.4rem' }}>
              
              {/* VISTA 1: GESTIÓN DE RECLAMOS (CUANDO STATUS ES 'Reclamo') */}
              {order.status === 'Reclamo' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '0.6rem 0.85rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={17} /> Centro de Atención y Resolución de Reclamos en Garantía
                    </h4>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Esta orden se encuentra en estado de <strong>RECLAMO</strong>. Revisa los comentarios de la falla y selecciona la acción resolutiva de soporte técnico.
                    </p>
                  </div>

                  {/* NOTA DEL RECLAMO REGISTRADO Y FECHA/HORA DE INCIDENCIA */}
                  {(() => {
                    const claimNotif = detailData?.customer_notifications?.find((n: any) => 
                      n.contact_reason?.includes('Reclamo') || n.message?.includes('Reclamo')
                    );
                    const claimDateStr = claimNotif?.created_at
                      ? new Date(claimNotif.created_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })
                      : (order.updated_at ? new Date(order.updated_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : 'Fecha no especificada');

                    return (
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertTriangle size={14} /> INCIDENCIA REPORTADA POR EL CLIENTE:
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.15)', padding: '0.18rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.35)', fontWeight: 700 }}>
                            📅 Fecha & Hora del Reclamo: {claimDateStr}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'white', lineHeight: 1.4, background: 'rgba(0,0,0,0.25)', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-line' }}>
                          {claimNotif?.customer_response || claimNotif?.message || order.claim_reason || 'Cliente reportó falla o disconformidad en la pieza recibida bajo garantía.'}
                        </p>
                      </div>
                    );
                  })()}

                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem' }}>
                    <label className="label" style={{ fontSize: '0.74rem', color: 'white', fontWeight: 700 }}>
                      Notas de Diagnóstico del Taller / Justificación de Resolución:
                    </label>
                    <textarea
                      className="input-field"
                      rows={2}
                      style={{ fontSize: '0.76rem', marginBottom: '0.65rem' }}
                      placeholder="Ej: Falla verificada por el equipo técnico. Se aprueba la preparación y envío de un nuevo repuesto en reemplazo..."
                      value={claimSolutionNotes}
                      onChange={(e) => setClaimSolutionNotes(e.target.value)}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.55rem' }}>
                      <button
                        type="button"
                        disabled={processingClaimSolution}
                        onClick={() => handleResolveClaim('replacement')}
                        style={{
                          background: 'rgba(139, 92, 246, 0.18)', border: '1px solid #8b5cf6', color: '#c084fc',
                          padding: '0.55rem 0.65rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.86rem', marginBottom: '0.15rem' }}>📦 Aprobar Reemplazo</div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.85, fontWeight: 400 }}>Regresa a "En Preparación" para enviar repuesto.</div>
                      </button>

                      <button
                        type="button"
                        disabled={processingClaimSolution}
                        onClick={() => handleResolveClaim('refund')}
                        style={{
                          background: 'rgba(245, 158, 11, 0.18)', border: '1px solid #f59e0b', color: '#fcd34d',
                          padding: '0.55rem 0.65rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.86rem', marginBottom: '0.15rem' }}>💵 Aprobar Reembolso</div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.85, fontWeight: 400 }}>Cambia a "Reembolsado" y finaliza el trámite.</div>
                      </button>

                      <button
                        type="button"
                        disabled={processingClaimSolution}
                        onClick={() => handleResolveClaim('closed')}
                        style={{
                          background: 'rgba(16, 185, 129, 0.18)', border: '1px solid #10b981', color: '#86efac',
                          padding: '0.55rem 0.65rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.86rem', marginBottom: '0.15rem' }}>✅ Cerrar Reclamo</div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.85, fontWeight: 400 }}>Retorna a "Entregado" con reclamo atendido.</div>
                      </button>
                    </div>
                  </div>

                  {/* BITÁCORA Y REGISTRO DE COMUNICACIONES DEL RECLAMO */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.76rem', color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MessageSquare size={16} /> Bitácora de Comunicaciones y Seguimiento con el Cliente
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowClaimCommForm(!showClaimCommForm)}
                        style={{
                          background: showClaimCommForm ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                          border: `1px solid ${showClaimCommForm ? '#ef4444' : '#3b82f6'}`,
                          color: showClaimCommForm ? '#fca5a5' : '#93c5fd',
                          padding: '0.22rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                      >
                        {showClaimCommForm ? '✕ Cancelar' : '➕ Registrar Llamada / WhatsApp'}
                      </button>
                    </div>

                    {/* FORMULARIO INLINE DE NUEVA COMUNICACIÓN */}
                    {showClaimCommForm && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Canal de Contacto:</label>
                            <select
                              className="input-field"
                              style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem' }}
                              value={claimCommChannel}
                              onChange={(e) => setClaimCommChannel(e.target.value)}
                            >
                              <option value="WhatsApp">💬 WhatsApp Web</option>
                              <option value="Llamada de Voz">📞 Llamada Telefónica</option>
                              <option value="Email">📧 Correo Electrónico</option>
                              <option value="Presencial">🏬 Presencial en Taller</option>
                            </select>
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Resultado / Estado del Avance:</label>
                            <select
                              className="input-field"
                              style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem' }}
                              value={claimCommResult}
                              onChange={(e) => setClaimCommResult(e.target.value)}
                            >
                              <option value="En Evaluación Técnica">🔍 En Evaluación Técnica</option>
                              <option value="Esperando Pieza de Repuesto">📦 Esperando Pieza de Repuesto</option>
                              <option value="Cliente enviará Fotos / Fotos Recibidas">📷 Evidencia / Fotos Recibidas</option>
                              <option value="Cita Acordada para Revisión">📅 Cita Acordada para Revisión</option>
                              <option value="Acuerdo Alcanzado">🤝 Acuerdo Alcanzado</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Respuesta / Comentario del Cliente:</label>
                          <input
                            className="input-field"
                            type="text"
                            style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem' }}
                            placeholder="Ej: Cliente informa que enviará video de la falla por WhatsApp..."
                            value={claimCommCustomerResponse}
                            onChange={(e) => setClaimCommCustomerResponse(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Notas Internas del Operador / Acción Tomada:</label>
                          <textarea
                            className="input-field"
                            rows={2}
                            style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem' }}
                            placeholder="Ej: Se le solicitó número de guía de devolución de la pieza defectuosa..."
                            value={claimCommMessage}
                            onChange={(e) => setClaimCommMessage(e.target.value)}
                          />
                        </div>

                        <button
                          type="button"
                          disabled={savingClaimComm}
                          onClick={handleSaveClaimCommunication}
                          style={{
                            background: 'var(--accent-primary)', border: 'none', color: 'white',
                            padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                            cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}
                        >
                          {savingClaimComm ? 'Guardando...' : '💾 Guardar Seguimiento'}
                        </button>
                      </div>
                    )}

                    {/* LISTADO DE SEGUIMIENTOS DEL RECLAMO */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                      {(() => {
                        const claimLogs = detailData?.customer_notifications?.filter((n: any) =>
                          n.contact_reason?.includes('Reclamo') || n.message?.includes('Reclamo')
                        ) || [];

                        if (claimLogs.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '0.6rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              No se han registrado llamadas ni avances adicionales para este reclamo aún. Usa el botón superior para agregar un seguimiento.
                            </div>
                          );
                        }

                        return claimLogs.map((log: any, idx: number) => (
                          <div key={log.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.45rem 0.65rem', fontSize: '0.74rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontWeight: 700, color: '#93c5fd' }}>
                                {log.contact_channel === 'WhatsApp' ? '💬 WhatsApp' : log.contact_channel === 'Llamada de Voz' ? '📞 Llamada' : '📌 ' + (log.contact_channel || 'Seguimiento')} - {log.contact_result || 'Avance'}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                📅 {log.created_at ? new Date(log.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '-'} • Op: {log.user_name || 'Sistema'}
                              </span>
                            </div>
                            {log.customer_response && (
                              <div style={{ color: '#fef08a', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                                <strong>Cliente:</strong> "{log.customer_response}"
                              </div>
                            )}
                            {log.message && (
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                                <strong>Notas:</strong> {log.message}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : order.status === 'Entregado' ? (
                /* VISTA 2: PANEL DE POST-VENTA & GARANTÍA (CUANDO STATUS ES 'Entregado') */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={17} /> Panel de Control Post-Venta & Garantía de Pieza
                      </h4>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Orden entregada totalmente. Consulta el estado de la garantía, gestiona el reembolso del CORE o registra un reclamo si el cliente reporta alguna falla.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onPrintOrder(order.id, 'invoice')}
                        style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.18)', border: '1px solid #3b82f6', color: '#93c5fd', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Printer size={14} /> Factura Final (PDF)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const phone = (order.customer_phone || order.phone || '').replace(/\D/g, '');
                          if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                          else toast.error('Sin teléfono válido');
                        }}
                        style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#4ade80', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <MessageSquare size={14} /> WhatsApp Soporte
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.65rem' }}>
                    
                    {/* CARD GARANTÍA */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          🛡️ GARANTÍA DE PIEZA ({warrantyDaysTotal} DÍAS)
                        </span>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                          background: isWarrantyActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isWarrantyActive ? '#86efac' : '#fca5a5',
                          border: `1px solid ${isWarrantyActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                        }}>
                          {isWarrantyActive ? `🟢 Vigente (${daysWarrantyLeft} días restantes)` : '🔴 Expirada'}
                        </span>
                      </div>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                          <span>Progreso de Garantía ({warrantyProgressPercent}%)</span>
                          <span>{daysWarrantyLeft} de {warrantyDaysTotal} días restantes</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${warrantyProgressPercent}%`, height: '100%', background: isWarrantyActive ? 'var(--accent-primary)' : '#ef4444', borderRadius: '3px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                        <span>Entrega: <strong style={{ color: 'white' }}>{deliveryDate.toLocaleDateString('es-ES')}</strong></span>
                        <span>Vence: <strong style={{ color: 'white' }}>{warrantyExpiryDate.toLocaleDateString('es-ES')}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setClaimReason(''); setShowClaimModal(true); }}
                        style={{
                          width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.18)',
                          border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '0.76rem', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                        }}
                      >
                        <AlertTriangle size={15} /> 🚨 Abrir Reclamo por Garantía / Falla de Pieza
                      </button>
                    </div>

                    {/* CARD CORE */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            📦 FIANZA / REEMBOLSO DE CORE ($150)
                          </span>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                            background: coreInfo.badgeBg, color: coreInfo.color, border: `1px solid ${coreInfo.badgeBorder}`
                          }}>
                            {coreInfo.icon} {coreInfo.label}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          {coreInfo.desc}
                        </p>
                      </div>

                      {isCoreFeePaidPending && coreInfo.daysLeft && coreInfo.daysLeft > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCoreStatus('Reembolsado');
                            api.patch(`/orders/${order.id}/workflow`, { core_status: 'Reembolsado' });
                            onSaveCustomerNotification({
                              message: '💵 CORE Devuelto Físicamente por el cliente. Reembolso de $150 procesado exitosamente.',
                              contact_channel: 'En Tienda',
                              contact_reason: 'Devolución de CORE y Reembolso',
                              contact_result: '$150 Reembolsados'
                            });
                            toast.success('💵 Reembolso de $150 registrado exitosamente.');
                          }}
                          style={{
                            width: '100%', padding: '0.45rem', borderRadius: '8px', background: '#10b981',
                            border: 'none', color: 'black', fontSize: '0.76rem', fontWeight: 800,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                          }}
                        >
                          💵 Registrar Reembolso de $150 (CORE Entregado)
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                          {coreStatus === 'Entregado' ? '✅ Sin trámites pendientes de CORE.' : 'Sin reembolso pendiente de CORE.'}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* FORMULARIO INLINE APERTURA DE RECLAMO */}
                  {showClaimModal && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '0.75rem 0.85rem', marginTop: '0.4rem' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.84rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={16} /> Registro de Reclamo / Falla por Garantía
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.65rem 0' }}>
                        Escribe en detalle la falla reportada por el cliente. La orden pasará a estado <strong>RECLAMO</strong> para atención técnica:
                      </p>

                      <div style={{ marginBottom: '0.55rem' }}>
                        <textarea
                          className="input-field"
                          rows={3}
                          style={{ fontSize: '0.76rem' }}
                          placeholder="Ej: Cliente indica que la transmisión presentó un código de falla P0700 a los 10 días de instalada..."
                          value={claimReason}
                          onChange={(e) => setClaimReason(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                          onClick={() => setShowClaimModal(false)}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingClaim}
                          onClick={handleCreateClaim}
                          style={{ background: '#ef4444', border: 'none', color: 'white', fontWeight: 700, padding: '0.35rem 0.85rem', fontSize: '0.76rem' }}
                        >
                          {savingClaim ? 'Guardando...' : '🚨 Confirmar y Abrir Reclamo'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : order.status === 'Reembolsado' || order.status === 'Cancelado' ? (
                /* VISTA 3: PANEL DE ORDEN REEMBOLSADA / CANCELADA (SIN STEPPER) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '10px', padding: '0.75rem 0.85rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={18} /> Orden Reembolsada & Tramitación Concluida
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Esta orden ha sido marcada como <strong>{order.status.toUpperCase()}</strong>. El flujo de seguimiento del Call Center ha finalizado completamente y no requiere más acciones operativas.
                    </p>
                  </div>

                  {/* INFORMACIÓN DEL REEMBOLSO */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      RESUMEN DE TRAMITACIÓN DE REEMBOLSO:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.55rem', marginBottom: '0.5rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', display: 'block' }}>MONTO TOTAL ORDEN:</span>
                        <strong style={{ fontSize: '0.9rem', color: '#4ade80' }}>${(Number(order.price || 0) + Number(order.core_fee || 0)).toFixed(2)}</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', display: 'block' }}>ESTADO DE LA OPERACIÓN:</span>
                        <strong style={{ fontSize: '0.84rem', color: '#fcd34d' }}>💵 Reembolso Finalizado</strong>
                      </div>
                    </div>

                    {/* NOTA O REGISTRO DEL REEMBOLSO */}
                    {(() => {
                      const refundNotif = detailData?.customer_notifications?.find((n: any) =>
                        n.message?.includes('Reembolso') || n.contact_reason?.includes('Reembolso')
                      );
                      if (refundNotif) {
                        return (
                          <div style={{ padding: '0.5rem 0.65rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.74rem' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', marginBottom: '0.15rem' }}>
                              📅 Registrado el: {refundNotif.created_at ? new Date(refundNotif.created_at).toLocaleString('es-ES') : '-'} por {refundNotif.user_name || 'Sistema'}
                            </div>
                            <div style={{ color: 'white', fontWeight: 600 }}>{refundNotif.message}</div>
                            {refundNotif.customer_response && (
                              <div style={{ color: '#60a5fa', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                                Respuesta: "{refundNotif.customer_response}"
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* ACCIONES RÁPIDAS */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => onPrintOrder(order.id, 'invoice')}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.18)', border: '1px solid #3b82f6', color: '#93c5fd', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Printer size={14} /> Factura / Comprobante (PDF)
                    </button>
                  </div>
                </div>
              ) : (
                /* VISTA 4: STEPPER DE CALL CENTER EN 4 PASOS (PARA ÓRDENES EN PROCESO) */
                <>
                  {/* STEPPER NAVIGATION BAR (STRICT LOCKING) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: '0.45rem',
                    marginBottom: '0.75rem',
                    padding: '0.35rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            const isUnlocked = step.id <= unlockedStep;
            const isCompleted = unlockedStep > step.id;

            return (
              <button
                key={step.id}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) setActiveStep(step.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '10px',
                  border: isActive 
                    ? '1px solid var(--accent-primary)' 
                    : isUnlocked 
                    ? '1px solid rgba(16,185,129,0.3)' 
                    : '1px solid rgba(255,255,255,0.04)',
                  background: isActive 
                    ? 'rgba(59, 130, 246, 0.12)' 
                    : isUnlocked 
                    ? 'rgba(16,185,129,0.06)' 
                    : 'rgba(255,255,255,0.01)',
                  color: isActive ? '#60a5fa' : isUnlocked ? '#86efac' : 'rgba(255,255,255,0.3)',
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  opacity: isUnlocked ? 1 : 0.45,
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--gradient-primary)' : isCompleted ? '#10b981' : isUnlocked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {!isUnlocked ? <Lock size={12} /> : isCompleted ? <CheckCircle size={12} /> : <Icon size={12} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: isActive ? 700 : 600, color: isActive ? 'white' : isUnlocked ? 'var(--text-main)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {step.title}
                  </div>
                  {!isMobile && (
                    <div style={{ fontSize: '0.64rem', color: isUnlocked ? 'var(--text-secondary)' : 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP CONTENT BODY WITH ANIMATION */}
        <div style={{ flex: 1, minHeight: '260px' }}>
          <AnimatePresence mode="wait">
            
            {/* ETAPA 1: NOTIFICACIÓN DE CREACIÓN (BILINGÜE ES / EN + CAPTURE OBLIGATORIO) */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {/* Header Banner */}
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Package size={16} /> Etapa 1: Notificación de Creación de Orden (Post-Pago)
                    </h4>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {unlockedStep > 1 
                        ? '✅ La notificación fue enviada y la captura de pantalla ha sido verificada correctamente.'
                        : 'Envía el mensaje con términos, políticas de CORE ($150 / 2 semanas) y garantía. Se requiere subir la captura para desbloquear el Paso 2.'}
                    </p>
                  </div>

                  {unlockedStep === 1 && (
                    /* Language Selector */
                    <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: '16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setMsgLang('es');
                          setNotifyForm(prev => ({ ...prev, message: getCreationMessage('es') }));
                        }}
                        style={{
                          padding: '0.2rem 0.55rem', borderRadius: '12px', border: 'none',
                          background: msgLang === 'es' ? 'var(--accent-primary)' : 'transparent',
                          color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}
                      >
                        🇪🇸 Español
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMsgLang('en');
                          setNotifyForm(prev => ({ ...prev, message: getCreationMessage('en') }));
                        }}
                        style={{
                          padding: '0.2rem 0.55rem', borderRadius: '12px', border: 'none',
                          background: msgLang === 'en' ? 'var(--accent-primary)' : 'transparent',
                          color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  )}
                </div>

                {/* CONDITIONAL CONTENT: MESSAGE GENERATOR (BEFORE UPLOAD) VS VERIFIED SCREENSHOT (AFTER UPLOAD) */}
                {unlockedStep > 1 ? (
                  /* DISPLAY VERIFIED CAPTURE PREVIEW */
                  <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={16} /> Comprobante de Notificación Enviada Verificado
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenScreenshotModal}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Upload size={13} /> Adjuntar Otra Captura
                      </button>
                    </div>

                    {attachments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {attachments.map((att: any) => {
                          const url = getFileUrl(att.file_path);
                          const isImage = att.file_type?.includes('image') || att.file_path?.match(/\.(jpg|jpeg|png|webp)$/i);

                          return (
                            <div key={att.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {isImage ? (
                                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                                  <img
                                    src={url}
                                    alt={att.original_name || 'Captura de pantalla'}
                                    style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', objectFit: 'contain', background: '#000' }}
                                  />
                                </div>
                              ) : null}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <FileText size={14} color="#10b981" />
                                  <span style={{ fontSize: '0.78rem', color: 'white', fontWeight: 600 }}>{att.original_name || 'Captura_Notificación'}</span>
                                </div>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600, background: 'rgba(59,130,246,0.1)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.3)' }}
                                >
                                  <Download size={13} /> Ver / Descargar
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
                        Notificación inicial enviada al cliente.
                      </p>
                    )}
                  </div>
                ) : (
                  /* DISPLAY MESSAGE GENERATOR BEFORE UPLOAD */
                  <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label className="label" style={{ fontSize: '0.78rem', color: 'white', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Globe size={14} color="var(--accent-primary)" /> Mensaje Autogenerado Listo para Enviar ({msgLang === 'es' ? 'Español' : 'English'}):
                      </label>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentMsgText)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Copy size={13} /> Copiar Mensaje
                      </button>
                    </div>

                    <textarea
                      className="input-field"
                      rows={5}
                      style={{ fontFamily: 'monospace', fontSize: '0.76rem', lineHeight: 1.4, background: 'rgba(0,0,0,0.25)' }}
                      value={currentMsgText}
                      onChange={(e) => setNotifyForm(prev => ({ ...prev, message: e.target.value }))}
                    />

                    {/* Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{ background: '#25D366', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', fontWeight: 600, padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem' }}
                        >
                          <MessageSquare size={16} /> Enviar por WhatsApp
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenScreenshotModal}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                      >
                        <Upload size={16} /> Mensaje Enviado (Subir Capture & Desbloquear Paso 2)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ETAPA 2: ACUSE DE RECEPCIÓN & CONTADOR 2-3 DÍAS */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {/* Timer Banner */}
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={16} /> Etapa 2: Acuse de Recepción & Contador Estimado de 2 a 3 Días
                    </h4>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Plazo prometido al cliente: entrega en 2 a 3 días hábiles. Registra la respuesta o confirma llamada de voz.
                    </p>
                  </div>

                  <span style={{ padding: '0.25rem 0.65rem', borderRadius: '16px', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', fontSize: '0.74rem', fontWeight: 700, border: '1px solid rgba(245,158,11,0.4)' }}>
                    ⏱️ Plazo: 2-3 Días Hábiles
                  </span>
                </div>

                {/* CONDITIONAL STEP 2: FORM BEFORE COMPLETION VS VERIFIED RESPONSE AFTER COMPLETION */}
                {unlockedStep > 2 ? (
                  /* VERIFIED ACUSE SUMMARY CARD */
                  <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={16} /> Acuse de Recepción Registrado y Verificado
                      </span>

                      <span style={{
                        padding: '0.25rem 0.65rem', borderRadius: '16px', fontSize: '0.74rem', fontWeight: 700,
                        background: voiceCallMade ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                        color: voiceCallMade ? '#7dd3fc' : '#86efac',
                        border: voiceCallMade ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)'
                      }}>
                        {voiceCallMade ? '📞 Confirmado vía Llamada de Voz' : '📱 Confirmado por Mensaje / Texto'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 700, marginBottom: '0.2rem' }}>
                        Respuesta Registrada del Cliente:
                      </span>
                      <p style={{ color: 'white', fontSize: '0.82rem', margin: 0, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                        {notifyForm.customer_response || (voiceCallMade ? 'Cliente contactado telefónicamente. Confirmó recepción y términos.' : 'Cliente notificado por mensaje de texto/WhatsApp.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* FORMULARIO ACUSE BEFORE COMPLETION */
                  <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ marginBottom: '0.65rem' }}>
                      <label className="label" style={{ fontSize: '0.78rem' }}>Respuesta o Acuse del Cliente (Texto / WhatsApp):</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Ej: Cliente confirmó recibido el mensaje y acepta términos de CORE y garantía..."
                        style={{ fontSize: '0.76rem' }}
                        value={notifyForm.customer_response}
                        onChange={(e) => setNotifyForm(prev => ({ ...prev, customer_response: e.target.value }))}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <input
                        type="checkbox"
                        id="voiceCall"
                        checked={voiceCallMade}
                        onChange={(e) => setVoiceCallMade(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="voiceCall" style={{ fontSize: '0.78rem', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        📞 Se realizó llamada de voz al cliente (Cliente no respondió por texto / WhatsApp).
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowProrogationModal(true)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <AlertTriangle size={14} /> Incidencia: Registrar Prórroga o Demora
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={savingNotify}
                        onClick={handleStep2Complete}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                      >
                        <CheckCircle size={16} /> {savingNotify ? 'Guardando...' : 'Marcar como Notificado (Paso 3)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Prorogation Modal */}
                {showProrogationModal && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '0.75rem 0.85rem' }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 0.35rem 0', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={16} /> Registro de Prórroga / Tiempo Adicional
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                      En caso de que la pieza no esté disponible en 2-3 días (dañada, retraso de importación), acuerda una nueva fecha con el cliente:
                    </p>
                    
                    <div className="form-grid-2" style={{ gap: '0.55rem' }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.74rem' }}>Nueva Fecha Prometida</label>
                        <input
                          type="datetime-local"
                          className="input-field"
                          style={{ fontSize: '0.76rem' }}
                          value={prorogationUntil}
                          onChange={(e) => setProrogationUntil(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '0.74rem' }}>Motivo del Retraso</label>
                        <input
                          type="text"
                          className="input-field"
                          style={{ fontSize: '0.76rem' }}
                          placeholder="Ej: Pieza dañada en tránsito..."
                          value={prorogationReason}
                          onChange={(e) => setProrogationReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.65rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                        onClick={() => setShowProrogationModal(false)}
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleProrogationSave}
                        style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                      >
                        Guardar Prórroga
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ETAPA 3: NOTIFICACIÓN PIEZA LISTA & CITA EN CALENDARIO */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {/* Header Banner */}
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={16} /> Etapa 3: Pieza Lista & Agendamiento de Cita en Calendario
                    </h4>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {unlockedStep > 3 
                        ? '✅ La cita ha sido programada en el calendario y confirmada con el cliente.'
                        : 'Notifica al cliente que su pieza está lista, registra su respuesta y agenda la fecha/hora de retiro o entrega.'}
                    </p>
                  </div>

                  {unlockedStep === 3 && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => onChangeStatus(order.id, 'Listo para Retiro')}
                        style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(168,85,247,0.2)', border: '1px solid #a855f7', color: '#e9d5ff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🏬 Listo para Retiro
                      </button>

                      <button
                        type="button"
                        onClick={() => onChangeStatus(order.id, 'Listo para Despacho')}
                        style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(236,72,153,0.2)', border: '1px solid #ec4899', color: '#fbcfe8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🚚 Listo para Despacho
                      </button>
                    </div>
                  )}
                </div>

                {/* CONDITIONAL STEP 3: FORM BEFORE COMPLETION VS VERIFIED CALENDAR CITA AFTER COMPLETION */}
                {unlockedStep > 3 ? (
                  /* DISPLAY VERIFIED CALENDAR SUMMARY CARD WITH RESCHEDULE OPTION */
                  <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    
                    {/* ALERTA DE CITA VENCIDA / INASISTENCIA */}
                    {order.status !== 'Entregado' && (order.scheduled_pickup_at || scheduledPickupAt) && new Date(scheduledPickupAt || order.scheduled_pickup_at).getTime() < Date.now() && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '0.45rem 0.75rem', borderRadius: '8px', marginBottom: '0.65rem',
                        color: '#fca5a5', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertTriangle size={15} color="#ef4444" />
                          <span><strong>Inasistencia / Cita Vencida:</strong> El cliente no asistió en la fecha agendada. Presiona Reprogramar para registrar el motivo y fijar una nueva fecha.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleReason('');
                            setRescheduleDate(toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
                            setShowRescheduleModal(true);
                          }}
                          style={{ background: '#ef4444', border: 'none', color: 'white', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          🔄 Reprogramar Cita
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={16} /> Cita Programada en Calendario y Verificada
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem', borderRadius: '16px', fontSize: '0.74rem', fontWeight: 700,
                          background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)'
                        }}>
                          {order.shipping_toggle ? '🚚 Envío a Domicilio' : '🏬 Retiro en Tienda'}
                        </span>

                        {order.status !== 'Entregado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleReason('');
                              setRescheduleDate(toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
                              setShowRescheduleModal(true);
                            }}
                            style={{
                              background: 'rgba(245, 158, 11, 0.18)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              color: '#fcd34d',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '16px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            🔄 Reprogramar Cita (Cliente Inasistente)
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', flexShrink: 0 }}>
                        <Calendar size={20} color="#60a5fa" />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                          Fecha & Hora Agendada en Calendario:
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: 'white' }}>
                          {order.scheduled_pickup_at ? new Date(order.scheduled_pickup_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : (scheduledPickupAt ? new Date(scheduledPickupAt).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : 'No definida')}
                        </strong>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 700, marginBottom: '0.15rem' }}>
                        Respuesta / Confirmación del Cliente:
                      </span>
                      <p style={{ color: 'white', fontSize: '0.8rem', margin: 0, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                        {notifyForm.customer_response || 'Cliente confirmó horario agendado para recibir/retirar su pieza.'}
                      </p>
                    </div>

                    {/* FORMULARIO DE REPROGRAMACIÓN DE CITA INLINE */}
                    {showRescheduleModal && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '10px',
                        padding: '0.75rem 0.85rem',
                        marginTop: '0.65rem'
                      }}>
                        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.84rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          🔄 Reprogramación de Cita por Inasistencia / Cambio
                        </h4>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.65rem 0' }}>
                          Escribe lo indicado por el cliente sobre el motivo de su inasistencia y selecciona la nueva fecha agendada en el calendario:
                        </p>

                        <div style={{ marginBottom: '0.55rem' }}>
                          <label className="label" style={{ fontSize: '0.74rem' }}>Motivo de Inasistencia / Comentario del Cliente:</label>
                          <textarea
                            className="input-field"
                            rows={2}
                            style={{ fontSize: '0.76rem' }}
                            placeholder="Ej: El cliente no pudo asistir por falla de transporte. Solicita mover la cita para el viernes a las 10:00 AM..."
                            value={rescheduleReason}
                            onChange={(e) => setRescheduleReason(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem', background: 'rgba(0,0,0,0.25)', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <input
                            type="checkbox"
                            id="rescheduleCall"
                            checked={rescheduleCallMade}
                            onChange={(e) => setRescheduleCallMade(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="rescheduleCall" style={{ fontSize: '0.76rem', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                            📞 Se realizó llamada de voz para coordinar la nueva fecha con el cliente.
                          </label>
                        </div>

                        <div className="form-grid-2" style={{ gap: '0.55rem' }}>
                          <div>
                            <label className="label" style={{ fontSize: '0.74rem' }}>Nueva Fecha & Hora Agendada</label>
                            <input
                              type="datetime-local"
                              className="input-field"
                              style={{ fontSize: '0.76rem' }}
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem 0.75rem', fontSize: '0.76rem' }}
                              onClick={() => setShowRescheduleModal(false)}
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={savingReschedule}
                              onClick={handleSaveReschedule}
                              style={{ background: '#f59e0b', border: 'none', color: 'black', fontWeight: 700, padding: '0.45rem 0.85rem', fontSize: '0.76rem', flex: 1 }}
                            >
                              {savingReschedule ? 'Guardando...' : '🔄 Guardar Reprogramación'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* DISPLAY FORM BEFORE COMPLETION */
                  <>
                    {/* Message & Language Selector */}
                    <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <label className="label" style={{ fontSize: '0.78rem', color: 'white', fontWeight: 700, margin: 0 }}>
                          Mensaje de Pieza Lista ({msgLang === 'es' ? 'Español' : 'English'}):
                        </label>

                        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '0.15rem', borderRadius: '12px' }}>
                          <button
                            type="button"
                            onClick={() => { setMsgLang('es'); setNotifyForm(prev => ({ ...prev, message: getReadyMessage('es') })); }}
                            style={{ padding: '0.2rem 0.5rem', borderRadius: '8px', border: 'none', background: msgLang === 'es' ? 'var(--accent-primary)' : 'transparent', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            🇪🇸 ES
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMsgLang('en'); setNotifyForm(prev => ({ ...prev, message: getReadyMessage('en') })); }}
                            style={{ padding: '0.2rem 0.5rem', borderRadius: '8px', border: 'none', background: msgLang === 'en' ? 'var(--accent-primary)' : 'transparent', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            🇺🇸 EN
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ fontFamily: 'monospace', fontSize: '0.76rem', lineHeight: 1.4, background: 'rgba(0,0,0,0.25)' }}
                        value={currentMsgText}
                        onChange={(e) => setNotifyForm(prev => ({ ...prev, message: e.target.value }))}
                      />

                      <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentMsgText)}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Copy size={13} /> Copiar Mensaje
                        </button>

                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                            style={{ background: '#25D366', color: 'white', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Customer Response & Calendar Scheduling Picker */}
                    <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--accent-primary)' }}>
                      <div style={{ marginBottom: '0.55rem' }}>
                        <label className="label" style={{ fontSize: '0.78rem' }}>Respuesta / Confirmación del Cliente (Texto o Llamada):</label>
                        <textarea
                          className="input-field"
                          rows={2}
                          placeholder="Ej: Cliente confirmó que pasará a retirar mañana..."
                          style={{ fontSize: '0.76rem' }}
                          value={notifyForm.customer_response}
                          onChange={(e) => setNotifyForm(prev => ({ ...prev, customer_response: e.target.value }))}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <input
                          type="checkbox"
                          id="step3VoiceCall"
                          checked={voiceCallMade}
                          onChange={(e) => setVoiceCallMade(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="step3VoiceCall" style={{ fontSize: '0.78rem', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          📞 Se realizó llamada de voz al cliente para acordar la cita.
                        </label>
                      </div>

                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={16} color="var(--accent-primary)" /> Agendar Cita de Retiro / Entrega en el Calendario:
                      </div>

                      <div className="form-grid-2" style={{ gap: '0.55rem' }}>
                        <div>
                          <label className="label" style={{ fontSize: '0.74rem' }}>Fecha y Hora Programada</label>
                          <input
                            type="datetime-local"
                            className="input-field"
                            style={{ fontSize: '0.76rem' }}
                            value={scheduledPickupAt}
                            onChange={(e) => setScheduledPickupAt(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={savingNotify}
                            onClick={handleStep3Complete}
                            style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                          >
                            <CheckCircle size={16} /> {savingNotify ? 'Guardando...' : 'Cita Programada (Paso 4)'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ETAPA 4: CIERRE OPERATIVO & FACTURACIÓN DE COMPRA (COMPACTO) */}
            {activeStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
              >
                {/* Header Banner */}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '0.45rem 0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle size={16} /> Etapa 4: Cierre Operativo y Checklist Obligatorio de Entrega
                  </h4>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Verifica todos los requisitos antes de marcar la orden como ENTREGADA TOTALMENTE.
                  </p>
                </div>

                {/* Mandatory Delivery Checklist */}
                <div className="glass-card" style={{ padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Checklist de Cierre Operativo (Marcar todos):
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: checkReceived ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: checkReceived ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      <input
                        type="checkbox"
                        id="checkReceived"
                        checked={checkReceived}
                        onChange={(e) => setCheckReceived(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="checkReceived" style={{ fontSize: '0.8rem', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        1. Cliente retiró en tienda o se completó la entrega a domicilio en conformidad.
                      </label>
                    </div>

                    {/* CORE STATUS SELECTION & POST-DELIVERY LOCK LOGIC */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Package size={15} color="#f59e0b" /> Estado del CORE (Pieza Vieja):
                      </div>

                      {/* IF ORDER IS NOT FINALIZE/DELIVERED, SHOW SELECTOR BUTTONS */}
                      {order.status !== 'Entregado' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '0.45rem', marginBottom: '0.55rem' }}>
                          <button
                            type="button"
                            onClick={() => setCoreStatus('Entregado')}
                            style={{
                              padding: '0.45rem 0.55rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                              background: coreStatus === 'Entregado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)',
                              border: coreStatus === 'Entregado' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                              color: coreStatus === 'Entregado' ? '#86efac' : 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.76rem' }}>✅ Entregó CORE</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>Dejó pieza en tienda.</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCoreStatus('Pagado_Pendiente')}
                            style={{
                              padding: '0.45rem 0.55rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                              background: (coreStatus === 'Pagado_Pendiente' || coreStatus === 'Fianza_150' || coreStatus === 'Pendiente') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.02)',
                              border: (coreStatus === 'Pagado_Pendiente' || coreStatus === 'Fianza_150' || coreStatus === 'Pendiente') ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.06)',
                              color: (coreStatus === 'Pagado_Pendiente' || coreStatus === 'Fianza_150' || coreStatus === 'Pendiente') ? '#fcd34d' : 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.76rem' }}>⏳ Pagó $150 (CORE)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>14 días devolución.</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCoreStatus('Reembolsado')}
                            style={{
                              padding: '0.45rem 0.55rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                              background: coreStatus === 'Reembolsado' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                              border: coreStatus === 'Reembolsado' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                              color: coreStatus === 'Reembolsado' ? '#93c5fd' : 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.76rem' }}>💵 Reembolsado</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>Reembolso de $150 enviado.</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCoreStatus('No_Aplica')}
                            style={{
                              padding: '0.45rem 0.55rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                              background: coreStatus === 'No_Aplica' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                              border: coreStatus === 'No_Aplica' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
                              color: coreStatus === 'No_Aplica' ? 'white' : 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.76rem' }}>⚪ No Aplica</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>Sin devolución.</div>
                          </button>
                        </div>
                      ) : (
                        /* POST-DELIVERY VERIFIED STATE DISPLAY & REFUND ACTION */
                        <div style={{
                          padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.35rem',
                          background: coreInfo.badgeBg, border: `1px solid ${coreInfo.badgeBorder}`, color: coreInfo.color,
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.85rem' }}>{coreInfo.icon} {coreInfo.label}</strong>
                              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{coreInfo.desc}</span>
                            </div>

                            {/* REFUND BUTTON SHOWN ONLY IF DEPOSIT PAID AND DAYS REMAINING > 0 */}
                            {(coreStatus === 'Pagado_Pendiente' || coreStatus === 'Fianza_150' || coreStatus === 'Pendiente') && (coreInfo.daysLeft || 0) > 0 && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleProcessCoreRefund}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  border: 'none', color: 'white', fontWeight: 700, padding: '0.45rem 0.85rem', fontSize: '0.78rem'
                                }}
                              >
                                💵 Registrar Reembolso de $150 (CORE Entregado)
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* LIVE RESUMEN DE COMPRA CORE BANNER (FOR PRE-DELIVERY) */}
                      {order.status !== 'Entregado' && (
                        <div style={{
                          padding: '0.45rem 0.75rem', borderRadius: '8px',
                          background: coreInfo.badgeBg, border: `1px solid ${coreInfo.badgeBorder}`, color: coreInfo.color,
                          fontSize: '0.75rem', lineHeight: 1.35
                        }}>
                          <strong style={{ display: 'block', marginBottom: '0.1rem' }}>{coreInfo.icon} {coreInfo.label}</strong>
                          <span>{coreInfo.desc}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: checkInvoice ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: checkInvoice ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      <input
                        type="checkbox"
                        id="checkInvoice"
                        checked={checkInvoice}
                        onChange={(e) => setCheckInvoice(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="checkInvoice" style={{ fontSize: '0.8rem', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        3. Factura / Invoice final emitida e impresa/enviada al cliente.
                      </label>
                    </div>
                  </div>

                  {/* Final Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onPrintOrder(order.id, 'invoice')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      <Printer size={15} /> Emitir Invoice
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleFinalizeDelivery}
                      style={{ background: '#10b981', border: 'none', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      <CheckCircle size={16} /> Finalizar Orden Totalmente
                    </button>
                  </div>
                </div>

                {/* Archivos y Adjuntos */}
                <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <FileText size={16} /> Documentos Emitidos ({attachments.length})
                  </div>
                  {attachments.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Sin archivos adjuntos registrados.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                      {attachments.map((att: any) => (
                        <a
                          key={att.id}
                          href={getFileUrl(att.file_path)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'white', textDecoration: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                            <FileText size={18} color="var(--accent-primary)" />
                            <span style={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {att.original_name || 'Archivo'}
                            </span>
                          </div>
                          <Download size={16} color="var(--text-secondary)" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* STEPPER FOOTER NAVIGATION */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: activeStep === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {steps.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  if (s.id <= unlockedStep) setActiveStep(s.id);
                }}
                style={{
                  width: activeStep === s.id ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: activeStep === s.id ? 'var(--accent-primary)' : s.id <= unlockedStep ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)',
                  cursor: s.id <= unlockedStep ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s ease'
                }}
              />
            ))}
          </div>

          {activeStep < steps.length ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={activeStep >= unlockedStep}
              onClick={() => setActiveStep((prev) => Math.min(unlockedStep, prev + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: activeStep >= unlockedStep ? 0.5 : 1 }}
            >
              Siguiente <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Cerrar <X size={18} />
            </button>
          )}
        </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ACCORDION 3: HISTORIAL OPERATIVO & REGISTRO DE ACTIVIDAD */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '1rem',
          transition: 'all 0.3s ease'
        }}>
          {/* ACCORDION HEADER TOGGLE */}
          <button
            type="button"
            onClick={handleToggleHistory}
            style={{
              width: '100%',
              padding: '0.85rem 1.15rem',
              background: 'rgba(255,255,255,0.03)',
              border: 'none',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#f59e0b' }}>
                <Clock size={18} />
                <span>Historial Operativo & Registro de Actividad</span>
              </div>
              <span style={{
                fontSize: '0.75rem', color: '#fde047', background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)', padding: '0.18rem 0.6rem', borderRadius: '10px', fontWeight: 700
              }}>
                📜 { (detailData?.history?.length || 0) + (detailData?.customer_notifications?.length || 0) + 1 } Eventos Registrados
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isHistoryExpanded ? 'Ocultar Historial' : 'Ver Historial Completo'}
              {isHistoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {/* EXPANDABLE HISTORY CONTENT */}
          {isHistoryExpanded && (
            <div style={{ padding: '1.15rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* FILTER BAR FOR HISTORY */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'notif', label: '💬 Mensajes / WhatsApp' },
                  { id: 'reschedule', label: '🔄 Reprogramaciones' },
                  { id: 'claims', label: '🚨 Reclamos / Garantía' },
                  { id: 'status', label: '⚡ Cambios de Estado' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHistoryFilter(f.id as any)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: historyFilter === f.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                      borderColor: historyFilter === f.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                      color: historyFilter === f.id ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.4rem' }}>
                
                {/* Event 1: Creation (Shown when filter is all or status) */}
                {(historyFilter === 'all' || historyFilter === 'status') && (
                  <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', height: 'fit-content' }}>
                      <Package size={16} />
                    </div>
                    <div style={{ flex: 1, fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'white' }}>Creación de la Orden #{order.order_code}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleString('es-ES') : '-'}
                        </span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        Cliente: {order.first_name} {order.last_name} • Vehículo: {order.brand} {order.model} {order.year} • Total: ${(Number(order.price || 0) + Number(order.core_fee || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Event 2: Customer Notifications & Responses */}
                {detailData?.customer_notifications
                  ?.filter((notif: any) => {
                    if (historyFilter === 'all') return true;
                    const r = (notif.contact_reason || '') + (notif.message || '');
                    if (historyFilter === 'reschedule') return r.includes('Reprogramación') || r.includes('Reprogramada');
                    if (historyFilter === 'claims') return r.includes('Reclamo') || r.includes('Garantía');
                    if (historyFilter === 'notif') return !r.includes('Reprogramación') && !r.includes('Reclamo');
                    return false;
                  })
                  ?.map((notif: any, index: number) => (
                    <div key={notif.id || index} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', color: '#86efac', height: 'fit-content' }}>
                        <MessageSquare size={16} />
                      </div>
                      <div style={{ flex: 1, fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'white' }}>Notificación: {notif.contact_reason || notif.type || 'Seguimiento'} ({notif.contact_channel || notif.channel || 'WhatsApp'})</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {notif.created_at ? new Date(notif.created_at).toLocaleString('es-ES') : '-'}
                          </span>
                        </div>
                        {notif.message && (
                          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {notif.message}
                          </p>
                        )}
                        {notif.customer_response && (
                          <div style={{ marginTop: '0.25rem', padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', color: '#60a5fa', fontSize: '0.75rem' }}>
                            💬 Respuesta del Cliente: "{notif.customer_response}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Operador: {notif.user_name || 'Sistema'}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Event 3: Database Status Changes */}
                {(historyFilter === 'all' || historyFilter === 'status' || historyFilter === 'claims') && (
                  detailData?.history
                    ?.filter((h: any) => {
                      if (historyFilter === 'claims') return h.status === 'Reclamo';
                      return true;
                    })
                    ?.map((h: any, index: number) => (
                      <div key={h.id || index} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(168,85,247,0.2)', color: '#c084fc', height: 'fit-content' }}>
                          <CheckCircle size={16} />
                        </div>
                        <div style={{ flex: 1, fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong style={{ color: 'white' }}>Cambio de Estado SQL: {h.status}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {h.created_at ? new Date(h.created_at).toLocaleString('es-ES') : '-'}
                            </span>
                          </div>
                          {h.notes && (
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              Notas: {h.notes}
                            </p>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Operador: {h.user_name || 'Sistema'}
                          </div>
                        </div>
                      </div>
                    ))
                )}

              </div>
            </div>
          )}
        </div>

        {/* MODAL PARA SUBIR CAPTURA DE PANTALLA (OBTENER PASO 2) */}
        {showScreenshotModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', background: '#12121e', border: '1px solid var(--accent-primary)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Upload size={20} color="var(--accent-primary)" /> Subir Captura del Mensaje Enviado
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Para verificar y desbloquear el <strong>Paso 2 (Acuse de Recepción)</strong>, adjunta la captura de pantalla o comprobante del mensaje enviado al cliente.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedFile ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                  borderColor: selectedFile ? '#10b981' : 'var(--glass-border)',
                  marginBottom: '1.25rem'
                }}
              >
                {selectedFile ? (
                  <div>
                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{selectedFile.name}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(selectedFile.size / 1024).toFixed(1)} KB - Clic para cambiar</span>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Haz clic para seleccionar la imagen / capture</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Soporta JPG, PNG, WEBP</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowScreenshotModal(false);
                    setSelectedFile(null);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={uploadingScreenshot || !selectedFile}
                  onClick={handleUploadScreenshotAndAdvance}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {uploadingScreenshot ? 'Verificando y Subiendo...' : 'Confirmar & Desbloquear Paso 2'}
                </button>
              </div>
            </div>
          </div>
        )}

      </motion.div>
  );

  if (viewMode === 'page') {
    return (
      <div style={{ padding: isMobile ? 0 : '0.25rem 0 1rem' }}>
        {drawerContent}
      </div>
    );
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      transition={{ duration: 0.15 }}
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '1rem',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 1300
      }}
    >
      {drawerContent}
    </motion.div>,
    document.body
  );
};
