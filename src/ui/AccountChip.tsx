import { motion } from 'motion/react';
import { useAuthStore } from '../app/auth';
import { useGameStore } from '../app/store';
import { account as t } from '../content/uz/extra';
import styles from './ui.module.css';

/** Yuqori burchakdagi hisob tugmasi: mehmon — «Kirish», kirgan — ism va avatar */
export function AccountChip() {
  const { status, profile, email, configured } = useAuthStore();
  const openAux = useGameStore((s) => s.openAux);
  if (!configured) return null;
  const signedIn = status === 'signedIn';
  const name = profile?.full_name ?? email ?? '';
  const initial = name.trim().charAt(0).toUpperCase() || '👤';
  return (
    <motion.button
      type="button"
      className={styles.accountChip}
      onClick={() => openAux(signedIn ? 'profile' : 'auth')}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <span className={styles.accountAvatar} aria-hidden="true">
        {signedIn ? initial : '🔐'}
      </span>
      <span className={styles.accountName}>{signedIn ? name.split(' ')[0] : t.signIn}</span>
    </motion.button>
  );
}
