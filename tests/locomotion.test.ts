import { describe, expect, it } from 'vitest';
import { approach, brakingSpeed, findPath, strideRate } from '../src/game/three/locomotion';
import { footRect, intersects } from '../src/game/three/space';
import { MISSION_LIST } from '../src/missions/data';
import type { Point, Rect } from '../src/types/models';

const WALKABLE: Rect = { x: 30, y: 190, width: 900, height: 335 };
const DESK: Rect = { x: 360, y: 260, width: 220, height: 64 };

function segmentClear(a: Point, b: Point, blockers: Rect[]): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (blockers.some((r) => intersects(footRect(p), r))) return false;
  }
  return true;
}

describe('yo‘l topish', () => {
  it('to‘siq bo‘lmasa — to‘g‘ri chiziq', () => {
    expect(findPath({ x: 100, y: 450 }, { x: 800, y: 450 }, [DESK], WALKABLE)).toEqual([{ x: 800, y: 450 }]);
  });

  it('stolni aylanib o‘tadi va har bir bo‘lak to‘siqqa tegmaydi', () => {
    const start = { x: 470, y: 420 };
    const goal = { x: 470, y: 215 };
    const path = findPath(start, goal, [DESK], WALKABLE);
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(goal);
    [start, ...path].slice(1).forEach((p, i) => expect(segmentClear(i === 0 ? start : path[i - 1]!, p, [DESK])).toBe(true));
  });

  it('nishon to‘siq ichida bo‘lsa — eng yaqin bo‘sh nuqtagacha boradi', () => {
    const path = findPath({ x: 100, y: 450 }, { x: 470, y: 290 }, [DESK], WALKABLE);
    const end = path[path.length - 1]!;
    expect(intersects(footRect(end), DESK)).toBe(false);
    expect(Math.hypot(end.x - 470, end.y - 290)).toBeLessThan(80);
  });

  it.each(MISSION_LIST.map((m) => [m.id, m] as const))('%s — har bir obyektga spawn nuqtasidan yetib boriladi', (_id, m) => {
    const blockers = m.room.decor.filter((d) => d.solid).map((d) => d.rect);
    for (const h of m.hotspots) {
      const path = findPath(m.room.spawn, h.interactPoint, blockers, m.room.walkable);
      const end = path[path.length - 1]!;
      expect(Math.hypot(end.x - h.interactPoint.x, end.y - h.interactPoint.y), h.id).toBeLessThan(40);
    }
  });
});

describe('tabiiy harakat', () => {
  it('tezlik sakramaydi: bir kadrda cheklangan o‘zgaradi va nishondan oshmaydi', () => {
    expect(approach(0, 180, 900, 1 / 60)).toBeCloseTo(15);
    expect(approach(175, 180, 900, 1 / 60)).toBe(180);
    expect(approach(180, 0, 1200, 1 / 60)).toBeCloseTo(160);
  });

  it('nishonga yaqinlashganda sekinlashadi', () => {
    expect(brakingSpeed(0, 1200)).toBe(0);
    expect(brakingSpeed(4, 1200)).toBeLessThan(brakingSpeed(13, 1200));
    expect(brakingSpeed(13, 1200)).toBeCloseTo(Math.sqrt(2 * 1200 * 13));
  });

  it('qadam tezligi haqiqiy tezlikka bog‘liq — oyoq sirpanmaydi', () => {
    expect(strideRate(0)).toBe(0);
    expect(strideRate(90)).toBeCloseTo(strideRate(180) / 2);
  });
});
