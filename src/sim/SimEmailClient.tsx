import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { ui } from '../content/uz/ui';
import { isDecisionDone } from '../missions/engine/missionReducer';
import type { SimEmail, SimTextPart } from '../types/models';
import { Button } from '../ui/Button';
import { SimFrame } from '../ui/SimFrame';
import { ClueTarget, isFound, MarkModeToggle, useClueFinder, useMarkMode, type SimProps } from './common';
import styles from './sim.module.css';

export function SimEmailClient({ mission, state, dispatch, onClose }: SimProps) {
  const all = mission.sim.emails ?? [];
  const reported = all.filter((m) => m.decisionId && isDecisionDone(state, m.decisionId));
  const emails = all.filter((m) => !reported.includes(m));
  const [selectedId, setSelectedId] = useState<string | null>(emails[emails.length - 1]?.id ?? null);
  const [markMode, setMarkMode] = useMarkMode();
  const find = useClueFinder(state, dispatch);
  const selected = emails.find((m) => m.id === selectedId) ?? null;

  return (
    <SimFrame
      title={ui.sim.email.title}
      icon="✉️"
      onClose={onClose}
      toolbar={<MarkModeToggle markMode={markMode} onToggle={() => setMarkMode((m) => !m)} />}
    >
      <div className={styles.mailLayout}>
        <nav aria-label={ui.sim.email.inbox} className={styles.mailList}>
          <h3 className={styles.paneHeading}>{ui.sim.email.inbox}</h3>
          {reported.length > 0 && (
            <motion.p className={styles.notice} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              🛡️ {ui.sim.email.reported}
            </motion.p>
          )}
          {emails.length === 0 ? (
            <p className={styles.muted}>{ui.sim.email.empty}</p>
          ) : (
            <ul>
              <AnimatePresence initial={true}>
              {[...emails].reverse().map((m, i) => (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }}
                  exit={{ opacity: 0, x: 80, height: 0, transition: { duration: 0.35 } }}
                >
                  <button
                    type="button"
                    className={[styles.mailItem, m.id === selectedId ? styles.mailItemActive : ''].join(' ')}
                    aria-current={m.id === selectedId || undefined}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <span className={styles.mailFrom}>{m.fromName}</span>
                    <span className={styles.mailTime}>{m.time}</span>
                    <span className={styles.mailSubject}>{m.subject}</span>
                  </button>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>
          )}
        </nav>
        <section className={styles.mailView} aria-label={selected?.subject ?? ui.sim.email.selectEmail}>
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <EmailView email={selected} markMode={markMode} find={find} {...{ mission, state, dispatch }} />
            </motion.div>
          ) : (
            <p className={styles.muted}>{ui.sim.email.selectEmail}</p>
          )}
        </section>
      </div>
      {markMode && <p className={styles.markHint}>{ui.sim.markModeHint}</p>}
    </SimFrame>
  );
}

interface EmailViewProps extends Pick<SimProps, 'mission' | 'state' | 'dispatch'> {
  email: SimEmail;
  markMode: boolean;
  find(clueId?: string): void;
}

function EmailView({ email, markMode, find, mission, state, dispatch }: EmailViewProps) {
  const decision = email.decisionId ? mission.decisions[email.decisionId] : undefined;
  const canChoose = decision !== undefined && !isDecisionDone(state, decision.id);
  const choose = (choiceId: string) => decision && canChoose && dispatch({ type: 'CHOOSE', decisionId: decision.id, choiceId });
  const target = (clueId: string | undefined, content: ReactNode, block = false) => (
    <ClueTarget clueId={clueId} markMode={markMode} found={isFound(state, clueId)} onFind={find} block={block}>
      {content}
    </ClueTarget>
  );

  return (
    <article className={styles.mail}>
      {canChoose && email.toolbarChoiceIds && (
        <div className={styles.mailToolbar} role="toolbar" aria-label={ui.sim.email.toolbar}>
          {email.toolbarChoiceIds.map((id) => {
            const c = decision?.choices.find((x) => x.id === id);
            if (!c) return null;
            return (
              <Button key={id} variant={c.id === 'report' ? 'primary' : 'secondary'} onClick={() => choose(c.id)}>
                {c.shortLabel ?? c.label}
              </Button>
            );
          })}
        </div>
      )}
      <h3 className={styles.mailHeading}>
        <span className="visually-hidden">{ui.sim.email.subject}: </span>
        {target(email.clues?.subject, email.subject)}
      </h3>
      <p className={styles.mailMeta}>
        <span className={styles.muted}>{ui.sim.email.from}: </span>
        {target(email.clues?.from, (
          <>
            <strong>{email.fromName}</strong> &lt;{email.fromAddress}&gt;
          </>
        ))}
        <span className={styles.mailTime}> · {email.time}</span>
      </p>
      <p>{target(email.clues?.greeting, email.greeting)}</p>
      {email.body.map((paragraph, i) => (
        <p key={i}>
          {paragraph.map((part, j) => (
            <Part key={j} part={part} markMode={markMode} found={isFound(state, part.clueId)} find={find} onLink={choose} />
          ))}
        </p>
      ))}
      <p className={styles.signature}>{email.signature}</p>
      {email.attachment && (
        <div className={styles.attachment}>
          <span className="visually-hidden">{ui.sim.email.attachment}: </span>
          {target(email.attachment.clueId, <><span aria-hidden="true">📎</span> {email.attachment.fileName}</>, true)}
        </div>
      )}
    </article>
  );
}

function Part({ part, markMode, found, find, onLink }: { part: SimTextPart; markMode: boolean; found: boolean; find(id?: string): void; onLink(choiceId: string): void }) {
  if (part.type === 'text' || markMode) {
    return (
      <ClueTarget clueId={part.clueId} markMode={markMode} found={found} onFind={find}>
        {part.type === 'link' ? <span className={styles.fakeLink}>{part.text}</span> : part.text}
      </ClueTarget>
    );
  }
  const tipId = `tip-${part.realUrl.replace(/[^a-z0-9]/gi, '-')}`;
  // <a> emas: bosilganda faqat o‘yin ichidagi qaror ishga tushadi, hech qanday sahifa ochilmaydi.
  return (
    <span className={styles.linkWrap}>
      <button
        type="button"
        className={[styles.fakeLink, found ? styles.clueFound : ''].join(' ')}
        aria-describedby={tipId}
        onClick={() => part.choiceId && onLink(part.choiceId)}
      >
        {part.text}
      </button>
      <span role="tooltip" id={tipId} className={styles.tooltip}>
        {ui.sim.email.realUrl}: {part.realUrl}
      </span>
    </span>
  );
}
