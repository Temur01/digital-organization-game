import { usePlayer, useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { allCompleted, nextMissionId } from '../app/transitions';
import { ui } from '../content/uz/ui';
import { MISSION_LIST, MISSIONS } from '../missions/data';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import { fillName } from '../ui/text';
import styles from './screens.module.css';

const ICON = { safe: '✔', risky: '⚠', critical: '✖' } as const;

export function ResultScreen() {
  const result = useGameStore((s) => s.lastResult);
  const progress = useGameStore((s) => s.progress);
  const openBriefing = useGameStore((s) => s.openBriefing);
  const goTo = useGameStore((s) => s.goTo);
  const player = usePlayer();
  const heading = useScreenHeading<HTMLHeadingElement>();
  if (!result) return null;

  const mission = MISSIONS[result.missionId];
  const mp = progress.missions[result.missionId];
  const passed = result.outcome === 'passed';
  const next = nextMissionId(result.missionId);
  const nextOpen = next !== null && progress.missions[next].status !== 'locked';
  const finished = passed && allCompleted(progress);

  return (
    <main className={styles.page}>
      <article className={styles.result}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true">{mission.icon}</span> {mission.title}
        </p>
        <h1 ref={heading} tabIndex={-1} className={passed ? styles.passed : styles.failed}>
          <span aria-hidden="true">{passed ? '✔ ' : '✖ '}</span>
          {passed ? ui.result.passed : ui.result.failed}
        </h1>
        <div className={styles.scoreRow}>
          <Stars value={result.stars} size="lg" />
          <span className={styles.score}>{ui.result.score(result.score, result.maxScore)}</span>
        </div>
        <p className={styles.muted}>
          {ui.result.best(mp.bestScore, mp.bestStars)} · {ui.result.attempts(mp.attempts)}
        </p>

        <section aria-labelledby="r-decisions">
          <h2 id="r-decisions">{ui.result.decisions}</h2>
          <ul className={styles.resultList}>
            {result.decisions.map((d) => {
              const decision = mission.decisions[d.decisionId];
              const choice = decision?.choices.find((c) => c.id === d.firstChoiceId);
              return (
                <li key={d.decisionId} className={styles[`outcome_${d.firstOutcome}`]}>
                  <span className={styles.outcomeIcon} aria-hidden="true">
                    {ICON[d.firstOutcome]}
                  </span>
                  <span>
                    <strong>{decision?.prompt}</strong>
                    <br />
                    {choice ? fillName(choice.label, player.name) : ''} — <em>{ui.result.outcome[d.firstOutcome]}</em>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="r-clues">
          <h2 id="r-clues">{ui.result.clues}</h2>
          <ul className={styles.resultList}>
            {Object.values(mission.clues).map((c) => {
              const found = result.cluesFound.includes(c.id);
              return (
                <li key={c.id} className={found ? styles.outcome_safe : styles.clueMissed}>
                  <span className={styles.outcomeIcon} aria-hidden="true">
                    {found ? '🔍' : '○'}
                  </span>
                  <span>
                    <strong>{c.label}</strong> ({found ? ui.result.clueFoundLabel : ui.result.clueMissed})
                    <br />
                    {c.explanation}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="r-lessons" className={styles.lessons}>
          <h2 id="r-lessons">{ui.result.remember}</h2>
          <ul>
            {mission.lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>

        {finished && (
          <section aria-labelledby="r-congrats" className={styles.congrats}>
            <h2 id="r-congrats">🎉 {ui.result.congratsTitle}</h2>
            <p>{ui.result.congratsText}</p>
            {MISSION_LIST.map((m) => (
              <div key={m.id}>
                <h3>{m.title}</h3>
                <ul>
                  {m.lessons.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Button variant="secondary" onClick={() => window.print()} className={styles.noPrint}>
              {ui.result.print}
            </Button>
          </section>
        )}

        <div className={[styles.actions, styles.noPrint].join(' ')}>
          <Button variant="secondary" onClick={() => goTo('map')}>
            {ui.result.toMap}
          </Button>
          <Button variant="secondary" onClick={() => openBriefing(mission.id)}>
            {ui.result.replay}
          </Button>
          {passed && nextOpen && next && <Button onClick={() => openBriefing(next)}>{ui.result.next}</Button>}
        </div>
      </article>
    </main>
  );
}
