import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import type { MissionAction } from '../missions/engine/missionReducer';
import type { Mission, MissionRuntimeState } from '../types/models';
import { burstAt } from '../ui/anim';
import { Button } from '../ui/Button';
import styles from './sim.module.css';

export interface SimProps {
  mission: Mission;
  state: MissionRuntimeState;
  dispatch(action: MissionAction): void;
  playerName: string;
  onClose(): void;
}

/** Belgilash rejimi: shubhali joyni bosib «belgi» topish. C tugmasi bilan almashtiriladi. */
export function useMarkMode() {
  const [markMode, setMarkMode] = useState(false);
  const pushToast = useGameStore((s) => s.pushToast);
  const previous = useRef(markMode);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyC' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      setMarkMode((m) => !m);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (previous.current === markMode) return;
    previous.current = markMode;
    pushToast(markMode ? ui.sim.markModeOn : ui.sim.markModeOff);
  }, [markMode, pushToast]);
  return [markMode, setMarkMode] as const;
}

export function MarkModeToggle({ markMode, onToggle }: { markMode: boolean; onToggle(): void }) {
  return (
    <Button variant={markMode ? 'primary' : 'secondary'} aria-pressed={markMode} onClick={onToggle} title={ui.sim.markModeHint}>
      🔍 {ui.sim.markMode}
    </Button>
  );
}

export function useClueFinder(state: MissionRuntimeState, dispatch: SimProps['dispatch']) {
  const pushToast = useGameStore((s) => s.pushToast);
  return (clueId?: string) => {
    if (!clueId) pushToast(ui.sim.nothingSuspicious);
    else if (state.cluesFound.includes(clueId)) pushToast(ui.sim.clueAlready);
    else dispatch({ type: 'FIND_CLUE', clueId });
  };
}

interface ClueTargetProps {
  clueId?: string;
  markMode: boolean;
  found: boolean;
  onFind(clueId?: string): void;
  children: ReactNode;
  block?: boolean;
}

/** Belgilash rejimida — tugma; oddiy rejimda — matn. Topilgan belgi ajratib ko‘rsatiladi. */
export function ClueTarget({ clueId, markMode, found, onFind, children, block }: ClueTargetProps) {
  const cls = [styles.clue, block ? styles.clueBlock : '', found ? styles.clueFound : '', markMode ? styles.clueActive : ''].join(' ');
  const foundText = found ? <span className="visually-hidden"> ({ui.result.clueFoundLabel})</span> : null;
  if (markMode) {
    return (
      <button
        type="button"
        className={cls}
        onClick={(e) => {
          if (clueId && !found) burstAt(e.currentTarget);
          onFind(clueId);
        }}
      >
        {children}
        {foundText}
      </button>
    );
  }
  return (
    <span className={cls}>
      {children}
      {foundText}
    </span>
  );
}

export function isFound(state: MissionRuntimeState, clueId?: string): boolean {
  return clueId !== undefined && state.cluesFound.includes(clueId);
}
