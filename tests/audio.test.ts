import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MAX_SFX_VOICES, SFX } from '../src/game/audio/audioConfig';
import { sfxForEvent } from '../src/game/audio/audioEvents';
import { AudioManager, busVolume, clampVolume } from '../src/game/audio/AudioManager';
import { resolveAudioSettings } from '../src/game/audio/audioSettings';
import type { SfxId } from '../src/game/audio/audioTypes';
import { progressSchema } from '../src/persistence/schema';
import { createDefaultProgress, loadProgress, saveProgress } from '../src/persistence/storage';

// ---------- Soxta Web Audio (jsdom’da AudioContext yo‘q) ----------

class FakeParam {
  constructor(public value = 0) {}
  setValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
  setTargetAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
}

class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
  disconnect() {}
}

class FakeSource extends FakeNode {
  started = false;
  stopped = false;
  buffer: unknown = null;
  loop = false;
  type = 'sine';
  frequency = new FakeParam(440);
  playbackRate = new FakeParam(1);
  constructor(private readonly ctx: FakeContext) {
    super();
  }
  start() {
    this.started = true;
    this.ctx.started.push(this);
  }
  stop() {
    this.stopped = true;
  }
}

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = 'running';
  destination = new FakeNode();
  started: FakeSource[] = [];
  gains: { gain: FakeParam }[] = [];
  panners: { positionX: FakeParam }[] = [];
  decodeFails = false;
  listener = Object.fromEntries(
    ['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ'].map((k) => [k, new FakeParam()]),
  );
  suspend = vi.fn(async () => void (this.state = 'suspended'));
  resume = vi.fn(async () => void (this.state = 'running'));
  close = vi.fn(async () => void (this.state = 'closed'));
  createGain() {
    const g = Object.assign(new FakeNode(), { gain: new FakeParam(1) });
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    return new FakeSource(this);
  }
  createBufferSource() {
    return new FakeSource(this);
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam(), Q: new FakeParam() });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam() });
  }
  createBuffer(_c: number, length: number, rate: number) {
    return { duration: length / rate, getChannelData: () => new Float32Array(length) };
  }
  createPanner() {
    const p = Object.assign(new FakeNode(), {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 10000,
      rolloffFactor: 1,
      positionX: new FakeParam(),
      positionY: new FakeParam(),
      positionZ: new FakeParam(),
    });
    this.panners.push(p);
    return p;
  }
  decodeAudioData = vi.fn(async () => {
    if (this.decodeFails) throw new Error('decode');
    return { duration: 0.5 };
  });
}

let ctx: FakeContext;
let now = 0;
let createContext: Mock<() => AudioContext>;
let fetchFn: Mock<(url: string) => Promise<Response>>;
let warn: Mock<(message: string) => void>;

function makeManager() {
  ctx = new FakeContext();
  // Soxta kontekst faqat AudioManager ishlatadigan qismni amalga oshiradi
  createContext = vi.fn(() => ctx as unknown as AudioContext);
  fetchFn = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }));
  warn = vi.fn<(message: string) => void>();
  return new AudioManager({ createContext, fetchFn, baseUrl: '/', now: () => now, warn });
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 1000;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('balandlik hisoblari', () => {
  it('clampVolume 0–1 oralig‘iga keltiradi, noto‘g‘ri qiymat — 0', () => {
    expect(clampVolume(-0.5)).toBe(0);
    expect(clampVolume(1.7)).toBe(1);
    expect(clampVolume(0.3)).toBe(0.3);
    expect(clampVolume(Number.NaN)).toBe(0);
    expect(clampVolume('0.5')).toBe(0);
    expect(clampVolume(undefined)).toBe(0);
  });

  it('yakuniy balandlik = master × toifa; ovozsiz rejim — 0', () => {
    const s = { master: 0.5, music: 0.8, sfx: 0.4, ambience: 1, muted: false };
    expect(busVolume(s, 'music')).toBeCloseTo(0.4);
    expect(busVolume(s, 'sfx')).toBeCloseTo(0.2);
    expect(busVolume(s, 'ui')).toBeCloseTo(0.2);
    expect(busVolume(s, 'footsteps')).toBeCloseTo(0.2);
    expect(busVolume(s, 'world')).toBeCloseTo(0.5);
    expect(busVolume({ ...s, muted: true }, 'music')).toBe(0);
    expect(busVolume({ ...s, master: 3 }, 'music')).toBeCloseTo(0.8);
  });

  it('sozlamalar o‘zgarsa shina balandligi yangilanadi, musiqa qayta boshlanmaydi', () => {
    const m = makeManager();
    m.unlock();
    m.playMusic('menu');
    const gainsBefore = ctx.gains.length;
    m.setSettings({ master: 0.5, music: 0.5, sfx: 1, ambience: 1, muted: false });
    expect(m.busLevel('music')).toBeCloseTo(0.25);
    expect(ctx.gains.length).toBe(gainsBefore);
    expect(m.currentMusic).toBe('menu');
    m.setSettings({ master: 9, music: -2, sfx: 1, ambience: 1, muted: false });
    expect(m.getSettings()).toMatchObject({ master: 1, music: 0 });
  });
});

describe('effektlar', () => {
  it('brauzer ruxsatidan (unlock) oldin AudioContext yaratilmaydi va hech narsa chalinmaydi', () => {
    const m = makeManager();
    expect(m.playSfx('interaction')).toBe(false);
    expect(createContext).not.toHaveBeenCalled();
    m.unlock();
    expect(createContext).toHaveBeenCalledTimes(1);
    m.unlock();
    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('chalinadi (fayl yo‘q — sintez), ovozsiz rejimda chalinmaydi', () => {
    const m = makeManager();
    m.unlock();
    expect(m.playSfx('interaction')).toBe(true);
    expect(ctx.started.length).toBeGreaterThan(0);
    now += 500;
    m.setSettings({ master: 1, music: 1, sfx: 1, ambience: 1, muted: true });
    expect(m.playSfx('interaction')).toBe(false);
  });

  it('cooldown: bir harakat bir xil tovushni ikki marta chalmaydi; guruh cooldown’i', () => {
    const m = makeManager();
    m.unlock();
    expect(m.playSfx('interaction')).toBe(true);
    expect(m.playSfx('interaction')).toBe(false);
    now += SFX.interaction.cooldownMs! + 1;
    expect(m.playSfx('interaction')).toBe(true);
    // Oyna ochilishi va darhol yopilishi (StrictMode) — bitta tovush
    expect(m.playSfx('windowOpen')).toBe(true);
    expect(m.playSfx('windowClose')).toBe(false);
  });

  it('ovozlar to‘lganda: past ustuvorlikdagi yangi tovush tashlanadi, muhim tovush joy oladi', () => {
    const m = makeManager();
    m.unlock();
    // Har biri o‘z cooldown kaliti bilan (umumiy guruhdagi windowClose chiqarib tashlanadi)
    const ids = (Object.keys(SFX) as SfxId[]).filter((id) => SFX[id].priority >= 1 && id !== 'missionComplete' && id !== 'windowClose');
    for (const id of ids.slice(0, MAX_SFX_VOICES)) expect(m.playSfx(id)).toBe(true);
    expect(m.debugState().voices).toBe(MAX_SFX_VOICES);
    expect(m.playSfx('tap')).toBe(false);
    expect(m.playSfx('missionComplete')).toBe(true);
    expect(m.debugState().voices).toBe(MAX_SFX_VOICES);
  });

  it('pauzada qadamlar chalinmaydi, xona va qadam shinalari jim, musiqa pasayadi', () => {
    const m = makeManager();
    m.unlock();
    const musicLevel = m.busLevel('music');
    m.setGamePaused(true);
    expect(m.busLevel('world')).toBe(0);
    expect(m.busLevel('ambience')).toBe(0);
    expect(m.busLevel('footsteps')).toBe(0);
    expect(m.busLevel('music')).toBeLessThan(musicLevel);
    const startedBefore = ctx.started.length;
    m.playFootstep('wood');
    expect(ctx.started.length).toBe(startedBefore);
    m.setGamePaused(false);
    m.playFootstep('wood');
    expect(ctx.started.length).toBe(startedBefore + 1);
  });

  it('yorliq yashirilganda kontekst to‘xtatiladi va qaytganda davom etadi', () => {
    const m = makeManager();
    m.unlock();
    m.setPageHidden(true);
    expect(ctx.suspend).toHaveBeenCalled();
    m.setPageHidden(false);
    expect(ctx.resume).toHaveBeenCalled();
  });
});

describe('fon musiqasi', () => {
  it('bir xil trek ikki marta boshlanmaydi; ruxsatgacha kutadi; almashadi va to‘xtaydi', () => {
    const m = makeManager();
    m.playMusic('menu');
    expect(m.currentMusic).toBe(null);
    m.unlock();
    expect(m.currentMusic).toBe('menu');
    const gains = ctx.gains.length;
    m.playMusic('menu');
    m.playMusic('menu');
    expect(ctx.gains.length).toBe(gains);
    m.playMusic('gameplay');
    expect(m.currentMusic).toBe('gameplay');
    m.stopMusic();
    expect(m.currentMusic).toBe(null);
    // To‘xtatilgandan keyin rejalashtiruvchi ham to‘xtaydi — yangi notalar qo‘shilmaydi
    vi.advanceTimersByTime(3000);
    const started = ctx.started.length;
    vi.advanceTimersByTime(5000);
    expect(ctx.started.length).toBe(started);
  });
});

describe('takrorlanuvchi va 3D tovushlar', () => {
  it('ruxsatdan oldin so‘ralgan loop ruxsat berilganda boshlanadi; stop — to‘xtatadi', () => {
    const m = makeManager();
    const loop = m.playLoop('computerHum', { position: { x: 1, y: 0, z: 2 } });
    expect(loop.active).toBe(false);
    m.unlock();
    expect(loop.active).toBe(true);
    expect(ctx.panners).toHaveLength(1);
    expect(ctx.panners[0]!.positionX.value).toBe(1);
    loop.setPosition({ x: 4, y: 0, z: 2 });
    expect(ctx.panners[0]!.positionX.value).toBe(4);
    loop.stop();
    expect(loop.active).toBe(false);
    expect(m.debugState().loops).toEqual([]);
  });

  it('fon (ambience) bir xil bo‘lsa qayta yaratilmaydi', () => {
    const m = makeManager();
    m.unlock();
    m.setAmbience('roomToneDay');
    const gains = ctx.gains.length;
    m.setAmbience('roomToneDay');
    expect(ctx.gains.length).toBe(gains);
    m.setAmbience(null);
    expect(m.debugState().loops).toEqual([]);
  });
});

describe('audio fayllar', () => {
  const original = SFX.pickup.src;
  afterEach(() => {
    SFX.pickup.src = original;
  });

  it('fayl topilmasa — o‘yin to‘xtamaydi, sintez chalinadi, ogohlantirish bir marta', async () => {
    const m = makeManager();
    fetchFn.mockResolvedValue(new Response('', { status: 404 }));
    SFX.pickup.src = 'audio/sfx/pickup.ogg';
    m.unlock();
    expect(m.playSfx('pickup')).toBe(true);
    await vi.runAllTimersAsync();
    now += 1000;
    expect(m.playSfx('pickup')).toBe(true);
    await vi.runAllTimersAsync();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/pickup\.ogg/);
  });

  it('fayl yuklangach — bufer chalinadi (birinchi marta sintez, yuklash fonda)', async () => {
    const m = makeManager();
    SFX.pickup.src = 'audio/sfx/pickup.ogg';
    m.unlock();
    m.playSfx('pickup');
    await vi.runAllTimersAsync();
    now += 1000;
    const before = ctx.started.length;
    m.playSfx('pickup');
    const fresh = ctx.started.slice(before);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.buffer).toEqual({ duration: 0.5 });
  });
});

describe('sozlamalarni saqlash', () => {
  it('buzilgan audio sozlamalari tuzatiladi, progress yo‘qolmaydi', () => {
    const p = createDefaultProgress();
    const raw = { ...p, settings: { ...p.settings, audio: { master: 5, music: 'baland', sfx: -1, ambience: 0.3, muted: 'ha' } } };
    const parsed = progressSchema.parse(raw);
    expect(parsed.settings.audio).toEqual({ master: 1, music: 0.45, sfx: 0, ambience: 0.3, muted: false });
    const broken = progressSchema.parse({ ...p, settings: { ...p.settings, audio: 'garbage' } });
    expect(broken.settings.audio).toBeUndefined();
    expect(broken.settings.textScale).toBe(p.settings.textScale);
  });

  it('eski sozlamalar (sound/music belgilari) to‘g‘ri o‘tkaziladi', () => {
    expect(resolveAudioSettings({ sound: false }).muted).toBe(true);
    expect(resolveAudioSettings({ sound: true, music: false }).music).toBe(0);
    expect(resolveAudioSettings({ audio: { master: 0.3, music: 0.2, sfx: 0.1, ambience: 0, muted: true } })).toEqual({
      master: 0.3,
      music: 0.2,
      sfx: 0.1,
      ambience: 0,
      muted: true,
    });
  });

  it('localStorage’ga saqlanadi va qayta yuklanadi', () => {
    localStorage.clear();
    const p = createDefaultProgress();
    const audio = { master: 0.6, music: 0.25, sfx: 0.9, ambience: 0.1, muted: false };
    saveProgress({ ...p, settings: { ...p.settings, audio } });
    expect(loadProgress().settings.audio).toEqual(audio);
  });
});

describe('o‘yin hodisalari → tovushlar', () => {
  it('har hodisa o‘z tovushiga mos keladi', () => {
    expect(sfxForEvent({ type: 'hotspotActivated', kind: 'door' })).toBe('doorOpen');
    expect(sfxForEvent({ type: 'hotspotActivated', kind: 'device' })).toBe('pickup');
    expect(sfxForEvent({ type: 'hotspotActivated', kind: 'npc' })).toBe('talk');
    expect(sfxForEvent({ type: 'hotspotActivated', kind: 'computer' })).toBe('interaction');
    expect(sfxForEvent({ type: 'decision', outcome: 'safe' })).toBe('correct');
    expect(sfxForEvent({ type: 'decision', outcome: 'critical' })).toBe('critical');
    expect(sfxForEvent({ type: 'quizAnswer', correct: false })).toBe('incorrectAnswer');
    expect(sfxForEvent({ type: 'missionEnded', passed: true })).toBe('missionComplete');
    expect(sfxForEvent({ type: 'ui', action: 'menuOpen' })).toBe('menuOpen');
  });
});
