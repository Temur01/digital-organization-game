import { ui } from '../content/uz/ui';
import type { Choice } from '../types/models';
import { Button } from './Button';
import { Modal } from './Modal';
import { fillName } from './text';
import styles from './ui.module.css';

const ICON = { safe: '✔', risky: '⚠', critical: '✖' } as const;

interface FeedbackPanelProps {
  choice: Choice;
  firstAttempt: boolean;
  playerName: string;
  onAck(): void;
}

export function FeedbackPanel({ choice, firstAttempt, playerName, onAck }: FeedbackPanelProps) {
  const { outcome } = choice;
  const button =
    outcome === 'safe' ? ui.feedback.continue : outcome === 'risky' ? ui.feedback.retry : ui.feedback.whatWouldHappen;
  return (
    <Modal title={`${ui.feedback[outcome]}: ${choice.feedbackTitle}`} hideTitle size="sm" tone={outcome}>
      <div className={styles.feedbackHead}>
        <span className={[styles.feedbackIcon, styles[`icon_${outcome}`]].join(' ')} aria-hidden="true">
          {ICON[outcome]}
        </span>
        <div>
          <p className={styles.feedbackKind}>{ui.feedback[outcome]}</p>
          <p className={styles.feedbackTitle}>{fillName(choice.feedbackTitle, playerName)}</p>
        </div>
      </div>
      <p>{fillName(choice.feedback, playerName)}</p>
      {outcome === 'safe' && (
        <p className={styles.points}>{firstAttempt ? ui.feedback.points(choice.points) : ui.feedback.noPoints}</p>
      )}
      <div className={styles.actions}>
        <Button onClick={onAck} autoFocusTarget variant={outcome === 'critical' ? 'danger' : 'primary'}>
          {button}
        </Button>
      </div>
    </Modal>
  );
}
