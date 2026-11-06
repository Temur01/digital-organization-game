import { describe, expect, it } from 'vitest';
import { FrameGovernor, qualityLadder, shouldRenderFrame } from '../src/game/three/quality';

const feed = (g: FrameGovernor, dt: number, n: number) => {
  let changed = 0;
  for (let i = 0; i < n; i++) if (g.sample(dt)) changed++;
  return changed;
};

describe('sifat zinapoyasi', () => {
  it('avval bloom o‘chadi, keyin aniqlik pasayadi', () => {
    const ladder = qualityLadder(2);
    expect(ladder[0]).toEqual({ pixelRatio: 2, bloom: true });
    expect(ladder[1]).toEqual({ pixelRatio: 2, bloom: false });
    expect(ladder[ladder.length - 1]!.pixelRatio).toBeLessThan(2);
    ladder.slice(1).forEach((l) => expect(l.bloom).toBe(false));
  });

  it('takroriy pog‘ona bo‘lmaydi', () => {
    const ladder = qualityLadder(1);
    expect(new Set(ladder.map((l) => JSON.stringify(l))).size).toBe(ladder.length);
  });
});

describe('kadr nazoratchisi', () => {
  it('60 fps da sifat o‘zgarmaydi', () => {
    const g = new FrameGovernor(qualityLadder(2));
    expect(feed(g, 1 / 60, 600)).toBe(0);
    expect(g.current).toEqual({ pixelRatio: 2, bloom: true });
  });

  it('barqaror sekinlikda sifat pasayadi', () => {
    const g = new FrameGovernor(qualityLadder(2));
    expect(feed(g, 1 / 25, 90)).toBeGreaterThan(0);
    expect(g.current.bloom).toBe(false);
  });

  it('bir martalik uzilish (yorliq almashishi) hisobga olinmaydi', () => {
    const g = new FrameGovernor(qualityLadder(2));
    for (let i = 0; i < 20; i++) {
      g.sample(2);
      feed(g, 1 / 60, 10);
    }
    expect(g.current.bloom).toBe(true);
  });

  it('eng past pog‘onadan pastga tushmaydi', () => {
    const ladder = qualityLadder(2);
    const g = new FrameGovernor(ladder);
    feed(g, 1 / 10, 5000);
    expect(g.current).toEqual(ladder[ladder.length - 1]);
  });
});

describe('kutish rejimi', () => {
  it('oyna ochiq (kutish) bo‘lsa — sekundiga ~10 kadr', () => {
    expect(shouldRenderFrame({ idle: true, sinceLastRender: 0.02 })).toBe(false);
    expect(shouldRenderFrame({ idle: true, sinceLastRender: 0.11 })).toBe(true);
  });
  it('faol o‘yinda har kadr chiziladi', () => {
    expect(shouldRenderFrame({ idle: false, sinceLastRender: 0.001 })).toBe(true);
  });
});
