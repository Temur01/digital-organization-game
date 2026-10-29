import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { CHARACTERS, characterForGender } from '../content/characters';
import { CharacterAvatar } from './CharacterArt';
import styles from './ui.module.css';

type Gender = 'male' | 'female';

interface GenderPickerProps {
  /** Radio guruhi nomi (sahifada yagona bo‘lsin) */
  name: string;
  legend: string;
  hint?: string;
  value: Gender | null;
  options: Record<Gender, string>;
  onChange(value: Gender): void;
  error?: string;
  errorId?: string;
}

/** Jins tanlovi: har bir variant o‘ziga mos qahramon rasmini ko‘rsatadi (ismsiz — qahramon foydalanuvchi ismini oladi) */
export function GenderPicker({ name, legend, hint, value, options, onChange, error, errorId }: GenderPickerProps) {
  return (
    <fieldset className={styles.genderField} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}>
      <legend>
        {legend} {hint && <span className={styles.genderHint}>· {hint}</span>}
      </legend>
      <div className={styles.genderGroup}>
        {(['male', 'female'] as const).map((g) => {
          const character = CHARACTERS[characterForGender(g)!];
          const checked = value === g;
          return (
            <motion.label
              key={g}
              className={[styles.genderCard, checked ? styles.genderCardActive : ''].join(' ')}
              style={{ '--accent': character.accent } as CSSProperties}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              <input type="radio" name={name} value={g} checked={checked} onChange={() => onChange(g)} className={styles.genderInput} />
              <CharacterAvatar character={character} className={styles.genderAvatar} />
              <strong className={styles.genderText}>{options[g]}</strong>
              {checked && (
                <motion.span
                  className={styles.genderCheck}
                  aria-hidden="true"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className={styles.genderError}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
