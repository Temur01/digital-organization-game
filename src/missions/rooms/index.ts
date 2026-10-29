import type { RoomDefinition, RoomTheme } from '../../types/models';

/** Mantiqiy o‘lcham: 960×540. Devor yuqorida, pol pastda. */
const WALL = 170;
const WALKABLE = { x: 30, y: 190, width: 900, height: 335 };

const dayTheme: RoomTheme = {
  wall: 0xe7ecef,
  wallTrim: 0xc9d3da,
  floor: 0xd8c7ae,
  floorLine: 0xc9b597,
  window: 0xbfe3f5,
};

const nightTheme: RoomTheme = {
  wall: 0x56627a,
  wallTrim: 0x434e63,
  floor: 0x8a7d6c,
  floorLine: 0x7a6e5f,
  window: 0x1d2a4a,
  night: true,
};

export const officeRoom: RoomDefinition = {
  id: 'office',
  theme: dayTheme,
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 200, y: 450 },
  decor: [
    { kind: 'window', rect: { x: 400, y: 30, width: 150, height: 95 } },
    { kind: 'window', rect: { x: 580, y: 30, width: 150, height: 95 } },
    { kind: 'cabinet', rect: { x: 40, y: 160, width: 70, height: 100 }, solid: true },
    { kind: 'rug', rect: { x: 330, y: 360, width: 280, height: 120 } },
    { kind: 'desk', rect: { x: 360, y: 260, width: 220, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 450, y: 330, width: 40, height: 26 } },
    { kind: 'desk', rect: { x: 660, y: 380, width: 200, height: 64 }, solid: true },
    { kind: 'plant', rect: { x: 60, y: 430, width: 44, height: 70 }, solid: true },
    { kind: 'plant', rect: { x: 880, y: 250, width: 40, height: 60 }, solid: true },
  ],
};

export const lobbyRoom: RoomDefinition = {
  id: 'lobby',
  theme: dayTheme,
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 110, y: 470 },
  decor: [
    { kind: 'window', rect: { x: 360, y: 30, width: 150, height: 95 } },
    { kind: 'wallArt', rect: { x: 560, y: 45, width: 90, height: 70 } },
    { kind: 'counter', rect: { x: 80, y: 250, width: 240, height: 70 }, solid: true },
    { kind: 'table', rect: { x: 600, y: 250, width: 110, height: 40 }, solid: true },
    { kind: 'rug', rect: { x: 380, y: 360, width: 220, height: 130 } },
    { kind: 'desk', rect: { x: 750, y: 330, width: 180, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 820, y: 400, width: 40, height: 26 } },
    { kind: 'plant', rect: { x: 340, y: 210, width: 40, height: 60 }, solid: true },
  ],
};

export const nightOfficeRoom: RoomDefinition = {
  id: 'office-night',
  theme: nightTheme,
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 220, y: 450 },
  decor: [
    { kind: 'window', rect: { x: 400, y: 30, width: 150, height: 95 } },
    { kind: 'window', rect: { x: 580, y: 30, width: 150, height: 95 } },
    { kind: 'cabinet', rect: { x: 40, y: 160, width: 70, height: 100 }, solid: true },
    { kind: 'rug', rect: { x: 330, y: 360, width: 280, height: 120 } },
    { kind: 'desk', rect: { x: 360, y: 260, width: 220, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 450, y: 330, width: 40, height: 26 } },
    { kind: 'desk', rect: { x: 660, y: 380, width: 200, height: 64 }, solid: true },
    { kind: 'plant', rect: { x: 60, y: 430, width: 44, height: 70 }, solid: true },
  ],
};
