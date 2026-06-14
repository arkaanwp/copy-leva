import { useEffect, useState } from 'react';
import AppIcon from './AppIcon';

function ToastItem({ toast, onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setIsClosing(false);

    const dismissTimer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(toast.id), 220);
    }, 3000);

    return () => clearTimeout(dismissTimer);
  }, [toast.id, onClose]);

  const handleManualClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(toast.id), 220);
  };

  const toastType = toast.type || 'info';
  const iconName = toastType === 'success' ? 'check' : toastType === 'error' ? 'x' : 'info';

  return (
    <div className={`toast toast-${toastType} ${isClosing ? 'toast-closing' : ''}`} role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        <AppIcon name={iconName} size={16} />
      </span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleManualClose} aria-label="Tutup notifikasi">
        <AppIcon name="x" size={14} />
      </button>
    </div>
  );
}

export default function Toast({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifikasi">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
