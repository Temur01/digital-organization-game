import type { ChoiceOutcome, HotspotKind } from '../../types/models';
import type { SfxId } from './audioTypes';
import { audioManager } from './index';

/**
 * O‘yin hodisalari → tovushlar. O‘yin mantig‘i faqat «nima bo‘ldi»ni aytadi;
 * qaysi tovush chalinishini shu yerda hal qilamiz (o‘yin obyektlari audioga bog‘lanmaydi).
 */
export type GameAudioEvent =
  | { type: 'hotspotActivated'; kind: HotspotKind }
  | { type: 'clueFound' }
  | { type: 'decision'; outcome: ChoiceOutcome }
  | { type: 'objectiveComplete' }
  | { type: 'quizAnswer'; correct: boolean }
  | { type: 'missionEnded'; passed: boolean }
  | { type: 'resultStar' }
  | { type: 'ui'; action: 'tap' | 'windowOpen' | 'windowClose' | 'menuOpen' | 'notify' | 'vibrate' };

export function sfxForEvent(e: GameAudioEvent): SfxId {
  switch (e.type) {
    case 'hotspotActivated':
      return e.kind === 'door' ? 'doorOpen' : e.kind === 'device' || e.kind === 'box' ? 'pickup' : e.kind === 'npc' ? 'talk' : 'interaction';
    case 'clueFound':
      return 'clue';
    case 'decision':
      return e.outcome === 'safe' ? 'correct' : e.outcome;
    case 'objectiveComplete':
      return 'objective';
    case 'quizAnswer':
      return e.correct ? 'correctAnswer' : 'incorrectAnswer';
    case 'missionEnded':
      return e.passed ? 'missionComplete' : 'missionFailed';
    case 'resultStar':
      return 'star';
    case 'ui':
      return e.action;
  }
}

/** `delay` — soniyalarda (animatsiyaga moslash) */
export function playGameAudio(e: GameAudioEvent, opts?: { delay?: number }): boolean {
  return audioManager.playSfx(sfxForEvent(e), opts);
}
