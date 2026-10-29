import { useMemo, useState, type FormEvent } from 'react';
import { ui } from '../content/uz/ui';
import { isDecisionDone } from '../missions/engine/missionReducer';
import type { ReportField } from '../types/models';
import { Button } from '../ui/Button';
import { SimFrame } from '../ui/SimFrame';
import { fillName, stableShuffle } from '../ui/text';
import type { SimProps } from './common';
import styles from './sim.module.css';

/** Hodisani xabar qilish (faqat tanlov maydonlari) va parolni almashtirish (faqat variant tanlash). */
export function SimItPortal({ mission, state, dispatch, playerName, onClose }: SimProps) {
  const portal = mission.sim.itPortal;
  if (!portal) return null;
  const reportDone = isDecisionDone(state, portal.report.decisionId);
  const passwordDone = isDecisionDone(state, portal.password.decisionId);

  return (
    <SimFrame title={ui.sim.itPortal.title} icon="🛡️" onClose={onClose}>
      {!reportDone && <ReportForm {...{ mission, state, dispatch, playerName, onClose }} />}
      {reportDone && !passwordDone && <PasswordChange {...{ mission, state, dispatch, playerName, onClose }} />}
      {reportDone && passwordDone && <p className={styles.notice}>{ui.sim.itPortal.allDone}</p>}
    </SimFrame>
  );
}

function isFieldCorrect(field: ReportField, selected: readonly string[]): boolean {
  return field.options.every((o) => o.correct === selected.includes(o.id));
}

function ReportForm({ mission, dispatch }: SimProps) {
  const report = mission.sim.itPortal!.report;
  // Tanlovlar faqat shu komponent xotirasida; hech qayerga yuborilmaydi va saqlanmaydi.
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const toggle = (field: ReportField, optionId: string, checked: boolean) =>
    setValues((v) => {
      const current = v[field.id] ?? [];
      const next = field.kind === 'radio' ? [optionId] : checked ? [...current, optionId] : current.filter((x) => x !== optionId);
      return { ...v, [field.id]: next };
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const wrong = report.fields.filter((f) => !isFieldCorrect(f, values[f.id] ?? [])).map((f) => f.id);
    setErrors(wrong);
    dispatch({ type: 'CHOOSE', decisionId: report.decisionId, choiceId: wrong.length === 0 ? report.correctChoiceId : report.wrongChoiceId });
  };

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <h3 className={styles.paneHeading}>{ui.sim.itPortal.reportHeading}</h3>
      <p className={styles.muted}>{ui.sim.itPortal.reportIntro}</p>
      {errors.length > 0 && (
        <p className={styles.errorBox} role="alert">
          {ui.sim.itPortal.fixFields}
        </p>
      )}
      {report.fields.map((f) => {
        const invalid = errors.includes(f.id);
        const hintId = `${f.id}-hint`;
        return (
          <fieldset
            key={f.id}
            className={[styles.fieldset, invalid ? styles.fieldsetError : ''].join(' ')}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? hintId : undefined}
          >
            <legend>
              {f.label} <span className={styles.fieldKind}>· {f.kind === 'checkbox' ? ui.sim.itPortal.multiHint : ui.sim.itPortal.singleHint}</span>
            </legend>
            {f.options.map((o) => (
              <label key={o.id} className={styles.checkRow}>
                <input type={f.kind} name={f.id} checked={(values[f.id] ?? []).includes(o.id)} onChange={(e) => toggle(f, o.id, e.target.checked)} />
                <span>{o.label}</span>
              </label>
            ))}
            {invalid && (
              <p id={hintId} className={styles.fieldHint}>
                💡 {f.errorHint}
              </p>
            )}
          </fieldset>
        );
      })}
      <Button type="submit">{ui.sim.itPortal.submit}</Button>
    </form>
  );
}

function PasswordChange({ mission, dispatch, playerName }: SimProps) {
  const { decisionId, intro } = mission.sim.itPortal!.password;
  const decision = mission.decisions[decisionId];
  const choices = useMemo(() => (decision ? stableShuffle(decision.choices, decision.id) : []), [decision]);
  if (!decision) return null;
  return (
    <section aria-labelledby="pw-heading">
      <h3 id="pw-heading" className={styles.paneHeading}>
        {ui.sim.itPortal.passwordHeading}
      </h3>
      <p>{intro}</p>
      <p className={styles.muted}>🔒 {ui.sim.itPortal.passwordNote}</p>
      <ul className={styles.passwordList}>
        {choices.map((c) => (
          <li key={c.id} className={styles.passwordCard}>
            <code className={styles.passwordText}>{fillName(c.label, playerName)}</code>
            <Button variant="secondary" onClick={() => dispatch({ type: 'CHOOSE', decisionId, choiceId: c.id })}>
              {ui.sim.itPortal.choose}
              <span className="visually-hidden">: {fillName(c.label, playerName)}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
