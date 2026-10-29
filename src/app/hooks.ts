import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Settings } from '../types/models';
import { useGameStore } from './store';
import { CHARACTERS, characterForGender } from '../content/characters';
import type { CharacterId } from '../types/models';
import { useAuthStore } from './auth';
import { companyConfig } from './config';
import { subscribeVoices, voiceLabel } from './voice';

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

/** Mos ovoz nomi (yoki null) — ovozlar asinxron yuklanganda komponent qayta chiziladi */
export function useVoiceLabel(): string | null {
  return useSyncExternalStore(subscribeVoices, voiceLabel, () => null);
}

/** Ekran almashganda fokusni sarlavhaga o‘tkazadi (screen reader uchun). */
export function useScreenHeading<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

/** O‘yinchining ko‘rinadigan ismi: kirgan bo‘lsa — profildagi ism, aks holda standart (config) */
export function usePlayerName(): { first: string; full: string; age: number | null; department: string; position: string } {
  const profile = useAuthStore((s) => (s.status === 'signedIn' ? s.profile : null));
  const { firstName, lastName, age, department, position } = companyConfig.defaultPlayer;
  if (profile?.full_name) {
    const full = profile.full_name.trim().replace(/\s+/g, ' ');
    return {
      first: full.split(' ')[0] ?? full,
      full,
      age: profile.age,
      department: profile.department ?? department,
      position: profile.position ?? position,
    };
  }
  return { first: firstName, full: `${firstName} ${lastName}`, age, department, position };
}

/** Kirgan foydalanuvchi jinsini kiritgan bo‘lsa — qat’iy belgilangan qahramon, aks holda null */
export function useLockedCharacter(): CharacterId | null {
  return useAuthStore((s) => (s.status === 'signedIn' ? characterForGender(s.profile?.gender) : null));
}

/**
 * Tanlangan qahramon (rasmi, rangi) + o‘yinchining o‘z ismi.
 * Shu sababli dialog, qaror va natijalarda «Bek/Guli» o‘rniga foydalanuvchi ismi, bo‘limi va kasbi chiqadi.
 */
export function usePlayer() {
  const locked = useLockedCharacter();
  const selected = useGameStore((s) => s.progress.selectedCharacter);
  const id = locked ?? selected ?? 'bek';
  const { first, department, position } = usePlayerName();
  return useMemo(() => ({ ...CHARACTERS[id], name: first, role: `${department} · ${position}` }), [id, first, department, position]);
}
