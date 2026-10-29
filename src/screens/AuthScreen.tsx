import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuthStore, type RegisterInput } from '../app/auth';
import { companyConfig } from '../app/config';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { CHARACTERS } from '../content/characters';
import { auth as t } from '../content/uz/extra';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import styles from './aux.module.css';

type Mode = 'register' | 'login';
type Field = 'name' | 'department' | 'position' | 'email' | 'age';
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 60;

export function validate(
  mode: Mode,
  v: { name: string; department?: string; position?: string; email: string; age: string },
): Errors {
  const errors: Errors = {};
  if (mode === 'register' && v.name.trim().length < 2) errors.name = t.errors.name;
  if (mode === 'register' && !v.department?.trim()) errors.department = t.errors.department;
  if (mode === 'register' && !v.position?.trim()) errors.position = t.errors.position;
  if (!EMAIL_RE.test(v.email.trim())) errors.email = t.errors.email;
  if (mode === 'register' && v.age.trim() !== '') {
    const n = Number(v.age);
    if (!Number.isInteger(n) || n < 10 || n > 100) errors.age = t.errors.age;
  }
  return errors;
}

export function AuthScreen() {
  const configured = useAuthStore((s) => s.configured);
  const status = useAuthStore((s) => s.status);
  const sendMagicLink = useAuthStore((s) => s.sendMagicLink);
  const closeAux = useGameStore((s) => s.closeAux);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const ids = useId();

  const [mode, setMode] = useState<Mode>('register');
  const defaults = companyConfig.defaultPlayer;
  const [name, setName] = useState(`${defaults.firstName} ${defaults.lastName}`);
  const [department, setDepartment] = useState<string>(defaults.department);
  const [position, setPosition] = useState<string>(defaults.position);
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(String(defaults.age));
  const [gender, setGender] = useState<RegisterInput['gender']>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Havola orqali kirilgach — avvalgi ekranga qaytamiz
  useEffect(() => {
    if (status === 'signedIn') closeAux();
  }, [status, closeAux]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const found = validate(mode, { name, department, position, email, age });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    const res = await sendMagicLink(mode, {
      fullName: name.trim(),
      department: department.trim(),
      position: position.trim(),
      email: email.trim().toLowerCase(),
      age: age.trim() === '' ? null : Number(age),
      gender,
    });
    setSending(false);
    if (res.ok) {
      setSentTo(email.trim().toLowerCase());
      setCooldown(RESEND_SECONDS);
    } else {
      setServerError(res.error);
    }
  };

  const field = (key: Field) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${ids}-${key}-err` : undefined,
  });

  return (
    <main className={styles.page}>
      <div className={styles.authLayout}>
        <motion.section
          className={styles.authHero}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        >
          <span className={styles.pill}>🔐 {t.eyebrow}</span>
          <h1 ref={heading} tabIndex={-1} className={styles.heroHeading}>
            {t.heading}
          </h1>
          <p className={styles.lead}>{t.lead}</p>
          <ul className={styles.benefits}>
            {t.benefits.map((b, i) => (
              <motion.li key={b.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                <span aria-hidden="true">{b.icon}</span> {b.text}
              </motion.li>
            ))}
          </ul>
          <div className={styles.heroArt} aria-hidden="true">
            <CharacterArt character={CHARACTERS.bek} height="100%" float />
            <CharacterArt character={CHARACTERS.guli} height="94%" float />
          </div>
        </motion.section>

        <motion.section
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.1 }}
        >
          {!configured ? (
            <div className={styles.notice}>
              <p>{t.notConfigured}</p>
              <Button onClick={closeAux}>{t.guest}</Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {sentTo ? (
                <motion.div key="sent" className={styles.sent} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className={styles.envelope} aria-hidden="true">
                    <span>✉️</span>
                  </div>
                  <h2>{t.sentTitle}</h2>
                  <p role="status">{t.sentText(sentTo)}</p>
                  <p className={styles.muted}>{t.sentHint}</p>
                  <div className={styles.row}>
                    <Button variant="secondary" disabled={cooldown > 0 || sending} onClick={() => void submit()}>
                      {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
                    </Button>
                    <Button variant="ghost" onClick={() => setSentTo(null)}>
                      {t.changeEmail}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={(e) => void submit(e)} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className={styles.tabs} role="tablist" aria-label={t.eyebrow}>
                    {(['register', 'login'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        className={[styles.tab, mode === m ? styles.tabActive : ''].join(' ')}
                        onClick={() => {
                          setMode(m);
                          setErrors({});
                          setServerError(null);
                        }}
                      >
                        {t.tabs[m]}
                        {mode === m && <motion.span layoutId="auth-tab" className={styles.tabIndicator} />}
                      </button>
                    ))}
                  </div>

                  {mode === 'register' && (
                    <div className={styles.field}>
                      <label htmlFor={`${ids}-name`}>
                        {t.fullName} <span className={styles.req}>· {t.required}</span>
                      </label>
                      <input
                        id={`${ids}-name`}
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        placeholder={t.fullNamePlaceholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        {...field('name')}
                      />
                      {errors.name && (
                        <p id={`${ids}-name-err`} className={styles.error}>
                          {errors.name}
                        </p>
                      )}
                    </div>
                  )}

                  {mode === 'register' && (
                    <div className={styles.twoCols}>
                      <div className={styles.field}>
                        <label htmlFor={`${ids}-department`}>
                          {t.department} <span className={styles.req}>· {t.required}</span>
                        </label>
                        <input
                          id={`${ids}-department`}
                          type="text"
                          autoComplete="organization"
                          maxLength={80}
                          placeholder={t.departmentPlaceholder}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          {...field('department')}
                        />
                        {errors.department && (
                          <p id={`${ids}-department-err`} className={styles.error}>
                            {errors.department}
                          </p>
                        )}
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`${ids}-position`}>
                          {t.position} <span className={styles.req}>· {t.required}</span>
                        </label>
                        <input
                          id={`${ids}-position`}
                          type="text"
                          autoComplete="organization-title"
                          maxLength={80}
                          placeholder={t.positionPlaceholder}
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          {...field('position')}
                        />
                        {errors.position && (
                          <p id={`${ids}-position-err`} className={styles.error}>
                            {errors.position}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.field}>
                    <label htmlFor={`${ids}-email`}>
                      {t.email} <span className={styles.req}>· {t.required}</span>
                    </label>
                    <input
                      id={`${ids}-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      {...field('email')}
                    />
                    {errors.email && (
                      <p id={`${ids}-email-err`} className={styles.error}>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div className={styles.twoCols}>
                      <div className={styles.field}>
                        <label htmlFor={`${ids}-age`}>
                          {t.age} <span className={styles.opt}>· {t.ageHint}</span>
                        </label>
                        <input
                          id={`${ids}-age`}
                          type="number"
                          inputMode="numeric"
                          min={10}
                          max={100}
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          {...field('age')}
                        />
                        {errors.age && (
                          <p id={`${ids}-age-err`} className={styles.error}>
                            {errors.age}
                          </p>
                        )}
                      </div>
                      <fieldset className={styles.field}>
                        <legend>
                          {t.gender} <span className={styles.opt}>· {t.ageHint}</span>
                        </legend>
                        <div className={styles.segmented}>
                          {(['none', 'male', 'female'] as const).map((g) => (
                            <label key={g} className={styles.segment}>
                              <input
                                type="radio"
                                name={`${ids}-gender`}
                                checked={(gender ?? 'none') === g}
                                onChange={() => setGender(g === 'none' ? null : g)}
                              />
                              <span>{t.genderOptions[g]}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  )}

                  {serverError && (
                    <p className={styles.serverError} role="alert">
                      {serverError}
                    </p>
                  )}
                  <Button type="submit" className={styles.submit} disabled={sending}>
                    {sending ? t.sending : mode === 'register' ? t.submitRegister : t.submitLogin} <span aria-hidden="true">→</span>
                  </Button>
                  <p className={styles.privacy}>🔒 {t.privacy}</p>
                </motion.form>
              )}
            </AnimatePresence>
          )}
          <div className={styles.cardFooter}>
            <Button variant="ghost" onClick={closeAux}>
              ← {t.guest}
            </Button>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
