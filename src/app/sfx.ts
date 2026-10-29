/** Juda sodda UI tovushlari (WebAudio). Tashqi fayl yuklanmaydi. */
export type SfxName = 'safe' | 'risky' | 'critical' | 'clue';

const TONES: Record<SfxName, [number, number][]> = {
  safe: [[660, 0.08], [880, 0.12]],
  risky: [[440, 0.12], [370, 0.14]],
  critical: [[300, 0.16], [220, 0.22]],
  clue: [[990, 0.07]],
};

let ctx: AudioContext | null = null;

export function playSfx(name: SfxName): void {
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, dur] of TONES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    /* tovush ixtiyoriy */
  }
}
