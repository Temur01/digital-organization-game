import { Container, Graphics } from 'pixi.js';
import { IKAT_COLORS } from '../content/characters';
import type { CharacterLook, DecorItem, Direction, HotspotKind, Rect, RoomDefinition } from '../types/models';

const DARK = 0x2b2b2b;

// ---------- Personaj (vaqtinchalik MVP konsepti: flat vektor, kontursiz) ----------

export class CharacterView extends Container {
  private readonly shadow = new Graphics();
  private readonly legL = new Graphics();
  private readonly legR = new Graphics();
  private readonly body = new Graphics();
  private direction: Direction = 'down';
  private phase = 0;

  constructor(private readonly look: CharacterLook) {
    super();
    this.shadow.ellipse(0, 0, 15, 5).fill({ color: 0x000000, alpha: 0.18 });
    this.addChild(this.shadow, this.legL, this.legR, this.body);
    this.drawLegs();
    this.drawBody();
  }

  setDirection(dir: Direction): void {
    if (dir === this.direction) return;
    this.direction = dir;
    this.drawLegs();
    this.drawBody();
  }

  /** moving=false bo‘lsa idle holat */
  animate(dt: number, moving: boolean, reducedMotion: boolean): void {
    if (moving && !reducedMotion) {
      this.phase += dt * 12;
      const s = Math.sin(this.phase);
      this.legL.y = s * 2.5;
      this.legR.y = -s * 2.5;
      this.body.y = -Math.abs(s) * 1.5;
    } else {
      this.phase = 0;
      this.legL.y = 0;
      this.legR.y = 0;
      this.body.y = 0;
    }
  }

  private drawLegs(): void {
    const side = this.direction === 'left' || this.direction === 'right';
    const { bottom, shoes } = this.look;
    for (const [leg, x] of [
      [this.legL, side ? -3 : -5],
      [this.legR, side ? 3 : 5],
    ] as const) {
      leg.clear();
      leg.roundRect(-3.5, -22, 7, 20, 2).fill(bottom);
      leg.roundRect(-4, -4, side ? 10 : 8, 4, 1.5).fill(shoes);
      leg.x = x;
    }
  }

  private drawBody(): void {
    const g = this.body;
    const l = this.look;
    g.clear();
    this.scale.x = this.direction === 'left' ? -1 : 1;

    if (this.direction === 'right' || this.direction === 'left') {
      if (l.hairStyle === 'braid') g.roundRect(-13, -62, 6, 27, 3).fill(l.hair);
      g.roundRect(-10, -53, 20, 33, 6).fill(l.top);
      g.rect(-2, -56, 5, 4).fill(l.skinShade);
      g.roundRect(-2, -50, 6, 24, 2).fill(l.top);
      g.circle(1, -25, 3).fill(l.skin);
      if (l.accent === 'lanyard') {
        g.moveTo(2, -52).lineTo(5, -40).stroke({ width: 1.5, color: IKAT_COLORS[0] });
        g.roundRect(3, -41, 6, 7, 1).fill(0xffffff);
      }
      g.circle(-1, -67, 12.5).fill(l.hair);
      g.ellipse(3, -63, 9, 9.5).fill(l.skin);
      g.rect(-4, -76, 15, 6).fill(l.hair);
      g.circle(7, -64, 1.5).fill(DARK);
      if (l.hairStyle === 'bun') g.circle(-10, -74, 6).fill(l.hair);
      return;
    }

    if (this.direction === 'up') {
      g.roundRect(-17, -50, 5, 24, 2).fill(l.top);
      g.roundRect(12, -50, 5, 24, 2).fill(l.top);
      g.circle(-14.5, -25, 3).fill(l.skin);
      g.circle(14.5, -25, 3).fill(l.skin);
      g.roundRect(-13, -53, 26, 33, 6).fill(l.top);
      g.rect(-3, -56, 6, 4).fill(l.skinShade);
      g.circle(0, -66, 12.5).fill(l.hair);
      if (l.hairStyle === 'braid') {
        g.roundRect(-3, -62, 6, 30, 3).fill(l.hair);
        g.circle(0, -31, 3).fill(IKAT_COLORS[0]);
      }
      if (l.hairStyle === 'bun') g.circle(0, -80, 6).fill(l.hair);
      return;
    }

    // down (old tomondan)
    g.roundRect(-17, -50, 5, 24, 2).fill(l.top);
    g.roundRect(12, -50, 5, 24, 2).fill(l.top);
    g.circle(-14.5, -25, 3).fill(l.skin);
    g.circle(14.5, -25, 3).fill(l.skin);
    g.roundRect(-13, -53, 26, 33, 6).fill(l.top);
    if (l.topInner !== undefined) g.poly([-6, -53, 6, -53, 0, -41]).fill(l.topInner);
    if (l.accent === 'lanyard') {
      // Bo‘yin bog‘ichi atlas (ikat) naqshi bilan
      for (let i = 0; i < 4; i++) {
        const color = IKAT_COLORS[i % IKAT_COLORS.length] ?? DARK;
        g.moveTo(-5 + i * 0.8, -52 + i * 3.5).lineTo(-4.2 + i * 0.8, -48.5 + i * 3.5).stroke({ width: 2, color });
        g.moveTo(5 - i * 0.8, -52 + i * 3.5).lineTo(4.2 - i * 0.8, -48.5 + i * 3.5).stroke({ width: 2, color });
      }
      g.roundRect(-5, -39, 10, 8, 1).fill(0xffffff);
      g.rect(-5, -39, 10, 2).fill(IKAT_COLORS[2] ?? DARK);
    }
    if (l.accent === 'pocket') {
      // Blazer cho‘ntagidagi atlas naqshli ro‘mol
      g.poly([3, -44, 11, -44, 7, -49]).fill(IKAT_COLORS[0] ?? DARK);
      g.poly([5, -44, 9, -44, 7, -47]).fill(IKAT_COLORS[1] ?? DARK);
      g.roundRect(-11, -42, 8, 7, 1).fill(0xffffff);
      g.rect(-11, -42, 8, 2).fill(IKAT_COLORS[3] ?? DARK);
    }
    g.rect(-3, -56, 6, 4).fill(l.skinShade);
    g.circle(0, -68, 12.5).fill(l.hair);
    g.ellipse(0, -63, 10.5, 9.5).fill(l.skin);
    if (l.hairStyle === 'short') g.poly([-11, -70, 4, -74, 11, -68, 11, -75, -9, -77]).fill(l.hair);
    if (l.hairStyle === 'braid') {
      g.poly([-11, -66, 0, -73, 11, -66, 10, -76, -10, -76]).fill(l.hair);
      g.roundRect(8, -62, 6, 26, 3).fill(l.hair);
      g.circle(11, -36, 3).fill(IKAT_COLORS[0] ?? DARK);
    }
    if (l.hairStyle === 'bun') {
      g.poly([-11, -66, 0, -72, 11, -66, 10, -76, -10, -76]).fill(l.hair);
      g.circle(0, -82, 6).fill(l.hair);
    }
    g.circle(-4, -63, 1.6).fill(DARK);
    g.circle(4, -63, 1.6).fill(DARK);
    g.roundRect(-2.5, -58.5, 5, 1.4, 0.7).fill(0x9a5b4a);
  }
}

// ---------- Xona foni va jihozlar ----------

export function drawRoomBackground(g: Graphics, room: RoomDefinition): void {
  const { theme, wallHeight } = room;
  g.clear();
  g.rect(0, 0, 960, wallHeight).fill(theme.wall);
  g.rect(0, wallHeight - 10, 960, 10).fill(theme.wallTrim);
  g.rect(0, wallHeight, 960, 540 - wallHeight).fill(theme.floor);
  for (let y = wallHeight + 30; y < 540; y += 30) {
    g.moveTo(0, y).lineTo(960, y).stroke({ width: 1, color: theme.floorLine });
  }
  if (theme.night) g.rect(0, 0, 960, 540).fill({ color: 0x0b1530, alpha: 0.12 });
}

export function isBackgroundDecor(item: DecorItem): boolean {
  return item.kind === 'window' || item.kind === 'wallArt' || item.kind === 'rug';
}

export function drawDecor(g: Graphics, item: DecorItem, room: RoomDefinition): void {
  const { x, y, width: w, height: h } = item.rect;
  const { theme } = room;
  switch (item.kind) {
    case 'window':
      g.rect(x - 5, y - 5, w + 10, h + 10).fill(theme.wallTrim);
      g.rect(x, y, w, h).fill(theme.window);
      if (theme.night) {
        for (const [sx, sy] of [[0.2, 0.3], [0.6, 0.2], [0.8, 0.6], [0.35, 0.7]] as const) {
          g.circle(x + w * sx, y + h * sy, 1.5).fill(0xfff3c4);
        }
      } else {
        g.poly([x + 10, y + h, x + 40, y, x + 60, y, x + 30, y + h]).fill({ color: 0xffffff, alpha: 0.35 });
      }
      g.rect(x + w / 2 - 2, y, 4, h).fill(theme.wallTrim);
      g.rect(x, y + h / 2 - 2, w, 4).fill(theme.wallTrim);
      break;
    case 'wallArt':
      g.rect(x, y, w, h).fill(0x3d405b);
      g.rect(x + 5, y + 5, w - 10, h - 10).fill(0xf4f1de);
      g.circle(x + w * 0.35, y + h * 0.45, h * 0.2).fill(0xe07a5f);
      g.poly([x + w * 0.45, y + h - 10, x + w * 0.7, y + 15, x + w - 10, y + h - 10]).fill(0x81b29a);
      break;
    case 'rug':
      g.roundRect(x, y, w, h, 10).fill({ color: 0x9c6b7a, alpha: 0.55 });
      g.roundRect(x + 10, y + 10, w - 20, h - 20, 6).stroke({ width: 3, color: 0xf2b134, alpha: 0.6 });
      break;
    case 'cabinet':
      g.rect(x, y, w, h).fill(0x9aa5b1);
      for (let i = 1; i < 3; i++) g.rect(x + 6, y + (h / 3) * i - 2, w - 12, 2).fill(0x7b8794);
      g.rect(x + w / 2 - 6, y + h / 6, 12, 3).fill(0x52606d);
      break;
    case 'desk':
    case 'table': {
      const top = item.kind === 'desk' ? 0xa47148 : 0xb98b5e;
      const front = item.kind === 'desk' ? 0x7f5333 : 0x936a43;
      g.rect(x + 6, y + h - 6, 8, 10).fill(front);
      g.rect(x + w - 14, y + h - 6, 8, 10).fill(front);
      g.rect(x, y, w, h * 0.45).fill(top);
      g.rect(x, y + h * 0.45, w, h * 0.45).fill(front);
      break;
    }
    case 'counter':
      g.rect(x, y, w, h * 0.3).fill(0xe0e6ea);
      g.rect(x, y + h * 0.3, w, h * 0.7).fill(0x3d5a80);
      g.rect(x + 10, y + h * 0.5, w - 20, 4).fill(0x98c1d9);
      break;
    case 'plant':
      g.poly([x + w * 0.2, y + h * 0.55, x + w * 0.8, y + h * 0.55, x + w * 0.7, y + h, x + w * 0.3, y + h]).fill(0xc56b3c);
      g.circle(x + w * 0.5, y + h * 0.3, w * 0.35).fill(0x4c9a5a);
      g.circle(x + w * 0.25, y + h * 0.42, w * 0.25).fill(0x3f8a4d);
      g.circle(x + w * 0.75, y + h * 0.42, w * 0.25).fill(0x5aad69);
      break;
    case 'chair':
      g.roundRect(x, y, w, h, 6).fill(0x3d405b);
      g.rect(x + w / 2 - 2, y + h, 4, 6).fill(0x2b2d42);
      break;
  }
}

// ---------- Interaktiv obyektlar ----------

export function drawHotspot(g: Graphics, kind: HotspotKind, b: Rect, night: boolean): void {
  const { x, y, width: w, height: h } = b;
  switch (kind) {
    case 'computer':
    case 'note': {
      const screenH = h - 14;
      g.rect(x + w / 2 - 4, y + screenH, 8, 10).fill(0x3a3d4d);
      g.roundRect(x + w / 2 - 14, y + h - 5, 28, 5, 2).fill(0x3a3d4d);
      g.roundRect(x, y, w, screenH, 4).fill(0x2b2d42);
      g.rect(x + 4, y + 4, w - 8, screenH - 8).fill(night ? 0xbde0fe : 0x8ecae6);
      g.rect(x + 8, y + 9, w * 0.5, 3).fill({ color: 0xffffff, alpha: 0.8 });
      g.rect(x + 8, y + 15, w * 0.35, 3).fill({ color: 0xffffff, alpha: 0.6 });
      if (kind === 'note') {
        g.rect(x + w - 18, y + 2, 16, 16).fill(0xffd166);
        g.rect(x + w - 15, y + 7, 10, 1.5).fill(0x6b5b2e);
        g.rect(x + w - 15, y + 11, 8, 1.5).fill(0x6b5b2e);
      }
      break;
    }
    case 'phone':
      g.roundRect(x + 4, y + 2, w - 8, h - 4, 4).fill(0x22223b);
      g.roundRect(x + 7, y + 5, w - 14, h - 10, 2).fill(night ? 0xcaf0f8 : 0x9bf6ff);
      break;
    case 'device':
      g.ellipse(x + w / 2, y + h - 2, w / 2, 4).fill({ color: 0x000000, alpha: 0.15 });
      g.roundRect(x + 4, y + 6, w - 14, h - 10, 3).fill(0x3a86ff);
      g.rect(x + w - 10, y + 9, 8, h - 16).fill(0xc0c4cc);
      g.rect(x + 8, y + 9, 10, 5).fill(0xffd166);
      break;
    case 'poster':
      g.rect(x, y, w, h).fill(0xffffff);
      g.rect(x, y, w, h).stroke({ width: 2, color: 0x9aa5b1 });
      g.rect(x, y, w, 20).fill(0xd1495b);
      for (let i = 0; i < 5; i++) g.rect(x + 10, y + 32 + i * 12, w - 20 - (i % 2) * 14, 4).fill(0x9aa5b1);
      break;
    case 'door':
      g.rect(x - 6, y - 6, w + 12, h + 6).fill(0x6d4c41);
      g.rect(x, y, w, h).fill(0x8d6e63);
      g.rect(x + 10, y + 12, w - 20, h * 0.35).fill(0x795548);
      g.rect(x + 10, y + h * 0.55, w - 20, h * 0.35).fill(0x795548);
      g.circle(x + w - 14, y + h * 0.5, 4).fill(0xf2b134);
      g.rect(x + w / 2 - 18, y - 22, 36, 12).fill(0x3d5a80);
      break;
    case 'box':
      g.rect(x, y + 8, w, h - 8).fill(0xd4a373);
      g.rect(x - 3, y + 4, w + 6, 8).fill(0xc08552);
      g.rect(x + 8, y + 18, w - 16, 12).fill(0x3d5a80);
      g.rect(x + 14, y + 22, w - 28, 4).fill(0xffffff);
      break;
    case 'npc':
      break;
  }
}

/** Badge: hal qilingan obyekt uchun yashil belgi */
export function drawDoneBadge(g: Graphics, b: Rect): void {
  const cx = b.x + b.width;
  const cy = b.y;
  g.circle(cx, cy, 9).fill(0x2a9d8f);
  g.moveTo(cx - 4, cy).lineTo(cx - 1, cy + 3).lineTo(cx + 4, cy - 3).stroke({ width: 2.5, color: 0xffffff });
}

/** Ba’zi obyektlar stol ustida turadi — ularni stoldan yuqoriroq chizish uchun */
export function hotspotZ(kind: HotspotKind, b: Rect): number {
  if (kind === 'poster' || kind === 'door') return -1000;
  if (kind === 'device') return -500;
  if (kind === 'npc') return b.y + b.height;
  return b.y + b.height + 60;
}
