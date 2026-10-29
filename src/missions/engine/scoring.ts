import type { Mission, MissionRuntimeState, Stars } from '../../types/models';

export const DECISION_POINTS = 10;

export function maxScore(mission: Mission): number {
  const decisions = Object.keys(mission.decisions).length * DECISION_POINTS;
  const clues = Object.values(mission.clues).reduce((sum, c) => sum + c.points, 0);
  return decisions + clues;
}

/**
 * ★★★ — barcha qarorlar birinchi urinishda xavfsiz va belgilarning ≥ 80 % topilgan;
 * ★★ — ball ≥ 60 %; ★ — missiya bajarilgan; jiddiy xato — 0.
 */
export function computeStars(state: MissionRuntimeState, mission: Mission, passed: boolean): Stars {
  if (!passed) return 0;
  const decisionIds = Object.keys(mission.decisions);
  const allFirstSafe = decisionIds.every((id) => state.decisionLog[id]?.firstOutcome === 'safe');
  const clueTotal = Object.keys(mission.clues).length;
  const clueRatio = clueTotal === 0 ? 1 : state.cluesFound.length / clueTotal;
  if (allFirstSafe && clueRatio >= 0.8) return 3;
  if (state.score >= maxScore(mission) * 0.6) return 2;
  return 1;
}
