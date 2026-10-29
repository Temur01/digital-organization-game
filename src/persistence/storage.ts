import { MISSION_LIST } from '../missions/data';
import type { LocalProgress, MissionId, MissionProgress, MissionResult, Settings } from '../types/models';
import { migrate } from './migrate';
import { progressSchema } from './schema';

export const STORAGE_KEY = 'raqamli-qalqon:progress';

export const DEFAULT_SETTINGS: Settings = {
  textScale: 1,
  reducedMotion: 'system',
  highContrast: false,
  listMode: false,
  sound: true,
  fullscreen: true,
};

const emptyMission = (status: MissionProgress['status']): MissionProgress => ({
  status,
  attempts: 0,
  bestScore: 0,
  bestStars: 0,
});

/** Yetishmayotgan missiyalarni qo‘shadi va ochilish holatini zanjir bo‘yicha tiklaydi. */
export function normalize(missions: Partial<Record<string, MissionProgress>>): Record<MissionId, MissionProgress> {
  const out = {} as Record<MissionId, MissionProgress>;
  let prevCompleted = true;
  for (const m of MISSION_LIST) {
    const existing = missions[m.id];
    const entry = existing ? { ...existing } : emptyMission('locked');
    if (entry.status === 'locked' && prevCompleted) entry.status = 'available';
    out[m.id] = entry;
    prevCompleted = entry.status === 'completed';
  }
  return out;
}

export function createDefaultProgress(): LocalProgress {
  return {
    version: 1,
    selectedCharacter: null,
    missions: normalize({}),
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: new Date().toISOString(),
  };
}

export function isStorageAvailable(): boolean {
  try {
    const probe = `${STORAGE_KEY}:probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadProgress(): LocalProgress {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = progressSchema.safeParse(migrate(JSON.parse(raw)));
    if (parsed.success) {
      return { ...parsed.data, missions: normalize(parsed.data.missions as Record<string, MissionProgress>) };
    }
  } catch {
    /* storage mavjud emas yoki JSON buzilgan */
  }
  if (raw) {
    console.warn('[progress] Saqlangan progress o‘qilmadi, standart holat ishlatiladi.');
    try {
      localStorage.setItem(`${STORAGE_KEY}:corrupt`, raw);
    } catch {
      /* e’tiborsiz */
    }
  }
  return createDefaultProgress();
}

export function saveProgress(progress: LocalProgress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* e’tiborsiz */
  }
}

/** Natijani progressga qo‘llaydi: eng yaxshi natija pasaymaydi, keyingi missiya ochiladi. */
export function applyResult(progress: LocalProgress, result: MissionResult, unlocks: MissionId[]): LocalProgress {
  const current = progress.missions[result.missionId];
  const passed = result.outcome === 'passed';
  const updated: MissionProgress = {
    status: passed ? 'completed' : current.status,
    attempts: current.attempts + 1,
    bestScore: passed ? Math.max(current.bestScore, result.score) : current.bestScore,
    bestStars: passed ? (Math.max(current.bestStars, result.stars) as MissionProgress['bestStars']) : current.bestStars,
    lastResult: result,
  };
  const missions = { ...progress.missions, [result.missionId]: updated };
  if (passed) {
    for (const id of unlocks) {
      if (missions[id].status === 'locked') missions[id] = { ...missions[id], status: 'available' };
    }
  }
  return { ...progress, missions };
}
