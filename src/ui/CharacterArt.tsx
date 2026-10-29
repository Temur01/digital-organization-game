import type { Character } from '../types/models';
import styles from './ui.module.css';

interface CharacterArtProps {
  character: Character;
  /** CSS balandlik (masalan, '320px' yoki '100%') */
  height: string;
  float?: boolean;
  className?: string;
}

/** Personaj illyustratsiyasi (src/assets/characters). Dekorativ — matn muqobili alohida beriladi. */
export function CharacterArt({ character, height, float = false, className }: CharacterArtProps) {
  return (
    <img
      src={character.art}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={[styles.art, float ? styles.artFloat : '', className].filter(Boolean).join(' ')}
      style={{ height }}
    />
  );
}

/** Dumaloq avatar: illyustratsiyaning yuz qismi (qahramon yoki NPC) */
export function CharacterAvatar({ character, className }: { character: Pick<Character, 'art' | 'faceX'>; className?: string }) {
  return (
    <span className={[styles.avatar, styles.avatarPlayer, className].filter(Boolean).join(' ')} aria-hidden="true">
      <img
        src={character.art}
        alt=""
        className={styles.avatarImg}
        style={{ transform: `translateX(-${character.faceX * 100}%)` }}
        draggable={false}
      />
    </span>
  );
}
