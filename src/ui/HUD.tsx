import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ui } from '../content/uz/ui';
import { currentObjective, isObjectiveDone } from '../missions/engine/missionReducer';
import type { Mission, MissionRuntimeState } from '../types/models';
import { fullscreenSupported, useFullscreen } from '../app/fullscreen';
import { useCountUp } from './anim';
import { Button } from './Button';
import styles from './ui.module.css';

/** Qiymat o‘zgarganda «sakraydigan» son */
function Bump({ value, children }: { value: number; children: ReactNode }) {
  return (
    <motion.span
      key={value}
      className={styles.hudStat}
      initial={{ scale: value === 0 ? 1 : 1.35 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
    >
      {children}
    </motion.span>
  );
}

export function HUD({ mission, state, onPause }: { mission: Mission; state: MissionRuntimeState; onPause(): void }) {
  const objective = currentObjective(mission, state.flags);
  const clueTotal = Object.keys(mission.clues).length;
  const required = mission.objectives.filter((o) => !o.optional);
  const doneCount = required.filter((o) => isObjectiveDone(o, state.flags)).length;
  const score = useCountUp(state.score, 600);
  const [fullscreen, toggleFullscreen] = useFullscreen();

  return (
    <header className={styles.hud}>
      <div className={styles.hudTitle}>
        <span aria-hidden="true" className={styles.hudIcon}>
          {mission.icon}
        </span>{' '}
        <h1 className={styles.hudHeading}>{mission.title}</h1>
      </div>
      <div className={styles.hudObjective}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={objective?.id ?? 'done'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className={styles.hudObjectiveText}
          >
            <strong>{ui.game.objective}:</strong> {objective ? objective.label : ui.game.allObjectivesDone}
          </motion.p>
        </AnimatePresence>
        <div className={styles.progressTrack} aria-hidden="true">
          <motion.div
            className={styles.progressFill}
            initial={false}
            animate={{ width: `${(doneCount / Math.max(1, required.length)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
      <div className={styles.hudStats}>
        <Bump value={state.cluesFound.length}>🔍 {ui.game.clues(state.cluesFound.length, clueTotal)}</Bump>
        <Bump value={state.score}>
          ⭐ {ui.common.score}: {score}
        </Bump>
        {fullscreenSupported() && (
          <Button
            variant="secondary"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? ui.game.fullscreenOff : ui.game.fullscreenOn}
            title={fullscreen ? ui.game.fullscreenOff : ui.game.fullscreenOn}
          >
            <span aria-hidden="true">{fullscreen ? '🗗' : '⛶'}</span>
          </Button>
        )}
        <Button variant="secondary" onClick={onPause} aria-label={ui.game.pause}>
          ⏸ <span className={styles.hideSm}>{ui.game.pause}</span>
        </Button>
      </div>
    </header>
  );
}
