import {
  DEFAULT_AUDIO_SETTINGS,
  FOOTSTEPS,
  LOOPS,
  MAX_SFX_VOICES,
  MUSIC,
  MUSIC_FADE_SECONDS,
  OVERLAY_WORLD_DUCK,
  PAUSE_MUSIC_DUCK,
  SFX,
  SPATIAL_DEFAULTS,
} from './audioConfig';
import type { AudioBus, AudioSettings, LoopHandle, LoopId, MusicId, SfxId, SpatialOptions, Surface, Vec3 } from './audioTypes';
import { synthFootstep, synthLoop, synthMusic, synthSfx, type Stoppable } from './synth';

import { busVolume, clampVolume } from './audioSettings';

export { busVolume, clampVolume };

export interface AudioManagerDeps {
  createContext: () => AudioContext;
  fetchFn: (url: string) => Promise<Response>;
  /** Fayllar manzili prefiksi (Vite BASE_URL) */
  baseUrl: string;
  now: () => number;
  warn: (message: string) => void;
}

interface Voice {
  id: SfxId;
  priority: number;
  startedAt: number;
  endsAt: number;
  gain: GainNode;
}

interface Playing {
  id: string;
  gain: GainNode;
  source: Stoppable;
}

const BUSES: AudioBus[] = ['music', 'sfx', 'ui', 'footsteps', 'ambience', 'world'];
const RAMP = 0.06;

/**
 * Markaziy audio boshqaruvchi. O‘yin mantig‘idan ajratilgan: o‘yin faqat «nima bo‘ldi» deydi (playSfx('pickup')),
 * qaysi fayl, qanday balandlik va ustuvorlik — shu yerda va audioConfig.ts da hal qilinadi.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private buses = new Map<AudioBus, GainNode>();
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private voices: Voice[] = [];
  private lastPlayed = new Map<string, number>();
  private buffers = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private warned = new Set<string>();
  private music: Playing | null = null;
  private desiredMusic: MusicId | null = null;
  private ambience: LoopHandle | null = null;
  private desiredAmbience: LoopId | null = null;
  private loops = new Set<ManagedLoop>();
  private gamePaused = false;
  private overlay = false;
  private pageHidden = false;
  private stepAlt = false;
  private disposed = false;

  constructor(private readonly deps: AudioManagerDeps) {}

  // ---------- Hayot sikli ----------

  /** Foydalanuvchi harakatidan (bosish/tugma) chaqiriladi. Brauzer ruxsatisiz AudioContext yaratilmaydi. */
  unlock(): void {
    if (this.disposed) return;
    if (!this.ctx) {
      try {
        this.ctx = this.deps.createContext();
      } catch (err) {
        this.warnOnce('context', `[audio] AudioContext yaratilmadi: ${String(err)}`);
        return;
      }
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 8;
      limiter.ratio.value = 6;
      limiter.connect(this.ctx.destination);
      for (const bus of BUSES) {
        const g = this.ctx.createGain();
        g.gain.value = this.targetGain(bus);
        g.connect(limiter);
        this.buses.set(bus, g);
      }
      // Ruxsatdan oldin so‘ralgan musiqa, fon va 3D manbalar endi boshlanadi
      if (this.desiredMusic) this.startMusic(this.desiredMusic);
      for (const l of this.loops) l.start();
    }
    if (this.ctx.state === 'suspended' && !this.pageHidden) this.ctx.resume().catch((err) => this.warnOnce('resume', `[audio] resume: ${String(err)}`));
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  /** Brauzer yorlig‘i yashirilganda — ovoz to‘xtaydi, qaytganda davom etadi */
  setPageHidden(hidden: boolean): void {
    this.pageHidden = hidden;
    if (!this.ctx) return;
    const op = hidden ? this.ctx.suspend() : this.ctx.resume();
    op.catch((err) => this.warnOnce('visibility', `[audio] visibility: ${String(err)}`));
  }

  /** O‘yin pauzasi: musiqa pasayadi, xona tovushlari va qadamlar jim */
  setGamePaused(paused: boolean): void {
    this.gamePaused = paused;
    this.applyGains();
  }

  /** Dialog yoki simulyatsiya oynasi ochiq — xona tovushlari pasayadi */
  setOverlay(active: boolean): void {
    this.overlay = active;
    this.applyGains();
  }

  dispose(): void {
    this.disposed = true;
    this.stopMusic();
    this.ambience?.stop();
    for (const l of [...this.loops]) l.stop();
    for (const v of this.voices) v.gain.disconnect();
    this.voices = [];
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  // ---------- Sozlamalar ----------

  setSettings(next: AudioSettings): void {
    this.settings = {
      master: clampVolume(next.master),
      music: clampVolume(next.music),
      sfx: clampVolume(next.sfx),
      ambience: clampVolume(next.ambience),
      muted: !!next.muted,
    };
    // Faqat shinalar balandligi o‘zgaradi — chalinayotgan tovushlar qayta boshlanmaydi
    this.applyGains();
  }

  /** Shinaning hozirgi maqsadli balandligi (diagnostika va sinovlar uchun) */
  busLevel(bus: AudioBus): number {
    return this.targetGain(bus);
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  private targetGain(bus: AudioBus): number {
    let v = busVolume(this.settings, bus);
    if (bus === 'music' && this.gamePaused) v *= PAUSE_MUSIC_DUCK;
    if ((bus === 'world' || bus === 'ambience' || bus === 'footsteps') && this.gamePaused) v = 0;
    if (bus === 'world' && this.overlay) v *= OVERLAY_WORLD_DUCK;
    return v;
  }

  private applyGains(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [bus, g] of this.buses) g.gain.setTargetAtTime(this.targetGain(bus), t, RAMP);
  }

  // ---------- Fayllar (dangasa yuklash) ----------

  /** Oldindan yuklash (masalan, missiya boshlanishida). Faylsiz tovushlar uchun hech narsa qilmaydi. */
  preload(srcs: (string | undefined)[]): void {
    for (const src of srcs) if (src) void this.load(src);
  }

  private load(src: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    let p = this.loading.get(src);
    if (!p) {
      p = this.deps
        .fetchFn(`${this.deps.baseUrl}${src}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .catch((err: unknown) => {
          this.warnOnce(src, `[audio] «${src}» yuklanmadi (${String(err)}) — sintez ishlatiladi`);
          return null;
        })
        .then((buffer) => {
          this.buffers.set(src, buffer);
          return buffer;
        });
      this.loading.set(src, p);
    }
    return p;
  }

  /** Tayyor bufer yoki undefined (hali yuklanmoqda / fayl yo‘q) — undefined bo‘lsa sintez chalinadi */
  private readyBuffer(src: string | undefined): AudioBuffer | undefined {
    if (!src) return undefined;
    if (!this.buffers.has(src)) {
      void this.load(src);
      return undefined;
    }
    return this.buffers.get(src) ?? undefined;
  }

  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.deps.warn(message);
  }

  // ---------- Effektlar ----------

  /**
   * Bir martalik effekt. false — chalinmadi (ruxsat yo‘q, cooldown, ovozlar to‘la).
   * `delay` — soniyalarda (natija ekranidagi yulduzlar kabi animatsiyaga moslash uchun).
   */
  playSfx(id: SfxId, opts: { delay?: number; volume?: number } = {}): boolean {
    const ctx = this.ctx;
    if (!ctx || this.settings.muted) return false;
    const def = SFX[id];
    const now = this.deps.now();
    this.voices = this.voices.filter((v) => v.endsAt > now);

    const key = def.group ?? id;
    const last = this.lastPlayed.get(key);
    if (def.cooldownMs !== undefined && last !== undefined && now - last < def.cooldownMs) return false;

    // Shu tovushning nusxalari ko‘p bo‘lsa — eng eskisini almashtiramiz
    const same = this.voices.filter((v) => v.id === id);
    if (def.maxInstances !== undefined && same.length >= def.maxInstances) this.stopVoice(same[0]!);
    // Umumiy chegara: past (yoki teng) ustuvorlikdagi eng eski ovoz bo‘shatiladi, aks holda yangisi tashlab yuboriladi
    if (this.voices.length >= MAX_SFX_VOICES) {
      const victim = this.voices.filter((v) => v.priority <= def.priority).sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt)[0];
      if (!victim) return false;
      this.stopVoice(victim);
    }

    this.lastPlayed.set(key, now);
    const gain = ctx.createGain();
    gain.gain.value = clampVolume(def.volume * (opts.volume ?? 1));
    gain.connect(this.buses.get(def.bus)!);
    const delay = Math.max(0, opts.delay ?? 0);
    const t = ctx.currentTime + 0.01 + delay;
    let duration: number;
    const buffer = this.readyBuffer(def.src);
    try {
      if (buffer) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start(t);
        duration = buffer.duration;
      } else {
        duration = synthSfx(id, ctx, gain, t);
      }
    } catch (err) {
      gain.disconnect();
      this.warnOnce(`play-${id}`, `[audio] «${id}» chalinmadi: ${String(err)}`);
      return false;
    }
    const voice: Voice = { id, priority: def.priority, startedAt: now, endsAt: now + (delay + duration) * 1000 + 50, gain };
    this.voices.push(voice);
    setTimeout(() => this.releaseVoice(voice), voice.endsAt - now + 100);
    return true;
  }

  private stopVoice(v: Voice): void {
    if (this.ctx) v.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    this.releaseVoice(v);
  }

  private releaseVoice(v: Voice): void {
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
    setTimeout(() => v.gain.disconnect(), 150);
  }

  /** Qadam ovozi (pol turiga qarab). Pauzada chalinmaydi. */
  playFootstep(surface: Surface): void {
    const ctx = this.ctx;
    if (!ctx || this.gamePaused || this.settings.muted) return;
    const def = FOOTSTEPS[surface];
    const gain = ctx.createGain();
    gain.gain.value = clampVolume(def.volume);
    gain.connect(this.buses.get('footsteps')!);
    this.stepAlt = !this.stepAlt;
    const t = ctx.currentTime + 0.005;
    const variants = def.src ?? [];
    const buffer = variants.length > 0 ? this.readyBuffer(variants[Math.floor(Math.random() * variants.length)]) : undefined;
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 0.95 + Math.random() * 0.1;
      src.connect(gain);
      src.start(t);
    } else synthFootstep(def, ctx, gain, t, this.stepAlt);
    setTimeout(() => gain.disconnect(), 600);
  }

  // ---------- Fon musiqasi ----------

  /** Bir xil trek qayta so‘ralsa hech narsa qilmaydi; boshqasi — silliq almashadi; null — to‘xtatadi */
  playMusic(id: MusicId | null): void {
    if (this.desiredMusic === id && (this.music?.id === id || !this.ctx)) return;
    this.desiredMusic = id;
    if (!this.ctx) return;
    this.fadeOutMusic();
    if (id) this.startMusic(id);
  }

  stopMusic(): void {
    this.desiredMusic = null;
    this.fadeOutMusic();
  }

  get currentMusic(): MusicId | null {
    return (this.music?.id as MusicId | undefined) ?? null;
  }

  private startMusic(id: MusicId): void {
    const ctx = this.ctx!;
    const def = MUSIC[id];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, clampVolume(def.volume)), ctx.currentTime + MUSIC_FADE_SECONDS);
    gain.connect(this.buses.get('music')!);
    let source: Stoppable;
    const buffer = this.readyBuffer(def.src);
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      source = { stop: () => src.stop() };
    } else {
      source = synthMusic(id, ctx, gain);
    }
    this.music = { id, gain, source };
  }

  private fadeOutMusic(): void {
    const m = this.music;
    this.music = null;
    if (!m || !this.ctx) return;
    const t = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setTargetAtTime(0, t, MUSIC_FADE_SECONDS / 4);
    setTimeout(
      () => {
        m.source.stop();
        m.gain.disconnect();
      },
      MUSIC_FADE_SECONDS * 1000 + 200,
    );
  }

  // ---------- Fon (ambience) va takrorlanuvchi tovushlar ----------

  /** Xona fon tovushi (pozitsiyasiz). Bir xil fon qayta so‘ralsa — o‘zgarmaydi. */
  setAmbience(id: LoopId | null): void {
    if (this.desiredAmbience === id) return;
    this.desiredAmbience = id;
    this.ambience?.stop();
    this.ambience = id ? this.playLoop(id) : null;
  }

  /**
   * Takrorlanuvchi tovush. `position` berilsa — 3D manba (PannerNode), tinglovchiga nisbatan eshitiladi.
   * Ruxsatdan oldin so‘ralsa — ruxsat berilganda boshlanadi. Handle.stop() — darhol to‘xtatish.
   */
  playLoop(id: LoopId, opts: { position?: Vec3; spatial?: Partial<SpatialOptions> } = {}): LoopHandle {
    const loop = new ManagedLoop(this, id, opts.position, { ...SPATIAL_DEFAULTS, ...opts.spatial });
    this.loops.add(loop);
    if (this.ctx) loop.start();
    return loop;
  }

  /** @internal ManagedLoop uchun */
  attachLoop(loop: ManagedLoop): { gain: GainNode; panner: PannerNode | null; source: Stoppable } | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const def = LOOPS[loop.id];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, clampVolume(def.volume)), ctx.currentTime + 0.25);
    let panner: PannerNode | null = null;
    if (loop.position) {
      panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = loop.spatial.refDistance;
      panner.maxDistance = loop.spatial.maxDistance;
      panner.rolloffFactor = loop.spatial.rolloff;
      setPannerPosition(panner, loop.position, ctx.currentTime);
      gain.connect(panner).connect(this.buses.get(def.bus)!);
    } else gain.connect(this.buses.get(def.bus)!);
    const buffer = this.readyBuffer(def.src);
    let source: Stoppable;
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      source = { stop: () => src.stop() };
    } else source = synthLoop(loop.id, ctx, gain);
    return { gain, panner, source };
  }

  /** @internal */
  detachLoop(loop: ManagedLoop): void {
    this.loops.delete(loop);
  }

  /** @internal */
  get audioTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** Tinglovchi (3D) — odatda qahramon joyi; kamera tomonga emas, devor tomonga qaraydi */
  setListener(position: Vec3, forward: Vec3 = { x: 0, y: 0, z: -1 }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(position.x, t, 0.05);
      l.positionY.setTargetAtTime(position.y, t, 0.05);
      l.positionZ.setTargetAtTime(position.z, t, 0.05);
      l.forwardX.setValueAtTime(forward.x, t);
      l.forwardY.setValueAtTime(forward.y, t);
      l.forwardZ.setValueAtTime(forward.z, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    } else {
      // Eski Safari
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  /** Sinov va diagnostika uchun holat */
  debugState() {
    return {
      unlocked: this.unlocked,
      contextState: this.ctx?.state ?? 'none',
      music: this.currentMusic,
      ambience: this.desiredAmbience,
      voices: this.voices.length,
      loops: [...this.loops].filter((l) => l.active).map((l) => l.id),
      paused: this.gamePaused,
      overlay: this.overlay,
      settings: this.getSettings(),
    };
  }
}

function setPannerPosition(p: PannerNode, v: Vec3, t: number): void {
  if (p.positionX) {
    p.positionX.setTargetAtTime(v.x, t, 0.05);
    p.positionY.setTargetAtTime(v.y, t, 0.05);
    p.positionZ.setTargetAtTime(v.z, t, 0.05);
  } else p.setPosition(v.x, v.y, v.z);
}

/** Takrorlanuvchi tovush: ruxsatgacha kutadi, to‘xtatilganda tugunlar uziladi */
class ManagedLoop implements LoopHandle {
  private nodes: { gain: GainNode; panner: PannerNode | null; source: Stoppable } | null = null;
  private stopped = false;

  constructor(
    private readonly manager: AudioManager,
    readonly id: LoopId,
    public position: Vec3 | undefined,
    readonly spatial: SpatialOptions,
  ) {}

  get active(): boolean {
    return !this.stopped && this.nodes !== null;
  }

  start(): void {
    if (this.stopped || this.nodes) return;
    this.nodes = this.manager.attachLoop(this);
  }

  setPosition(p: Vec3): void {
    this.position = p;
    if (this.nodes?.panner) setPannerPosition(this.nodes.panner, p, this.manager.audioTime);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.manager.detachLoop(this);
    const n = this.nodes;
    this.nodes = null;
    if (!n) return;
    n.gain.gain.setTargetAtTime(0, this.manager.audioTime, 0.04);
    setTimeout(() => {
      n.source.stop();
      n.gain.disconnect();
      n.panner?.disconnect();
    }, 250);
  }
}

export type { ManagedLoop };
