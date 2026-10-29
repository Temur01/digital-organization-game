import type { Direction, Point, Rect, RoomDefinition } from '../../types/models';

/**
 * Missiya ma’lumotlari mantiqiy 2D koordinatalarda (960×540): yuqorida devor, pastda pol.
 * O‘yin mantig‘i (yurish, to‘qnashuv) shu koordinatalarda qoladi; bu modul ularni 3D metrga o‘giradi.
 */
export const PX_PER_M = 80;
export const DEPTH_SCALE = 1.5;
export const WALL_HEIGHT_M = 3.4;
export const ROOM_HALF_W = 480 / PX_PER_M; // 6 m

export const toX = (x: number) => (x - 480) / PX_PER_M;
export const toZ = (y: number, room: RoomDefinition) => ((y - room.wallHeight) / PX_PER_M) * DEPTH_SCALE;
export const fromX = (X: number) => X * PX_PER_M + 480;
export const fromZ = (Z: number, room: RoomDefinition) => (Z / DEPTH_SCALE) * PX_PER_M + room.wallHeight;
/** Devordagi narsalar: 2D y (0…wallHeight) → balandlik (m) */
export const wallY = (y: number, room: RoomDefinition) => ((room.wallHeight - y) / room.wallHeight) * WALL_HEIGHT_M;
export const floorDepth = (room: RoomDefinition) => toZ(540, room);

// ---------- 2D harakat mantig‘i ----------

export const FOOT = { w: 24, h: 12 };

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function footRect(p: Point): Rect {
  return { x: p.x - FOOT.w / 2, y: p.y - FOOT.h, width: FOOT.w, height: FOOT.h };
}

export function clampToWalkable(p: Point, room: RoomDefinition): Point {
  const w = room.walkable;
  return {
    x: Math.min(Math.max(p.x, w.x + FOOT.w / 2), w.x + w.width - FOOT.w / 2),
    y: Math.min(Math.max(p.y, w.y + FOOT.h), w.y + w.height),
  };
}

export function faceFrom(dx: number, dy: number): Direction {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}
