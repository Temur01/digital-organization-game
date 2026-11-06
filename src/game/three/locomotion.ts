import type { Point, Rect } from '../../types/models';
import { FOOT, footRect, intersects } from './space';

/** Asosiy yurish tezligi, mantiqiy px/s */
export const WALK_SPEED = 180;
export const ACCELERATION = 900;
export const DECELERATION = 1200;
/** Yurish varag‘i kadrlari soniyasiga (WALK_SPEED da) */
const WALK_FPS = 11;
const CELL = 16;

/** Qiymatni nishon tomon `rate` tezlikda suradi; nishondan oshmaydi. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  const step = rate * dt;
  if (Math.abs(target - current) <= step) return target;
  return current + Math.sign(target - current) * step;
}

/** `distance` masofada to‘xtab ulgurish mumkin bo‘lgan eng katta tezlik */
export function brakingSpeed(distance: number, deceleration: number): number {
  return Math.sqrt(2 * deceleration * Math.max(0, distance));
}

/** Kadr almashish tezligi haqiqiy tezlikka bog‘liq — oyoq poldan sirpanmaydi */
export function strideRate(speed: number): number {
  return (WALK_FPS * speed) / WALK_SPEED;
}

interface Grid {
  cols: number;
  rows: number;
  center(col: number, row: number): Point;
  free: Uint8Array;
}

function isFree(p: Point, blockers: readonly Rect[], walkable: Rect): boolean {
  if (p.x < walkable.x + FOOT.w / 2 || p.x > walkable.x + walkable.width - FOOT.w / 2) return false;
  if (p.y < walkable.y + FOOT.h || p.y > walkable.y + walkable.height) return false;
  const foot = footRect(p);
  return !blockers.some((b) => intersects(foot, b));
}

function lineClear(a: Point, b: Point, blockers: readonly Rect[], walkable: Rect): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isFree({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, blockers, walkable)) return false;
  }
  return true;
}

function buildGrid(blockers: readonly Rect[], walkable: Rect): Grid {
  const cols = Math.floor(walkable.width / CELL) + 1;
  const rows = Math.floor(walkable.height / CELL) + 1;
  const center = (col: number, row: number): Point => ({ x: walkable.x + col * CELL, y: walkable.y + row * CELL });
  const free = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) if (isFree(center(col, row), blockers, walkable)) free[row * cols + col] = 1;
  }
  return { cols, rows, center, free };
}

function nearestFreeCell(grid: Grid, p: Point): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < grid.free.length; i++) {
    if (!grid.free[i]) continue;
    const c = grid.center(i % grid.cols, Math.floor(i / grid.cols));
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

function searchCells(grid: Grid, from: number, to: number): number[] | null {
  const { cols, rows, free } = grid;
  const cost = new Float64Array(free.length).fill(Infinity);
  const parent = new Int32Array(free.length).fill(-1);
  const closed = new Uint8Array(free.length);
  const goal = grid.center(to % cols, Math.floor(to / cols));
  const estimate = (i: number) => {
    const c = grid.center(i % cols, Math.floor(i / cols));
    return Math.hypot(c.x - goal.x, c.y - goal.y);
  };
  const open = [from];
  cost[from] = 0;
  while (open.length > 0) {
    let bestAt = 0;
    for (let k = 1; k < open.length; k++) {
      if (cost[open[k]!]! + estimate(open[k]!) < cost[open[bestAt]!]! + estimate(open[bestAt]!)) bestAt = k;
    }
    const current = open.splice(bestAt, 1)[0]!;
    if (current === to) {
      const cells = [current];
      while (parent[cells[0]!]! >= 0) cells.unshift(parent[cells[0]!]!);
      return cells;
    }
    closed[current] = 1;
    const col = current % cols;
    const row = Math.floor(current / cols);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nc = col + dx;
        const nr = row + dy;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const next = nr * cols + nc;
        // Burchakni kesib o‘tmaslik uchun qo‘shni kataklar ham bo‘sh bo‘lishi kerak
        if (!free[next] || closed[next] || !free[row * cols + nc] || !free[nr * cols + col]) continue;
        const nextCost = cost[current]! + Math.hypot(dx, dy) * CELL;
        if (nextCost < cost[next]!) {
          if (cost[next] === Infinity) open.push(next);
          cost[next] = nextCost;
          parent[next] = current;
        }
      }
    }
  }
  return null;
}

/**
 * Oyoq to‘rtburchagi to‘siqlarga tegmaydigan yo‘l (A*, so‘ng keraksiz burilishlar olib tashlanadi).
 * Qaytaradi: boshlang‘ich nuqtasiz yo‘l nuqtalari. Yo‘l topilmasa — to‘g‘ridan-to‘g‘ri nishon.
 */
export function findPath(start: Point, goal: Point, blockers: readonly Rect[], walkable: Rect): Point[] {
  if (lineClear(start, goal, blockers, walkable)) return [goal];
  const grid = buildGrid(blockers, walkable);
  const from = nearestFreeCell(grid, start);
  const to = nearestFreeCell(grid, goal);
  if (from < 0 || to < 0) return [goal];
  const cells = searchCells(grid, from, to);
  if (!cells) return [goal];

  const points = cells.map((i) => grid.center(i % grid.cols, Math.floor(i / grid.cols)));
  const end = points[points.length - 1]!;
  if (lineClear(end, goal, blockers, walkable)) points.push(goal);

  // Ko‘rinib turgan eng uzoq nuqtaga to‘g‘ri yuriladi — zinapoyasimon yurish bo‘lmaydi
  const out: Point[] = [];
  let anchor = start;
  let i = 0;
  while (i < points.length) {
    let far = i;
    for (let k = points.length - 1; k > i; k--) {
      if (lineClear(anchor, points[k]!, blockers, walkable)) {
        far = k;
        break;
      }
    }
    out.push(points[far]!);
    anchor = points[far]!;
    i = far + 1;
  }
  return out;
}
