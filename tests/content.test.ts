import { describe, expect, it } from 'vitest';
import { MISSION_LIST } from '../src/missions/data';
import { validateMission } from '../src/missions/engine/validateMission';
import { maxScore } from '../src/missions/engine/scoring';

describe('missiya kontenti', () => {
  it.each(MISSION_LIST.map((m) => [m.id, m] as const))('%s — validatsiyadan o‘tadi', (_id, mission) => {
    expect(validateMission(mission)).toEqual([]);
  });

  it('kamida uchta missiya bor va tartib noyob', () => {
    expect(MISSION_LIST.length).toBeGreaterThanOrEqual(3);
    expect(new Set(MISSION_LIST.map((m) => m.order)).size).toBe(MISSION_LIST.length);
  });

  it('har missiyada 3–5 hotspot, 4–5 belgi, 2–4 qaror', () => {
    for (const m of MISSION_LIST) {
      expect(m.hotspots.length).toBeGreaterThanOrEqual(3);
      expect(m.hotspots.length).toBeLessThanOrEqual(5);
      expect(Object.keys(m.clues).length).toBeGreaterThanOrEqual(4);
      expect(Object.keys(m.clues).length).toBeLessThanOrEqual(5);
      expect(Object.keys(m.decisions).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(m.decisions).length).toBeLessThanOrEqual(4);
    }
  });

  it('maxScore = qarorlar × 10 + belgilar × 5', () => {
    const m1 = MISSION_LIST[0]!;
    expect(maxScore(m1)).toBe(2 * 10 + 5 * 5);
  });

  it('validator xatolarni topadi', () => {
    const broken = structuredClone(MISSION_LIST[0]!);
    broken.hotspots[0]!.action = { type: 'dialog', dialogId: 'yo‘q' };
    broken.sim.emails![0]!.fromAddress = 'hr@real-company.com';
    broken.decisions['m1-d-verify']!.choices = broken.decisions['m1-d-verify']!.choices.filter((c) => c.outcome !== 'safe');
    const errors = validateMission(broken);
    expect(errors.some((e) => e.includes('dialog'))).toBe(true);
    expect(errors.some((e) => e.includes('.example'))).toBe(true);
    expect(errors.some((e) => e.includes('xavfsiz tanlov'))).toBe(true);
  });
});
