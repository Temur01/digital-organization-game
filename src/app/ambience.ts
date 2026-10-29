/**
 * O‘yin fon musiqasi va qadam tovushlari — WebAudio’da sintez qilinadi, tashqi fayl yuklanmaydi.
 * Musiqa: sokin akkordlar (Am–F–C–G) va yumshoq arpedjio, past ovozda tsikl bo‘lib chalinadi.
 */
import { audioContext } from './sfx';

/** Hozircha o‘chirilgan: musiqa ham, qadam tovushi ham chalinmaydi */
export const AMBIENCE_ENABLED = false;

const MUSIC_VOLUME = 0.05;
const STEP_VOLUME = 0.12;
const CHORD_SECONDS = 3.2;
const LOOKAHEAD_SECONDS = 0.6;

/** Har bir akkord: bas notasi va yuqori uchta nota (Hz) */
const CHORDS: [number, number[]][] = [
  [110.0, [220.0, 261.63, 329.63]], // Am
  [87.31, [174.61, 220.0, 261.63]], // F
  [130.81, [261.63, 329.63, 392.0]], // C
  [98.0, [196.0, 246.94, 293.66]], // G
];

let master: GainNode | null = null;
let timer: number | undefined;
let nextChordAt = 0;
let chordIndex = 0;
let noise: AudioBuffer | null = null;
let stepIndex = 0;

function tone(ctx: AudioContext, out: AudioNode, freq: number, start: number, dur: number, peak: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.4, dur / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function scheduleChord(ctx: AudioContext, out: AudioNode, at: number) {
  const [bass, notes] = CHORDS[chordIndex % CHORDS.length]!;
  chordIndex++;
  tone(ctx, out, bass, at, CHORD_SECONDS, 0.5, 'sine');
  for (const n of notes) tone(ctx, out, n, at, CHORD_SECONDS, 0.18, 'triangle');
  // Arpedjio: akkord notalari bir oktava yuqorida, sakkizlik notalar
  const step = CHORD_SECONDS / 8;
  for (let i = 0; i < 8; i++) tone(ctx, out, notes[[0, 1, 2, 1][i % 4]!]! * 2, at + i * step, step * 1.6, 0.12, 'sine');
}

export function startMusic(): void {
  if (!AMBIENCE_ENABLED || master) return;
  try {
    const ctx = audioContext();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + 2);
    master.connect(filter).connect(ctx.destination);
    nextChordAt = ctx.currentTime + 0.1;
    chordIndex = 0;
    const out = master;
    const tick = () => {
      while (nextChordAt < ctx.currentTime + LOOKAHEAD_SECONDS) {
        scheduleChord(ctx, out, nextChordAt);
        nextChordAt += CHORD_SECONDS;
      }
    };
    tick();
    timer = window.setInterval(tick, 250);
  } catch {
    master = null;
  }
}

export function stopMusic(): void {
  window.clearInterval(timer);
  timer = undefined;
  const g = master;
  master = null;
  if (!g) return;
  try {
    const t = g.context.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    window.setTimeout(() => g.disconnect(), 4000);
  } catch {
    /* tovush ixtiyoriy */
  }
}

/** Bitta qadam: qisqa filtrlangan shovqin; chap/o‘ng qadam ohangi biroz farq qiladi */
export function playFootstep(): void {
  if (!AMBIENCE_ENABLED) return;
  try {
    const ctx = audioContext();
    if (!noise) {
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (stepIndex++ % 2 === 0 ? 520 : 440) + Math.random() * 80;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(STEP_VOLUME, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  } catch {
    /* tovush ixtiyoriy */
  }
}
