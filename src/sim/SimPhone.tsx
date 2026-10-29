import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (pushDone) return;
    const t = window.setInterval(() => setRequests((n) => Math.min(n + 1, 99)), 4000);
    return () => window.clearInterval(t);
  }, [pushDone]);

  if (!phone) return null;
  const { mfa, call } = phone;
  const callDone = isDecisionDone(state, call.decisionId);
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
          <section className={styles.phoneCard} aria-labelledby="mfa-title">
            <p className={styles.phoneApp}>
              🔐 {mfa.app} <span className={styles.badgeCount}>{ui.sim.phone.requests(requests)}</span>
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
          </section>
        )}

        {pushDone && !callDone && (
          <section className={styles.phoneCard} aria-labelledby="call-title">
            <p className={styles.phoneApp}>📞 {ui.sim.phone.incomingCall}</p>
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
          </section>
        )}

        {callDone && <p className={styles.notice}>{phone.doneText}</p>}
      </div>
      {markMode && !callDone && <p className={styles.markHint}>{ui.sim.markModeHint}</p>}
    </SimFrame>
  );
}
