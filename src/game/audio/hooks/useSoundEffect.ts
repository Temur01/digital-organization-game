import { useCallback } from 'react';
import type { SfxId } from '../audioTypes';
import { audioManager } from '../index';

/** Barqaror funksiya: har renderda yangi audio obyekt yaratilmaydi */
export function useSoundEffect(id: SfxId): (opts?: { delay?: number; volume?: number }) => boolean {
  return useCallback((opts) => audioManager.playSfx(id, opts), [id]);
}
