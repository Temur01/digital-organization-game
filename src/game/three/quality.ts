export interface QualityLevel {
  pixelRatio: number;
  bloom: boolean;
}

/** Oyna ochiq paytida sahna shu oraliqda chiziladi (s) */
const IDLE_FRAME_INTERVAL = 0.1;
/** O‘rtacha kadr shundan uzun bo‘lsa (~40 fps), sifat pasayadi */
const SLOW_FRAME = 0.025;
const WINDOW = 45;
/** Bundan uzun kadr — yorliq almashishi yoki bir martalik uzilish, hisobga olinmaydi */
const OUTLIER = 0.25;

/** Sifat pog‘onalari: avval deyarli sezilmaydigan bloom, keyin aniqlik. */
export function qualityLadder(pixelRatio: number): QualityLevel[] {
  const levels: QualityLevel[] = [
    { pixelRatio, bloom: true },
    { pixelRatio, bloom: false },
    { pixelRatio: Math.max(1, pixelRatio * 0.75), bloom: false },
    { pixelRatio: Math.max(0.75, pixelRatio * 0.5), bloom: false },
  ];
  return levels.filter((l, i) => i === 0 || l.pixelRatio !== levels[i - 1]!.pixelRatio || l.bloom !== levels[i - 1]!.bloom);
}

/** Sekin kadrlar barqaror davom etsa, sifatni bir pog‘ona pasaytiradi. Faqat pastga: tasvir miltillamaydi. */
export class FrameGovernor {
  private level: number;
  private total = 0;
  private count = 0;

  constructor(
    private readonly ladder: readonly QualityLevel[],
    startLevel = 0,
  ) {
    this.level = Math.min(startLevel, ladder.length - 1);
  }

  get current(): QualityLevel {
    return this.ladder[this.level]!;
  }

  /** Haqiqiy kadr vaqti (s). Sifat o‘zgarsa `true`. */
  sample(dt: number): boolean {
    if (dt > OUTLIER) return false;
    this.total += dt;
    this.count++;
    if (this.count < WINDOW) return false;
    const average = this.total / this.count;
    this.total = 0;
    this.count = 0;
    if (average <= SLOW_FRAME || this.level >= this.ladder.length - 1) return false;
    this.level++;
    return true;
  }
}

export function shouldRenderFrame({ idle, sinceLastRender }: { idle: boolean; sinceLastRender: number }): boolean {
  return !idle || sinceLastRender >= IDLE_FRAME_INTERVAL;
}
