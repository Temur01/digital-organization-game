import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { ui } from '../content/uz/ui';
import type { Decision } from '../types/models';
import { Modal } from './Modal';
import { fillName, stableShuffle } from './text';
import styles from './ui.module.css';

interface DecisionPanelProps {
  decision: Decision;
  playerName: string;
  onChoose(choiceId: string): void;
  onEscape(): void;
}

export function DecisionPanel({ decision, playerName, onChoose, onEscape }: DecisionPanelProps) {
  const choices = useMemo(() => (decision.shuffle === false ? decision.choices : stableShuffle(decision.choices, decision.id)), [decision]);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!listRef.current?.closest('[role="dialog"]')?.contains(document.activeElement)) return;
      const n = Number(e.key);
      const choice = Number.isInteger(n) && n >= 1 ? choices[n - 1] : undefined;
      if (choice) {
        e.preventDefault();
        onChoose(choice.id);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [choices, onChoose]);

  return (
    <Modal title={decision.prompt} onEscape={onEscape} size="md">
      <p className={styles.decisionTag} aria-hidden="true">
        {ui.decision.tag}
      </p>
      {decision.context && (
        <motion.p className={styles.context} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          {fillName(decision.context, playerName)}
        </motion.p>
      )}
      <ol ref={listRef} className={styles.choiceList}>
        {choices.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.07, type: 'spring', stiffness: 420, damping: 28 }}
          >
            <button type="button" className={styles.choiceButton} onClick={() => onChoose(c.id)} data-autofocus={i === 0 ? '' : undefined}>
              <span className={styles.choiceKey} aria-hidden="true">
                {i + 1}
              </span>
              {fillName(c.label, playerName)}
              <span className={styles.choiceArrow} aria-hidden="true">
                →
              </span>
            </button>
          </motion.li>
        ))}
      </ol>
      <p className={styles.muted}>{ui.decision.hint}</p>
    </Modal>
  );
}
