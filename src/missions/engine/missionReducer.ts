import type {
  Effect,
  InteractionAction,
  InteractiveObject,
  Mission,
  MissionId,
  MissionPhase,
  MissionResult,
  MissionRuntimeState,
  Objective,
} from '../../types/models';
import { clueFlag, doneFlag, evaluate } from './conditions';
import { computeStars, maxScore } from './scoring';

export type MissionAction =
  | { type: 'START_MISSION'; missionId: MissionId }
  | { type: 'SCENE_READY' }
  | { type: 'ACTIVATE_HOTSPOT'; hotspotId: string }
  | { type: 'OPEN_DECISION'; decisionId: string }
  | { type: 'FIND_CLUE'; clueId: string }
  | { type: 'CHOOSE'; decisionId: string; choiceId: string }
  | { type: 'ACK' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' };

const PAUSABLE: MissionPhase[] = ['exploring', 'interacting', 'deciding', 'feedback', 'consequence'];

export function createInitialState(missionId: MissionId): MissionRuntimeState {
  return {
    missionId,
    phase: 'loading',
    resumeTo: null,
    activeOverlay: null,
    flags: [],
    cluesFound: [],
    decisionLog: {},
    pendingFeedback: null,
    score: 0,
  };
}

// ---------- Yordamchi selectorlar (UI ham ishlatadi) ----------

export function isHotspotVisible(h: InteractiveObject, flags: readonly string[]): boolean {
  return evaluate(h.visibleWhen, flags);
}

export function isHotspotEnabled(h: InteractiveObject, flags: readonly string[]): boolean {
  return evaluate(h.enabledWhen, flags);
}

export function isHotspotDone(h: InteractiveObject, flags: readonly string[]): boolean {
  return h.doneWhen !== undefined && evaluate(h.doneWhen, flags);
}

export function isDecisionDone(state: MissionRuntimeState, decisionId: string): boolean {
  return state.flags.includes(doneFlag(decisionId));
}

export function isObjectiveDone(o: Objective, flags: readonly string[]): boolean {
  return evaluate(o.completeWhen, flags);
}

export function currentObjective(mission: Mission, flags: readonly string[]): Objective | null {
  return mission.objectives.find((o) => !o.optional && !isObjectiveDone(o, flags)) ?? null;
}

// ---------- Ichki yordamchilar ----------

function addFlag(state: MissionRuntimeState, flag: string): MissionRuntimeState {
  return state.flags.includes(flag) ? state : { ...state, flags: [...state.flags, flag] };
}

function addClue(state: MissionRuntimeState, clueId: string, mission: Mission): MissionRuntimeState {
  const clue = mission.clues[clueId];
  if (!clue || state.cluesFound.includes(clueId)) return state;
  return addFlag(
    { ...state, cluesFound: [...state.cluesFound, clueId], score: state.score + clue.points },
    clueFlag(clueId),
  );
}

function applyEffects(state: MissionRuntimeState, effects: Effect[] | undefined, mission: Mission): MissionRuntimeState {
  return (effects ?? []).reduce<MissionRuntimeState>(
    (s, e) => (e.type === 'setFlag' ? addFlag(s, e.flag) : addClue(s, e.clueId, mission)),
    state,
  );
}

function maybeComplete(state: MissionRuntimeState, mission: Mission): MissionRuntimeState {
  if (state.phase !== 'exploring' && state.phase !== 'interacting') return state;
  if (!evaluate(mission.completeWhen, state.flags)) return state;
  return { ...state, phase: 'completed', activeOverlay: null };
}

function runAction(state: MissionRuntimeState, action: InteractionAction): MissionRuntimeState {
  switch (action.type) {
    case 'dialog':
      return { ...state, phase: 'interacting', activeOverlay: { type: 'dialog', dialogId: action.dialogId } };
    case 'openSim':
      return { ...state, phase: 'interacting', activeOverlay: { type: 'sim', app: action.app } };
    case 'decision':
      if (isDecisionDone(state, action.decisionId)) return state;
      return {
        ...state,
        phase: 'deciding',
        activeOverlay: { type: 'decision', decisionId: action.decisionId, returnTo: null },
      };
  }
}

// ---------- Reducer ----------

export function missionReducer(
  state: MissionRuntimeState,
  action: MissionAction,
  mission: Mission,
): MissionRuntimeState {
  switch (action.type) {
    case 'START_MISSION':
    case 'RESTART':
      return createInitialState(action.type === 'START_MISSION' ? action.missionId : state.missionId);

    case 'SCENE_READY':
      return state.phase === 'loading' ? { ...state, phase: 'exploring' } : state;

    case 'ACTIVATE_HOTSPOT': {
      if (state.phase !== 'exploring') return state;
      const h = mission.hotspots.find((x) => x.id === action.hotspotId);
      if (!h || !isHotspotVisible(h, state.flags) || !isHotspotEnabled(h, state.flags)) return state;
      const done = isHotspotDone(h, state.flags);
      const next = done ? h.actionWhenDone : h.action;
      return next ? runAction(state, next) : state;
    }

    case 'OPEN_DECISION': {
      if (state.phase !== 'interacting' || !mission.decisions[action.decisionId]) return state;
      if (isDecisionDone(state, action.decisionId)) return state;
      return {
        ...state,
        phase: 'deciding',
        activeOverlay: { type: 'decision', decisionId: action.decisionId, returnTo: state.activeOverlay },
      };
    }

    case 'FIND_CLUE':
      if (state.phase !== 'interacting' && state.phase !== 'deciding') return state;
      return addClue(state, action.clueId, mission);

    case 'CHOOSE': {
      if (state.phase !== 'interacting' && state.phase !== 'deciding') return state;
      const decision = mission.decisions[action.decisionId];
      const choice = decision?.choices.find((c) => c.id === action.choiceId);
      if (!decision || !choice || isDecisionDone(state, decision.id)) return state;

      const prev = state.decisionLog[decision.id];
      const attempts = (prev?.attempts ?? 0) + 1;
      const firstAttempt = attempts === 1;
      let next: MissionRuntimeState = {
        ...state,
        decisionLog: {
          ...state.decisionLog,
          [decision.id]: {
            decisionId: decision.id,
            firstChoiceId: prev?.firstChoiceId ?? choice.id,
            firstOutcome: prev?.firstOutcome ?? choice.outcome,
            finalChoiceId: choice.id,
            attempts,
          },
        },
        score: state.score + (firstAttempt && choice.outcome === 'safe' ? choice.points : 0),
        pendingFeedback: { decisionId: decision.id, choiceId: choice.id, returnPhase: state.phase },
        phase: 'feedback',
      };
      if (choice.outcome === 'safe') {
        next = applyEffects(addFlag(next, doneFlag(decision.id)), choice.effects, mission);
      }
      return next;
    }

    case 'ACK': {
      if (state.phase === 'consequence') return { ...state, phase: 'failed', activeOverlay: null };
      if (state.phase !== 'feedback' || !state.pendingFeedback) return state;
      const { decisionId, choiceId, returnPhase } = state.pendingFeedback;
      const outcome = mission.decisions[decisionId]?.choices.find((c) => c.id === choiceId)?.outcome;

      if (outcome === 'critical') return { ...state, phase: 'consequence' };
      if (outcome === 'risky') return { ...state, phase: returnPhase, pendingFeedback: null };

      // safe: qaror oynasi yopiladi va oldingi kontekstga qaytiladi
      let next: MissionRuntimeState = { ...state, pendingFeedback: null };
      if (returnPhase === 'deciding' && state.activeOverlay?.type === 'decision') {
        const back = state.activeOverlay.returnTo;
        next = { ...next, activeOverlay: back, phase: back ? 'interacting' : 'exploring' };
      } else {
        next = { ...next, phase: returnPhase };
      }
      return maybeComplete(next, mission);
    }

    case 'CLOSE_OVERLAY': {
      if (state.phase !== 'interacting' || !state.activeOverlay) return state;
      const overlay = state.activeOverlay;
      if (overlay.type === 'dialog') {
        const dialog = mission.dialogs[overlay.dialogId];
        const next = applyEffects(state, dialog?.effectsOnEnd, mission);
        if (dialog?.thenDecisionId && !isDecisionDone(next, dialog.thenDecisionId)) {
          return {
            ...next,
            phase: 'deciding',
            activeOverlay: { type: 'decision', decisionId: dialog.thenDecisionId, returnTo: null },
          };
        }
        return maybeComplete({ ...next, phase: 'exploring', activeOverlay: null }, mission);
      }
      return maybeComplete({ ...state, phase: 'exploring', activeOverlay: null }, mission);
    }

    case 'PAUSE':
      return PAUSABLE.includes(state.phase) ? { ...state, resumeTo: state.phase, phase: 'paused' } : state;

    case 'RESUME':
      return state.phase === 'paused' && state.resumeTo
        ? { ...state, phase: state.resumeTo, resumeTo: null }
        : state;
  }
}

export function buildResult(state: MissionRuntimeState, mission: Mission, now = new Date()): MissionResult {
  const passed = state.phase === 'completed';
  return {
    missionId: mission.id,
    outcome: passed ? 'passed' : 'failed',
    score: state.score,
    maxScore: maxScore(mission),
    stars: computeStars(state, mission, passed),
    cluesFound: [...state.cluesFound],
    decisions: Object.keys(mission.decisions)
      .map((id) => state.decisionLog[id])
      .filter((d): d is NonNullable<typeof d> => d !== undefined),
    finishedAt: now.toISOString(),
  };
}
