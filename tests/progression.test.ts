import { describe, expect, it } from 'vitest';
import { rankFor, ui } from '../src/content/uz/ui';
import { MISSION_LIST, MISSIONS } from '../src/missions/data';
import { normalize } from '../src/persistence/storage';
import type { MissionProgress } from '../src/types/models';

describe('yangi bosqichlar', () => {
  it('missiyalar zanjiri uzilmagan: har biri keyingisini ochadi', () => {
    MISSION_LIST.slice(0, -1).forEach((m, i) => expect(m.unlocks).toEqual([MISSION_LIST[i + 1]!.id]));
    expect(MISSION_LIST[MISSION_LIST.length - 1]!.unlocks).toEqual([]);
  });

  it('yangi missiyalar ro‘yxatda, tartibda', () => {
    expect(MISSIONS['m6-ceo-fraud'].order).toBe(6);
    expect(MISSIONS['m7-ransomware'].order).toBe(7);
    expect(MISSIONS['m8-remote-cafe'].order).toBe(8);
  });

  it('eski saqlanmada m5 tugagan bo‘lsa, m6 ochiq, m7 yopiq', () => {
    const done: MissionProgress = { status: 'completed', attempts: 1, bestScore: 10, bestStars: 3 };
    const old = Object.fromEntries(MISSION_LIST.slice(0, 5).map((m) => [m.id, done]));
    const missions = normalize(old);
    expect(missions['m6-ceo-fraud'].status).toBe('available');
    expect(missions['m7-ransomware'].status).toBe('locked');
  });

  it('har bir yangi missiyaning xonasi o‘ziga xos', () => {
    const ids = MISSION_LIST.map((m) => m.room.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('unvonlar', () => {
  it('eng yuqori unvon uchun jami yulduzlarning kamida 80% kerak', () => {
    const max = MISSION_LIST.length * 3;
    const top = ui.ranks[ui.ranks.length - 1]!;
    expect(top.min).toBeGreaterThanOrEqual(Math.ceil(max * 0.8));
    expect(top.min).toBeLessThanOrEqual(max);
    expect(rankFor(max).current.name).toBe(top.name);
  });
});
