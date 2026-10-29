/**
 * Audio tizimi tiplari. Barcha tovush identifikatorlari shu yerda — noto‘g‘ri nom kompilyatsiyada ushlanadi.
 */

/** Ichki mikser shinalari. UI faqat music / sfx / ambience slayderlarini ko‘rsatadi; ui va footsteps — sfx ichida. */
export type AudioBus = 'music' | 'sfx' | 'ui' | 'footsteps' | 'ambience' | 'world';

/** Foydalanuvchi sozlaydigan toifalar (slayderlar) */
export type VolumeCategory = 'music' | 'sfx' | 'ambience';

export type SfxId =
  | 'tap'
  | 'windowOpen'
  | 'windowClose'
  | 'menuOpen'
  | 'interaction'
  | 'talk'
  | 'doorOpen'
  | 'pickup'
  | 'clue'
  | 'correct'
  | 'risky'
  | 'critical'
  | 'objective'
  | 'notify'
  | 'vibrate'
  | 'star'
  | 'missionComplete'
  | 'missionFailed'
  | 'correctAnswer'
  | 'incorrectAnswer';

/** Takrorlanuvchi (loop) tovushlar: qo‘ng‘iroq, xona shovqini, 3D manbalar */
export type LoopId = 'phoneRing' | 'roomToneDay' | 'roomToneNight' | 'computerHum' | 'phoneBuzz' | 'coffeeMachine' | 'waterCooler' | 'clockTick';

export type MusicId = 'menu' | 'gameplay' | 'night';

export type Surface = 'wood' | 'stone' | 'carpet';

/** Sintez retseptlari (fayl bo‘lmasa yoki yuklanmasa ishlatiladi) */
export type SynthId = SfxId | 'footstep';

/** 0 — eng muhim emas (UI tik), 3 — eng muhim (missiya natijasi) */
export type Priority = 0 | 1 | 2 | 3;

export interface SfxDef {
  bus: Extract<AudioBus, 'sfx' | 'ui'>;
  /** public/ dan nisbiy yo‘l. Fayl qo‘shilmaguncha undefined — sintez ishlatiladi. */
  src?: string;
  volume: number;
  priority: Priority;
  /** Shu tovush yana chalinishidan oldingi minimal vaqt (ms) */
  cooldownMs?: number;
  /** Bir vaqtda chalinadigan nusxalar soni */
  maxInstances?: number;
  /** Bir guruhdagi tovushlar umumiy cooldown’ga ega (masalan, oyna ochish/yopish) */
  group?: string;
}

export interface LoopDef {
  bus: Extract<AudioBus, 'sfx' | 'ambience' | 'world'>;
  src?: string;
  volume: number;
}

export interface MusicDef {
  src?: string;
  volume: number;
}

export interface SpatialOptions {
  /** Shu masofagacha (m) balandlik pasaymaydi */
  refDistance: number;
  /** Shu masofadan keyin pasayish to‘xtaydi (m) */
  maxDistance: number;
  /** Pasayish tezligi */
  rolloff: number;
}

export interface FootstepDef {
  src?: string[];
  volume: number;
  /** Sintez: bandpass chastotasi va so‘nish vaqti */
  freq: number;
  decay: number;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  muted: boolean;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Takrorlanuvchi yoki 3D tovushni boshqarish */
export interface LoopHandle {
  stop(): void;
  /** Faqat 3D manbalar uchun */
  setPosition(p: Vec3): void;
  readonly active: boolean;
}
