/**
 * Sintez qilingan tovushlar (Web Audio). Audio fayl bo‘lmaganda yoki yuklanmaganda ishlatiladi —
 * shuning uchun o‘yin hech qachon «jim» qolmaydi va tashqi yuklab olishga bog‘liq emas.
 */
import type { FootstepDef, LoopId, MusicId, SfxId } from './audioTypes';

export interface Stoppable {
  stop(): void;
}

interface Note {
  freq: number;
  at: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
  slideTo?: number;
  attack?: number;
}

function note(c: BaseAudioContext, dest: AudioNode, t0: number, n: Note) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const start = t0 + n.at;
  const peak = n.gain ?? 0.18;
  osc.type = n.type ?? 'sine';
  osc.frequency.setValueAtTime(n.freq, start);
  if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, start + n.dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + (n.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
  osc.connect(g).connect(dest);
  osc.start(start);
  osc.stop(start + n.dur + 0.05);
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
/** 2 soniyalik oq shovqin (kesh — har chaqiruvda yangi bufer yaratilmaydi) */
function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(c);
  if (!b) {
    b = c.createBuffer(1, Math.ceil(c.sampleRate * 2), c.sampleRate);
    const data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(c, b);
  }
  return b;
}

function noiseBurst(c: BaseAudioContext, dest: AudioNode, t0: number, dur: number, from: number, to: number, peak: number, q = 1.2) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(dest);
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}

/** Telefon titrashi: past «g‘o‘ng‘illash», 25 Hz amplituda modulyatsiyasi bilan */
function buzz(c: BaseAudioContext, dest: AudioNode, t0: number, dur: number, peak = 0.32) {
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 140;
  const lowpass = c.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 420;
  const am = c.createGain();
  am.gain.value = 0;
  const lfo = c.createOscillator();
  lfo.frequency.value = 25;
  const depth = c.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(am.gain);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
  env.gain.setValueAtTime(peak, t0 + dur - 0.05);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(lowpass).connect(am).connect(env).connect(dest);
  for (const n of [osc, lfo]) {
    n.start(t0);
    n.stop(t0 + dur + 0.05);
  }
}

const C5 = 523.25,
  E5 = 659.25,
  G5 = 783.99,
  C6 = 1046.5,
  E6 = 1318.5,
  A4 = 440,
  F4 = 349.23,
  D4 = 293.66;

/** Bir martalik effektlar. Qaytariladigan son — tovush davomiyligi (s), ovozlarni hisoblash uchun. */
const SFX_SYNTH: Record<SfxId, (c: BaseAudioContext, d: AudioNode, t: number) => number> = {
  tap: (c, d, t) => (note(c, d, t, { freq: 1800, at: 0, dur: 0.035, gain: 0.1, type: 'triangle', slideTo: 1200 }), 0.05),
  windowOpen: (c, d, t) => {
    noiseBurst(c, d, t, 0.22, 500, 2600, 0.2);
    note(c, d, t, { freq: 620, at: 0.03, dur: 0.12, gain: 0.15, slideTo: 980 });
    return 0.25;
  },
  windowClose: (c, d, t) => (noiseBurst(c, d, t, 0.18, 2200, 500, 0.15), 0.2),
  menuOpen: (c, d, t) => {
    noiseBurst(c, d, t, 0.16, 800, 1800, 0.12);
    note(c, d, t, { freq: 880, at: 0.02, dur: 0.1, gain: 0.08, type: 'triangle' });
    return 0.2;
  },
  interaction: (c, d, t) => {
    note(c, d, t, { freq: 740, at: 0, dur: 0.09, gain: 0.16, type: 'triangle' });
    note(c, d, t, { freq: 988, at: 0.06, dur: 0.14, gain: 0.12, type: 'triangle' });
    return 0.22;
  },
  talk: (c, d, t) => {
    note(c, d, t, { freq: 520, at: 0, dur: 0.07, gain: 0.14, type: 'square', slideTo: 600 });
    note(c, d, t, { freq: 660, at: 0.08, dur: 0.08, gain: 0.12, type: 'square', slideTo: 560 });
    return 0.18;
  },
  // Eshik: g‘ijirlash va yumshoq «gup»
  doorOpen: (c, d, t) => {
    noiseBurst(c, d, t, 0.45, 300, 900, 0.18, 6);
    note(c, d, t, { freq: 180, at: 0.02, dur: 0.4, gain: 0.08, type: 'sawtooth', slideTo: 240 });
    note(c, d, t, { freq: 90, at: 0.42, dur: 0.18, gain: 0.3, slideTo: 60 });
    return 0.65;
  },
  pickup: (c, d, t) => {
    [C5, E5, G5].forEach((f, i) => note(c, d, t, { freq: f * 1.5, at: i * 0.05, dur: 0.14, gain: 0.14, type: 'triangle' }));
    return 0.3;
  },
  clue: (c, d, t) => {
    note(c, d, t, { freq: 1567.98, at: 0, dur: 0.18, gain: 0.12 });
    note(c, d, t, { freq: 2093, at: 0.05, dur: 0.22, gain: 0.07 });
    return 0.3;
  },
  correct: (c, d, t) => {
    note(c, d, t, { freq: E5, at: 0, dur: 0.14, type: 'triangle' });
    note(c, d, t, { freq: C6, at: 0.09, dur: 0.32, type: 'triangle' });
    note(c, d, t, { freq: E6, at: 0.09, dur: 0.32, gain: 0.05 });
    return 0.45;
  },
  risky: (c, d, t) => {
    note(c, d, t, { freq: A4, at: 0, dur: 0.16, type: 'triangle' });
    note(c, d, t, { freq: 370, at: 0.13, dur: 0.26, type: 'triangle' });
    return 0.42;
  },
  critical: (c, d, t) => {
    note(c, d, t, { freq: 220, at: 0, dur: 0.5, type: 'sawtooth', gain: 0.09, slideTo: 140 });
    note(c, d, t, { freq: 110, at: 0, dur: 0.6, gain: 0.2, slideTo: 80 });
    return 0.65;
  },
  objective: (c, d, t) => {
    [C5, E5, G5, C6].forEach((f, i) => note(c, d, t, { freq: f, at: i * 0.075, dur: 0.38 - i * 0.04, type: 'triangle', gain: 0.13 }));
    note(c, d, t, { freq: E6, at: 0.3, dur: 0.5, gain: 0.04 });
    return 0.85;
  },
  notify: (c, d, t) => {
    note(c, d, t, { freq: G5, at: 0, dur: 0.16, type: 'triangle', gain: 0.14 });
    note(c, d, t, { freq: C6, at: 0.12, dur: 0.28, type: 'triangle', gain: 0.14 });
    return 0.42;
  },
  vibrate: (c, d, t) => {
    buzz(c, d, t, 0.32);
    buzz(c, d, t + 0.45, 0.32);
    return 0.8;
  },
  star: (c, d, t) => {
    note(c, d, t, { freq: 1318.5, at: 0, dur: 0.25, gain: 0.1, slideTo: 1760 });
    note(c, d, t, { freq: 2637, at: 0.04, dur: 0.3, gain: 0.04 });
    noiseBurst(c, d, t, 0.15, 5000, 9000, 0.03);
    return 0.35;
  },
  missionComplete: (c, d, t) => {
    const seq: [number, number, number][] = [
      [C5, 0, 0.14],
      [E5, 0.13, 0.14],
      [G5, 0.26, 0.14],
      [C6, 0.39, 0.6],
    ];
    for (const [f, at, dur] of seq) {
      note(c, d, t, { freq: f, at, dur, type: 'triangle', gain: 0.15 });
      note(c, d, t, { freq: f / 2, at, dur, gain: 0.07 });
    }
    for (const f of [E5, G5]) note(c, d, t, { freq: f, at: 0.39, dur: 0.7, gain: 0.06 });
    return 1.1;
  },
  missionFailed: (c, d, t) => {
    [A4, F4, D4].forEach((f, i) => note(c, d, t, { freq: f, at: i * 0.2, dur: 0.4, type: 'triangle', gain: 0.12 }));
    return 0.85;
  },
  correctAnswer: (c, d, t) => {
    note(c, d, t, { freq: G5, at: 0, dur: 0.12, type: 'triangle', gain: 0.15 });
    note(c, d, t, { freq: C6, at: 0.08, dur: 0.26, type: 'triangle', gain: 0.15 });
    return 0.36;
  },
  incorrectAnswer: (c, d, t) => {
    note(c, d, t, { freq: 196, at: 0, dur: 0.14, type: 'square', gain: 0.07 });
    note(c, d, t, { freq: 165, at: 0.13, dur: 0.24, type: 'square', gain: 0.07 });
    return 0.4;
  },
};

export function synthSfx(id: SfxId, c: BaseAudioContext, dest: AudioNode, t: number): number {
  return SFX_SYNTH[id](c, dest, t);
}

/** Qadam: qisqa filtrlangan shovqin; chap/o‘ng qadam ohangi biroz farq qiladi */
export function synthFootstep(def: FootstepDef, c: BaseAudioContext, dest: AudioNode, t: number, alt: boolean): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = def.freq * (alt ? 0.88 : 1) * (0.94 + Math.random() * 0.12);
  filter.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + def.decay);
  src.connect(filter).connect(g).connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(t + def.decay + 0.05);
}

// ---------- Takrorlanuvchi tovushlar ----------

/** Oldindan rejalashtiruvchi: setInterval faqat keyingi hodisalarni qo‘shadi, aniq vaqt — AudioContext soatida */
function scheduler(c: BaseAudioContext, period: number, emit: (at: number, n: number) => void, jitter = 0): Stoppable {
  let next = c.currentTime + 0.05;
  let n = 0;
  const tick = () => {
    while (next < c.currentTime + 0.6) {
      emit(next, n++);
      next += period * (1 + (Math.random() - 0.5) * jitter);
    }
  };
  tick();
  const timer = setInterval(tick, 200);
  return { stop: () => clearInterval(timer) };
}

/** Uzluksiz filtrlangan shovqin (xona shovqini, ventilyator) */
function noiseBed(c: BaseAudioContext, dest: AudioNode, type: BiquadFilterType, freq: number, q: number, gain: number): Stoppable {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(dest);
  src.start();
  return { stop: () => src.stop() };
}

function hum(c: BaseAudioContext, dest: AudioNode, freq: number, gain: number): Stoppable {
  const osc = c.createOscillator();
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  osc.connect(g).connect(dest);
  osc.start();
  return { stop: () => osc.stop() };
}

const LOOP_SYNTH: Record<LoopId, (c: BaseAudioContext, d: AudioNode) => Stoppable[]> = {
  // Klassik telefon qo‘ng‘irog‘i: 440 + 480 Hz, 1.6 s jiringlash / 1 s jimlik
  phoneRing: (c, d) => [
    scheduler(c, 2.6, (at) => {
      for (const f of [440, 480]) {
        note(c, d, at, { freq: f, at: 0, dur: 1.6, gain: 0.1, attack: 0.03 });
        note(c, d, at, { freq: f, at: 0.02, dur: 1.5, gain: 0.03, type: 'square' });
      }
    }),
  ],
  // Kunduzgi ofis: ventilyatsiya shovqini va uzoqdan klaviatura
  roomToneDay: (c, d) => [
    noiseBed(c, d, 'lowpass', 420, 0.5, 0.06),
    scheduler(
      c,
      2.4,
      (at, n) => {
        if (n % 3 === 0) return;
        for (let i = 0; i < 4; i++) noiseBurst(c, d, at + i * 0.11, 0.03, 3000, 2500, 0.012, 4);
      },
      0.8,
    ),
  ],
  // Tungi ofis: past g‘uvillash va vaqti-vaqti bilan uzoqdan o‘tgan mashina
  roomToneNight: (c, d) => [
    noiseBed(c, d, 'lowpass', 260, 0.5, 0.07),
    hum(c, d, 55, 0.025),
    scheduler(c, 9, (at, n) => n > 0 && noiseBurst(c, d, at, 3.2, 180, 520, 0.05, 0.6), 0.5),
  ],
  computerHum: (c, d) => [noiseBed(c, d, 'bandpass', 900, 0.8, 0.12), hum(c, d, 120, 0.02)],
  // Stol ustidagi telefon: sahnadagi titrash animatsiyasi bilan bir xil (har 2.2 s, 0.5 s)
  phoneBuzz: (c, d) => [scheduler(c, 2.2, (at) => buzz(c, d, at, 0.5, 0.4))],
  coffeeMachine: (c, d) => [hum(c, d, 92, 0.05), noiseBed(c, d, 'lowpass', 300, 0.7, 0.04)],
  waterCooler: (c, d) => [
    scheduler(
      c,
      6,
      (at) => {
        for (let i = 0; i < 3; i++) note(c, d, at, { freq: 260 + i * 70, at: i * 0.09, dur: 0.12, gain: 0.12, slideTo: 520 + i * 90 });
      },
      0.6,
    ),
  ],
  clockTick: (c, d) => [scheduler(c, 1, (at, n) => noiseBurst(c, d, at, 0.02, n % 2 ? 4200 : 3600, 3000, 0.12, 8))],
};

export function synthLoop(id: LoopId, c: BaseAudioContext, dest: AudioNode): Stoppable {
  const parts = LOOP_SYNTH[id](c, dest);
  return { stop: () => parts.forEach((p) => p.stop()) };
}

// ---------- Fon musiqasi (generativ) ----------

interface Track {
  /** [bas, [akkord notalari]] (Hz) */
  chords: [number, number[]][];
  seconds: number;
  /** Arpedjio notalari soni bir akkordda (0 — yo‘q) */
  arp: number;
  lowpass: number;
}

const TRACKS: Record<MusicId, Track> = {
  // Menyu: yorug‘ va sokin (C–Am–F–G)
  menu: {
    chords: [
      [130.81, [261.63, 329.63, 392.0]],
      [110.0, [220.0, 261.63, 329.63]],
      [87.31, [174.61, 220.0, 261.63]],
      [98.0, [196.0, 246.94, 293.66]],
    ],
    seconds: 4,
    arp: 4,
    lowpass: 2000,
  },
  // O‘yin: harakatli arpedjio (Am–F–C–G)
  gameplay: {
    chords: [
      [110.0, [220.0, 261.63, 329.63]],
      [87.31, [174.61, 220.0, 261.63]],
      [130.81, [261.63, 329.63, 392.0]],
      [98.0, [196.0, 246.94, 293.66]],
    ],
    seconds: 3.2,
    arp: 8,
    lowpass: 1800,
  },
  // Tun: qorong‘iroq va sekin (Dm–Bb–F–C)
  night: {
    chords: [
      [73.42, [146.83, 174.61, 220.0]],
      [58.27, [116.54, 146.83, 174.61]],
      [87.31, [174.61, 220.0, 261.63]],
      [65.41, [130.81, 164.81, 196.0]],
    ],
    seconds: 4.8,
    arp: 4,
    lowpass: 1100,
  },
};

function pad(c: BaseAudioContext, dest: AudioNode, freq: number, at: number, dur: number, peak: number, type: OscillatorType) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.4, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

export function synthMusic(id: MusicId, c: BaseAudioContext, dest: AudioNode): Stoppable {
  const track = TRACKS[id];
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = track.lowpass;
  filter.connect(dest);
  const s = scheduler(c, track.seconds, (at, n) => {
    const [bass, notes] = track.chords[n % track.chords.length]!;
    pad(c, filter, bass, at, track.seconds, 0.5, 'sine');
    for (const f of notes) pad(c, filter, f, at, track.seconds, 0.16, 'triangle');
    const step = track.seconds / Math.max(1, track.arp);
    for (let i = 0; i < track.arp; i++) pad(c, filter, notes[[0, 1, 2, 1][i % 4]!]! * 2, at + i * step, step * 1.6, 0.1, 'sine');
  });
  return {
    stop: () => {
      s.stop();
      // Rejalashtirilgan notalar so‘nib bo‘lgach, filtrni uzamiz
      setTimeout(() => filter.disconnect(), (track.seconds + 1) * 1000);
    },
  };
}
