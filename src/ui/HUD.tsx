import { ui } from '../content/uz/ui';
import { currentObjective } from '../missions/engine/missionReducer';
import type { Mission, MissionRuntimeState } from '../types/models';
import { Button } from './Button';
import styles from './ui.module.css';

export function HUD({ mission, state, onPause }: { mission: Mission; state: MissionRuntimeState; onPause(): void }) {
  const objective = currentObjective(mission, state.flags);
  const clueTotal = Object.keys(mission.clues).length;
  return (
    <header className={styles.hud}>
      <div className={styles.hudTitle}>
        <span aria-hidden="true">{mission.icon}</span> <h1 className={styles.hudHeading}>{mission.title}</h1>
      </div>
      <p className={styles.hudObjective}>
        <strong>{ui.game.objective}:</strong> {objective ? objective.label : ui.game.allObjectivesDone}
      </p>
      <div className={styles.hudStats}>
        <span>🔍 {ui.game.clues(state.cluesFound.length, clueTotal)}</span>
        <span>
          {ui.common.score}: {state.score}
        </span>
        <Button variant="secondary" onClick={onPause} aria-label={ui.game.pause}>
          ⏸ <span className={styles.hideSm}>{ui.game.pause}</span>
        </Button>
      </div>
    </header>
  );
}
