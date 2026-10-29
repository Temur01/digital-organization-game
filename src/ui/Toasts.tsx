import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useGameStore, type Toast } from '../app/store';
import styles from './ui.module.css';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGameStore((s) => s.dismissToast);
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(toast.id), 3500);
    return () => window.clearTimeout(t);
  }, [toast.id, dismiss]);
  const success = toast.tone === 'success';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
      className={[styles.toast, success ? styles.toast_success : ''].join(' ')}
    >
      <motion.span
        aria-hidden="true"
        className={styles.toastIcon}
        initial={{ rotate: -40, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.1 }}
      >
        {success ? '🔍' : 'ℹ️'}
      </motion.span>
      {toast.text}
      <motion.span
        aria-hidden="true"
        className={styles.toastTimer}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3.5, ease: 'linear' }}
      />
    </motion.div>
  );
}

/** Ko‘rinadigan toastlar + screen reader uchun live region */
export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
