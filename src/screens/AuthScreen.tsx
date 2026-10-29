import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuthStore } from '../app/auth';
import { companyConfig } from '../app/config';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { CHARACTERS } from '../content/characters';
import { auth as t } from '../content/uz/extra';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import { Select } from '../ui/Select';
import styles from './aux.module.css';

type Mode = 'register' | 'login' | 'forgot';
type Field = 'name' | 'position' | 'email' | 'password';
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 6;

export function validate(mode: Mode, v: { name: string; position?: string; email: string; password?: string }): Errors {
  const errors: Errors = {};
  if (mode === 'register' && v.name.trim().length < 2) errors.name = t.errors.name;
  if (mode === 'register' && !v.position?.trim()) errors.position = t.errors.position;
  if (!EMAIL_RE.test(v.email.trim())) errors.email = t.errors.email;
  if (mode !== 'forgot' && (v.password ?? '').length < MIN_PASSWORD) errors.password = t.errors.password;
  return errors;
}

export function AuthScreen() {
  const configured = useAuthStore((s) => s.configured);
  const status = useAuthStore((s) => s.status);
  const register = useAuthStore((s) => s.register);
  const signIn = useAuthStore((s) => s.signIn);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const recovery = useAuthStore((s) => s.recovery);
  const clearRecovery = useAuthStore((s) => s.clearRecovery);
  const closeAux = useGameStore((s) => s.closeAux);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const ids = useId();

  const [mode, setMode] = useState<Mode>('register');
  const defaults = companyConfig.defaultPlayer;
  const [name, setName] = useState<string>(defaults.firstName);
  const [position, setPosition] = useState<string>(defaults.position);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmTo, setConfirmTo] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  // Kirilgach — avvalgi ekranga qaytamiz (parolni tiklash havolasidan kelgan bo‘lsa — avval yangi parol)
  useEffect(() => {
    if (status === 'signedIn' && recovery === 'none') closeAux();
  }, [status, recovery, closeAux]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setServerError(null);
    setResetSentTo(null);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const found = validate(mode, { name, position, email, password });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    const cleanEmail = email.trim().toLowerCase();
    const res =
      mode === 'register'
        ? await register(
            {
              fullName: name.trim(),
              position,
              email: cleanEmail,
            },
            password,
          )
        : mode === 'forgot'
          ? await requestPasswordReset(cleanEmail)
          : await signIn(cleanEmail, password);
    setSending(false);
    if (!res.ok) setServerError(res.error);
    else if (mode === 'forgot') setResetSentTo(cleanEmail);
    else if ('needsConfirm' in res && res.needsConfirm) setConfirmTo(cleanEmail);
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
          transition={{
            type: 'spring',
            stiffness: 160,
            damping: 20,
            delay: 0.1,
          }}
        >
          {!configured ? (
            <div className={styles.notice}>
              <p>{t.notConfigured}</p>
              <Button onClick={closeAux}>{t.guest}</Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {recovery !== 'none' ? (
                <RecoveryPanel
                  key="recovery"
                  onRequestNew={() => {
                    clearRecovery();
                    switchMode('forgot');
                  }}
                />
              ) : resetSentTo ? (
                <motion.div
                  key="reset-sent"
                  className={styles.sent}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={styles.envelope} aria-hidden="true">
                    <span>📬</span>
                  </div>
                  <h2>{t.forgot.sentTitle}</h2>
                  <p role="status">{t.forgot.sentText(resetSentTo)}</p>
                  {serverError && (
                    <p className={styles.serverError} role="alert">
                      {serverError}
                    </p>
                  )}
                  <div className={styles.row}>
                    <Button variant="secondary" disabled={sending} onClick={() => void submit()}>
                      {sending ? t.sending : t.forgot.resend}
                    </Button>
                    <Button variant="ghost" onClick={() => switchMode('login')}>
                      {t.forgot.back}
                    </Button>
                  </div>
                </motion.div>
              ) : confirmTo ? (
                <motion.div key="sent" className={styles.sent} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className={styles.envelope} aria-hidden="true">
                    <span>✉️</span>
                  </div>
                  <h2>{t.confirmTitle}</h2>
                  <p role="status">{t.confirmText(confirmTo)}</p>
                  <div className={styles.row}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirmTo(null);
                        setMode('login');
                      }}
                    >
                      {t.tabs.login}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={(e) => void submit(e)} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {mode === 'forgot' ? (
                    <div className={styles.formIntro}>
                      <h2>🔑 {t.forgot.title}</h2>
                      <p className={styles.muted}>{t.forgot.lead}</p>
                    </div>
                  ) : (
                    <div className={styles.tabs} role="tablist" aria-label={t.eyebrow}>
                      {(['register', 'login'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={mode === m}
                          className={[styles.tab, mode === m ? styles.tabActive : ''].join(' ')}
                          onClick={() => switchMode(m)}
                        >
                          {t.tabs[m]}
                          {mode === m && <motion.span layoutId="auth-tab" className={styles.tabIndicator} />}
                        </button>
                      ))}
                    </div>
                  )}

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
                    <div className={styles.field}>
                      <label htmlFor={`${ids}-position`}>
                        {t.position} <span className={styles.req}>· {t.required}</span>
                      </label>
                      <Select
                        id={`${ids}-position`}
                        value={position}
                        options={companyConfig.positions}
                        placeholder={t.positionPlaceholder}
                        onChange={setPosition}
                        invalid={!!errors.position}
                        describedBy={errors.position ? `${ids}-position-err` : undefined}
                      />
                      {errors.position && (
                        <p id={`${ids}-position-err`} className={styles.error}>
                          {errors.position}
                        </p>
                      )}
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

                  {mode !== 'forgot' && (
                    <div className={styles.field}>
                      <label htmlFor={`${ids}-password`}>
                        {t.password} <span className={styles.req}>· {t.required}</span>
                      </label>
                      <div className={styles.passwordRow}>
                        <input
                          id={`${ids}-password`}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                          minLength={MIN_PASSWORD}
                          maxLength={72}
                          placeholder={mode === 'register' ? t.passwordHint : ''}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          {...field('password')}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggle}
                          aria-pressed={showPassword}
                          aria-label={showPassword ? t.hidePassword : t.showPassword}
                          title={showPassword ? t.hidePassword : t.showPassword}
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          <span aria-hidden="true">{showPassword ? '🙈' : '👁️'}</span>
                        </button>
                      </div>
                      {errors.password && (
                        <p id={`${ids}-password-err`} className={styles.error}>
                          {errors.password}
                        </p>
                      )}
                      {mode === 'login' && (
                        <button type="button" className={styles.linkButton} onClick={() => switchMode('forgot')}>
                          {t.forgotLink}
                        </button>
                      )}
                    </div>
                  )}

                  {serverError && (
                    <p className={styles.serverError} role="alert">
                      {serverError}
                    </p>
                  )}
                  <Button type="submit" className={styles.submit} disabled={sending}>
                    {sending ? t.sending : mode === 'register' ? t.submitRegister : mode === 'forgot' ? t.forgot.submit : t.submitLogin}{' '}
                    <span aria-hidden="true">→</span>
                  </Button>
                  {mode === 'forgot' ? (
                    <Button variant="ghost" className={styles.submit} onClick={() => switchMode('login')}>
                      ← {t.forgot.back}
                    </Button>
                  ) : (
                    <p className={styles.privacy}>🔒 {t.privacy}</p>
                  )}
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

/** Parolni tiklash havolasidan qaytganda: havola tekshiruvi, yangi parol formasi yoki «havola yaroqsiz» */
function RecoveryPanel({ onRequestNew }: { onRequestNew(): void }) {
  const recovery = useAuthStore((s) => s.recovery);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const clearRecovery = useAuthStore((s) => s.clearRecovery);
  const pushToast = useGameStore((s) => s.pushToast);
  const ids = useId();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(t.errors.password);
    if (password !== confirm) return setError(t.errors.mismatch);
    setError(null);
    setSaving(true);
    const res = await updatePassword(password);
    setSaving(false);
    if (res.ok) pushToast(t.reset.done, 'success');
    else setError(res.error);
  };

  if (recovery === 'pending') {
    return (
      <motion.div className={styles.sent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className={styles.envelope} aria-hidden="true" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}>
          <span>🔄</span>
        </motion.div>
        <p role="status">{t.reset.checking}</p>
      </motion.div>
    );
  }

  if (recovery === 'invalid') {
    return (
      <motion.div className={styles.sent} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
        <div className={styles.envelope} aria-hidden="true">
          <span>⌛</span>
        </div>
        <h2>{t.reset.invalidTitle}</h2>
        <p role="alert">{t.reset.invalidText}</p>
        <div className={styles.row}>
          <Button onClick={onRequestNew}>{t.reset.requestNew}</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form onSubmit={(e) => void submit(e)} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={styles.formIntro}>
        <h2>🔐 {t.reset.title}</h2>
        <p className={styles.muted}>{t.reset.lead}</p>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${ids}-new`}>
          {t.reset.password} <span className={styles.req}>· {t.passwordHint}</span>
        </label>
        <div className={styles.passwordRow}>
          <input
            id={`${ids}-new`}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-autofocus
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-pressed={show}
            aria-label={show ? t.hidePassword : t.showPassword}
            title={show ? t.hidePassword : t.showPassword}
            onClick={() => setShow((v) => !v)}
          >
            <span aria-hidden="true">{show ? '🙈' : '👁️'}</span>
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${ids}-confirm`}>{t.reset.confirm}</label>
        <input
          id={`${ids}-confirm`}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={72}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p className={styles.serverError} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className={styles.submit} disabled={saving}>
        {saving ? t.sending : t.reset.submit} <span aria-hidden="true">→</span>
      </Button>
      <Button variant="ghost" className={styles.submit} onClick={clearRecovery}>
        {t.reset.cancel}
      </Button>
    </motion.form>
  );
}
