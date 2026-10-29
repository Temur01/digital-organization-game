import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../app/auth';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { leaderboard as t } from '../content/uz/extra';
import { supabase, type LeaderboardRow } from '../lib/supabase';
import { Button } from '../ui/Button';
import styles from './aux.module.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardScreen() {
  const status = useAuthStore((s) => s.status);
  const syncing = useAuthStore((s) => s.syncing);
  const closeAux = useGameStore((s) => s.closeAux);
  const openAux = useGameStore((s) => s.openAux);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setError(false);
    const { data, error: err } = await supabase.rpc('get_leaderboard', { limit_count: 20 });
    if (err) setError(true);
    else setRows((data as LeaderboardRow[]) ?? []);
  }, []);

  // Sinxronlash tugagach ham yangilaymiz — yangi natija darhol ko‘rinsin
  useEffect(() => {
    if (!syncing) void load();
  }, [load, syncing]);

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const maxPoints = Math.max(1, ...(rows ?? []).map((r) => Number(r.points)));
  // Podium tartibi: 2-o‘rin, 1-o‘rin, 3-o‘rin
  const podiumOrder = [podium[1], podium[0], podium[2]].filter((r): r is LeaderboardRow => r !== undefined);

  return (
    <main className={styles.page}>
      <section className={[styles.card, styles.boardCard].join(' ')}>
        <span className={styles.pill}>🏆 {t.eyebrow}</span>
        <h1 ref={heading} tabIndex={-1} className={styles.heroHeading}>
          {t.heading}
        </h1>
        <p className={styles.lead}>{t.lead}</p>

        {!supabase ? (
          <p className={styles.notice}>{t.notConfigured}</p>
        ) : error ? (
          <div className={styles.notice}>
            <p>{t.error}</p>
            <Button variant="secondary" onClick={() => void load()}>
              {t.retry}
            </Button>
          </div>
        ) : rows === null ? (
          <p className={styles.muted} role="status">
            {t.loading}
          </p>
        ) : rows.length === 0 ? (
          <p className={styles.notice}>{t.empty}</p>
        ) : (
          <>
            <ol className={styles.podium} aria-label={t.heading}>
              {podiumOrder.map((r) => {
                const place = Number(r.rank);
                return (
                  <motion.li
                    key={`${r.rank}-${r.display_name}`}
                    className={[styles.podiumItem, styles[`place${Math.min(place, 3)}`], r.is_me ? styles.me : ''].join(' ')}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 16, delay: place === 1 ? 0.35 : place === 2 ? 0.15 : 0.25 }}
                  >
                    <motion.span
                      className={styles.medal}
                      aria-hidden="true"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: place * 0.3 }}
                    >
                      {MEDALS[place - 1] ?? '🏅'}
                    </motion.span>
                    <span className={styles.podiumName}>
                      {r.display_name}
                      {r.is_me && <span className={styles.meTag}>{t.you}</span>}
                    </span>
                    <span className={styles.podiumPoints}>
                      {r.points} <small>{t.points}</small>
                    </span>
                    <motion.span
                      className={styles.podiumBar}
                      aria-hidden="true"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    >
                      {place}
                    </motion.span>
                  </motion.li>
                );
              })}
            </ol>

            {rest.length > 0 && (
              <ol className={styles.boardList} start={4}>
                {rest.map((r, i) => (
                  <motion.li
                    key={`${r.rank}-${r.display_name}-${i}`}
                    className={r.is_me ? styles.me : undefined}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <span className={styles.rankNum}>{r.rank}</span>
                    <span className={styles.boardName}>
                      {r.display_name}
                      {r.is_me && <span className={styles.meTag}>{t.you}</span>}
                    </span>
                    <span className={styles.boardBar} aria-hidden="true">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(Number(r.points) / maxPoints) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.05 }}
                      />
                    </span>
                    <span className={styles.boardPoints}>
                      {r.points} <small>{t.points}</small>
                    </span>
                  </motion.li>
                ))}
              </ol>
            )}
          </>
        )}

        <div className={styles.row}>
          <Button variant="ghost" onClick={closeAux}>
            ← {t.back}
          </Button>
          {supabase && status !== 'signedIn' && <Button onClick={() => openAux('auth')}>{t.guestCta} →</Button>}
        </div>
      </section>
    </main>
  );
}
