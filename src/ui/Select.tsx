import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './ui.module.css';

export interface SelectOption {
  value: string;
  icon?: string;
}

interface SelectProps {
  /** Tashqi <label htmlFor> bilan bog‘lash uchun */
  id: string;
  value: string;
  options: readonly SelectOption[];
  placeholder: string;
  onChange(value: string): void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Brauzerning oddiy <select>’i o‘rniga — mavzuga mos ochiladigan ro‘yxat.
 * WAI-ARIA «select-only combobox» namunasi: ↑ ↓ Home End — yurish, Enter/Space — tanlash, Esc — yopish,
 * harf yozish — shu harfdan boshlanuvchi variantga o‘tish.
 */
export function Select({ id, value, options, placeholder, onChange, invalid, describedBy }: SelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', timer: 0 });
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const [active, setActive] = useState(Math.max(selectedIndex, 0));
  const selected = options[selectedIndex];

  const show = () => {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };
  const choose = (i: number) => {
    const option = options[i];
    if (option) onChange(option.value);
    setOpen(false);
  };

  // Tashqarida bosilsa — yopamiz
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Faol variant ko‘rinib tursin
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const move = (i: number) => {
      e.preventDefault();
      if (!open) return show();
      setActive(Math.min(Math.max(i, 0), last));
    };
    switch (e.key) {
      case 'ArrowDown':
        return move(e.altKey ? active : active + 1);
      case 'ArrowUp':
        if (open && e.altKey) {
          e.preventDefault();
          return choose(active);
        }
        return move(active - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(last);
      case 'PageDown':
        return move(active + 10);
      case 'PageUp':
        return move(active - 10);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return open ? choose(active) : show();
      case 'Escape':
        if (open) {
          // Modal yoki ekranning Esc ishlovchisiga yetib bormasin
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        return;
      case 'Tab':
        if (open) choose(active);
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const t = typeahead.current;
      window.clearTimeout(t.timer);
      t.text += e.key.toLocaleLowerCase('uz');
      t.timer = window.setTimeout(() => (t.text = ''), 600);
      const from = open ? active : Math.max(selectedIndex, 0);
      const order = [...options.keys()].map((k) => (from + (t.text.length === 1 ? 1 : 0) + k) % options.length);
      const hit = order.find((i) => options[i]!.value.toLocaleLowerCase('uz').startsWith(t.text));
      if (hit === undefined) return;
      if (open) setActive(hit);
      else onChange(options[hit]!.value);
    }
  };

  return (
    <div ref={rootRef} className={[styles.select, open ? styles.selectOpen : ''].join(' ')}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={styles.selectTrigger}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        {selected ? (
          <span className={styles.selectValue}>
            {selected.icon && (
              <span className={styles.selectIcon} aria-hidden="true">
                {selected.icon}
              </span>
            )}
            {selected.value}
          </span>
        ) : (
          <span className={styles.selectPlaceholder}>{placeholder}</span>
        )}
        <motion.span className={styles.selectChevron} aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            tabIndex={-1}
            className={styles.selectList}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                // Klaviatura combobox tugmasida ishlanadi (aria-activedescendant), variantlar fokus olmaydi
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={[styles.selectOption, i === active ? styles.selectOptionActive : '', isSelected ? styles.selectOptionSelected : ''].join(' ')}
                  onPointerMove={() => setActive(i)}
                  // Fokus tugmadan ketmasin
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                >
                  <span className={styles.selectIcon} aria-hidden="true">
                    {o.icon ?? '•'}
                  </span>
                  <span className={styles.selectLabel}>{o.value}</span>
                  {isSelected && (
                    <span className={styles.selectCheck} aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
