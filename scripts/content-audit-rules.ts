import type { ChoiceOutcome } from '../src/types/models';

/** Jev bergan mustaqil baholar; qaror quyidagi jadvalda, kodda qabul qilinadi. */
export interface ChoiceJudgment {
  /** Noul: harakat xavfsizlik amaliyotiga mosmi (0–1) */
  followsPractice: number;
  /** Score: 0 — zarar yo‘q, 1 — bilvosita xavf, 2 — bevosita jiddiy zarar */
  harm: number;
}

export type AuditFlag = 'safe-looks-harmful' | 'critical-looks-harmless' | 'risky-looks-safe' | 'risky-looks-critical';

const YES = 0.7;
const NO = 0.3;

/**
 * Muallif belgilagan natija va baholar mos kelmasa, inson ko‘rib chiqishi uchun belgi qaytaradi.
 * 0.3–0.7 oralig‘i — «aniq emas», belgi qo‘yilmaydi. Belgi xato degani emas: kontentni avtomatik o‘zgartirmaydi.
 */
export function auditChoice(outcome: ChoiceOutcome, { followsPractice, harm }: ChoiceJudgment): AuditFlag | null {
  switch (outcome) {
    case 'safe':
      return followsPractice < NO || harm >= 1.5 ? 'safe-looks-harmful' : null;
    case 'critical':
      return followsPractice > YES || harm < 0.5 ? 'critical-looks-harmless' : null;
    case 'risky':
      if (followsPractice > YES && harm < 0.5) return 'risky-looks-safe';
      return harm >= 1.8 ? 'risky-looks-critical' : null;
  }
}
