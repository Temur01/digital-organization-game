import type { QuizQuestion } from '../content/quiz/questions';

export const QUIZ_ID = 'raqamli-gigiyena-v1';
export const QUESTIONS_PER_SESSION = 10;

export interface SessionQuestion {
  question: QuizQuestion;
  /** Aralashtirilgan variantlar */
  options: QuizQuestion['options'];
  /** «50/50» olib tashlagan variantlar */
  removed: string[];
}

export interface QuizAnswer {
  choice: string;
  correct: boolean;
  points: number;
}

export interface QuizState {
  questions: SessionQuestion[];
  index: number;
  phase: 'question' | 'answered' | 'done';
  answers: Record<string, QuizAnswer>;
  score: number;
  streak: number;
  bestStreak: number;
  fiftyLeft: number;
  startedAt: number;
}

export interface QuizResult {
  quizId: string;
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  /** savol id → tanlangan variant id */
  answers: Record<string, string>;
  finishedAt: string;
}

/** Ketma-ket to‘g‘ri javoblar uchun bonus: 10, 12, 14, 16, 18 (maksimum) */
export function pointsFor(streak: number): number {
  return 10 + Math.min(Math.max(streak - 1, 0), 4) * 2;
}

export function maxScoreFor(total: number): number {
  let sum = 0;
  for (let i = 1; i <= total; i++) sum += pointsFor(i);
  return sum;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function createQuizSession(
  pool: readonly QuizQuestion[],
  count = QUESTIONS_PER_SESSION,
  rng: () => number = Math.random,
  now = Date.now(),
): QuizState {
  const picked = shuffle(pool, rng).slice(0, Math.min(count, pool.length));
  return {
    questions: picked.map((question) => ({ question, options: shuffle(question.options, rng), removed: [] })),
    index: 0,
    phase: 'question',
    answers: {},
    score: 0,
    streak: 0,
    bestStreak: 0,
    fiftyLeft: 1,
    startedAt: now,
  };
}

export function currentQuestion(state: QuizState): SessionQuestion | null {
  return state.questions[state.index] ?? null;
}

export function answerQuestion(state: QuizState, choice: string): QuizState {
  const sq = currentQuestion(state);
  if (state.phase !== 'question' || !sq || sq.removed.includes(choice) || !sq.options.some((o) => o.id === choice)) return state;
  const correct = choice === sq.question.correct;
  const streak = correct ? state.streak + 1 : 0;
  const points = correct ? pointsFor(streak) : 0;
  return {
    ...state,
    phase: 'answered',
    answers: { ...state.answers, [sq.question.id]: { choice, correct, points } },
    score: state.score + points,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

export function nextQuestion(state: QuizState): QuizState {
  if (state.phase !== 'answered') return state;
  const index = state.index + 1;
  return index >= state.questions.length ? { ...state, phase: 'done' } : { ...state, index, phase: 'question' };
}

/** «50/50»: ikkita noto‘g‘ri variantni olib tashlaydi (bir sessiyada bir marta) */
export function applyFiftyFifty(state: QuizState, rng: () => number = Math.random): QuizState {
  const sq = currentQuestion(state);
  if (state.phase !== 'question' || !sq || state.fiftyLeft <= 0 || sq.removed.length > 0) return state;
  const wrong = sq.options.filter((o) => o.id !== sq.question.correct).map((o) => o.id);
  const removed = shuffle(wrong, rng).slice(0, 2);
  const questions = state.questions.map((q, i) => (i === state.index ? { ...q, removed } : q));
  return { ...state, questions, fiftyLeft: state.fiftyLeft - 1 };
}

export function buildQuizResult(state: QuizState, now = Date.now()): QuizResult {
  const answers = Object.fromEntries(Object.entries(state.answers).map(([id, a]) => [id, a.choice]));
  return {
    quizId: QUIZ_ID,
    score: state.score,
    maxScore: maxScoreFor(state.questions.length),
    correct: Object.values(state.answers).filter((a) => a.correct).length,
    total: state.questions.length,
    bestStreak: state.bestStreak,
    durationMs: Math.max(0, now - state.startedAt),
    answers,
    finishedAt: new Date(now).toISOString(),
  };
}
