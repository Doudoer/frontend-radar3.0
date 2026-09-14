import React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  closeOnOverlay?: boolean;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  asPage?: boolean;
}

const SIZE_WIDTH: Record<NonNullable<ModalProps['size']>, string> = {
  sm: '460px',
  md: '760px',
  lg: '980px',
  xl: '1180px',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
  closeOnOverlay = true,
  description,
  size = 'md',
  asPage = false,
}) => {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const handleClose = React.useEffectEvent(onClose);
  const resolvedMaxWidth = maxWidth || SIZE_WIDTH[size];

  const lockBodyScroll = React.useCallback(() => {
    const body = document.body;
    const currentCount = Number(body.dataset.modalLockCount || '0');

    if (currentCount === 0) {
      body.dataset.modalPrevOverflow = body.style.overflow || '';
      body.style.overflow = 'hidden';
      body.classList.add('modal-open');
    }

    body.dataset.modalLockCount = String(currentCount + 1);
  }, []);

  const unlockBodyScroll = React.useCallback(() => {
    const body = document.body;
    const currentCount = Number(body.dataset.modalLockCount || '0');
    const nextCount = Math.max(0, currentCount - 1);

    if (nextCount === 0) {
      body.style.overflow = body.dataset.modalPrevOverflow || '';
      body.classList.remove('modal-open');
      delete body.dataset.modalLockCount;
      delete body.dataset.modalPrevOverflow;
      return;
    }

    body.dataset.modalLockCount = String(nextCount);
  }, []);

  React.useEffect(() => {
    if (!isOpen || asPage) return;

    previousActiveRef.current = document.activeElement as HTMLElement;
    lockBodyScroll();

    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;

      const focusables = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;

      if (!container.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      unlockBodyScroll();
      previousActiveRef.current?.focus();
    };
  }, [asPage, isOpen, lockBodyScroll, unlockBodyScroll]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modalCard = (
    <div
      className="glass-card premium-modal"
      role="dialog"
      aria-modal={asPage ? undefined : 'true'}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(e) => e.stopPropagation()}
      style={{ ['--modal-max-width' as any]: resolvedMaxWidth }}
      data-modal-size={size}
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal-header">
        <h2 id={titleId} className="modal-title font-outfit">
          {title}
        </h2>
        <button ref={closeButtonRef} onClick={onClose} className="modal-close" aria-label="Cerrar modal">
          <X size={20} />
        </button>
      </div>

      {description && (
        <p id={descriptionId} className="modal-description">
          {description}
        </p>
      )}

      <div className="modal-content-scroll">
        <div className="modal-content-shell">
          {children}
        </div>
      </div>
    </div>
  );

  if (asPage) {
    return (
      <section style={{ padding: '0.25rem 0 1rem' }}>
        {modalCard}
      </section>
    );
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (!closeOnOverlay) return;
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {modalCard}
    </div>,
    document.body
  );
};

export default React.memo(Modal);
