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
  const choices = useMemo(
    () => (decision.shuffle === false ? decision.choices : stableShuffle(decision.choices, decision.id)),
    [decision],
  );
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
      {decision.context && <p className={styles.context}>{fillName(decision.context, playerName)}</p>}
      <ol ref={listRef} className={styles.choiceList}>
        {choices.map((c, i) => (
          <li key={c.id}>
            <button type="button" className={styles.choiceButton} onClick={() => onChoose(c.id)} data-autofocus={i === 0 ? '' : undefined}>
              <span className={styles.choiceKey} aria-hidden="true">
                {i + 1}
              </span>
              {fillName(c.label, playerName)}
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.muted}>{ui.decision.hint}</p>
    </Modal>
  );
}
