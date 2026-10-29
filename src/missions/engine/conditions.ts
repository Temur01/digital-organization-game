import type { Condition, Flag } from '../../types/models';

export function evaluate(condition: Condition | undefined, flags: readonly Flag[]): boolean {
  if (!condition) return true;
  const has = (f: Flag) => flags.includes(f);
  if (condition.all && !condition.all.every(has)) return false;
  if (condition.any && !condition.any.some(has)) return false;
  if (condition.none && condition.none.some(has)) return false;
  return true;
}

export const doneFlag = (decisionId: string) => `done:${decisionId}`;
export const clueFlag = (clueId: string) => `clue:${clueId}`;
