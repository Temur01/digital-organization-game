import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types/models';
import { useGameStore } from './store';
import { CHARACTERS } from '../content/characters';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(setting: Settings['reducedMotion']): boolean {
  const [system, setSystem] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return setting === 'on' || (setting === 'system' && system);
}

/** Ekran almashganda fokusni sarlavhaga o‘tkazadi (screen reader uchun). */
export function useScreenHeading<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

export function usePlayer() {
  const id = useGameStore((s) => s.progress.selectedCharacter) ?? 'bek';
  return CHARACTERS[id];
}
