import { useState } from 'react';
import { fullscreenSupported } from '../app/fullscreen';
import { useVoiceLabel } from '../app/hooks';
import { VOICE_ENABLED } from '../app/voice';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import type { Settings } from '../types/models';
import { AudioControls } from './AudioControls';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './ui.module.css';

const SCALES: Settings['textScale'][] = [1, 1.25, 1.5];
const MOTION: Settings['reducedMotion'][] = ['system', 'on', 'off'];

export function SettingsPanel({ allowReset = true }: { allowReset?: boolean }) {
  const settings = useGameStore((s) => s.progress.settings);
  const update = useGameStore((s) => s.updateSettings);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const pushToast = useGameStore((s) => s.pushToast);
  const storageAvailable = useGameStore((s) => s.storageAvailable);
  const [confirmReset, setConfirmReset] = useState(false);
  const voice = useVoiceLabel();

  return (
    <div className={styles.settings}>
      <fieldset className={styles.fieldset}>
        <legend>{ui.settings.textScale}</legend>
        <div className={styles.segmented}>
          {SCALES.map((v) => (
            <label key={v} className={styles.segment}>
              <input type="radio" name="textScale" checked={settings.textScale === v} onChange={() => update({ textScale: v })} />
              <span>{Math.round(v * 100)}%</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>{ui.settings.reducedMotion}</legend>
        <div className={styles.segmented}>
          {MOTION.map((v) => (
            <label key={v} className={styles.segment}>
              <input type="radio" name="reducedMotion" checked={settings.reducedMotion === v} onChange={() => update({ reducedMotion: v })} />
              <span>{ui.settings.reducedMotionOptions[v]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {(
        [
          ['highContrast', ui.settings.highContrast],
          ['listMode', ui.settings.listMode],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className={styles.checkRow}>
          <input type="checkbox" checked={settings[key]} onChange={(e) => update({ [key]: e.target.checked })} />
          <span>{label}</span>
        </label>
      ))}
      {fullscreenSupported() && (
        <label className={styles.checkRow}>
          <input type="checkbox" checked={settings.fullscreen ?? true} onChange={(e) => update({ fullscreen: e.target.checked })} />
          <span>{ui.settings.fullscreen}</span>
        </label>
      )}
      <AudioControls />
      {VOICE_ENABLED && (
        <>
          <label className={styles.checkRow}>
            <input type="checkbox" disabled={!voice} checked={!!voice && (settings.voice ?? true)} onChange={(e) => update({ voice: e.target.checked })} />
            <span>{ui.settings.voice}</span>
          </label>
          <p className={styles.muted}>{voice ? ui.settings.voiceUsing(voice) : ui.settings.voiceUnavailable}</p>
        </>
      )}
      {!storageAvailable && <p className={styles.warning}>{ui.map.storageWarning}</p>}
      {allowReset && (
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          {ui.settings.reset}
        </Button>
      )}
      {confirmReset && (
        <ConfirmDialog
          title={ui.settings.resetConfirmTitle}
          text={ui.settings.resetConfirmText}
          confirmLabel={ui.settings.reset}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetProgress();
            setConfirmReset(false);
            pushToast(ui.settings.resetDone);
          }}
        />
      )}
    </div>
  );
}
