import { motion } from 'motion/react';
import { ui } from '../content/uz/ui';
import styles from './ui.module.css';

interface StarsProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  /** Yulduzlar birin-ketin «otilib» chiqadi */
  pop?: boolean;
  delay?: number;
}

export function Stars({ value, size = 'md', pop = false, delay = 0 }: StarsProps) {
  return (
    <span className={[styles.stars, styles[`stars_${size}`]].join(' ')} role="img" aria-label={ui.common.stars(value)}>
      {[1, 2, 3].map((i) => {
        const on = i <= value;
        return (
          <motion.span
            key={i}
            aria-hidden="true"
            className={on ? styles.starOn : styles.starOff}
            initial={pop ? { scale: 0, rotate: -180, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 11, delay: pop ? delay + (i - 1) * 0.28 : 0 }}
          >
            ★
          </motion.span>
        );
      })}
    </span>
  );
}
