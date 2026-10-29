import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { usePlayer, useScreenHeading } from '../app/hooks';
import { playGameAudio } from '../game/audio/audioEvents';
import { totalStars as countStars, useGameStore } from '../app/store';
import { allCompleted, nextMissionId } from '../app/transitions';
import { rankFor, ui } from '../content/uz/ui';
import { MISSION_LIST, MISSIONS } from '../missions/data';
import { celebrate, useCountUp } from '../ui/anim';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
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
  const score = useCountUp(result?.score ?? 0, 1200, 0);
  const passed = result?.outcome === 'passed';
  const finishedAll = passed && allCompleted(progress);
  const stars = result?.stars ?? 0;

  const starsBefore = useGameStore((s) => s.starsBefore);
  const rank = rankFor(countStars(progress)).current;
  const rankUp = passed && rankFor(starsBefore).current.name !== rank.name;
  const lead = useMemo(() => ui.result.passedLead[Math.floor(Math.random() * ui.result.passedLead.length)], []);

  useEffect(() => {
    if (!passed) {
      playGameAudio({ type: 'missionEnded', passed: false }, { delay: 0.25 });
      return;
    }
    // Har bir yulduz «otilib» chiqqanda (Stars: delay 0.3 + 0.28 s qadam) — uchqun, so‘ng fanfara va konfetti
    for (let i = 0; i < stars; i++) playGameAudio({ type: 'resultStar' }, { delay: 0.3 + i * 0.28 });
    const at = 500 + stars * 280;
    playGameAudio({ type: 'missionEnded', passed: true }, { delay: at / 1000 });
    const t = window.setTimeout(() => celebrate(stars === 3 || finishedAll ? 'big' : 'small'), at);
    return () => window.clearTimeout(t);
  }, [passed, stars, finishedAll]);

  if (!result) return null;

  const mission = MISSIONS[result.missionId];
  const mp = progress.missions[result.missionId];
  const next = nextMissionId(result.missionId);
  const nextOpen = next !== null && progress.missions[next].status !== 'locked';
  const appear = (delay: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } });

  return (
    <main className={styles.page}>
      <article className={styles.result}>
        <section className={[styles.resultHero, passed ? styles.heroPassed : styles.heroFailed].join(' ')}>
          <div className={styles.resultHeroText}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true">{mission.icon}</span> {mission.title}
            </p>
            <motion.h1
              ref={heading}
              tabIndex={-1}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={passed ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              <span aria-hidden="true">{passed ? '🏆 ' : '💥 '}</span>
              <span className={passed ? 'gradient-text' : styles.failedText}>{passed ? ui.result.passed : ui.result.failed}</span>
            </motion.h1>
            <motion.p className={styles.lead} {...appear(0.2)}>
              {passed ? lead : ui.result.failedLead}
            </motion.p>
            <div className={styles.scoreRow}>
              <Stars value={result.stars} size="lg" pop delay={0.3} />
              <span className={styles.score} aria-label={ui.result.score(result.score, result.maxScore)}>
                <span aria-hidden="true">{ui.result.score(score, result.maxScore)}</span>
              </span>
            </div>
            <div className={styles.scoreBar} aria-hidden="true">
              <motion.div
                className={styles.scoreBarFill}
                initial={{ width: 0 }}
                animate={{ width: `${(result.score / Math.max(1, result.maxScore)) * 100}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
            <p className={styles.muted}>
              {ui.result.best(mp.bestScore, mp.bestStars)} · {ui.result.attempts(mp.attempts)}
            </p>
            {rankUp && (
              <motion.div
                className={styles.rankUp}
                initial={{ opacity: 0, scale: 0.5, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 1.4, type: 'spring', stiffness: 260, damping: 12 }}
              >
                <span className={styles.rankIcon} aria-hidden="true">
                  {rank.icon}
                </span>
                <span>
                  <span className={styles.rankLabel}>{ui.result.newRank}</span>
                  <strong className={styles.rankName}>{rank.name}</strong>
                </span>
              </motion.div>
            )}
          </div>
          <motion.div
            className={styles.resultArt}
            aria-hidden="true"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 140, damping: 16 }}
          >
            <span className={styles.characterGlow} />
            <CharacterArt character={player} height="100%" float />
          </motion.div>
        </section>

        <div className={styles.resultGrid}>
          <section aria-labelledby="r-decisions" className={styles.resultCard}>
            <h2 id="r-decisions">🧭 {ui.result.decisions}</h2>
            <ul className={styles.resultList}>
              {result.decisions.map((d, i) => {
                const decision = mission.decisions[d.decisionId];
                const choice = decision?.choices.find((c) => c.id === d.firstChoiceId);
                return (
                  <motion.li key={d.decisionId} className={styles[`outcome_${d.firstOutcome}`]} {...appear(0.6 + i * 0.08)}>
                    <span className={styles.outcomeIcon} aria-hidden="true">
                      {ICON[d.firstOutcome]}
                    </span>
                    <span>
                      <strong>{decision?.prompt}</strong>
                      <br />
                      {choice ? fillName(choice.label, player.name) : ''} — <em>{ui.result.outcome[d.firstOutcome]}</em>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="r-clues" className={styles.resultCard}>
            <h2 id="r-clues">
              🔍 {ui.result.clues} · {result.cluesFound.length}/{Object.keys(mission.clues).length}
            </h2>
            <ul className={styles.resultList}>
              {Object.values(mission.clues).map((c, i) => {
                const found = result.cluesFound.includes(c.id);
                return (
                  <motion.li key={c.id} className={found ? styles.outcome_safe : styles.clueMissed} {...appear(0.8 + i * 0.07)}>
                    <span className={styles.outcomeIcon} aria-hidden="true">
                      {found ? '🔍' : '○'}
                    </span>
                    <span>
                      <strong>{c.label}</strong> ({found ? ui.result.clueFoundLabel : ui.result.clueMissed})
                      <br />
                      {c.explanation}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        </div>

        <motion.section aria-labelledby="r-lessons" className={styles.lessons} {...appear(1.2)}>
          <h2 id="r-lessons">💡 {ui.result.remember}</h2>
          <ol className={styles.lessonList}>
            {mission.lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </motion.section>

        {finishedAll && (
          <motion.section
            aria-labelledby="r-congrats"
            className={styles.congrats}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
          >
            <h2 id="r-congrats">🎉 {ui.result.congratsTitle}</h2>
            <p>{ui.result.congratsText}</p>
            <div className={styles.congratsGrid}>
              {MISSION_LIST.map((m) => (
                <div key={m.id} className={styles.congratsItem}>
                  <h3>
                    <span aria-hidden="true">{m.icon}</span> {m.title}
                  </h3>
                  <ul>
                    {m.lessons.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={() => window.print()} className={styles.noPrint}>
              🖨 {ui.result.print}
            </Button>
          </motion.section>
        )}

        <div className={[styles.actions, styles.noPrint].join(' ')}>
          <Button variant="ghost" onClick={() => goTo('map')}>
            🗺 {ui.result.toMap}
          </Button>
          <Button variant="secondary" onClick={() => openBriefing(mission.id)}>
            ↻ {ui.result.replay}
          </Button>
          {passed && nextOpen && next && (
            <Button className={[styles.ctaBig, styles.pulseButton].join(' ')} onClick={() => openBriefing(next)}>
              {ui.result.next} <span aria-hidden="true">→</span>
            </Button>
          )}
        </div>
      </article>
    </main>
  );
}
