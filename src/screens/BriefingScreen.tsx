import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import { MISSIONS } from '../missions/data';
import { Button } from '../ui/Button';
import styles from './screens.module.css';

export function BriefingScreen() {
  const id = useGameStore((s) => s.briefingMissionId);
  const startMission = useGameStore((s) => s.startMission);
  const goTo = useGameStore((s) => s.goTo);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const mission = id ? MISSIONS[id] : null;
  if (!mission) return null;

  return (
    <main className={styles.page}>
      <article className={styles.briefing}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true">{mission.icon}</span> {mission.topicLabel}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {mission.title}
        </h1>
        {mission.briefing.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <h2>{ui.briefing.objectives}</h2>
        <ul className={styles.objectives}>
          {mission.objectives.map((o) => (
            <li key={o.id}>
              {o.label} {o.optional && <span className={styles.muted}>{ui.briefing.optional}</span>}
            </li>
          ))}
        </ul>
        <p className={styles.controls}>{ui.briefing.controls}</p>
        <p className={styles.simNote}>{ui.common.simulationNote}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => goTo('map')}>
            {ui.briefing.backToMap}
          </Button>
          <Button onClick={() => startMission(mission.id)}>{ui.briefing.start}</Button>
        </div>
      </article>
    </main>
  );
}
