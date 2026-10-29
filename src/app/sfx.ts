/**
 * O‘yin tovushlari (WebAudio sintezi). Tashqi fayl yuklanmaydi — har bir tovush osilator va shovqindan yasaladi.
 * Barcha tovushlar bitta umumiy balandlik (master) va cheklagich (compressor) orqali o‘tadi —
 * bir vaqtda bir nechtasi chalinsa ham «chirillamaydi».
 */
export type SfxName = 'safe' | 'risky' | 'critical' | 'clue' | 'tap' | 'open' | 'close' | 'vibrate' | 'notify' | 'objective' | 'star' | 'fanfare' | 'fail';

const MASTER_VOLUME = 0.55;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

/** Umumiy AudioContext. Brauzer uni foydalanuvchi harakatisiz «uxlatib» qo‘yadi — birinchi bosishda uyg‘otamiz. */
export function audioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    const resume = () => {
      if (ctx?.state === 'suspended') void ctx.resume();
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
  }
  return ctx;
}

function out(): { ctx: AudioContext; dest: AudioNode } {
  const c = audioContext();
  if (!master) {
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    master = c.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(limiter).connect(c.destination);
  }
  return { ctx: c, dest: master };
}

/** Sozlamalardagi «Tovush effektlari» — o‘chirilsa hech qanday effekt chalinmaydi */
export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) stopRing();
}

interface Note {
  freq: number;
  /** Boshlanish (soniya, chalinish vaqtiga nisbatan) */
  at: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
  /** Nota oxirigacha chastota shu qiymatga siljiydi */
  slideTo?: number;
  attack?: number;
}

function note(c: AudioContext, dest: AudioNode, t0: number, n: Note) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const start = t0 + n.at;
  const peak = n.gain ?? 0.18;
  const attack = n.attack ?? 0.008;
  osc.type = n.type ?? 'sine';
  osc.frequency.setValueAtTime(n.freq, start);
  if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, start + n.dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
  osc.connect(g).connect(dest);
  osc.start(start);
  osc.stop(start + n.dur + 0.05);
}

/** Qisqa shovqin (shitirlash, «vush») — filtrlangan oq shovqin */
function noise(c: AudioContext, dest: AudioNode, t0: number, dur: number, from: number, to: number, peak: number) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(dest);
  src.start(t0);
}

/** Telefon titrashi: past «g‘o‘ng‘illash», 25 Hz da amplituda modulyatsiyasi bilan */
function buzz(c: AudioContext, dest: AudioNode, t0: number, dur: number) {
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
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(am.gain);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.32, t0 + 0.03);
  env.gain.setValueAtTime(0.32, t0 + dur - 0.05);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(lowpass).connect(am).connect(env).connect(dest);
  for (const node of [osc, lfo]) {
    node.start(t0);
    node.stop(t0 + dur + 0.05);
  }
}

// Notalar (Hz)
const C5 = 523.25,
  E5 = 659.25,
  G5 = 783.99,
  C6 = 1046.5,
  E6 = 1318.5,
  A4 = 440,
  F4 = 349.23,
  D4 = 293.66;

const SOUNDS: Record<SfxName, (c: AudioContext, dest: AudioNode, t: number) => void> = {
  // Xavfsiz tanlov — yorqin ko‘tariluvchi ikki nota
  safe: (c, d, t) => {
    note(c, d, t, { freq: E5, at: 0, dur: 0.14, type: 'triangle' });
    note(c, d, t, { freq: C6, at: 0.09, dur: 0.32, type: 'triangle' });
    note(c, d, t, { freq: E6, at: 0.09, dur: 0.32, gain: 0.05 });
  },
  // Xavfli — ikkilanuvchi pastga tushish
  risky: (c, d, t) => {
    note(c, d, t, { freq: A4, at: 0, dur: 0.16, type: 'triangle' });
    note(c, d, t, { freq: 370, at: 0.13, dur: 0.26, type: 'triangle' });
  },
  // Jiddiy xato — past, «og‘ir» tovush
  critical: (c, d, t) => {
    note(c, d, t, { freq: 220, at: 0, dur: 0.5, type: 'sawtooth', gain: 0.09, slideTo: 140 });
    note(c, d, t, { freq: 110, at: 0, dur: 0.6, type: 'sine', gain: 0.2, slideTo: 80 });
  },
  // Belgi topildi — yaltiroq «ding»
  clue: (c, d, t) => {
    note(c, d, t, { freq: 1567.98, at: 0, dur: 0.18, gain: 0.12 });
    note(c, d, t, { freq: 2093, at: 0.05, dur: 0.22, gain: 0.07 });
  },
  // Tugma bosilishi — juda yumshoq «tik»
  tap: (c, d, t) => {
    note(c, d, t, { freq: 1800, at: 0, dur: 0.035, gain: 0.035, type: 'triangle', slideTo: 1200 });
  },
  // Oyna ochilishi — yuqoriga «vush» va pufakcha
  open: (c, d, t) => {
    noise(c, d, t, 0.22, 500, 2600, 0.08);
    note(c, d, t, { freq: 620, at: 0.03, dur: 0.12, gain: 0.08, slideTo: 980 });
  },
  close: (c, d, t) => {
    noise(c, d, t, 0.18, 2200, 500, 0.06);
  },
  // MFA push — ikki marta titrash
  vibrate: (c, d, t) => {
    buzz(c, d, t, 0.32);
    buzz(c, d, t + 0.45, 0.32);
  },
  // Yangi xabar / bildirishnoma
  notify: (c, d, t) => {
    note(c, d, t, { freq: G5, at: 0, dur: 0.16, type: 'triangle', gain: 0.14 });
    note(c, d, t, { freq: C6, at: 0.12, dur: 0.28, type: 'triangle', gain: 0.14 });
  },
  // Bosqich bajarildi — ko‘tariluvchi arpedjio (C–E–G–C)
  objective: (c, d, t) => {
    [C5, E5, G5, C6].forEach((f, i) => note(c, d, t, { freq: f, at: i * 0.075, dur: 0.38 - i * 0.04, type: 'triangle', gain: 0.13 }));
    note(c, d, t, { freq: E6, at: 0.3, dur: 0.5, gain: 0.04 });
  },
  // Natija ekranida har bir yulduz
  star: (c, d, t) => {
    note(c, d, t, { freq: 1318.5, at: 0, dur: 0.25, gain: 0.1, slideTo: 1760 });
    note(c, d, t, { freq: 2637, at: 0.04, dur: 0.3, gain: 0.04 });
    noise(c, d, t, 0.15, 5000, 9000, 0.03);
  },
  // Missiya muvaffaqiyatli — kichik fanfara
  fanfare: (c, d, t) => {
    const seq: [number, number, number][] = [
      [C5, 0, 0.14],
      [E5, 0.13, 0.14],
      [G5, 0.26, 0.14],
      [C6, 0.39, 0.6],
    ];
    for (const [f, at, dur] of seq) {
      note(c, d, t, { freq: f, at, dur, type: 'triangle', gain: 0.15 });
      note(c, d, t, { freq: f / 2, at, dur, type: 'sine', gain: 0.07 });
    }
    for (const f of [E5, G5]) note(c, d, t, { freq: f, at: 0.39, dur: 0.7, type: 'sine', gain: 0.06 });
  },
  // Missiya muvaffaqiyatsiz — sokin pastga tushish
  fail: (c, d, t) => {
    [A4, F4, D4].forEach((f, i) => note(c, d, t, { freq: f, at: i * 0.2, dur: 0.4, type: 'triangle', gain: 0.12 }));
  },
};

export function playSfx(name: SfxName, delaySeconds = 0): void {
  if (!enabled) return;
  try {
    const { ctx: c, dest } = out();
    SOUNDS[name](c, dest, c.currentTime + 0.01 + delaySeconds);
  } catch {
    /* tovush ixtiyoriy */
  }
}

// ---------- Kiruvchi qo‘ng‘iroq ----------

let ringTimer: number | undefined;
let ringBus: GainNode | null = null;

/**
 * Klassik telefon qo‘ng‘irog‘i (440 + 480 Hz, 2 s jiringlash / 1 s jimlik).
 * `rings` marta jiringlaydi va o‘zi to‘xtaydi; qaytarilgan funksiya — darhol to‘xtatish.
 */
export function startRing(rings = 2): () => void {
  stopRing();
  if (!enabled) return stopRing;
  let left = rings;
  const ringOnce = () => {
    try {
      const { ctx: c, dest } = out();
      // Har bir jiringlash alohida «shina» orqali — to‘xtatilganda darhol o‘chirish uchun
      ringBus = c.createGain();
      ringBus.connect(dest);
      const t = c.currentTime + 0.02;
      for (const f of [440, 480]) note(c, ringBus, t, { freq: f, at: 0, dur: 1.6, gain: 0.07, attack: 0.03 });
      // Jiringlashning «metall» rangi
      for (const f of [440, 480]) note(c, ringBus, t, { freq: f, at: 0.02, dur: 1.5, gain: 0.02, type: 'square' });
    } catch {
      /* tovush ixtiyoriy */
    }
    left -= 1;
    if (left > 0) ringTimer = window.setTimeout(ringOnce, 2600);
    else ringTimer = undefined;
  };
  ringOnce();
  return stopRing;
}

export function stopRing(): void {
  if (ringTimer !== undefined) window.clearTimeout(ringTimer);
  ringTimer = undefined;
  if (ringBus && ctx) {
    ringBus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    ringBus = null;
  }
}
