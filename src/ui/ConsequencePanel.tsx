import { motion } from 'motion/react';
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
      <p className={[styles.feedbackTitle, styles.glitch].join(' ')} data-text={consequence.title}>
        {consequence.title}
      </p>
      <ol className={styles.timeline}>
        {consequence.steps.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.55, type: 'spring', stiffness: 300, damping: 24 }}
          >
            <motion.span
              className={styles.timelineIcon}
              aria-hidden="true"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.4, 1], rotate: 0 }}
              transition={{ delay: 0.45 + i * 0.55, duration: 0.45 }}
            >
              {s.icon}
            </motion.span>
            <span>{s.text}</span>
          </motion.li>
        ))}
      </ol>
      <motion.div
        className={styles.prevention}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + consequence.steps.length * 0.55 }}
      >
        <strong>{ui.consequence.prevention}:</strong> {consequence.prevention}
      </motion.div>
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
