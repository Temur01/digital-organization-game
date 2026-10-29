import { useState } from 'react';
import { companyConfig } from '../app/config';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { continueTarget, hasAnyProgress } from '../app/transitions';
import { ui } from '../content/uz/ui';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import styles from './screens.module.css';

export function TitleScreen() {
  const progress = useGameStore((s) => s.progress);
  const goTo = useGameStore((s) => s.goTo);
  const newGame = useGameStore((s) => s.newGame);
  const openSettings = useGameStore((s) => s.openSettings);
  const openCharacterSelect = useGameStore((s) => s.openCharacterSelect);
  const [dialog, setDialog] = useState<'newGame' | 'about' | null>(null);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const canContinue = hasAnyProgress(progress);

  const onContinue = () => (continueTarget(progress) === 'map' ? goTo('map') : openCharacterSelect());
  const onNewGame = () => (canContinue ? setDialog('newGame') : newGame());

  return (
    <main className={styles.title}>
      <div className={styles.titleCard}>
        <svg className={styles.logo} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 4 8 14v16c0 14 10 24 24 30 14-6 24-16 24-30V14z" fill="var(--color-primary)" />
          <path d="M22 32l7 7 14-15" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 ref={heading} tabIndex={-1} className={styles.titleHeading}>
          {companyConfig.gameTitle}
        </h1>
        <p className={styles.tagline}>{ui.title.tagline}</p>
        <div className={styles.menu}>
          {canContinue && <Button onClick={onContinue}>{ui.title.continue}</Button>}
          <Button variant={canContinue ? 'secondary' : 'primary'} onClick={onNewGame}>
            {ui.title.newGame}
          </Button>
          <Button variant="secondary" onClick={openSettings}>
            {ui.title.settings}
          </Button>
          <Button variant="ghost" onClick={() => setDialog('about')}>
            {ui.title.about}
          </Button>
        </div>
        <p className={styles.simNote}>{ui.common.simulationNote}</p>
      </div>
      {dialog === 'newGame' && (
        <ConfirmDialog
          title={ui.title.newGameConfirmTitle}
          text={ui.title.newGameConfirmText}
          confirmLabel={ui.title.newGame}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            newGame();
          }}
        />
      )}
      {dialog === 'about' && (
        <Modal title={ui.title.aboutTitle} onEscape={() => setDialog(null)}>
          {ui.title.aboutText.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <div className={styles.actions}>
            <Button onClick={() => setDialog(null)} autoFocusTarget>
              {ui.common.close}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
