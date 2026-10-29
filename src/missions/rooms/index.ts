import type { RoomDefinition, RoomTheme } from '../../types/models';

/**
 * Mantiqiy o‘lcham: 960×540. Devor yuqorida, pol pastda.
 * Har bir missiya o‘z joyida o‘tadi — pol materiali, devor ranglari, jihozlar va kompyuter turi farq qiladi.
 */
const WALL = 170;
const WALKABLE = { x: 30, y: 190, width: 900, height: 335 };

const base: Pick<RoomTheme, 'wall' | 'wallTrim' | 'floor' | 'floorLine' | 'window'> = {
  wall: 0xe7ecef,
  wallTrim: 0xc9d3da,
  floor: 0xd8c7ae,
  floorLine: 0xc9b597,
  window: 0xbfe3f5,
};

/** 1-missiya: yorug‘ ochiq ofis — eman pol, adaçayı yashil aksent, katta o‘simliklar */
export const officeRoom: RoomDefinition = {
  id: 'office',
  theme: { ...base, floorStyle: 'oak', wallColor: '#e3e7e0', accent: 0x4f8a6b, wainscot: null, computer: 'monitor' },
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 200, y: 450 },
  decor: [
    { kind: 'window', rect: { x: 400, y: 30, width: 150, height: 95 } },
    { kind: 'window', rect: { x: 580, y: 30, width: 150, height: 95 } },
    { kind: 'cabinet', rect: { x: 40, y: 160, width: 70, height: 100 }, solid: true },
    { kind: 'clock', rect: { x: 290, y: 48, width: 46, height: 46 } },
    { kind: 'shelf', rect: { x: 745, y: 86, width: 74, height: 84 } },
    { kind: 'pendant', rect: { x: 420, y: 282, width: 20, height: 20 } },
    { kind: 'pendant', rect: { x: 510, y: 282, width: 20, height: 20 } },
    { kind: 'cooler', rect: { x: 296, y: 176, width: 34, height: 74 }, solid: true },
    { kind: 'rug', rect: { x: 330, y: 360, width: 280, height: 120 } },
    { kind: 'desk', rect: { x: 360, y: 260, width: 220, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 450, y: 330, width: 40, height: 26 } },
    { kind: 'desk', rect: { x: 660, y: 380, width: 200, height: 64 }, solid: true },
    { kind: 'monstera', rect: { x: 55, y: 430, width: 50, height: 75 }, solid: true },
    { kind: 'monstera', rect: { x: 878, y: 245, width: 44, height: 65 }, solid: true },
  ],
};

/** 2-missiya: qabulxona — tosh plitka, terrakota aksent, panoramali deraza va divan */
export const lobbyRoom: RoomDefinition = {
  id: 'lobby',
  theme: { ...base, floorStyle: 'stone', wallColor: '#e7ddd0', accent: 0xc0714f, wainscot: null, computer: 'allInOne' },
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 110, y: 470 },
  decor: [
    { kind: 'window', rect: { x: 330, y: 25, width: 210, height: 105 } },
    { kind: 'wallArt', rect: { x: 570, y: 45, width: 90, height: 70 } },
    { kind: 'clock', rect: { x: 250, y: 46, width: 46, height: 46 } },
    { kind: 'shelf', rect: { x: 690, y: 86, width: 74, height: 84 } },
    { kind: 'pendant', rect: { x: 150, y: 290, width: 20, height: 20 } },
    { kind: 'pendant', rect: { x: 250, y: 290, width: 20, height: 20 } },
    { kind: 'cooler', rect: { x: 880, y: 186, width: 34, height: 74 }, solid: true },
    { kind: 'counter', rect: { x: 80, y: 250, width: 240, height: 70 }, solid: true },
    { kind: 'table', rect: { x: 600, y: 250, width: 110, height: 40 }, solid: true },
    { kind: 'rug', rect: { x: 380, y: 360, width: 220, height: 130 } },
    { kind: 'desk', rect: { x: 750, y: 330, width: 180, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 820, y: 400, width: 40, height: 26 } },
    { kind: 'sofa', rect: { x: 600, y: 462, width: 200, height: 55 }, solid: true },
    { kind: 'monstera', rect: { x: 336, y: 205, width: 48, height: 65 }, solid: true },
  ],
};

/** 3-missiya: tungi ofis — gilam, to‘q ko‘k devor, shahar chiroqlari va stol chiroqlari */
export const nightOfficeRoom: RoomDefinition = {
  id: 'office-night',
  theme: {
    wall: 0x56627a,
    wallTrim: 0x434e63,
    floor: 0x8a7d6c,
    floorLine: 0x7a6e5f,
    window: 0x1d2a4a,
    night: true,
    floorStyle: 'carpet',
    wallColor: '#3b4660',
    accent: 0x7589c7,
    wainscot: 0x2c3449,
    computer: 'laptop',
  },
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 220, y: 450 },
  decor: [
    { kind: 'window', rect: { x: 390, y: 25, width: 160, height: 105 } },
    { kind: 'window', rect: { x: 570, y: 25, width: 160, height: 105 } },
    { kind: 'cabinet', rect: { x: 40, y: 160, width: 70, height: 100 }, solid: true },
    { kind: 'clock', rect: { x: 290, y: 48, width: 46, height: 46 } },
    { kind: 'shelf', rect: { x: 745, y: 86, width: 74, height: 84 } },
    { kind: 'cooler', rect: { x: 296, y: 176, width: 34, height: 74 }, solid: true },
    { kind: 'desk', rect: { x: 360, y: 260, width: 220, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 450, y: 330, width: 40, height: 26 } },
    { kind: 'desk', rect: { x: 660, y: 380, width: 200, height: 64 }, solid: true },
    { kind: 'monstera', rect: { x: 55, y: 430, width: 50, height: 75 }, solid: true },
  ],
};

/** 4-missiya: ish joyi + kofe burchagi — terrazzo pol, iliq xantal aksent */
export const coffeeRoom: RoomDefinition = {
  id: 'coffee',
  theme: { ...base, floorStyle: 'terrazzo', wallColor: '#eadfcf', accent: 0xd08c3a, wainscot: null, computer: 'laptop' },
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 420, y: 470 },
  decor: [
    { kind: 'window', rect: { x: 330, y: 30, width: 150, height: 95 } },
    { kind: 'clock', rect: { x: 230, y: 46, width: 46, height: 46 } },
    { kind: 'wallArt', rect: { x: 520, y: 45, width: 90, height: 70 } },
    { kind: 'pendant', rect: { x: 220, y: 302, width: 20, height: 20 } },
    { kind: 'desk', rect: { x: 120, y: 280, width: 220, height: 64 }, solid: true },
    { kind: 'chair', rect: { x: 210, y: 350, width: 40, height: 26 } },
    { kind: 'kitchen', rect: { x: 640, y: 175, width: 250, height: 75 }, solid: true },
    { kind: 'fridge', rect: { x: 895, y: 172, width: 42, height: 88 }, solid: true },
    { kind: 'bistro', rect: { x: 540, y: 390, width: 110, height: 50 }, solid: true },
    { kind: 'rug', rect: { x: 300, y: 400, width: 200, height: 100 } },
    { kind: 'monstera', rect: { x: 45, y: 440, width: 50, height: 70 }, solid: true },
    { kind: 'monstera', rect: { x: 878, y: 440, width: 50, height: 70 }, solid: true },
  ],
};

/** 5-missiya: majlis xonasi — gilam, akustik reykalar, shisha devor, bayram sharlari va televizor */
export const meetingRoom: RoomDefinition = {
  id: 'meeting',
  theme: { ...base, floorStyle: 'carpet', wallColor: '#e6e2dc', accent: 0x8b5cf6, wainscot: null },
  wallHeight: WALL,
  walkable: WALKABLE,
  spawn: { x: 470, y: 470 },
  decor: [
    { kind: 'slats', rect: { x: 40, y: 25, width: 90, height: 145 } },
    { kind: 'window', rect: { x: 270, y: 30, width: 170, height: 95 } },
    { kind: 'tv', rect: { x: 470, y: 40, width: 170, height: 92 } },
    { kind: 'glassWall', rect: { x: 670, y: 20, width: 260, height: 150 } },
    { kind: 'meetingTable', rect: { x: 330, y: 236, width: 300, height: 84 }, solid: true },
    { kind: 'balloons', rect: { x: 668, y: 198, width: 40, height: 30 } },
    { kind: 'balloons', rect: { x: 880, y: 205, width: 40, height: 30 } },
    { kind: 'monstera', rect: { x: 40, y: 430, width: 50, height: 80 }, solid: true },
    { kind: 'monstera', rect: { x: 880, y: 420, width: 50, height: 80 }, solid: true },
  ],
};
