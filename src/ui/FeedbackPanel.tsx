import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ui } from '../content/uz/ui';
import type { Choice, ChoiceOutcome } from '../types/models';
import { celebrate, originOf, useCountUp } from './anim';
import { Button } from './Button';
import { Modal } from './Modal';
import { fillName } from './text';
import styles from './ui.module.css';

/** Ikonka chizilib paydo bo‘ladi: ✔ / ⚠ / ✖ */
function OutcomeIcon({ outcome }: { outcome: ChoiceOutcome }) {
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.45, delay: 0.25, ease: 'easeOut' as const } };
  return (
    <motion.span
      className={[styles.feedbackIcon, styles[`icon_${outcome}`]].join(' ')}
      aria-hidden="true"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 14 }}
    >
      <svg viewBox="0 0 40 40" width="30" height="30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {outcome === 'safe' && <motion.path d="M10 21 L17 28 L30 13" {...draw} />}
        {outcome === 'risky' && (
          <>
            <motion.path d="M20 9 L20 24" {...draw} />
            <motion.circle cx="20" cy="31" r="1.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
          </>
        )}
        {outcome === 'critical' && (
          <>
            <motion.path d="M12 12 L28 28" {...draw} />
            <motion.path d="M28 12 L12 28" {...draw} transition={{ ...draw.transition, delay: 0.45 }} />
          </>
        )}
      </svg>
    </motion.span>
  );
}

interface FeedbackPanelProps {
  choice: Choice;
  firstAttempt: boolean;
  playerName: string;
  onAck(): void;
}

export function FeedbackPanel({ choice, firstAttempt, playerName, onAck }: FeedbackPanelProps) {
  const { outcome } = choice;
  const iconRef = useRef<HTMLDivElement>(null);
  const earned = outcome === 'safe' && firstAttempt ? choice.points : 0;
  const shownPoints = useCountUp(earned, 600, 0);
  const button = outcome === 'safe' ? ui.feedback.continue : outcome === 'risky' ? ui.feedback.retry : ui.feedback.whatWouldHappen;

  useEffect(() => {
    if (outcome !== 'safe') return;
    const t = window.setTimeout(() => celebrate('small', originOf(iconRef.current)), 250);
    return () => window.clearTimeout(t);
  }, [outcome]);

  return (
    <Modal title={`${ui.feedback[outcome]}: ${choice.feedbackTitle}`} hideTitle size="sm" tone={outcome}>
      <div className={styles.feedbackHead} ref={iconRef}>
        <OutcomeIcon outcome={outcome} />
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <p className={styles.feedbackKind}>{ui.feedback[outcome]}</p>
          <p className={styles.feedbackTitle}>{fillName(choice.feedbackTitle, playerName)}</p>
        </motion.div>
      </div>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {fillName(choice.feedback, playerName)}
      </motion.p>
      {outcome === 'safe' && (
        <motion.p
          className={styles.points}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.45 }}
        >
          {firstAttempt ? ui.feedback.points(shownPoints) : ui.feedback.noPoints}
        </motion.p>
      )}
      <div className={styles.actions}>
        <Button onClick={onAck} autoFocusTarget variant={outcome === 'critical' ? 'danger' : 'primary'}>
          {button}
        </Button>
      </div>
    </Modal>
  );
}
