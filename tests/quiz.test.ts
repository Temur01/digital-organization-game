import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../src/app/store';
import { PENDING_KEY, enqueueResult, readPending } from '../src/app/sync';
import { QUIZ_QUESTIONS, QUIZ_TOPICS } from '../src/content/quiz/questions';
import { createDefaultProgress } from '../src/persistence/storage';
import {
  answerQuestion,
  applyFiftyFifty,
  buildQuizResult,
  createQuizSession,
  currentQuestion,
  maxScoreFor,
  nextQuestion,
  pointsFor,
} from '../src/quiz/engine';
import { validate } from '../src/screens/AuthScreen';

/** Deterministik tasodif (testlar barqaror bo‘lishi uchun) */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('savollar banki (qo‘llanma asosida)', () => {
  it('kamida 20 ta savol, id’lar noyob', () => {
    expect(QUIZ_QUESTIONS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(QUIZ_QUESTIONS.length);
  });

  it.each(QUIZ_QUESTIONS.map((q) => [q.id, q] as const))('%s — to‘liq va to‘g‘ri tuzilgan', (_id, q) => {
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
    expect(q.options.some((o) => o.id === q.correct)).toBe(true);
    expect(q.scenario.length).toBeGreaterThan(30);
    expect(q.explanation.length).toBeGreaterThan(30);
    expect(q.source.length).toBeGreaterThan(5);
    expect(QUIZ_TOPICS[q.topic]).toBeTruthy();
    // Xavfsizlik: savollarda haqiqiy havola yo‘q
    expect(JSON.stringify(q)).not.toMatch(/https?:\/\/|www\./i);
  });
});

describe('sinov dvigateli', () => {
  it('seriya bonusi: 10, 12, 14, 16, 18, 18…', () => {
    expect([1, 2, 3, 4, 5, 6].map(pointsFor)).toEqual([10, 12, 14, 16, 18, 18]);
    expect(maxScoreFor(10)).toBe(10 + 12 + 14 + 16 + 18 * 6);
  });

  it('sessiya: 10 ta savol, variantlar aralashtirilgan, lekin to‘liq', () => {
    const s = createQuizSession(QUIZ_QUESTIONS, 10, seeded(3));
    expect(s.questions).toHaveLength(10);
    for (const sq of s.questions) {
      expect([...sq.options.map((o) => o.id)].sort()).toEqual([...sq.question.options.map((o) => o.id)].sort());
    }
  });

  it('ideal o‘yin: maksimal ball va seriya', () => {
    let s = createQuizSession(QUIZ_QUESTIONS, 10, seeded(5));
    while (s.phase !== 'done') {
      s = answerQuestion(s, currentQuestion(s)!.question.correct);
      s = nextQuestion(s);
    }
    const r = buildQuizResult(s, s.startedAt + 60_000);
    expect(r.correct).toBe(10);
    expect(r.score).toBe(r.maxScore);
    expect(r.bestStreak).toBe(10);
    expect(r.durationMs).toBe(60_000);
    expect(Object.keys(r.answers)).toHaveLength(10);
  });

  it('noto‘g‘ri javob seriyani nolga tushiradi va ball bermaydi', () => {
    let s = createQuizSession(QUIZ_QUESTIONS, 3, seeded(7));
    s = nextQuestion(answerQuestion(s, currentQuestion(s)!.question.correct));
    const wrong = currentQuestion(s)!.options.find((o) => o.id !== currentQuestion(s)!.question.correct)!.id;
    s = answerQuestion(s, wrong);
    expect(s.streak).toBe(0);
    expect(s.score).toBe(10);
    // Javob berilgan savolga qayta javob berib bo‘lmaydi
    expect(answerQuestion(s, currentQuestion(s)!.question.correct)).toBe(s);
  });

  it('50/50: ikki noto‘g‘ri variantni olib tashlaydi, bir martagina', () => {
    let s = createQuizSession(QUIZ_QUESTIONS, 2, seeded(9));
    s = applyFiftyFifty(s, seeded(2));
    const sq = currentQuestion(s)!;
    expect(sq.removed).toHaveLength(2);
    expect(sq.removed).not.toContain(sq.question.correct);
    expect(s.fiftyLeft).toBe(0);
    // Olib tashlangan variantni tanlab bo‘lmaydi
    expect(answerQuestion(s, sq.removed[0]!)).toBe(s);
    s = nextQuestion(answerQuestion(s, sq.question.correct));
    expect(applyFiftyFifty(s)).toBe(s);
  });
});

describe('ro‘yxatdan o‘tish formasi', () => {
  it('ism, kasb va email majburiy', () => {
    expect(validate('register', { name: '', email: 'x' })).toMatchObject({
      name: expect.any(String),
      position: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(validate('register', { name: 'Ali', position: 'Dasturchi', email: 'ali@kompaniya.uz', password: 'parol123' })).toEqual({});
    expect(validate('register', { name: 'Ali', position: '', email: 'ali@kompaniya.uz', password: 'parol123' })).toHaveProperty('position');
    // Kirishda faqat email va parol
    expect(validate('login', { name: '', email: 'ali@kompaniya.uz', password: 'parol123' })).toEqual({});
    expect(validate('login', { name: '', email: 'ali@kompaniya.uz', password: '123' })).toHaveProperty('password');
    // Parolni tiklash — faqat email
    expect(validate('forgot', { name: '', email: 'ali@kompaniya.uz' })).toEqual({});
    expect(validate('forgot', { name: '', email: 'ali@' })).toHaveProperty('email');
  });
});

describe('natijalar navbati va server progressi', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ progress: createDefaultProgress() });
  });

  it('server ulanmagan bo‘lsa natija lokal navbatda qoladi', () => {
    enqueueResult({ kind: 'quiz', data: { quizId: 'q', score: 50, maxScore: 100, correct: 5, total: 10, bestStreak: 3, durationMs: 1, answers: {}, finishedAt: 'x' } });
    expect(readPending()).toHaveLength(1);
    localStorage.setItem(PENDING_KEY, '{buzilgan');
    expect(readPending()).toEqual([]);
  });

  it('missiya tugaganda natija navbatga tushadi', () => {
    const s = useGameStore.getState();
    s.selectCharacter('bek');
    s.startMission('m1-phishing');
    s.dispatchMission({ type: 'SCENE_READY' });
    s.dispatchMission({ type: 'ACTIVATE_HOTSPOT', hotspotId: 'm1-computer' });
    s.dispatchMission({ type: 'CHOOSE', decisionId: 'm1-d-action', choiceId: 'click-link' });
    s.dispatchMission({ type: 'ACK' });
    s.dispatchMission({ type: 'ACK' });
    expect(readPending().map((p) => p.kind)).toEqual(['mission']);
  });

  it('serverdagi natijalar lokal progressga qo‘shiladi va keyingi missiyani ochadi', () => {
    useGameStore.getState().mergeServerProgress({
      missions: { 'm1-phishing': { bestScore: 40, bestStars: 2, attempts: 3, passed: true } },
      quizBest: 120,
    });
    const p = useGameStore.getState().progress;
    expect(p.missions['m1-phishing']).toMatchObject({ status: 'completed', bestScore: 40, bestStars: 2, attempts: 3 });
    expect(p.missions['m2-suspicious-file'].status).toBe('available');
    expect(p.quizBest).toBe(120);
  });

  it('sinov natijasi rekordni yangilaydi, pasaytirmaydi', () => {
    const base = { quizId: 'q', maxScore: 154, correct: 5, total: 10, bestStreak: 3, durationMs: 1, answers: {}, finishedAt: 'x' };
    useGameStore.getState().finishQuiz({ ...base, score: 80 });
    useGameStore.getState().finishQuiz({ ...base, score: 50, finishedAt: 'y' });
    expect(useGameStore.getState().progress.quizBest).toBe(80);
  });
});
