import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { playSfx } from '../app/sfx';
import { ui } from '../content/uz/ui';
import { isDecisionDone } from '../missions/engine/missionReducer';
import type { Mission, SimTextPart } from '../types/models';
import { Button } from '../ui/Button';
import { SimFrame } from '../ui/SimFrame';
import { ClueTarget, isFound, MarkModeToggle, useClueFinder, useMarkMode, type SimProps } from './common';
import styles from './sim.module.css';

const t = ui.sim.social;
type Stage = 'post' | 'dm' | 'privacy' | 'done';

/** Ijtimoiy tarmoq: hamkasb posti → shubhali DM → o‘z profilingiz. Hech narsa joylanmaydi va yuborilmaydi. */
export function SimSocial({ mission, state, dispatch, onClose }: SimProps) {
  const social = mission.sim.social;
  const [markMode, setMarkMode] = useMarkMode();
  const find = useClueFinder(state, dispatch);
  const done = (id: string) => isDecisionDone(state, id);
  const stage: Stage = !social
    ? 'done'
    : !done(social.post.decisionId)
      ? 'post'
      : !done(social.dm.decisionId)
        ? 'dm'
        : !done(social.privacy.decisionId)
          ? 'privacy'
          : 'done';

  // Yangi DM kelganda — bildirishnoma tovushi
  useEffect(() => {
    if (stage === 'dm') playSfx('notify', 0.3);
  }, [stage]);

  if (!social) return null;
  const { post, dm, privacy } = social;
  const clue = (clueId: string | undefined, children: ReactNode, block = false) => (
    <ClueTarget clueId={clueId} markMode={markMode} found={isFound(state, clueId)} onFind={find} block={block}>
      {children}
    </ClueTarget>
  );
  const parts = (list: SimTextPart[]) => list.map((p, i) => <span key={i}>{clue(p.clueId, p.text)}</span>);

  const steps: { id: Exclude<Stage, 'done'>; label: string }[] = [
    { id: 'post', label: t.stepPost },
    { id: 'dm', label: t.stepDm },
    { id: 'privacy', label: t.stepPrivacy },
  ];
  const stageIndex = stage === 'done' ? steps.length : steps.findIndex((s) => s.id === stage);

  return (
    <SimFrame
      title={t.title}
      icon="📸"
      onClose={onClose}
      toolbar={stage !== 'done' && <MarkModeToggle markMode={markMode} onToggle={() => setMarkMode((m) => !m)} />}
    >
      <div className={styles.social}>
        <ol className={styles.socialSteps} aria-label={t.stepsLabel}>
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={i < stageIndex ? styles.socialStepDone : i === stageIndex ? styles.socialStepActive : undefined}
              aria-current={i === stageIndex ? 'step' : undefined}
            >
              <span aria-hidden="true">{i < stageIndex ? '✓' : i + 1}</span> {s.label}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          {stage === 'post' && (
            <motion.article key="post" className={styles.socialCard} {...slide}>
              <header className={styles.socialHeader}>
                <span className={styles.socialAvatar} aria-hidden="true">
                  {initials(post.author)}
                </span>
                <div className={styles.socialWho}>
                  <strong>{post.author}</strong> <span className={styles.muted}>{post.handle}</span>
                  <span className={styles.socialLocation}>{clue(post.locationClueId, post.location)}</span>
                </div>
                <span className={styles.socialDraft}>{post.time}</span>
              </header>

              <div className={styles.socialPhoto} role="group" aria-label={t.photoLabel}>
                <span className={styles.socialWindow} aria-hidden="true" />
                {post.photo.map((item) => (
                  <span key={item.id} className={styles.socialItem} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                    {clue(
                      item.clueId,
                      <>
                        <span className={styles.socialItemIcon} aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className={styles.socialItemLabel}>{item.label}</span>
                      </>,
                      true,
                    )}
                  </span>
                ))}
              </div>

              <div className={styles.socialActions} aria-hidden="true">
                <span>🤍</span>
                <span>💬</span>
                <span>📤</span>
                <span className={styles.socialLikes}>{t.likes(post.likes)}</span>
              </div>
              <p className={styles.socialCaption}>
                <strong>{post.handle}</strong> {parts(post.caption)}
              </p>

              <Choices mission={mission} decisionId={post.decisionId} choiceIds={post.choiceIds} heading={t.postQuestion} dispatch={dispatch} />
            </motion.article>
          )}

          {stage === 'dm' && (
            <motion.article key="dm" className={styles.socialCard} {...slide}>
              <header className={styles.socialHeader}>
                <span className={[styles.socialAvatar, styles.socialAvatarAlt].join(' ')} aria-hidden="true">
                  {initials(dm.from)}
                </span>
                <div className={styles.socialWho}>
                  <strong>{dm.from}</strong> <span className={styles.muted}>{dm.handle}</span>
                  <span className={styles.socialLocation}>{clue(dm.profileClueId, dm.profileNote)}</span>
                </div>
              </header>
              <div className={styles.socialThread} aria-label={t.dmLabel}>
                {dm.messages.map((m, i) => (
                  <motion.p
                    key={i}
                    className={styles.socialBubble}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.35 }}
                  >
                    {parts(m)}
                  </motion.p>
                ))}
              </div>
              <Choices mission={mission} decisionId={dm.decisionId} choiceIds={dm.choiceIds} heading={t.dmQuestion} dispatch={dispatch} />
            </motion.article>
          )}

          {stage === 'privacy' && (
            <motion.article key="privacy" className={styles.socialCard} {...slide}>
              <header className={styles.socialHeader}>
                <span className={[styles.socialAvatar, styles.socialAvatarMe].join(' ')} aria-hidden="true">
                  👤
                </span>
                <div className={styles.socialWho}>
                  <strong>{t.myProfile}</strong>
                  <span className={styles.muted}>{privacy.intro}</span>
                </div>
              </header>
              <dl className={styles.socialFields}>
                {privacy.fields.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{clue(f.clueId, f.value)}</dd>
                  </div>
                ))}
              </dl>
              <Choices mission={mission} decisionId={privacy.decisionId} choiceIds={privacy.choiceIds} heading={t.privacyQuestion} dispatch={dispatch} />
            </motion.article>
          )}

          {stage === 'done' && (
            <motion.p key="done" className={styles.notice} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              ✅ {social.doneText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      {markMode && stage !== 'done' && <p className={styles.markHint}>{ui.sim.markModeHint}</p>}
    </SimFrame>
  );
}

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
};

function initials(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Choices({
  mission,
  decisionId,
  choiceIds,
  heading,
  dispatch,
}: {
  mission: Mission;
  decisionId: string;
  choiceIds: string[];
  heading: string;
  dispatch: SimProps['dispatch'];
}) {
  const decision = mission.decisions[decisionId];
  const choices = choiceIds.map((id) => decision?.choices.find((c) => c.id === id)).filter((c) => c !== undefined);
  return (
    <div className={styles.socialChoices}>
      <p className={styles.socialQuestion}>{heading}</p>
      {choices.map((c) => (
        <Button key={c.id} variant="secondary" onClick={() => dispatch({ type: 'CHOOSE', decisionId, choiceId: c.id })}>
          {c.shortLabel ?? c.label}
        </Button>
      ))}
    </div>
  );
}
