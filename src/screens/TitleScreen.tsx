import { motion } from 'motion/react';
import { useState } from 'react';
import { companyConfig } from '../app/config';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { continueTarget, hasAnyProgress } from '../app/transitions';
import { CHARACTERS } from '../content/characters';
import { ui } from '../content/uz/ui';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import styles from './screens.module.css';

const FLOATERS = ['✉️', '🔒', '🛡️', '🔑', '📱', '💾', '🔍', '⚠️', '🧩', '📎', '🛰️', '💡'];

export function TitleScreen() {
  const progress = useGameStore((s) => s.progress);
  const goTo = useGameStore((s) => s.goTo);
  const newGame = useGameStore((s) => s.newGame);
  const openSettings = useGameStore((s) => s.openSettings);
  const openCharacterSelect = useGameStore((s) => s.openCharacterSelect);
  const [dialog, setDialog] = useState<'newGame' | 'about' | null>(null);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const canContinue = hasAnyProgress(progress);

  const onContinue = () => (continueTarget(progress) === 'map' ? goTo('map') : openCharacterSelect());
  const onNewGame = () => (canContinue ? setDialog('newGame') : newGame());
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.15 + i * 0.09, type: 'spring' as const, stiffness: 220, damping: 22 },
  });

  return (
    <main className={styles.title}>
      <div className={styles.orbs} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.floaters} aria-hidden="true">
        {FLOATERS.map((icon, i) => (
          <span
            key={i}
            className={styles.floater}
            style={{ left: `${(i * 37 + 5) % 100}%`, animationDelay: `${-i * 2.1}s`, animationDuration: `${18 + (i % 4) * 5}s` }}
          >
            {icon}
          </span>
        ))}
      </div>

      <section className={styles.heroText}>
        <motion.span className={styles.pill} {...rise(0)}>
          <span className={styles.pillDot} aria-hidden="true" /> {ui.title.eyebrow}
        </motion.span>
        <motion.h1 ref={heading} tabIndex={-1} className={[styles.titleHeading, 'gradient-text'].join(' ')} {...rise(1)}>
          {companyConfig.gameTitle}
        </motion.h1>
        <motion.p className={styles.tagline} {...rise(2)}>
          {ui.title.tagline}
        </motion.p>

        <motion.div className={styles.ctaRow} {...rise(3)}>
          {canContinue && (
            <Button className={styles.ctaBig} onClick={onContinue}>
              <span aria-hidden="true">▶</span> {ui.title.continue}
            </Button>
          )}
          <Button className={styles.ctaBig} variant={canContinue ? 'secondary' : 'primary'} onClick={onNewGame}>
            <span aria-hidden="true">{canContinue ? '↻' : '▶'}</span> {ui.title.newGame}
          </Button>
        </motion.div>

        <motion.ul className={styles.statRow} {...rise(4)}>
          {ui.title.stats.map((s) => (
            <li key={s.label} className={styles.statCard}>
              <span aria-hidden="true">{s.icon}</span>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </li>
          ))}
        </motion.ul>

        <motion.div className={styles.linkRow} {...rise(5)}>
          <Button variant="ghost" onClick={openSettings}>
            <span aria-hidden="true">⚙️</span> {ui.title.settings}
          </Button>
          <Button variant="ghost" onClick={() => setDialog('about')}>
            <span aria-hidden="true">ℹ️</span> {ui.title.about}
          </Button>
        </motion.div>
        <motion.p className={styles.simNote} {...rise(6)}>
          <span aria-hidden="true">🔒</span> {ui.common.simulationNote}
        </motion.p>
      </section>

      <section className={styles.heroArt} aria-hidden="true">
        <div className={styles.glowRing} />
        <motion.div
          className={styles.heroBek}
          initial={{ opacity: 0, x: -60, rotate: -4 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 16 }}
        >
          <CharacterArt character={CHARACTERS.bek} height="100%" float />
        </motion.div>
        <motion.div
          className={styles.heroGuli}
          initial={{ opacity: 0, x: 60, rotate: 4 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 16 }}
        >
          <CharacterArt character={CHARACTERS.guli} height="100%" float className={styles.floatDelay} />
        </motion.div>
        {ui.title.badges.map((b, i) => (
          <motion.span
            key={b}
            className={[styles.floatBadge, styles[`floatBadge${i}`]].join(' ')}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.18, type: 'spring', stiffness: 300, damping: 14 }}
          >
            {b}
          </motion.span>
        ))}
      </section>

      {dialog === 'newGame' && (
        <ConfirmDialog
          title={ui.title.newGameConfirmTitle}
          text={ui.title.newGameConfirmText}
          confirmLabel={ui.title.newGame}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            newGame();
          }}
        />
      )}
      {dialog === 'about' && (
        <Modal title={ui.title.aboutTitle} onEscape={() => setDialog(null)}>
          {ui.title.aboutText.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <div className={styles.actions}>
            <Button onClick={() => setDialog(null)} autoFocusTarget>
              {ui.common.close}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
