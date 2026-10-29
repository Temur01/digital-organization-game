import type { RoomTheme } from '../../types/models';
import type { AudioSettings, FootstepDef, LoopDef, LoopId, MusicDef, MusicId, SfxDef, SfxId, SpatialOptions, Surface } from './audioTypes';

/**
 * Barcha tovushlar ro‘yxati. Hozircha audio fayllar yo‘q — har bir tovush sintez qilinadi (synth.ts).
 * Fayl qo‘shish: public/audio/... ga joylang va shu yerda `src` ni yozing (masalan, src: 'audio/sfx/interaction.ogg').
 * Kutilayotgan fayl nomlari va formatlar: docs/AUDIO.md.
 */
export const SFX: Record<SfxId, SfxDef> = {
  tap: { bus: 'ui', volume: 0.35, priority: 0, cooldownMs: 40, maxInstances: 2 },
  windowOpen: { bus: 'ui', volume: 0.7, priority: 1, cooldownMs: 150, group: 'window' },
  windowClose: { bus: 'ui', volume: 0.6, priority: 1, cooldownMs: 150, group: 'window' },
  menuOpen: { bus: 'ui', volume: 0.6, priority: 1, cooldownMs: 150 },
  interaction: { bus: 'sfx', volume: 0.6, priority: 1, cooldownMs: 120 },
  talk: { bus: 'sfx', volume: 0.55, priority: 1, cooldownMs: 120 },
  doorOpen: { bus: 'sfx', volume: 0.8, priority: 2, cooldownMs: 300 },
  pickup: { bus: 'sfx', volume: 0.75, priority: 2, cooldownMs: 200 },
  clue: { bus: 'sfx', volume: 0.8, priority: 2, cooldownMs: 80, maxInstances: 2 },
  correct: { bus: 'sfx', volume: 0.9, priority: 2, cooldownMs: 200 },
  risky: { bus: 'sfx', volume: 0.9, priority: 2, cooldownMs: 200 },
  critical: { bus: 'sfx', volume: 1, priority: 3, cooldownMs: 200 },
  objective: { bus: 'sfx', volume: 0.85, priority: 2, cooldownMs: 250 },
  notify: { bus: 'sfx', volume: 0.75, priority: 1, cooldownMs: 300 },
  vibrate: { bus: 'sfx', volume: 0.8, priority: 1, cooldownMs: 500, maxInstances: 1 },
  star: { bus: 'sfx', volume: 0.75, priority: 2, maxInstances: 3 },
  missionComplete: { bus: 'sfx', volume: 1, priority: 3, cooldownMs: 1000 },
  missionFailed: { bus: 'sfx', volume: 0.9, priority: 3, cooldownMs: 1000 },
  correctAnswer: { bus: 'sfx', volume: 0.85, priority: 2, cooldownMs: 150 },
  incorrectAnswer: { bus: 'sfx', volume: 0.85, priority: 2, cooldownMs: 150 },
};

export const LOOPS: Record<LoopId, LoopDef> = {
  phoneRing: { bus: 'sfx', volume: 0.7 },
  roomToneDay: { bus: 'ambience', volume: 0.5 },
  roomToneNight: { bus: 'ambience', volume: 0.55 },
  computerHum: { bus: 'world', volume: 0.35 },
  phoneBuzz: { bus: 'world', volume: 0.9 },
  coffeeMachine: { bus: 'world', volume: 0.35 },
  waterCooler: { bus: 'world', volume: 0.5 },
  clockTick: { bus: 'world', volume: 0.3 },
};

export const MUSIC: Record<MusicId, MusicDef> = {
  menu: { volume: 0.55 },
  gameplay: { volume: 0.45 },
  night: { volume: 0.5 },
};

/** 3D manbalar uchun standart masofalar (metr). Xona ~12 m keng. */
export const SPATIAL_DEFAULTS: SpatialOptions = { refDistance: 1.2, maxDistance: 14, rolloff: 1.2 };

export const FOOTSTEPS: Record<Surface, FootstepDef> = {
  wood: { volume: 0.55, freq: 480, decay: 0.1 },
  stone: { volume: 0.5, freq: 1400, decay: 0.07 },
  carpet: { volume: 0.4, freq: 260, decay: 0.12 },
};

/** Pol materiali → qadam ovozi (yangi pol turi qo‘shilsa, shu yerga) */
export function surfaceForFloor(style: RoomTheme['floorStyle']): Surface {
  return style === 'carpet' ? 'carpet' : style === 'stone' || style === 'terrazzo' ? 'stone' : 'wood';
}

/** Qadam ritmi: animatsiyadagi oyoq tegish kadrlari (8 kadrli yurish varag‘i) yoki vaqt bo‘yicha zaxira */
export const FOOTSTEP_CADENCE = {
  /** Yurish varag‘ida oyoq polga tegadigan kadrlar */
  contactFrames: [0, 4] as readonly number[],
  /** Animatsiya bo‘lmasa (vektor qahramon) — qadamlar orasidagi vaqt, s */
  walkInterval: 0.36,
  /** Kelajakda yugurish qo‘shilsa */
  runInterval: 0.26,
};

/** Bir vaqtda chalinadigan effektlar chegarasi — undan oshsa, past ustuvorlikdagi eng eski tovush to‘xtatiladi */
export const MAX_SFX_VOICES = 14;

/** Fon musiqasi almashganda o‘tish vaqti, s */
export const MUSIC_FADE_SECONDS = 1.2;

/** Pauza paytida musiqa shu darajagacha pasayadi */
export const PAUSE_MUSIC_DUCK = 0.35;

/** Oyna (dialog, simulyatsiya) ochiq bo‘lganda xona tovushlari shu darajagacha pasayadi */
export const OVERLAY_WORLD_DUCK = 0.35;

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { master: 0.8, music: 0.45, sfx: 0.8, ambience: 0.5, muted: false };
