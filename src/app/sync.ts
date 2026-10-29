import { supabase } from '../lib/supabase';
import type { MissionResult } from '../types/models';
import type { QuizResult } from '../quiz/engine';

/**
 * Natijalar navbati: mehmon rejimida (yoki internet yo‘qligida) natijalar brauzerda kutadi,
 * foydalanuvchi kirgach serverga yuboriladi. Takroriy yuborish xavfsiz — bazada
 * (user_id, mission_id/quiz_id, finished_at) noyob.
 */
export const PENDING_KEY = 'raqamli-qalqon:pending-results';

export type PendingItem = { kind: 'mission'; data: MissionResult } | { kind: 'quiz'; data: QuizResult };

export function readPending(): PendingItem[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingItem[]) : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingItem[]): void {
  try {
    if (items.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-200)));
  } catch {
    /* saqlash imkoni yo‘q — mehmon rejimida natija faqat lokal progressda qoladi */
  }
}

export function enqueueResult(item: PendingItem): void {
  writePending([...readPending(), item]);
  void flushPending();
}

let flushing: Promise<number> | null = null;

/** Navbatni serverga yuboradi; yuborilganlar sonini qaytaradi */
export function flushPending(): Promise<number> {
  flushing ??= doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return 0;

  const items = readPending();
  const left: PendingItem[] = [];
  let sent = 0;
  for (const item of items) {
    const { error } =
      item.kind === 'mission'
        ? await supabase.from('mission_results').upsert(
            {
              user_id: userId,
              mission_id: item.data.missionId,
              outcome: item.data.outcome,
              score: item.data.score,
              max_score: item.data.maxScore,
              stars: item.data.stars,
              clues_found: item.data.cluesFound.length,
              finished_at: item.data.finishedAt,
            },
            { onConflict: 'user_id,mission_id,finished_at', ignoreDuplicates: true },
          )
        : await supabase.from('quiz_results').upsert(
            {
              user_id: userId,
              quiz_id: item.data.quizId,
              score: item.data.score,
              correct: item.data.correct,
              total: item.data.total,
              best_streak: item.data.bestStreak,
              duration_ms: item.data.durationMs,
              answers: item.data.answers,
              finished_at: item.data.finishedAt,
            },
            { onConflict: 'user_id,quiz_id,finished_at', ignoreDuplicates: true },
          );
    if (error) left.push(item);
    else sent++;
  }
  // Yuborish paytida qo‘shilgan yangi natijalarni ham saqlab qolamiz
  const added = readPending().slice(items.length);
  writePending([...left, ...added]);
  return sent;
}

export interface ServerBest {
  missions: Record<string, { bestScore: number; bestStars: number; attempts: number; passed: boolean }>;
  quizBest: number;
}

/** Serverdagi eng yaxshi natijalar — boshqa qurilmadagi progressni tiklash uchun */
export async function pullServerBest(): Promise<ServerBest | null> {
  if (!supabase) return null;
  const [missions, quizzes] = await Promise.all([
    supabase.from('mission_results').select('mission_id, outcome, score, stars'),
    supabase.from('quiz_results').select('score'),
  ]);
  if (missions.error || quizzes.error) return null;
  const out: ServerBest = { missions: {}, quizBest: 0 };
  for (const r of missions.data ?? []) {
    const m = (out.missions[r.mission_id as string] ??= { bestScore: 0, bestStars: 0, attempts: 0, passed: false });
    m.attempts++;
    if (r.outcome === 'passed') {
      m.passed = true;
      m.bestScore = Math.max(m.bestScore, r.score as number);
      m.bestStars = Math.max(m.bestStars, r.stars as number);
    }
  }
  for (const q of quizzes.data ?? []) out.quizBest = Math.max(out.quizBest, q.score as number);
  return out;
}
