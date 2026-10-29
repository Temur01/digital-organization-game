import { useEffect } from 'react';
import type { MusicId } from '../audioTypes';
import { audioManager } from '../index';

/** Shu trekni chaladi. Bir xil trek qayta so‘ralsa (StrictMode, qayta render) — hech narsa o‘zgarmaydi. */
export function useBackgroundMusic(id: MusicId | null): void {
  useEffect(() => {
    audioManager.playMusic(id);
  }, [id]);
}
