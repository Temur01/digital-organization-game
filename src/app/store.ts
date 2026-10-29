import { create } from 'zustand';
import { ui } from '../content/uz/ui';
import { MISSIONS } from '../missions/data';
import { isObjectiveDone, missionReducer, buildResult, createInitialState, type MissionAction } from '../missions/engine/missionReducer';
import {
  applyResult,
  clearProgress,
  createDefaultProgress,
  isStorageAvailable,
  loadProgress,
  saveProgress,
} from '../persistence/storage';
import type {
  AppScreen,
  CharacterId,
  LocalProgress,
  MissionId,
  MissionResult,
  MissionRuntimeState,
  Settings,
} from '../types/models';
import { playSfx, type SfxName } from './sfx';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success';
}

export interface GameStore {
  screen: AppScreen;
  settingsReturnTo: AppScreen;
  characterSelectReturnTo: AppScreen;
  progress: LocalProgress;
  storageAvailable: boolean;
  briefingMissionId: MissionId | null;
  lastResult: MissionResult | null;
  /** Oxirgi natijadan oldingi jami yulduzlar (unvon oshganini ko‘rsatish uchun) */
  starsBefore: number;
  mission: MissionRuntimeState | null;
  toasts: Toast[];

  goTo(screen: AppScreen): void;
  openSettings(): void;
  closeSettings(): void;
  openCharacterSelect(): void;
  selectCharacter(id: CharacterId): void;
  newGame(): void;
  resetProgress(): void;
  updateSettings(patch: Partial<Settings>): void;
  openBriefing(id: MissionId): void;
  startMission(id: MissionId): void;
  dispatchMission(action: MissionAction): void;
  exitMission(): void;
  pushToast(text: string, tone?: Toast['tone']): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;

export function totalStars(progress: LocalProgress): number {
  return Object.values(progress.missions).reduce((sum, m) => sum + m.bestStars, 0);
}

function persist(progress: LocalProgress): LocalProgress {
  saveProgress(progress);
  return progress;
}

export const useGameStore = create<GameStore>()((set, get) => {
  const sfx = (name: SfxName) => {
    if (get().progress.settings.sound) playSfx(name);
  };

  return {
    screen: 'title',
    settingsReturnTo: 'title',
    characterSelectReturnTo: 'title',
    progress: loadProgress(),
    storageAvailable: isStorageAvailable(),
    briefingMissionId: null,
    lastResult: null,
    starsBefore: 0,
    mission: null,
    toasts: [],

    goTo: (screen) => set({ screen }),

    openSettings: () => set((s) => ({ settingsReturnTo: s.screen, screen: 'settings' })),
    closeSettings: () => set((s) => ({ screen: s.settingsReturnTo })),

    openCharacterSelect: () =>
      set((s) => ({ characterSelectReturnTo: s.screen === 'map' ? 'map' : 'title', screen: 'characterSelect' })),

    selectCharacter: (id) =>
      set((s) => ({ progress: persist({ ...s.progress, selectedCharacter: id }), screen: 'map' })),

    newGame: () => {
      get().resetProgress();
      set({ characterSelectReturnTo: 'title', screen: 'characterSelect' });
    },

    resetProgress: () => {
      clearProgress();
      const settings = get().progress.settings;
      set({ progress: persist({ ...createDefaultProgress(), settings }), lastResult: null });
    },

    updateSettings: (patch) =>
      set((s) => ({ progress: persist({ ...s.progress, settings: { ...s.progress.settings, ...patch } }) })),

    openBriefing: (id) => {
      if (get().progress.missions[id].status === 'locked') return;
      set({ briefingMissionId: id, screen: 'briefing' });
    },

    startMission: (id) => {
      if (get().progress.missions[id].status === 'locked') return;
      set({ mission: createInitialState(id), briefingMissionId: id, screen: 'playing', toasts: [] });
    },

    dispatchMission: (action) => {
      const prev = get().mission;
      if (!prev) return;
      const mission = MISSIONS[prev.missionId];
      const next = missionReducer(prev, action, mission);
      if (next === prev) return;

      // Yon ta’sirlar: toastlar va tovushlar (reducer sof qoladi)
      for (const id of next.cluesFound.filter((c) => !prev.cluesFound.includes(c))) {
        get().pushToast(ui.game.clueFound(mission.clues[id]?.label ?? id), 'success');
        sfx('clue');
      }
      if (next.phase !== 'completed') {
        for (const o of mission.objectives) {
          if (!o.optional && isObjectiveDone(o, next.flags) && !isObjectiveDone(o, prev.flags)) {
            get().pushToast(ui.game.objectiveDone(o.label));
          }
        }
      }
      if (next.phase === 'feedback' && prev.phase !== 'feedback' && next.pendingFeedback) {
        const { decisionId, choiceId } = next.pendingFeedback;
        const outcome = mission.decisions[decisionId]?.choices.find((c) => c.id === choiceId)?.outcome;
        if (outcome) sfx(outcome);
      }

      if (next.phase === 'completed' || next.phase === 'failed') {
        // Natija avval saqlanadi, keyin ekran almashadi
        const result = buildResult(next, mission);
        const starsBefore = totalStars(get().progress);
        const progress = persist(applyResult(get().progress, result, mission.unlocks));
        set({ mission: null, lastResult: result, starsBefore, progress, screen: 'result', toasts: [] });
        return;
      }
      set({ mission: next });
    },

    exitMission: () => set({ mission: null, screen: 'map', toasts: [] }),

    pushToast: (text, tone = 'info') =>
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id: ++toastSeq, text, tone }] })),
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

export function useActiveMission() {
  const state = useGameStore((s) => s.mission);
  return state ? { state, mission: MISSIONS[state.missionId] } : null;
}
