import { motion, useAnimationControls } from 'motion/react';
import { useEffect, useState } from 'react';
import { audioManager } from '../game/audio';
import { playGameAudio } from '../game/audio/audioEvents';
import { ui } from '../content/uz/ui';
import { isDecisionDone } from '../missions/engine/missionReducer';
import { Button } from '../ui/Button';
import { SimFrame } from '../ui/SimFrame';
import { ClueTarget, isFound, MarkModeToggle, useClueFinder, useMarkMode, type SimProps } from './common';
import styles from './sim.module.css';

/** MFA so‘rovlari va «IT yordam» qo‘ng‘irog‘i. Vaqt bo‘yicha jarima yo‘q — hisoblagich faqat vizual. */
export function SimPhone({ mission, state, dispatch, onClose }: SimProps) {
  const phone = mission.sim.phone;
  const [markMode, setMarkMode] = useMarkMode();
  const find = useClueFinder(state, dispatch);
  const [requests, setRequests] = useState(3);
  const pushDone = phone ? isDecisionDone(state, phone.mfa.decisionId) : true;
  const shake = useAnimationControls();

  useEffect(() => {
    void shake.start({ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
  }, [shake]);

  useEffect(() => {
    if (pushDone) return;
    playGameAudio({ type: 'ui', action: 'vibrate' });
    const t = window.setInterval(() => {
      setRequests((n) => Math.min(n + 1, 99));
      playGameAudio({ type: 'ui', action: 'vibrate' });
      // Yangi so‘rov — telefon titraydi (harakat kamaytirilganda MotionConfig buni o‘chiradi)
      void shake.start({ x: [0, -6, 6, -5, 5, -3, 3, 0], rotate: [0, -1.5, 1.5, -1, 1, 0], transition: { duration: 0.45 } });
    }, 4000);
    return () => window.clearInterval(t);
  }, [pushDone, shake]);

  const callDone = phone ? isDecisionDone(state, phone.call.decisionId) : true;
  // Kiruvchi qo‘ng‘iroq: ikki marta jiringlaydi; javob berilsa yoki oyna yopilsa — darhol to‘xtaydi
  const ringing = pushDone && !callDone;
  useEffect(() => {
    if (!ringing) return;
    const ring = audioManager.playLoop('phoneRing');
    // Ikki marta jiringlab, qo‘ng‘iroq «ulanadi»
    const t = window.setTimeout(() => ring.stop(), 4800);
    return () => {
      window.clearTimeout(t);
      ring.stop();
    };
  }, [ringing]);

  if (!phone) return null;
  const { mfa, call } = phone;
  const choose = (decisionId: string, choiceId: string) => dispatch({ type: 'CHOOSE', decisionId, choiceId });
  const choicesOf = (decisionId: string, ids: readonly string[]) =>
    ids.map((id) => mission.decisions[decisionId]?.choices.find((c) => c.id === id)).filter((c) => c !== undefined);

  return (
    <SimFrame
      title={ui.sim.phone.title}
      icon="📱"
      onClose={onClose}
      toolbar={!callDone && <MarkModeToggle markMode={markMode} onToggle={() => setMarkMode((m) => !m)} />}
    >
      <div className={styles.phone}>
        {!pushDone && (
          <motion.section className={styles.phoneCard} aria-labelledby="mfa-title" animate={shake} initial={{ y: -40, opacity: 0 }}>
            <p className={styles.phoneApp}>
              🔐 {mfa.app}{' '}
              <motion.span
                key={requests}
                className={styles.badgeCount}
                initial={{ scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              >
                {ui.sim.phone.requests(requests)}
              </motion.span>
            </p>
            <h3 id="mfa-title" className={styles.phoneTitle}>
              <ClueTarget clueId={mfa.titleClueId} markMode={markMode} found={isFound(state, mfa.titleClueId)} onFind={find}>
                {mfa.title}
              </ClueTarget>
            </h3>
            <dl className={styles.phoneDetails}>
              <dt>{ui.sim.phone.location}</dt>
              <dd>
                <ClueTarget clueId={mfa.locationClueId} markMode={markMode} found={isFound(state, mfa.locationClueId)} onFind={find}>
                  {mfa.location}
                </ClueTarget>
              </dd>
              <dt>{ui.sim.phone.device}</dt>
              <dd>{mfa.device}</dd>
            </dl>
            <div className={styles.phoneActions}>
              {choicesOf(mfa.decisionId, mfa.choiceIds).map((c) => (
                <Button key={c.id} variant={c.id === 'deny' ? 'primary' : 'secondary'} onClick={() => choose(mfa.decisionId, c.id)}>
                  {c.shortLabel ?? c.label}
                </Button>
              ))}
            </div>
          </motion.section>
        )}

        {pushDone && !callDone && (
          <motion.section
            className={styles.phoneCard}
            aria-labelledby="call-title"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <div className={styles.callAvatar} aria-hidden="true">
              <span className={styles.ring} />
              <span className={[styles.ring, styles.ringDelay].join(' ')} />
              <span className={styles.callIcon}>📞</span>
            </div>
            <p className={styles.phoneApp}>{ui.sim.phone.incomingCall}</p>
            <h3 id="call-title" className={styles.phoneTitle}>
              {call.caller} <span className={styles.muted}>{call.callerNumber}</span>
            </h3>
            <div className={styles.subtitles} aria-label={ui.sim.phone.subtitles}>
              {call.lines.map((l, i) => (
                <p key={i}>
                  <span className={styles.muted}>{ui.sim.phone.callerSays}: </span>
                  <ClueTarget clueId={l.clueId} markMode={markMode} found={isFound(state, l.clueId)} onFind={find}>
                    {l.text}
                  </ClueTarget>
                </p>
              ))}
            </div>
            <div className={styles.phoneActionsColumn}>
              {choicesOf(call.decisionId, call.choiceIds).map((c) => (
                <Button key={c.id} variant="secondary" onClick={() => choose(call.decisionId, c.id)}>
                  {c.shortLabel ?? c.label}
                </Button>
              ))}
            </div>
          </motion.section>
        )}

        {callDone && (
          <motion.p className={styles.notice} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            ✅ {phone.doneText}
          </motion.p>
        )}
      </div>
      {markMode && !callDone && <p className={styles.markHint}>{ui.sim.markModeHint}</p>}
    </SimFrame>
  );
}
