import { ui } from '../content/uz/ui';
import type { Consequence } from '../types/models';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ui.module.css';

interface ConsequencePanelProps {
  consequence: Consequence;
  onResult(): void;
  onRestart(): void;
}

export function ConsequencePanel({ consequence, onResult, onRestart }: ConsequencePanelProps) {
  return (
    <Modal title={ui.consequence.heading} size="md" tone="critical">
      <p className={styles.feedbackTitle}>{consequence.title}</p>
      <ol className={styles.timeline}>
        {consequence.steps.map((s, i) => (
          <li key={i}>
            <span className={styles.timelineIcon} aria-hidden="true">
              {s.icon}
            </span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
      <div className={styles.prevention}>
        <strong>{ui.consequence.prevention}:</strong> {consequence.prevention}
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onRestart}>
          {ui.pause.restart}
        </Button>
        <Button onClick={onResult} autoFocusTarget>
          {ui.consequence.toResult}
        </Button>
      </div>
    </Modal>
  );
}
