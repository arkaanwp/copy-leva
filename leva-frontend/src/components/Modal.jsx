import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement;

    const setInitialFocus = () => {
      if (!dialogRef.current) return;
      const candidates = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (candidates.length > 0) {
        candidates[0].focus();
        return;
      }
      dialogRef.current?.focus();
    };

    /* UI/UX Fix: Step 7 — Dialog konfirmasi harus menjadi overlay global agar fokus aksi destruktif tidak terpotong area scroll/layout parent. */
    document.body.style.overflow = 'hidden';
    setInitialFocus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, []);

  useEffect(() => {
    const focusableElements = () => {
      if (!dialogRef.current) return [];

      return Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();

      if (event.key !== 'Tab') return;

      const candidates = focusableElements();
      if (candidates.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstEl = candidates[0];
      const lastEl = candidates[candidates.length - 1];
      const activeEl = document.activeElement;

      if (!event.shiftKey && activeEl === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }

      if (event.shiftKey && activeEl === firstEl) {
        event.preventDefault();
        lastEl.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="card modal-surface"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          padding: 24,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            style={{
              background: 'var(--color-bg)', border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', fontSize: 16,
              color: 'var(--color-text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>,
    document.body
  );
}
