import { MISSION_LIST } from '../missions/data';
import type { AppScreen, LocalProgress, MissionId } from '../types/models';

export function canOpenMission(progress: LocalProgress, id: MissionId): boolean {
  return progress.missions[id].status !== 'locked';
}

export function nextMissionId(id: MissionId): MissionId | null {
  const index = MISSION_LIST.findIndex((m) => m.id === id);
  return MISSION_LIST[index + 1]?.id ?? null;
}

export function previousMissionTitle(id: MissionId): string | null {
  const index = MISSION_LIST.findIndex((m) => m.id === id);
  return index > 0 ? (MISSION_LIST[index - 1]?.title ?? null) : null;
}

export function hasAnyProgress(progress: LocalProgress): boolean {
  return progress.selectedCharacter !== null || Object.values(progress.missions).some((m) => m.attempts > 0);
}

/** «Davom etish»: personaj tanlangan bo‘lsa xaritaga, aks holda tanlashga. */
export function continueTarget(progress: LocalProgress): AppScreen {
  return progress.selectedCharacter ? 'map' : 'characterSelect';
}

export function allCompleted(progress: LocalProgress): boolean {
  return Object.values(progress.missions).every((m) => m.status === 'completed');
}
