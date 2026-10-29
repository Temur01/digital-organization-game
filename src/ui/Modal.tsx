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
    <div className={styles.backdrop}>
      <div
        ref={ref}
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
      </div>
    </div>
  );
}

export function isModalOpen(): boolean {
  return stack.length > 0;
}
