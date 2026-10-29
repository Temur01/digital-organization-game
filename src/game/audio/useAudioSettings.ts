import { useMemo } from 'react';
import { useGameStore } from '../../app/store';
import { resolveAudioSettings } from './audioSettings';
import type { AudioSettings } from './audioTypes';

/**
 * Audio sozlamalari — mavjud progress sozlamalarida saqlanadi (localStorage, zod bilan tekshiriladi).
 * AudioManager bilan sinxronlash store.ts da (obuna) — bu hook faqat o‘qish va yozish uchun.
 */
export function useAudioSettings(): [AudioSettings, (patch: Partial<AudioSettings>) => void] {
  const settings = useGameStore((s) => s.progress.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const audio = useMemo(() => resolveAudioSettings(settings), [settings]);
  const update = (patch: Partial<AudioSettings>) => {
    const next = { ...audio, ...patch };
    // `sound` — eski versiyalar bilan moslik uchun
    updateSettings({ audio: next, sound: !next.muted });
  };
  return [audio, update];
}
