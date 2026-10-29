import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exitFullscreen } from '../app/fullscreen';
import { useReducedMotion, usePlayer } from '../app/hooks';
import { useActiveMission, useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import { audioManager } from '../game/audio';
import { surfaceForFloor } from '../game/audio/audioConfig';
import { GameBridge } from '../game/bridge';
import { createScene } from '../game/three/createScene3D';
import { isHotspotDone, isHotspotEnabled, isHotspotVisible, type MissionAction } from '../missions/engine/missionReducer';
import { SimEmailClient } from '../sim/SimEmailClient';
import { SimItPortal } from '../sim/SimItPortal';
import { SimPhone } from '../sim/SimPhone';
import { SimSocial } from '../sim/SimSocial';
import { SimWorkstation } from '../sim/SimWorkstation';
import type { HotspotVisualState, Mission, MissionRuntimeState, OverlayRef, Rect, SimAppId } from '../types/models';
import { ConsequencePanel } from '../ui/ConsequencePanel';
import { DecisionPanel } from '../ui/DecisionPanel';
import { DialogPanel } from '../ui/DialogPanel';
import { FeedbackPanel } from '../ui/FeedbackPanel';
import { HotspotList, HotspotOverlay } from '../ui/HotspotOverlay';
import { HUD } from '../ui/HUD';
import { isModalOpen } from '../ui/Modal';
import { PauseMenu } from '../ui/PauseMenu';
import type { SimProps } from '../sim/common';
import styles from './screens.module.css';

const SIMS: Record<SimAppId, (p: SimProps) => JSX.Element | null> = {
  email: SimEmailClient,
  workstation: SimWorkstation,
  phone: SimPhone,
  itPortal: SimItPortal,
  social: SimSocial,
};

const EMOTES = { safe: '😎', risky: '🤔', critical: '😱' } as const;

export function GameScreen() {
  const active = useActiveMission();
  if (!active) return null;
  return <GameView mission={active.mission} state={active.state} />;
}

function computeStates(mission: Mission, flags: readonly string[]): Record<string, HotspotVisualState> {
  const out: Record<string, HotspotVisualState> = {};
  for (const h of mission.hotspots) {
    out[h.id] = !isHotspotVisible(h, flags) ? 'hidden' : !isHotspotEnabled(h, flags) ? 'disabled' : isHotspotDone(h, flags) ? 'done' : 'idle';
  }
  return out;
}

function GameView({ mission, state }: { mission: Mission; state: MissionRuntimeState }) {
  const dispatch = useGameStore((s) => s.dispatchMission);
  const pushToast = useGameStore((s) => s.pushToast);
  const exitMission = useGameStore((s) => s.exitMission);
  const startMission = useGameStore((s) => s.startMission);
  const settings = useGameStore((s) => s.progress.settings);
  const player = usePlayer();
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  const [bridge] = useState(() => new GameBridge());
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [nearId, setNearId] = useState<string | null>(null);
  const [sceneError, setSceneError] = useState(false);

  const flagsKey = state.flags.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hotspotStates = useMemo(() => computeStates(mission, state.flags), [mission, flagsKey]);
  const exploring = state.phase === 'exploring';
  const isLoading = state.phase === 'loading';

  // Hodisa ishlovchilari eng so‘nggi qiymatlarni ref orqali o‘qiydi
  const floor = surfaceForFloor(mission.room.theme.floorStyle);
  const latest = useRef({ hotspotStates, exploring, reducedMotion, floor });
  latest.current = { hotspotStates, exploring, reducedMotion, floor };

  const activate = useCallback(
    (id: string) => {
      const h = mission.hotspots.find((x) => x.id === id);
      const visual = latest.current.hotspotStates[id];
      if (!h || !latest.current.exploring) return;
      if (visual === 'disabled') pushToast(h.disabledHint ?? ui.game.disabledDefault);
      else if (visual === 'done' && !h.actionWhenDone) pushToast(ui.game.alreadyDone);
      else dispatch({ type: 'ACTIVATE_HOTSPOT', hotspotId: id });
    },
    [mission, dispatch, pushToast],
  );

  // Sahnani yaratish / yo‘q qilish
  useEffect(() => {
    if (!containerRef.current) return;
    return createScene(containerRef.current, bridge);
  }, [bridge]);

  // Sahna hodisalari
  useEffect(
    () =>
      bridge.on((e) => {
        switch (e.type) {
          case 'ready':
            bridge.send({ type: 'setHotspotStates', states: latest.current.hotspotStates });
            bridge.send({ type: 'setReducedMotion', value: latest.current.reducedMotion });
            dispatch({ type: 'SCENE_READY' });
            window.setTimeout(() => bridge.send({ type: 'emote', symbol: '👋' }), 700);
            break;
          case 'error':
            setSceneError(true);
            dispatch({ type: 'SCENE_READY' });
            break;
          case 'nearHotspotChanged':
            setNearId(e.hotspotId);
            break;
          case 'hotspotActivated':
            activate(e.hotspotId);
            break;
          case 'hotspotLayout':
            setRects(e.rects);
            break;
          case 'footstep':
            audioManager.playFootstep(latest.current.floor);
            break;
        }
      }),
    [bridge, dispatch, activate],
  );

  // Missiyadan chiqilganda (natija, xarita) to‘liq ekran rejimi ham yopiladi
  useEffect(() => () => void exitFullscreen(), []);

  // Xona fon tovushi (kunduzgi ofis / tungi ofis); missiyadan chiqilganda to‘xtaydi
  const night = mission.room.theme.night ?? false;
  useEffect(() => {
    audioManager.setAmbience(night ? 'roomToneNight' : 'roomToneDay');
    return () => audioManager.setAmbience(null);
  }, [night]);

  // Pauza: musiqa pasayadi, xona jim. Oyna (dialog, simulyatsiya) ochiq — xona tovushlari pasayadi.
  const paused = state.phase === 'paused';
  const overlayOpen = !exploring && !paused && !isLoading;
  useEffect(() => audioManager.setGamePaused(paused), [paused]);
  useEffect(() => audioManager.setOverlay(overlayOpen), [overlayOpen]);
  useEffect(
    () => () => {
      audioManager.setGamePaused(false);
      audioManager.setOverlay(false);
    },
    [],
  );

  // Xona yuklash (start va qayta boshlash)
  useEffect(() => {
    if (isLoading) {
      bridge.send({ type: 'loadRoom', room: mission.room, hotspots: mission.hotspots, characterId: player.id });
    }
  }, [isLoading, bridge, mission, player.id]);

  // Qaror natijasi: sahnaga qaytganda personaj ustida emoji
  const pendingEmote = useRef<string | null>(null);
  const pendingOutcome = state.pendingFeedback
    ? mission.decisions[state.pendingFeedback.decisionId]?.choices.find((c) => c.id === state.pendingFeedback?.choiceId)?.outcome
    : undefined;
  useEffect(() => {
    if (pendingOutcome) pendingEmote.current = EMOTES[pendingOutcome];
  }, [pendingOutcome]);
  useEffect(() => {
    if (exploring && pendingEmote.current) {
      bridge.send({ type: 'emote', symbol: pendingEmote.current });
      pendingEmote.current = null;
    }
  }, [exploring, bridge]);

  useEffect(() => bridge.send({ type: 'setHotspotStates', states: hotspotStates }), [bridge, hotspotStates]);
  useEffect(() => bridge.send({ type: 'setPaused', paused: !exploring }), [bridge, exploring]);
  useEffect(() => bridge.send({ type: 'setReducedMotion', value: reducedMotion }), [bridge, reducedMotion]);

  // Esc — pauza (modal ochiq bo‘lsa, modal o‘zi ishlaydi)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isModalOpen() && latest.current.exploring) dispatch({ type: 'PAUSE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const onHotspotClick = (id: string) => {
    const visual = hotspotStates[id];
    if (visual === 'disabled' || sceneError) activate(id);
    else bridge.send({ type: 'walkToHotspot', hotspotId: id });
  };

  const send = useCallback((a: MissionAction) => dispatch(a), [dispatch]);
  const closeOverlay = useCallback(() => dispatch({ type: 'CLOSE_OVERLAY' }), [dispatch]);
  const nearHotspot = nearId ? mission.hotspots.find((h) => h.id === nearId) : undefined;
  const npcArt = useMemo(() => {
    const out: Record<string, { art: string; faceX: number; voice?: 'male' | 'female' }> = {};
    for (const h of mission.hotspots) if (h.npc?.art) out[h.npc.name] = { art: h.npc.art, faceX: h.npc.faceX ?? 0.5, voice: h.npc.voice };
    return out;
  }, [mission]);

  const overlay = state.activeOverlay;
  const base: OverlayRef | null = overlay?.type === 'decision' ? overlay.returnTo : overlay;
  const pending = state.pendingFeedback;
  const pendingChoice = pending ? mission.decisions[pending.decisionId]?.choices.find((c) => c.id === pending.choiceId) : undefined;
  const simProps: SimProps = { mission, state, dispatch: send, playerName: player.name, onClose: closeOverlay };

  return (
    <div className={styles.game}>
      <HUD mission={mission} state={state} onPause={() => dispatch({ type: 'PAUSE' })} />
      <div className={styles.stageWrap}>
        <div className={styles.stage}>
          <div ref={containerRef} className={styles.canvasHost} />
          {sceneError && <p className={styles.sceneError}>{ui.game.sceneError}</p>}
          {isLoading && <p className={styles.loading}>{ui.game.loading}</p>}
          <p className="visually-hidden">{ui.game.sceneLabel}</p>
          {!sceneError && <HotspotOverlay hotspots={mission.hotspots} states={hotspotStates} rects={rects} nearId={nearId} onActivate={onHotspotClick} />}
          {exploring && nearHotspot && hotspotStates[nearHotspot.id] !== 'hidden' && (
            <p className={styles.interactHint} aria-hidden="true">
              {ui.game.interactHint(nearHotspot.label)}
            </p>
          )}
        </div>
      </div>
      <HotspotList hotspots={mission.hotspots} states={hotspotStates} onActivate={activate} forceVisible={settings.listMode || sceneError} />

      {base?.type === 'dialog' && mission.dialogs[base.dialogId] && (
        <DialogPanel key={base.dialogId} dialog={mission.dialogs[base.dialogId]!} player={player} npcs={npcArt} onClose={closeOverlay} />
      )}
      {base?.type === 'sim' &&
        (() => {
          const Sim = SIMS[base.app];
          return <Sim {...simProps} />;
        })()}
      {overlay?.type === 'decision' && mission.decisions[overlay.decisionId] && (
        <DecisionPanel
          decision={mission.decisions[overlay.decisionId]!}
          playerName={player.name}
          onChoose={(choiceId) => dispatch({ type: 'CHOOSE', decisionId: overlay.decisionId, choiceId })}
          onEscape={() => dispatch({ type: 'PAUSE' })}
        />
      )}
      {state.phase === 'feedback' && pending && pendingChoice && (
        <FeedbackPanel
          choice={pendingChoice}
          firstAttempt={state.decisionLog[pending.decisionId]?.attempts === 1}
          playerName={player.name}
          onAck={() => dispatch({ type: 'ACK' })}
        />
      )}
      {state.phase === 'consequence' && pendingChoice?.consequenceId && mission.consequences[pendingChoice.consequenceId] && (
        <ConsequencePanel
          consequence={mission.consequences[pendingChoice.consequenceId]!}
          onResult={() => dispatch({ type: 'ACK' })}
          onRestart={() => {
            dispatch({ type: 'ACK' });
            startMission(mission.id);
          }}
        />
      )}
      {state.phase === 'paused' && (
        <PauseMenu onResume={() => dispatch({ type: 'RESUME' })} onRestart={() => dispatch({ type: 'RESTART' })} onExit={exitMission} />
      )}
    </div>
  );
}
