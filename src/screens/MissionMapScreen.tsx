import { usePlayer, useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { previousMissionTitle } from '../app/transitions';
import { ui } from '../content/uz/ui';
import { MISSION_LIST } from '../missions/data';
import { Button } from '../ui/Button';
import { CharacterPortrait } from '../ui/CharacterPortrait';
import { Stars } from '../ui/Stars';
import styles from './screens.module.css';

export function MissionMapScreen() {
  const progress = useGameStore((s) => s.progress);
  const storageAvailable = useGameStore((s) => s.storageAvailable);
  const openBriefing = useGameStore((s) => s.openBriefing);
  const openCharacterSelect = useGameStore((s) => s.openCharacterSelect);
  const openSettings = useGameStore((s) => s.openSettings);
  const goTo = useGameStore((s) => s.goTo);
  const player = usePlayer();
  const heading = useScreenHeading<HTMLHeadingElement>();
  const totalStars = MISSION_LIST.reduce((sum, m) => sum + progress.missions[m.id].bestStars, 0);

  return (
    <main className={styles.page}>
      <div className={styles.mapLayout}>
        <section className={styles.mapMain} aria-labelledby="map-heading">
          <h1 id="map-heading" ref={heading} tabIndex={-1}>
            {ui.map.heading}
          </h1>
          {!storageAvailable && <p className={styles.warning}>{ui.map.storageWarning}</p>}
          <ol className={styles.floorPlan}>
            {MISSION_LIST.map((m, i) => {
              const p = progress.missions[m.id];
              const locked = p.status === 'locked';
              const prev = previousMissionTitle(m.id);
              const statusText = locked ? ui.map.locked : p.status === 'completed' ? ui.map.completed : ui.map.available;
              return (
                <li key={m.id} className={styles.roomNodeItem}>
                  <button
                    type="button"
                    className={[styles.roomNode, styles[`room_${p.status}`]].join(' ')}
                    aria-disabled={locked || undefined}
                    aria-describedby={locked ? `hint-${m.id}` : undefined}
                    onClick={() => !locked && openBriefing(m.id)}
                  >
                    <span className={styles.roomIcon} aria-hidden="true">
                      {locked ? '🔒' : m.icon}
                    </span>
                    <span className={styles.roomNumber}>{ui.map.missionNumber(i + 1)}</span>
                    <span className={styles.roomTitle}>{m.title}</span>
                    <span className={styles.roomTopic}>{m.topicLabel}</span>
                    <span className={styles.roomStatus}>
                      {statusText}
                      {p.status === 'completed' && <Stars value={p.bestStars} size="sm" />}
                    </span>
                  </button>
                  {locked && prev && (
                    <p id={`hint-${m.id}`} className={styles.lockedHint}>
                      {ui.map.lockedHint(prev)}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        <aside className={styles.sidePanel}>
          <CharacterPortrait look={player.look} size={96} />
          <p>
            <strong>{ui.map.playingAs(player.name)}</strong>
          </p>
          <p>
            {ui.map.totalStars(totalStars, MISSION_LIST.length * 3)}
          </p>
          <div className={styles.menu}>
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
        </aside>
      </div>
    </main>
  );
}
