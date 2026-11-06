import * as THREE from 'three';
import type { Character, Direction } from '../../types/models';
import { cleanSingle, extractFrames, loadImage, type Frame } from './spriteSheet';
import { strideRate, WALK_SPEED } from './locomotion';
import * as tex from './textures';

const HEIGHT_M = 1.72;
/** Sekin qadamlarda ham oyoqlar harakatlanib tursin (px/s) */
const MIN_STRIDE_SPEED = 70;
const MOVING_SPEED = 6;
const BOB_M = 0.035;
const LEAN_RAD = 0.075;
const STRIDE_FRAMES = 8;

export interface RigMotion {
  /** Haqiqiy tezlik, px/s */
  speed: number;
  /** Gorizontal tezlik, px/s (chapga — manfiy) */
  lateral: number;
}

interface RigArt {
  idle: HTMLCanvasElement;
  frames: Frame[];
}

/** Piksel tahlili qimmat: har qahramon uchun bir marta bajariladi (qayta boshlash tez bo‘ladi) */
const artCache = new Map<string, Promise<RigArt>>();

function loadArt(character: Character): Promise<RigArt> {
  const cached = artCache.get(character.id);
  if (cached) return cached;
  const pending = Promise.all([
    loadImage(character.art),
    loadImage(character.walkSheet).catch((err: unknown) => {
      console.warn('[scene] yurish kadrlari yuklanmadi', err);
      return null;
    }),
  ]).then(([idleImg, sheetImg]) => ({ idle: cleanSingle(idleImg), frames: sheetImg ? extractFrames(sheetImg) : [] }));
  artCache.set(character.id, pending);
  pending.catch(() => artCache.delete(character.id));
  return pending;
}

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

function canvasTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function spriteMaterial(map: THREE.Texture, tint: number) {
  return new THREE.MeshBasicMaterial({ map, color: tint, alphaTest: 0.08, alphaToCoverage: true, side: THREE.DoubleSide });
}

/**
 * Illyustratsiyali qahramon (billboard):
 * - turganda — old ko‘rinishdagi rasm (src/assets/characters/{bek,guli}.png), yengil nafas olish bilan;
 * - yurganda — yurish sikli kadrlari (src/assets/characters/*-walk.png), chapga yurganda ko‘zgulanadi.
 */
export class CharacterRig {
  readonly root = new THREE.Group();
  private readonly figure = new THREE.Group();
  private readonly idle: THREE.Mesh;
  private readonly walk: THREE.Mesh | null;
  private readonly walkTextures: THREE.Texture[];
  private readonly shadow: THREE.Mesh;
  private readonly emote: THREE.Sprite;
  private readonly materials: THREE.MeshBasicMaterial[] = [];
  private walkPhase = 0;
  private frameIndex = -1;
  private walkBlend = 0;
  private time = Math.random() * 10;
  private hopLeft = 0;
  private emoteLeft = 0;
  private emoteAge = 0;
  private flip = 1;
  private facing = 1;
  private lean = 0;
  private settle = 0;
  private wasWalking = false;

  private constructor(idleCanvas: HTMLCanvasElement, frames: Frame[], tint: number) {
    // Turish holati
    const idleMat = spriteMaterial(canvasTexture(idleCanvas), tint);
    this.materials.push(idleMat);
    const idleW = (HEIGHT_M * idleCanvas.width) / idleCanvas.height;
    this.idle = new THREE.Mesh(new THREE.PlaneGeometry(idleW, HEIGHT_M), idleMat);
    this.idle.geometry.translate(0, HEIGHT_M / 2, 0);

    // Yurish holati: barcha kadrlar bir xil katakda, masshtab — figuraning o‘rtacha balandligi bo‘yicha
    this.walkTextures = frames.map((f) => canvasTexture(f.canvas));
    if (frames.length > 0) {
      const heights = frames.map((f) => f.contentHeight).sort((a, b) => a - b);
      const median = heights[Math.floor(heights.length / 2)]!;
      const k = HEIGHT_M / median;
      const cell = frames[0]!.canvas;
      const walkMat = spriteMaterial(this.walkTextures[0]!, tint);
      this.materials.push(walkMat);
      this.walk = new THREE.Mesh(new THREE.PlaneGeometry(cell.width * k, cell.height * k), walkMat);
      this.walk.geometry.translate(0, (cell.height * k) / 2, 0);
      this.walk.visible = false;
      this.figure.add(this.walk);
    } else {
      this.walk = null;
    }
    this.figure.add(this.idle);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 28),
      new THREE.MeshBasicMaterial({ map: tex.radialGlow('0,0,0'), transparent: true, opacity: 0.5, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.012;
    this.shadow.scale.set(1, 0.55, 1);

    this.emote = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xe6e6e6, transparent: true, depthTest: false }));
    this.emote.position.y = HEIGHT_M + 0.45;
    this.emote.visible = false;
    this.emote.renderOrder = 10;

    this.root.add(this.shadow, this.figure, this.emote);
  }

  static async create(character: Character, tint: number): Promise<CharacterRig> {
    const art = await loadArt(character);
    return new CharacterRig(art.idle, art.frames, tint);
  }

  /** Teksturalarni oldindan GPU ga yuklaydi — birinchi qadamda «qotish» bo‘lmaydi */
  uploadTextures(renderer: THREE.WebGLRenderer): void {
    this.walkTextures.forEach((t) => renderer.initTexture(t));
  }

  setDirection(dir: Direction): void {
    if (dir === 'left') this.flip = -1;
    if (dir === 'right') this.flip = 1;
  }

  playInteract(): void {
    this.hopLeft = 0.42;
  }

  showEmote(symbol: string, seconds = 1.8): void {
    this.emote.material.map = tex.emojiBubble(symbol);
    this.emote.material.needsUpdate = true;
    this.emoteLeft = seconds;
    this.emoteAge = 0;
    this.emote.visible = true;
  }

  /** Yurish varag‘i bormi (bo‘lmasa qadam tovushi vaqt bo‘yicha) */
  get hasWalkCycle(): boolean {
    return this.walk !== null && this.walkTextures.length > 0;
  }

  /**
   * Har kadr. Qaytaradi: shu kadrda oyoq polga tegdimi (qadam tovushi animatsiya bilan sinxron chalinishi uchun).
   * `contactFrames` — yurish varag‘idagi oyoq tegish kadrlari.
   */
  animate(dt: number, motion: RigMotion, reducedMotion: boolean, camera: THREE.Camera, contactFrames: readonly number[] = []): boolean {
    let stepped = false;
    this.time += dt;
    const moving = motion.speed > MOVING_SPEED;
    const pace = Math.min(1, motion.speed / WALK_SPEED);
    // Billboard: faqat vertikal o‘q atrofida kameraga buriladi
    const dx = camera.position.x - this.root.position.x;
    const dz = camera.position.z - this.root.position.z;
    this.figure.rotation.y = Math.atan2(dx, dz);

    // Harakat yo‘nalishiga engashish; to‘xtaganda yumshoq qaytadi
    const leanTarget = reducedMotion ? 0 : (-motion.lateral / WALK_SPEED) * LEAN_RAD;
    this.lean = damp(this.lean, leanTarget, 9, dt);
    this.figure.rotation.z = this.lean;

    // To‘xtaganda 0.12 s kutib turish holatiga o‘tadi (qadamlar orasida «lip» qilmasin)
    this.walkBlend = moving ? 0.12 : Math.max(0, this.walkBlend - dt);
    const walking = this.walk !== null && this.walkBlend > 0;
    if (this.wasWalking && !walking && !reducedMotion) this.settle = 1;
    this.wasWalking = walking;
    this.idle.visible = !walking;
    if (this.walk) this.walk.visible = walking;

    let bob = 0;
    if (walking && this.walk) {
      this.walkPhase += dt * strideRate(Math.max(motion.speed, MIN_STRIDE_SPEED));
      const index = Math.floor(this.walkPhase) % this.walkTextures.length;
      if (index !== this.frameIndex) {
        this.frameIndex = index;
        // To‘xtash paytidagi «so‘nish» (walkBlend) qadamlari sanalmaydi — faqat haqiqiy harakat
        stepped = moving && contactFrames.includes(index);
        (this.walk.material as THREE.MeshBasicMaterial).map = this.walkTextures[index]!;
      }
      // Burilish: chapdan o‘ngga bir lahzada emas, qisqa «aylanish» bilan
      this.facing = reducedMotion ? this.flip : damp(this.facing, this.flip, 16, dt);
      this.walk.scale.x = Math.abs(this.facing) < 0.14 ? 0.14 * this.flip : this.facing;
      // Oyoq tegish kadrlarida (0 va 4) gavda eng pastda, oralig‘ida eng yuqorida
      if (!reducedMotion) bob = Math.abs(Math.sin((this.walkPhase / STRIDE_FRAMES) * Math.PI * 2)) * BOB_M * pace;
      this.walk.scale.y = reducedMotion ? 1 : 1 + (bob / BOB_M) * 0.012;
      this.idle.scale.set(1, 1, 1);
      this.idle.rotation.z = 0;
    } else {
      this.walkPhase = 0;
      this.frameIndex = -1;
      this.facing = this.flip;
      // To‘xtash: og‘irlik oyoqqa tushadi — qisqa, so‘nuvchi cho‘kish
      this.settle = Math.max(0, this.settle - dt * 3.6);
      const squash = Math.sin(this.settle * Math.PI) * 0.028;
      this.idle.scale.y = reducedMotion ? 1 : 1 + Math.sin(this.time * 2.2) * 0.008 - squash;
      this.idle.scale.x = 1 + squash * 0.7;
      this.idle.rotation.z = reducedMotion ? 0 : Math.sin(this.time * 0.9) * 0.008;
    }
    // Soya: gavda ko‘tarilganda kichrayadi va xiralashadi
    const lift = bob / BOB_M;
    this.shadow.scale.set(1 + pace * 0.12 - lift * 0.05, 0.55 - lift * 0.03, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 - lift * 0.08;

    let hop = 0;
    if (this.hopLeft > 0 && !reducedMotion) {
      this.hopLeft -= dt;
      const t = 1 - Math.max(0, this.hopLeft) / 0.42;
      hop = Math.sin(t * Math.PI) * 0.12;
    }
    this.figure.position.y = hop + bob;

    if (this.emoteLeft > 0) {
      this.emoteLeft -= dt;
      this.emoteAge += dt;
      const t = Math.min(1, this.emoteAge / 0.3);
      const pop = reducedMotion ? 1 : 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
      this.emote.scale.set(0.62 * pop, 0.66 * pop, 1);
      this.emote.position.y = HEIGHT_M + 0.45 + hop + (reducedMotion ? 0 : Math.sin(this.emoteAge * 4) * 0.03);
      this.emote.material.opacity = Math.min(1, this.emoteLeft / 0.3);
      if (this.emoteLeft <= 0) this.emote.visible = false;
    }
    return stepped;
  }

  dispose(): void {
    this.walkTextures.forEach((t) => t.dispose());
    (this.idle.material as THREE.MeshBasicMaterial).map?.dispose();
    this.materials.forEach((m) => m.dispose());
    this.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  }
}
