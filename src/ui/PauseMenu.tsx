import { useState } from 'react';
import { ui } from '../content/uz/ui';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { SettingsPanel } from './SettingsPanel';
import styles from './ui.module.css';

interface PauseMenuProps {
  onResume(): void;
  onRestart(): void;
  onExit(): void;
}

export function PauseMenu({ onResume, onRestart, onExit }: PauseMenuProps) {
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const [confirm, setConfirm] = useState<'restart' | 'exit' | null>(null);

  return (
    <Modal title={view === 'menu' ? ui.pause.heading : ui.settings.heading} onEscape={view === 'menu' ? onResume : () => setView('menu')} size="sm">
      {view === 'menu' ? (
        <div className={styles.menu}>
          <Button onClick={onResume} autoFocusTarget>
            {ui.pause.resume}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm('restart')}>
            {ui.pause.restart}
          </Button>
          <Button variant="secondary" onClick={() => setView('settings')}>
            {ui.pause.settings}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm('exit')}>
            {ui.pause.exit}
          </Button>
        </div>
      ) : (
        <>
          <SettingsPanel allowReset={false} />
          <div className={styles.actions}>
            <Button onClick={() => setView('menu')} autoFocusTarget>
              {ui.common.back}
            </Button>
          </div>
        </>
      )}
      {confirm === 'restart' && (
        <ConfirmDialog title={ui.pause.restartConfirmTitle} text={ui.pause.restartConfirmText} onCancel={() => setConfirm(null)} onConfirm={onRestart} />
      )}
      {confirm === 'exit' && (
        <ConfirmDialog title={ui.pause.exitConfirmTitle} text={ui.pause.exitConfirmText} onCancel={() => setConfirm(null)} onConfirm={onExit} />
      )}
    </Modal>
  );
}
