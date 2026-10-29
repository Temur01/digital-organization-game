import { motion } from 'motion/react';
import { usePlayer, useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { previousMissionTitle } from '../app/transitions';
import { rankFor, ui } from '../content/uz/ui';
import { MISSION_LIST } from '../missions/data';
import { account } from '../content/uz/extra';
import { AccountChip } from '../ui/AccountChip';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import { Stars } from '../ui/Stars';
import styles from './screens.module.css';

export function MissionMapScreen() {
  const progress = useGameStore((s) => s.progress);
  const storageAvailable = useGameStore((s) => s.storageAvailable);
  const openBriefing = useGameStore((s) => s.openBriefing);
  const openCharacterSelect = useGameStore((s) => s.openCharacterSelect);
  const openSettings = useGameStore((s) => s.openSettings);
  const goTo = useGameStore((s) => s.goTo);
  const openAux = useGameStore((s) => s.openAux);
  const player = usePlayer();
  const heading = useScreenHeading<HTMLHeadingElement>();
  const maxStars = MISSION_LIST.length * 3;
  const totalStars = MISSION_LIST.reduce((sum, m) => sum + progress.missions[m.id].bestStars, 0);
  const { current: rank, next: nextRank } = rankFor(totalStars);

  return (
    <main className={styles.page}>
      <div className={styles.mapLayout}>
        <section className={styles.mapMain} aria-labelledby="map-heading">
          <header className={styles.pageHeader}>
            <span className={styles.pill}>
              <span className={styles.pillDot} aria-hidden="true" /> {ui.map.eyebrow}
            </span>
            <h1 id="map-heading" ref={heading} tabIndex={-1}>
              {ui.map.heading}
            </h1>
            <p className={styles.lead}>{ui.map.lead}</p>
          </header>
          {!storageAvailable && <p className={styles.warning}>{ui.map.storageWarning}</p>}

          <ol className={styles.missionGrid}>
            {MISSION_LIST.map((m, i) => {
              const p = progress.missions[m.id];
              const locked = p.status === 'locked';
              const prev = previousMissionTitle(m.id);
              const statusText = locked ? ui.map.locked : p.status === 'completed' ? ui.map.completed : ui.map.available;
              return (
                <motion.li
                  key={m.id}
                  className={styles.roomNodeItem}
                  initial={{ opacity: 0, y: 40, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 + i * 0.12 }}
                >
                  <motion.button
                    type="button"
                    whileHover={locked ? undefined : { y: -8 }}
                    whileTap={locked ? { x: [0, -6, 6, -4, 4, 0] } : { scale: 0.97 }}
                    className={[styles.roomNode, styles[`room_${p.status}`]].join(' ')}
                    aria-disabled={locked || undefined}
                    aria-describedby={locked ? `hint-${m.id}` : undefined}
                    onClick={() => !locked && openBriefing(m.id)}
                  >
                    <span className={styles.roomTop}>
                      <span className={styles.roomNumber}>{ui.map.missionNumber(i + 1)}</span>
                      <span className={[styles.statusChip, styles[`status_${p.status}`]].join(' ')}>{statusText}</span>
                    </span>
                    <span className={[styles.roomIcon, p.status === 'available' ? styles.roomIconFloat : ''].join(' ')} aria-hidden="true">
                      {locked ? '🔒' : m.icon}
                    </span>
                    <span className={styles.roomTitle}>{m.title}</span>
                    <span className={styles.roomSubtitle}>{m.subtitle}</span>
                    <span className={styles.roomMeta}>
                      <span className={styles.metaChip}>{m.topicLabel}</span>
                    </span>
                    <span className={styles.roomFooter}>
                      <span className={styles.difficulty}>
                        <span className="visually-hidden">{ui.briefing.difficulty}: </span>
                        {[0, 1, 2].map((d) => (
                          <span key={d} aria-hidden="true" className={d <= m.difficulty ? styles.diffOn : styles.diffOff} />
                        ))}
                        <span className={styles.diffLabel}>{ui.difficulty[m.difficulty]}</span>
                      </span>
                      <span className={styles.minutes}>⏱ {ui.briefing.duration(m.minutes)}</span>
                    </span>
                    {p.status === 'completed' ? (
                      <span className={styles.roomStars}>
                        <Stars value={p.bestStars} size="md" pop delay={0.4 + i * 0.12} />
                      </span>
                    ) : (
                      !locked && (
                        <span className={styles.roomCta} aria-hidden="true">
                          ▶ {ui.map.play}
                        </span>
                      )
                    )}
                  </motion.button>
                  {locked && prev && (
                    <p id={`hint-${m.id}`} className={styles.lockedHint}>
                      {ui.map.lockedHint(prev)}
                    </p>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </section>

        <motion.aside
          className={styles.sidePanel}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.2 }}
        >
          <div className={styles.sideArt} aria-hidden="true">
            <span className={styles.characterGlow} />
            <CharacterArt character={player} height="100%" float />
          </div>
          <p className={styles.sideName}>{ui.map.playingAs(player.name)}</p>
          <p className={styles.sideRole}>{player.role}</p>
          <div className={styles.rankCard}>
            <span className={styles.rankIcon} aria-hidden="true">
              {rank.icon}
            </span>
            <span>
              <span className={styles.rankLabel}>{ui.map.rank}</span>
              <strong className={styles.rankName}>{rank.name}</strong>
            </span>
            <span className={styles.rankStars}>
              ★ {ui.map.totalStars(totalStars, maxStars)}
              <span className="visually-hidden"> {ui.map.starsLabel}</span>
            </span>
          </div>
          <div className={styles.rankTrack} aria-hidden="true">
            <motion.div
              className={styles.rankFill}
              initial={{ width: 0 }}
              animate={{ width: `${(totalStars / maxStars) * 100}%` }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className={styles.rankNext}>{nextRank ? ui.map.nextRank(nextRank.min - totalStars, nextRank.name) : ui.map.maxRank}</p>
          <div className={styles.menu}>
            <AccountChip />
            <Button onClick={() => openAux('quiz')}>
              <span aria-hidden="true">🧠</span> {account.quiz}
            </Button>
            <Button variant="secondary" onClick={() => openAux('leaderboard')}>
              <span aria-hidden="true">🏆</span> {account.leaderboard}
            </Button>
            <Button variant="secondary" onClick={openCharacterSelect}>
              {ui.map.changeCharacter}
            </Button>
            <Button variant="secondary" onClick={openSettings}>
              {ui.title.settings}
            </Button>
            <Button variant="ghost" onClick={() => goTo('title')}>
              {ui.map.mainMenu}
            </Button>
          </div>
        </motion.aside>
      </div>
    </main>
  );
}
