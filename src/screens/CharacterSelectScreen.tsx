import { useState } from 'react';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { CHARACTER_IDS, CHARACTERS } from '../content/characters';
import { ui } from '../content/uz/ui';
import type { CharacterId } from '../types/models';
import { Button } from '../ui/Button';
import { CharacterPortrait } from '../ui/CharacterPortrait';
import styles from './screens.module.css';

export function CharacterSelectScreen() {
  const current = useGameStore((s) => s.progress.selectedCharacter);
  const selectCharacter = useGameStore((s) => s.selectCharacter);
  const goTo = useGameStore((s) => s.goTo);
  const returnTo = useGameStore((s) => s.characterSelectReturnTo);
  const [selected, setSelected] = useState<CharacterId>(current ?? 'bek');
  const heading = useScreenHeading<HTMLHeadingElement>();

  return (
    <main className={styles.page}>
      <h1 ref={heading} tabIndex={-1}>
        {ui.characterSelect.heading}
      </h1>
      <p className={styles.lead}>{ui.characterSelect.note}</p>
      <fieldset className={styles.characterGroup}>
        <legend className="visually-hidden">{ui.characterSelect.groupLabel}</legend>
        {CHARACTER_IDS.map((id) => {
          const c = CHARACTERS[id];
          const checked = selected === id;
          return (
            <label key={id} className={[styles.characterCard, checked ? styles.characterCardActive : ''].join(' ')}>
              <input type="radio" name="character" value={id} checked={checked} onChange={() => setSelected(id)} className={styles.radioInput} />
              <CharacterPortrait look={c.look} size={150} />
              <span className={styles.characterName}>{c.name}</span>
              <span className={styles.characterDesc}>{c.shortDescription}</span>
              {checked && <span className={styles.selectedTag}>✔ {ui.characterSelect.selected}</span>}
            </label>
          );
        })}
      </fieldset>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => goTo(returnTo)}>
          {ui.common.back}
        </Button>
        <Button onClick={() => selectCharacter(selected)}>{ui.common.confirm}</Button>
      </div>
    </main>
  );
}
