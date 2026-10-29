import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, applyResult, createDefaultProgress, loadProgress, saveProgress } from '../src/persistence/storage';
import type { MissionResult } from '../src/types/models';

const result = (over: Partial<MissionResult> = {}): MissionResult => ({
  missionId: 'm1-phishing',
  outcome: 'passed',
  score: 40,
  maxScore: 45,
  stars: 2,
  cluesFound: [],
  decisions: [],
  finishedAt: new Date().toISOString(),
  ...over,
});

describe('lokal progress', () => {
  beforeEach(() => localStorage.clear());

  it('standart progress: faqat birinchi missiya ochiq', () => {
    const p = loadProgress();
    expect(p.selectedCharacter).toBeNull();
    expect(p.missions['m1-phishing'].status).toBe('available');
    expect(p.missions['m2-suspicious-file'].status).toBe('locked');
    expect(p.missions['m3-mfa-incident'].status).toBe('locked');
  });

  it('saqlash va qayta o‘qish', () => {
    const p = { ...createDefaultProgress(), selectedCharacter: 'guli' as const };
    expect(saveProgress(p)).toBe(true);
    const loaded = loadProgress();
    expect(loaded.selectedCharacter).toBe('guli');
    expect(loaded.settings).toEqual(p.settings);
  });

  it('buzilgan JSON ilovani buzmaydi va zaxiraga ko‘chiriladi', () => {
    localStorage.setItem(STORAGE_KEY, '{buzilgan');
    const p = loadProgress();
    expect(p.missions['m1-phishing'].status).toBe('available');
    expect(localStorage.getItem(`${STORAGE_KEY}:corrupt`)).toBe('{buzilgan');
  });

  it('noto‘g‘ri sxema yoki noma’lum versiya standart holatga qaytadi', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, missions: 'x' }));
    expect(loadProgress().version).toBe(1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createDefaultProgress(), selectedCharacter: 'hacker' }));
    expect(loadProgress().selectedCharacter).toBeNull();
  });

  it('yetishmayotgan missiya yozuvlari tiklanadi va zanjir bo‘yicha ochiladi', () => {
    const p = createDefaultProgress();
    const partial = { ...p, missions: { 'm1-phishing': { ...p.missions['m1-phishing'], status: 'completed' } } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partial));
    const loaded = loadProgress();
    expect(loaded.missions['m2-suspicious-file'].status).toBe('available');
    expect(loaded.missions['m3-mfa-incident'].status).toBe('locked');
  });

  it('natija: keyingi missiya ochiladi, eng yaxshi natija pasaymaydi', () => {
    let p = applyResult(createDefaultProgress(), result({ score: 40, stars: 2 }), ['m2-suspicious-file']);
    expect(p.missions['m1-phishing']).toMatchObject({ status: 'completed', attempts: 1, bestScore: 40, bestStars: 2 });
    expect(p.missions['m2-suspicious-file'].status).toBe('available');

    p = applyResult(p, result({ score: 10, stars: 1 }), ['m2-suspicious-file']);
    expect(p.missions['m1-phishing']).toMatchObject({ attempts: 2, bestScore: 40, bestStars: 2 });

    p = applyResult(p, result({ outcome: 'failed', score: 0, stars: 0 }), ['m2-suspicious-file']);
    expect(p.missions['m1-phishing']).toMatchObject({ status: 'completed', attempts: 3, bestScore: 40 });
  });

  it('muvaffaqiyatsiz natija keyingi missiyani ochmaydi', () => {
    const p = applyResult(createDefaultProgress(), result({ outcome: 'failed', stars: 0 }), ['m2-suspicious-file']);
    expect(p.missions['m1-phishing'].status).toBe('available');
    expect(p.missions['m2-suspicious-file'].status).toBe('locked');
  });

  it('saqlangan ma’lumotda shaxsiy ma’lumot yo‘q', () => {
    saveProgress(createDefaultProgress());
    const keys = Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY)!));
    expect(keys.sort()).toEqual(['missions', 'selectedCharacter', 'settings', 'updatedAt', 'version']);
  });
});
