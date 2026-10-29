import { AnimatePresence, motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { CHARACTER_IDS, CHARACTERS } from '../content/characters';
import { ui } from '../content/uz/ui';
import type { CharacterId } from '../types/models';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import styles from './screens.module.css';

export function CharacterSelectScreen() {
  const current = useGameStore((s) => s.progress.selectedCharacter);
  const selectCharacter = useGameStore((s) => s.selectCharacter);
  const goTo = useGameStore((s) => s.goTo);
  const returnTo = useGameStore((s) => s.characterSelectReturnTo);
  const [selected, setSelected] = useState<CharacterId>(current ?? 'bek');
  const heading = useScreenHeading<HTMLHeadingElement>();
  const chosen = CHARACTERS[selected];

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <span className={styles.pill}>
          <span className={styles.pillDot} aria-hidden="true" /> {ui.characterSelect.eyebrow}
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {ui.characterSelect.heading}
        </h1>
        <p className={styles.lead}>{ui.characterSelect.note}</p>
      </header>

      <fieldset className={styles.characterGroup}>
        <legend className="visually-hidden">{ui.characterSelect.groupLabel}</legend>
        {CHARACTER_IDS.map((id, i) => {
          const c = CHARACTERS[id];
          const checked = selected === id;
          return (
            <motion.label
              key={id}
              className={[styles.characterCard, checked ? styles.characterCardActive : ''].join(' ')}
              style={{ '--accent': c.accent } as CSSProperties}
              initial={{ opacity: 0, y: 50, rotate: i === 0 ? -3 : 3 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: checked ? 1 : 0.97 }}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.08 }}
            >
              <input type="radio" name="character" value={id} checked={checked} onChange={() => setSelected(id)} className={styles.radioInput} />
              <span className={styles.characterStage} aria-hidden="true">
                <span className={styles.characterGlow} />
                <motion.span
                  key={String(checked)}
                  className={styles.characterArtWrap}
                  animate={checked ? { y: [0, -22, 0, -8, 0] } : { y: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  <CharacterArt character={c} height="100%" float={checked} />
                </motion.span>
              </span>
              <span className={styles.characterInfo}>
                <span className={styles.characterName}>{c.name}</span>
                <span className={styles.roleChip}>
                  <span className="visually-hidden">{ui.characterSelect.role}: </span>
                  {c.role}
                </span>
                <span className={styles.characterDesc}>{c.shortDescription}</span>
                <span className={styles.traits}>
                  {c.traits.map((t) => (
                    <span key={t} className={styles.trait}>
                      {t}
                    </span>
                  ))}
                </span>
                <span className={styles.quote}>{c.quote}</span>
              </span>
              <AnimatePresence>
                {checked && (
                  <motion.span
                    className={styles.selectedTag}
                    initial={{ scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    ✔ {ui.characterSelect.selected}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.label>
          );
        })}
      </fieldset>

      <motion.div className={styles.stickyBar} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <Button variant="ghost" onClick={() => goTo(returnTo)}>
          ← {ui.common.back}
        </Button>
        <span className={styles.stickyChosen} aria-live="polite">
          <strong>{chosen.name}</strong> · {chosen.role}
        </span>
        <Button className={styles.ctaBig} onClick={() => selectCharacter(selected)}>
          {ui.characterSelect.confirm} <span aria-hidden="true">→</span>
        </Button>
      </motion.div>
    </main>
  );
}
