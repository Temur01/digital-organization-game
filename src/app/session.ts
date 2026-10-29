import type { MissionRuntimeState } from '../types/models';

/**
 * Joriy o‘yin sessiyasi (sessionStorage): sahifa yangilanganda missiya yoki sinov davom etadi,
 * tab yopilganda esa tozalanadi. Doimiy progress — localStorage’da (persistence/storage.ts).
 */
const MISSION_KEY = 'raqamli-qalqon:session:mission';
const QUIZ_KEY = 'raqamli-qalqon:session:quiz';

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* saqlash imkoni yo‘q — yangilanganda sessiya boshidan boshlanadi */
  }
}

export const saveMissionSession = (state: MissionRuntimeState | null) => write(MISSION_KEY, state);
export const loadMissionSession = () => read<MissionRuntimeState>(MISSION_KEY);

export const saveQuizSession = <T>(state: T | null) => write(QUIZ_KEY, state);
export const loadQuizSession = <T>() => read<T>(QUIZ_KEY);
