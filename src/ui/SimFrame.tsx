import { useEffect, type ReactNode } from 'react';
import { playGameAudio } from '../game/audio/audioEvents';
import { ui } from '../content/uz/ui';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ui.module.css';

interface SimFrameProps {
  title: string;
  icon: string;
  onClose(): void;
  children: ReactNode;
  toolbar?: ReactNode;
}

/** Barcha simulyatsiya oynalari uchun ramka: «SIMULYATSIYA» yorlig‘i doim ko‘rinadi. */
export function SimFrame({ title, icon, onClose, children, toolbar }: SimFrameProps) {
  // Kompyuter/telefon oynasi ochilishi va yopilishi
  useEffect(() => {
    // Ochish/yopish bitta guruhda (cooldown) — StrictMode’dagi ikki marta o‘rnatish ortiqcha tovush bermaydi
    playGameAudio({ type: 'ui', action: 'windowOpen' });
    return () => void playGameAudio({ type: 'ui', action: 'windowClose' });
  }, []);

  return (
    <Modal title={title} hideTitle onEscape={onClose} size="lg" className={[styles.simModal, 'simLight'].join(' ')}>
      <div className={styles.simHeader}>
        <span className={styles.simDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.simTitle} aria-hidden="true">
          <span>{icon}</span> {title}
        </span>
        <span className={styles.simBadge} title={ui.common.simulationNote}>
          {ui.common.simulation}
        </span>
        <div className={styles.simToolbar}>{toolbar}</div>
        <Button variant="ghost" onClick={onClose} aria-label={`${title} — ${ui.common.close}`}>
          ✕
        </Button>
      </div>
      <div className={styles.simBody}>{children}</div>
    </Modal>
  );
}
