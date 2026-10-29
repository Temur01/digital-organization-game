import { ui } from '../content/uz/ui';
import styles from './ui.module.css';

export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={[styles.stars, styles[`stars_${size}`]].join(' ')} role="img" aria-label={ui.common.stars(value)}>
      {[1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" className={i <= value ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}
