import { motion, type TargetAndTransition } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './ui.module.css';

const stack: symbol[] = [];
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  /** Sarlavha vizual yashirin bo‘lsin (masalan, sim-oynalarda o‘z sarlavhasi bor) */
  hideTitle?: boolean;
  onEscape?: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  tone?: 'default' | 'safe' | 'risky' | 'critical';
  className?: string;
}

/** Fokus tuzog‘i, Esc va fokusni qaytarish. Bir nechta modal ustma-ust bo‘lsa, faqat eng yuqorisi faol. */
export function Modal({ title, hideTitle, onEscape, children, size = 'md', tone = 'default', className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const token = Symbol('modal');
    stack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token || !node) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === firstEl || !node.contains(document.activeElement))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (document.activeElement === lastEl || !node.contains(document.activeElement))) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <motion.div
        ref={ref}
        initial={ENTER[tone].initial}
        animate={ENTER[tone].animate}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[styles.modal, styles[`modal_${size}`], styles[`tone_${tone}`], className].filter(Boolean).join(' ')}
      >
        <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.modalTitle}>
          {title}
        </h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

const ENTER: Record<NonNullable<ModalProps['tone']>, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  default: {
    initial: { opacity: 0, y: 28, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
  },
  safe: {
    initial: { opacity: 0, scale: 0.6, rotate: -3 },
    animate: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 420, damping: 14 } },
  },
  risky: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.5 } },
  },
  critical: {
    initial: { opacity: 0, scale: 1.08 },
    animate: {
      opacity: 1,
      scale: 1,
      x: [0, -14, 14, -10, 10, -5, 0],
      boxShadow: ['0 0 0 0 rgba(179,38,30,0)', '0 0 0 14px rgba(179,38,30,0.45)', '0 6px 24px rgba(16,24,40,0.16)'],
      transition: { duration: 0.6 },
    },
  },
};

export function isModalOpen(): boolean {
  return stack.length > 0;
}
