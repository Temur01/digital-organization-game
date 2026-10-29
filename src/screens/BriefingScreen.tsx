import { motion } from 'motion/react';
import { usePlayer, useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import { MISSIONS } from '../missions/data';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import styles from './screens.module.css';

export function BriefingScreen() {
  const id = useGameStore((s) => s.briefingMissionId);
  const startMission = useGameStore((s) => s.startMission);
  const goTo = useGameStore((s) => s.goTo);
  const player = usePlayer();
  const heading = useScreenHeading<HTMLHeadingElement>();
  const mission = id ? MISSIONS[id] : null;
  if (!mission) return null;
  const fact = mission.facts[Math.floor(Date.now() / 60000) % mission.facts.length];
  const storyDelay = (i: number) => 0.25 + i * 0.3;
  const afterStory = storyDelay(mission.briefing.length);

  return (
    <main className={styles.page}>
      <div className={styles.briefingLayout}>
        <article className={styles.briefing}>
          <div className={styles.briefingHead}>
            <motion.span
              aria-hidden="true"
              className={styles.missionTile}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              {mission.icon}
            </motion.span>
            <div>
              <p className={styles.eyebrow}>{ui.briefing.eyebrow}</p>
              <h1 ref={heading} tabIndex={-1}>
                {mission.title}
              </h1>
              <p className={styles.subtitle}>{mission.subtitle}</p>
            </div>
          </div>

          <ul className={styles.chips}>
            <li className={styles.metaChip}>
              ⚠ {ui.briefing.threat}: {mission.topicLabel}
            </li>
            <li className={styles.metaChip}>
              🎚 {ui.briefing.difficulty}: {ui.difficulty[mission.difficulty]}
            </li>
            <li className={styles.metaChip}>⏱ {ui.briefing.duration(mission.minutes)}</li>
          </ul>

          <div className={styles.story}>
            {mission.briefing.map((t, i) => (
              <motion.p key={t} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: storyDelay(i) }}>
                {t}
              </motion.p>
            ))}
          </div>

          <h2>{ui.briefing.objectives}</h2>
          <ul className={styles.objectives}>
            {mission.objectives.map((o, i) => (
              <motion.li
                key={o.id}
                className={o.optional ? styles.objectiveBonus : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: afterStory + i * 0.08 }}
              >
                <span aria-hidden="true" className={styles.objectiveBullet}>
                  {o.optional ? '⭐' : '🎯'}
                </span>
                <span>{o.label}</span>
                {o.optional && <span className={styles.bonusChip}>{ui.briefing.optional}</span>}
              </motion.li>
            ))}
          </ul>

          <motion.aside
            className={styles.factCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: afterStory + 0.3 }}
          >
            <span className={styles.factIcon} aria-hidden="true">
              💡
            </span>
            <span>
              <strong>{ui.briefing.didYouKnow}</strong> {fact}
            </span>
          </motion.aside>

          <div className={styles.controls}>
            <span className={styles.controlsTitle}>{ui.briefing.controlsTitle}</span>
            {ui.briefing.controls.map(([key, label]) => (
              <span key={key} className={styles.control}>
                <kbd>{key}</kbd> {label}
              </span>
            ))}
          </div>
          <p className={styles.simNote}>🔒 {ui.common.simulationNote}</p>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => goTo('map')}>
              ← {ui.briefing.backToMap}
            </Button>
            <Button className={[styles.ctaBig, styles.pulseButton].join(' ')} onClick={() => startMission(mission.id)}>
              <span aria-hidden="true">▶</span> {ui.briefing.start}
            </Button>
          </div>
        </article>

        <motion.div
          className={styles.briefingArt}
          aria-hidden="true"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.2 }}
        >
          <motion.p
            className={styles.speech}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 14 }}
          >
            {player.quote}
          </motion.p>
          <span className={styles.characterGlow} />
          <CharacterArt character={player} height="100%" float />
        </motion.div>
      </div>
    </main>
  );
}
