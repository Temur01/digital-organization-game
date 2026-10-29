import { create } from 'zustand';
import { ui } from '../content/uz/ui';
import { MISSIONS } from '../missions/data';
import { isObjectiveDone, missionReducer, buildResult, createInitialState, type MissionAction } from '../missions/engine/missionReducer';
import { applyResult, clearProgress, createDefaultProgress, isStorageAvailable, loadProgress, saveProgress } from '../persistence/storage';
import type { AppScreen, CharacterId, LocalProgress, MissionId, MissionResult, MissionRuntimeState, Settings } from '../types/models';
import { audioManager } from '../game/audio';
import { playGameAudio } from '../game/audio/audioEvents';
import { resolveAudioSettings } from '../game/audio/audioSettings';
import { enqueueResult, type ServerBest } from './sync';
import { loadMissionSession, saveMissionSession } from './session';
import type { QuizResult } from '../quiz/engine';
import { normalize } from '../persistence/storage';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success';
}

export interface GameStore {
  screen: AppScreen;
  settingsReturnTo: AppScreen;
  characterSelectReturnTo: AppScreen;
  /** Kirish, profil, sinov va reyting ekranlaridan qaytish joyi */
  auxReturnTo: AppScreen;
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
  /** Sahifa yangilanganda: sessiyada shu missiya bo‘lsa — davom ettiradi, bo‘lmasa yangidan boshlaydi */
  resumeMission(id: MissionId): void;
  /** Saqlangan oxirgi natijani ko‘rsatadi (natija sahifasi yangilanganda) */
  showStoredResult(id: MissionId): boolean;
  dispatchMission(action: MissionAction): void;
  exitMission(): void;
  openAux(screen: 'auth' | 'profile' | 'quiz' | 'leaderboard'): void;
  closeAux(): void;
  finishQuiz(result: QuizResult): void;
  mergeServerProgress(best: ServerBest): void;
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
  return {
    screen: 'title',
    settingsReturnTo: 'title',
    characterSelectReturnTo: 'title',
    auxReturnTo: 'title',
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

    openCharacterSelect: () => set((s) => ({ characterSelectReturnTo: s.screen === 'map' ? 'map' : 'title', screen: 'characterSelect' })),

    selectCharacter: (id) => set((s) => ({ progress: persist({ ...s.progress, selectedCharacter: id }), screen: 'map' })),

    newGame: () => {
      get().resetProgress();
      set({ characterSelectReturnTo: 'title', screen: 'characterSelect' });
    },

    resetProgress: () => {
      clearProgress();
      const settings = get().progress.settings;
      set({ progress: persist({ ...createDefaultProgress(), settings }), lastResult: null });
    },

    updateSettings: (patch) => set((s) => ({ progress: persist({ ...s.progress, settings: { ...s.progress.settings, ...patch } }) })),

    openBriefing: (id) => {
      if (get().progress.missions[id].status === 'locked') return;
      set({ briefingMissionId: id, screen: 'briefing' });
    },

    startMission: (id) => {
      if (get().progress.missions[id].status === 'locked') return;
      const mission = createInitialState(id);
      saveMissionSession(mission);
      set({ mission, briefingMissionId: id, screen: 'playing', toasts: [] });
    },

    resumeMission: (id) => {
      if (get().progress.missions[id].status === 'locked') return;
      const saved = loadMissionSession();
      if (!saved || saved.missionId !== id) return get().startMission(id);
      const mission = MISSIONS[id];
      const pending = saved.pendingFeedback;
      const outcome = pending ? mission.decisions[pending.decisionId]?.choices.find((c) => c.id === pending.choiceId)?.outcome : undefined;
      // Jiddiy xato oqibatini yangilash bilan «chetlab o‘tib» bo‘lmaydi — oqibat ekrani qaytadi.
      // Aks holda xona qayta yuklanadi: topilgan belgilar, ball va qarorlar saqlanadi.
      const restored: MissionRuntimeState =
        outcome === 'critical'
          ? { ...saved, phase: 'consequence', resumeTo: null }
          : { ...saved, phase: 'loading', resumeTo: null, activeOverlay: null, pendingFeedback: null };
      set({ mission: restored, briefingMissionId: id, screen: 'playing', toasts: [] });
    },

    showStoredResult: (id) => {
      const stored = get().lastResult?.missionId === id ? get().lastResult : get().progress.missions[id].lastResult;
      if (!stored) return false;
      set({ lastResult: stored, starsBefore: totalStars(get().progress), screen: 'result' });
      return true;
    },

    dispatchMission: (action) => {
      const prev = get().mission;
      if (!prev) return;
      const mission = MISSIONS[prev.missionId];
      const next = missionReducer(prev, action, mission);
      if (next === prev) return;

      // Yon ta’sirlar: toastlar va tovushlar (reducer sof qoladi)
      // Obyekt bilan o‘zaro ta’sir — faqat reducer qabul qilganda (yopiq obyekt yoki takroriy bosish tovush chiqarmaydi)
      if (action.type === 'ACTIVATE_HOTSPOT') {
        const kind = mission.hotspots.find((h) => h.id === action.hotspotId)?.kind;
        if (kind) playGameAudio({ type: 'hotspotActivated', kind });
      }
      for (const id of next.cluesFound.filter((c) => !prev.cluesFound.includes(c))) {
        get().pushToast(ui.game.clueFound(mission.clues[id]?.label ?? id), 'success');
        playGameAudio({ type: 'clueFound' });
      }
      if (next.phase !== 'completed') {
        for (const o of mission.objectives) {
          if (!o.optional && isObjectiveDone(o, next.flags) && !isObjectiveDone(o, prev.flags)) {
            get().pushToast(ui.game.objectiveDone(o.label), 'success');
            // Qaror tovushi bilan ustma-ust tushmasin
            playGameAudio({ type: 'objectiveComplete' }, { delay: 0.35 });
          }
        }
      }
      if (next.phase === 'feedback' && prev.phase !== 'feedback' && next.pendingFeedback) {
        const { decisionId, choiceId } = next.pendingFeedback;
        const outcome = mission.decisions[decisionId]?.choices.find((c) => c.id === choiceId)?.outcome;
        if (outcome) playGameAudio({ type: 'decision', outcome });
      }

      if (next.phase === 'completed' || next.phase === 'failed') {
        // Natija avval saqlanadi, keyin ekran almashadi
        const result = buildResult(next, mission);
        const starsBefore = totalStars(get().progress);
        const progress = persist(applyResult(get().progress, result, mission.unlocks));
        enqueueResult({ kind: 'mission', data: result });
        saveMissionSession(null);
        set({ mission: null, lastResult: result, starsBefore, progress, screen: 'result', toasts: [] });
        return;
      }
      saveMissionSession(next);
      set({ mission: next });
    },

    exitMission: () => {
      saveMissionSession(null);
      set({ mission: null, screen: 'map', toasts: [] });
    },

    openAux: (screen) =>
      set((s) => {
        const aux: AppScreen[] = ['auth', 'profile', 'quiz', 'leaderboard'];
        return { auxReturnTo: aux.includes(s.screen) ? s.auxReturnTo : s.screen, screen };
      }),
    closeAux: () => set((s) => ({ screen: s.auxReturnTo })),

    finishQuiz: (result) => {
      const progress = persist({ ...get().progress, quizBest: Math.max(get().progress.quizBest ?? 0, result.score) });
      enqueueResult({ kind: 'quiz', data: result });
      set({ progress });
    },

    mergeServerProgress: (best) => {
      const current = get().progress;
      const missions = { ...current.missions };
      for (const [id, server] of Object.entries(best.missions)) {
        const local = missions[id as keyof typeof missions];
        if (!local) continue;
        missions[id as keyof typeof missions] = {
          ...local,
          status: server.passed ? 'completed' : local.status,
          bestScore: Math.max(local.bestScore, server.bestScore),
          bestStars: Math.max(local.bestStars, server.bestStars) as typeof local.bestStars,
          attempts: Math.max(local.attempts, server.attempts),
        };
      }
      set({ progress: persist({ ...current, missions: normalize(missions), quizBest: Math.max(current.quizBest ?? 0, best.quizBest) }) });
    },

    pushToast: (text, tone = 'info') => set((s) => ({ toasts: [...s.toasts.slice(-2), { id: ++toastSeq, text, tone }] })),
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

export function useActiveMission() {
  const state = useGameStore((s) => s.mission);
  return state ? { state, mission: MISSIONS[state.missionId] } : null;
}

// Audio sozlamalari: ishga tushganda va har o‘zgarganda AudioManager’ga uzatiladi (chalinayotgan tovushlar qayta boshlanmaydi)
audioManager.setSettings(resolveAudioSettings(useGameStore.getState().progress.settings));
useGameStore.subscribe((s, prev) => {
  if (s.progress.settings !== prev.progress.settings) audioManager.setSettings(resolveAudioSettings(s.progress.settings));
});
