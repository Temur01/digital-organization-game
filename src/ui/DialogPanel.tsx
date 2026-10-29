import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ui } from '../content/uz/ui';
import type { Character, Dialog } from '../types/models';
import { CharacterAvatar } from './CharacterArt';
import { prefersReducedMotion } from './anim';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ui.module.css';

const CHARS_PER_SECOND = 55;

/** Matn harfma-harf yoziladi. Tugma birinchi bosilganda yozuv darhol tugaydi. */
function useTypewriter(text: string) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const n = Math.min(text.length, Math.floor(((performance.now() - t0) / 1000) * CHARS_PER_SECOND));
      setCount(n);
      if (n >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);
  return { shown: text.slice(0, count), done: count >= text.length, finish: () => setCount(text.length) };
}

interface DialogPanelProps {
  dialog: Dialog;
  player: Character;
  /** Rasmli NPC’lar: ism → illyustratsiya */
  npcs?: Record<string, { art: string; faceX: number }>;
  onClose(): void;
}

export function DialogPanel({ dialog, player, npcs, onClose }: DialogPanelProps) {
  const playerName = player.name;
  const [index, setIndex] = useState(0);
  const line = dialog.lines[index];
  const typing = useTypewriter(line?.text ?? '');
  if (!line) return null;
  const isPlayer = line.speaker === 'player';
  const speaker = isPlayer ? playerName : line.speaker;
  const last = index === dialog.lines.length - 1;
  const initial = speaker.charAt(0) === '«' ? speaker.charAt(1) : speaker.charAt(0);

  const advance = () => {
    if (!typing.done) typing.finish();
    else if (last) onClose();
    else setIndex((i) => i + 1);
  };

  return (
    <Modal title={speaker} hideTitle onEscape={onClose} size="md" className={styles.dialogModal}>
      <div className={styles.dialogRow}>
        <motion.span
          key={speaker}
          aria-hidden="true"
          initial={{ scale: 0.4, rotate: -15 }}
          animate={{ scale: 1, rotate: 0, y: typing.done ? 0 : [0, -3, 0] }}
          transition={{ y: { repeat: typing.done ? 0 : Infinity, duration: 0.35 }, default: { type: 'spring', stiffness: 400, damping: 14 } }}
        >
          {isPlayer ? (
            <CharacterAvatar character={player} />
          ) : npcs?.[speaker] ? (
            <CharacterAvatar character={npcs[speaker]!} className={styles.avatarNpc} />
          ) : (
            <span className={styles.avatar}>{initial}</span>
          )}
        </motion.span>
        <div className={styles.dialogBody}>
          <p className={styles.speaker}>{isPlayer ? `${speaker} (${ui.dialog.you})` : speaker}</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              className={styles.dialogText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
              aria-hidden="true"
            >
              {typing.shown}
              {!typing.done && <span className={styles.caret}>▍</span>}
            </motion.p>
          </AnimatePresence>
          <p className="visually-hidden" aria-live="polite">
            {line.text}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <span className={styles.dots} aria-hidden="true">
          {dialog.lines.map((_, i) => (
            <span key={i} className={i === index ? styles.dotActive : styles.dot} />
          ))}
        </span>
        <Button onClick={advance} autoFocusTarget>
          {last && typing.done ? ui.dialog.finish : ui.dialog.next}
        </Button>
      </div>
    </Modal>
  );
}
