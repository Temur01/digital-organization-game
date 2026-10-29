import { useEffect } from 'react';
import { useGameStore, type Toast } from '../app/store';
import styles from './ui.module.css';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGameStore((s) => s.dismissToast);
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(toast.id), 3500);
    return () => window.clearTimeout(t);
  }, [toast.id, dismiss]);
  return (
    <div className={[styles.toast, toast.tone === 'success' ? styles.toast_success : ''].join(' ')}>
      <span aria-hidden="true">{toast.tone === 'success' ? '🔍 ' : 'ℹ️ '}</span>
      {toast.text}
    </div>
  );
}

/** Ko‘rinadigan toastlar + screen reader uchun live region */
export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
