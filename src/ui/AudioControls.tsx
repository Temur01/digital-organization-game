import { useId, type CSSProperties } from 'react';
import { audioManager } from '../game/audio';
import type { AudioSettings } from '../game/audio/audioTypes';
import { useAudioSettings } from '../game/audio/useAudioSettings';
import { ui } from '../content/uz/ui';
import styles from './ui.module.css';

const t = ui.settings.audio;
const SLIDERS: { key: Exclude<keyof AudioSettings, 'muted'>; label: string; icon: string }[] = [
  { key: 'master', label: t.master, icon: '🔊' },
  { key: 'music', label: t.music, icon: '🎵' },
  { key: 'sfx', label: t.sfx, icon: '✨' },
  { key: 'ambience', label: t.ambience, icon: '🏢' },
];

/** Ovoz sozlamalari: umumiy, musiqa, effektlar, atrof-muhit va ovozsiz rejim. O‘zgarish darhol eshitiladi. */
export function AudioControls() {
  const [audio, update] = useAudioSettings();
  const ids = useId();
  return (
    <fieldset className={styles.fieldset}>
      <legend>{t.heading}</legend>
      <label className={styles.checkRow}>
        <input type="checkbox" checked={audio.muted} onChange={(e) => update({ muted: e.target.checked })} />
        <span>{t.mute}</span>
      </label>
      <div className={styles.sliders} aria-disabled={audio.muted || undefined}>
        {SLIDERS.map((s) => {
          const id = `${ids}-${s.key}`;
          const percent = Math.round(audio[s.key] * 100);
          return (
            <div key={s.key} className={styles.sliderRow}>
              <label htmlFor={id}>
                <span aria-hidden="true">{s.icon}</span> {s.label}
              </label>
              <input
                id={id}
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                disabled={audio.muted}
                aria-valuetext={`${percent}%`}
                onChange={(e) => {
                  update({ [s.key]: Number(e.target.value) / 100 });
                  // Effektlar balandligini darhol eshitib ko‘rish (cooldown takrorlanishni cheklaydi)
                  if (s.key === 'sfx' || s.key === 'master') audioManager.playSfx('interaction');
                }}
                style={{ '--fill': `${percent}%` } as CSSProperties}
              />
              <output htmlFor={id} className={styles.sliderValue}>
                {percent}%
              </output>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
