import { AnimatePresence, motion } from 'motion/react';
import { playGameAudio } from '../game/audio/audioEvents';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../app/auth';
import { useScreenHeading } from '../app/hooks';
import { loadQuizSession, saveQuizSession } from '../app/session';
import { useGameStore } from '../app/store';
import { QUIZ_QUESTIONS, QUIZ_TOPICS } from '../content/quiz/questions';
import { quiz as t } from '../content/uz/extra';
import {
  answerQuestion,
  applyFiftyFifty,
  buildQuizResult,
  createQuizSession,
  currentQuestion,
  nextQuestion,
  type QuizResult,
  type QuizState,
} from '../quiz/engine';
import { burstAt, celebrate, originOf, useCountUp } from '../ui/anim';
import { Button } from '../ui/Button';
import styles from './aux.module.css';

const LETTERS = ['A', 'B', 'C', 'D'];

type ResultBundle = { result: QuizResult; record: boolean; state: QuizState };
type QuizSession = { state: QuizState | null; result: ResultBundle | null };

export function QuizScreen() {
  // Sahifa yangilanganda sinov shu savoldan davom etadi (sessionStorage)
  const [saved] = useState(() => loadQuizSession<QuizSession>());
  const [state, setState] = useState<QuizState | null>(saved?.state ?? null);
  const [result, setResult] = useState<ResultBundle | null>(saved?.result ?? null);
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    saveQuizSession<QuizSession>(state || result ? { state, result } : null);
  }, [state, result]);

  // Natijadan boshqa sahifaga o‘tilsa — keyingi safar sinov boshidan (kirish oynasi) ochiladi
  useEffect(
    () => () => {
      if (resultRef.current) saveQuizSession(null);
    },
    [],
  );
  const finishQuiz = useGameStore((s) => s.finishQuiz);
  const bestBefore = useGameStore((s) => s.progress.quizBest ?? 0);

  const start = () => {
    setResult(null);
    setState(createQuizSession(QUIZ_QUESTIONS));
  };

  const finish = (s: QuizState) => {
    const r = buildQuizResult(s);
    const record = r.score > bestBefore;
    finishQuiz(r);
    setResult({ result: r, record, state: s });
    setState(null);
  };

  if (result) return <QuizResultView {...result} onAgain={start} />;
  if (state) return <QuizPlay state={state} setState={setState} onFinish={finish} />;
  return <QuizIntro best={bestBefore} onStart={start} />;
}

function QuizIntro({ best, onStart }: { best: number; onStart(): void }) {
  const closeAux = useGameStore((s) => s.closeAux);
  const heading = useScreenHeading<HTMLHeadingElement>();
  return (
    <main className={styles.page}>
      <motion.section
        className={[styles.card, styles.quizIntro].join(' ')}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      >
        <motion.div
          className={styles.brain}
          aria-hidden="true"
          animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🧠
        </motion.div>
        <span className={styles.pill}>📘 {t.eyebrow}</span>
        <h1 ref={heading} tabIndex={-1} className={styles.heroHeading}>
          {t.heading}
        </h1>
        <p className={styles.lead}>{t.lead}</p>
        <ul className={styles.rules}>
          {t.rules.map((r, i) => (
            <motion.li key={r.text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
              <span aria-hidden="true">{r.icon}</span>
              {r.text}
            </motion.li>
          ))}
        </ul>
        {best > 0 && <p className={styles.bestChip}>🏅 {t.best(best)}</p>}
        <div className={styles.row}>
          <Button variant="ghost" onClick={closeAux}>
            ← {t.back}
          </Button>
          <Button className={styles.bigCta} onClick={onStart} autoFocusTarget>
            ▶ {t.start}
          </Button>
        </div>
      </motion.section>
    </main>
  );
}

function QuizPlay({ state, setState, onFinish }: { state: QuizState; setState(s: QuizState): void; onFinish(s: QuizState): void }) {
  const sq = currentQuestion(state)!;
  const q = sq.question;
  const answer = state.answers[q.id];
  const answered = state.phase === 'answered';
  const total = state.questions.length;
  const score = useCountUp(state.score, 500);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const last = state.index === total - 1;

  const choose = useCallback(
    (id: string) => {
      const next = answerQuestion(state, id);
      if (next === state) return;
      setState(next);
      const ok = next.answers[q.id]?.correct;
      playGameAudio({ type: 'quizAnswer', correct: !!ok });
      const el = optionRefs.current[id] ?? null;
      if (ok) {
        burstAt(el, 18);
        if (next.streak >= 3) celebrate('small', originOf(el));
      }
    },
    [state, setState, q.id],
  );

  const goNext = useCallback(() => {
    const next = nextQuestion(state);
    if (next.phase === 'done') onFinish(next);
    else setState(next);
  }, [state, setState, onFinish]);

  // Yangi savol — fokus sarlavhaga; javobdan keyin — «Keyingi» tugmasiga
  useEffect(() => {
    if (answered) nextRef.current?.focus();
    else headingRef.current?.focus();
  }, [answered, state.index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!answered) {
        const n = Number(e.key);
        const opt = Number.isInteger(n) ? sq.options[n - 1] : undefined;
        if (opt && !sq.removed.includes(opt.id)) {
          e.preventDefault();
          choose(opt.id);
        }
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, sq, choose, goNext]);

  return (
    <main className={styles.page}>
      <div className={styles.quizTop}>
        <div className={styles.dots} aria-hidden="true">
          {state.questions.map((x, i) => {
            const a = state.answers[x.question.id];
            return (
              <span
                key={x.question.id}
                className={[styles.dot, i === state.index ? styles.dotCurrent : '', a ? (a.correct ? styles.dotOk : styles.dotBad) : ''].join(' ')}
              />
            );
          })}
        </div>
        <div className={styles.quizStats}>
          <AnimatePresence>
            {state.streak >= 2 && (
              <motion.span
                key={state.streak}
                className={styles.streak}
                initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                🔥 {t.streak(state.streak)}
              </motion.span>
            )}
          </AnimatePresence>
          <span className={styles.scorePill} aria-live="polite">
            ⭐ {score}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={q.id}
          className={[styles.card, styles.questionCard].join(' ')}
          initial={{ opacity: 0, x: 60, rotate: 1.5 }}
          animate={answered && !answer?.correct ? { opacity: 1, x: [0, -12, 12, -8, 8, 0], rotate: 0 } : { opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: -60, rotate: -1.5, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className={styles.qMeta}>
            <span className={styles.qCount}>{t.question(state.index + 1, total)}</span>
            <span className={styles.topicChip}>{QUIZ_TOPICS[q.topic]}</span>
          </div>
          <div className={styles.scenario}>
            <motion.span
              className={styles.scenarioIcon}
              aria-hidden="true"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
            >
              {q.icon}
            </motion.span>
            <p>{q.scenario}</p>
          </div>
          <h1 ref={headingRef} tabIndex={-1} className={styles.qPrompt}>
            {q.prompt}
          </h1>

          <ul className={styles.options}>
            {sq.options.map((o, i) => {
              const removed = sq.removed.includes(o.id);
              const isCorrect = o.id === q.correct;
              const picked = answer?.choice === o.id;
              const cls = [
                styles.option,
                answered && isCorrect ? styles.optionCorrect : '',
                answered && picked && !isCorrect ? styles.optionWrong : '',
                answered && !isCorrect && !picked ? styles.optionDim : '',
                removed ? styles.optionRemoved : '',
              ].join(' ');
              return (
                <motion.li key={o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: removed ? 0.35 : 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06 }}>
                  <button
                    ref={(el) => {
                      optionRefs.current[o.id] = el;
                    }}
                    type="button"
                    className={cls}
                    disabled={answered || removed}
                    aria-pressed={picked}
                    onClick={() => choose(o.id)}
                  >
                    <span className={styles.letter} aria-hidden="true">
                      {answered && isCorrect ? '✓' : answered && picked ? '✗' : LETTERS[i]}
                    </span>
                    <span>{o.text}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>

          <AnimatePresence>
            {answered && answer && (
              <motion.div
                className={[styles.explain, answer.correct ? styles.explainOk : styles.explainBad].join(' ')}
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                role="status"
              >
                <p className={styles.verdict}>
                  {answer.correct ? `✅ ${t.correct}` : `❌ ${t.wrong}`}
                  {answer.correct && <span className={styles.plus}>{t.points(answer.points)}</span>}
                </p>
                <p>{q.explanation}</p>
                <p className={styles.source}>
                  📘 {t.source}: {q.source}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.qActions}>
            {!answered ? (
              <>
                <Button variant="secondary" disabled={state.fiftyLeft <= 0} onClick={() => setState(applyFiftyFifty(state))}>
                  ✂️ {t.fifty}
                </Button>
                <span className={styles.muted}>{t.keysHint}</span>
              </>
            ) : (
              <Button ref={nextRef} className={styles.bigCta} onClick={goNext}>
                {last ? t.finish : t.next} →
              </Button>
            )}
          </div>
        </motion.article>
      </AnimatePresence>
    </main>
  );
}

function QuizResultView({ result, record, state, onAgain }: { result: QuizResult; record: boolean; state: QuizState; onAgain(): void }) {
  const status = useAuthStore((s) => s.status);
  const openAux = useGameStore((s) => s.openAux);
  const closeAux = useGameStore((s) => s.closeAux);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const pct = Math.round((result.correct / result.total) * 100);
  const score = useCountUp(result.score, 1200, 0);
  const mistakes = useMemo(() => state.questions.filter((x) => !state.answers[x.question.id]?.correct), [state]);
  const R = 70;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    if (pct >= 70) {
      const id = window.setTimeout(() => celebrate(pct >= 90 ? 'big' : 'small'), 600);
      return () => window.clearTimeout(id);
    }
  }, [pct]);

  return (
    <main className={styles.page}>
      <motion.section className={[styles.card, styles.quizResult].join(' ')} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className={styles.ringWrap}>
          <svg viewBox="0 0 180 180" className={styles.ring} aria-hidden="true">
            <circle cx="90" cy="90" r={R} className={styles.ringTrack} />
            <motion.circle
              cx="90"
              cy="90"
              r={R}
              className={styles.ringFill}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - result.score / result.maxScore) }}
              transition={{ duration: 1.3, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <div className={styles.ringText}>
            <strong>{score}</strong>
            <span>{t.scoreLabel}</span>
          </div>
        </div>
        <h1 ref={heading} tabIndex={-1} className={styles.heroHeading}>
          {t.resultTitle(pct)}
        </h1>
        <div className={styles.resultChips}>
          <span>✅ {t.correctCount(result.correct, result.total)}</span>
          <span>🔥 {t.bestStreak(result.bestStreak)}</span>
          {record && (
            <motion.span
              className={styles.recordChip}
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 400, damping: 10 }}
            >
              🏅 {t.newRecord}
            </motion.span>
          )}
        </div>
        <p className={styles.saveNote}>
          {status === 'signedIn' ? t.savedOnline : t.savedLocal}{' '}
          {status !== 'signedIn' && (
            <Button variant="ghost" onClick={() => openAux('auth')}>
              {t.signIn} →
            </Button>
          )}
        </p>

        <h2>{t.review}</h2>
        {mistakes.length === 0 ? (
          <p className={styles.muted}>{t.noMistakes}</p>
        ) : (
          <ul className={styles.reviewList}>
            {mistakes.map((x, i) => {
              const picked = x.options.find((o) => o.id === state.answers[x.question.id]?.choice);
              const right = x.options.find((o) => o.id === x.question.correct);
              return (
                <motion.li key={x.question.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                  <p className={styles.reviewQ}>
                    <span aria-hidden="true">{x.question.icon}</span> {x.question.scenario}
                  </p>
                  <p className={styles.reviewBad}>
                    {t.yourAnswer}: {picked?.text}
                  </p>
                  <p className={styles.reviewOk}>
                    {t.rightAnswer}: {right?.text}
                  </p>
                  <p className={styles.muted}>{x.question.explanation}</p>
                </motion.li>
              );
            })}
          </ul>
        )}

        <div className={styles.row}>
          <Button variant="ghost" onClick={closeAux}>
            ← {t.back}
          </Button>
          <Button variant="secondary" onClick={() => openAux('leaderboard')}>
            🏆 {t.leaderboard}
          </Button>
          <Button className={styles.bigCta} onClick={onAgain} autoFocusTarget>
            ↻ {t.again}
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
