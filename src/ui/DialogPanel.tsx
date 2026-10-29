import { useState } from 'react';
import { ui } from '../content/uz/ui';
import type { Dialog } from '../types/models';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ui.module.css';

export function DialogPanel({ dialog, playerName, onClose }: { dialog: Dialog; playerName: string; onClose(): void }) {
  const [index, setIndex] = useState(0);
  const line = dialog.lines[index];
  if (!line) return null;
  const isPlayer = line.speaker === 'player';
  const speaker = isPlayer ? playerName : line.speaker;
  const last = index === dialog.lines.length - 1;
  return (
    <Modal title={speaker} hideTitle onEscape={onClose} size="md" className={styles.dialogModal}>
      <div className={styles.dialogRow}>
        <span className={[styles.avatar, isPlayer ? styles.avatarPlayer : ''].join(' ')} aria-hidden="true">
          {speaker.charAt(0) === '«' ? speaker.charAt(1) : speaker.charAt(0)}
        </span>
        <div>
          <p className={styles.speaker}>{isPlayer ? `${speaker} (${ui.dialog.you})` : speaker}</p>
          <p className={styles.dialogText} aria-live="polite">
            {line.text}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <span className={styles.muted} aria-hidden="true">
          {index + 1}/{dialog.lines.length}
        </span>
        {last ? (
          <Button onClick={onClose} autoFocusTarget>
            {ui.dialog.finish}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} autoFocusTarget>
            {ui.dialog.next}
          </Button>
        )}
      </div>
    </Modal>
  );
}
