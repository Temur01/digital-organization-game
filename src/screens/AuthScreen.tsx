import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { useAuthStore } from '../app/auth';
import { companyConfig } from '../app/config';
import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { CHARACTERS } from '../content/characters';
import { auth as t } from '../content/uz/extra';
import { Button } from '../ui/Button';
import { CharacterArt } from '../ui/CharacterArt';
import { GenderPicker } from '../ui/GenderPicker';
import { Select } from '../ui/Select';
import styles from './aux.module.css';

type Mode = 'register' | 'login' | 'forgot';
type Field = 'name' | 'gender' | 'position' | 'email' | 'password';
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 6;

export function validate(mode: Mode, v: { name: string; gender?: 'male' | 'female' | null; position?: string; email: string; password?: string }): Errors {
  const errors: Errors = {};
  if (mode === 'register' && v.name.trim().length < 2) errors.name = t.errors.name;
  if (mode === 'register' && !v.gender) errors.gender = t.errors.gender;
  if (mode === 'register' && !v.position?.trim()) errors.position = t.errors.position;
  if (!EMAIL_RE.test(v.email.trim())) errors.email = t.errors.email;
  if (mode !== 'forgot' && (v.password ?? '').length < MIN_PASSWORD) errors.password = t.errors.password;
  return errors;
}

/** Parol kuchi 0–4: uzunlik, harf+raqam aralashmasi, katta-kichik harf, maxsus belgi */
export function passwordStrength(p: string): number {
  if (p.length < MIN_PASSWORD) return p.length === 0 ? 0 : 1;
  let score = 1;
  if (p.length >= 10) score++;
  if (/[a-z]/i.test(p) && /\d/.test(p)) score++;
  if ((/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^a-z\d]/i.test(p)) score++;
  return Math.min(score, 4);
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
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [position, setPosition] = useState<string>(defaults.position);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const found = validate(mode, { name, gender, position, email, password });
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    const cleanEmail = email.trim().toLowerCase();
    const res =
      mode === 'register'
        ? await register({ fullName: name.trim(), gender: gender!, position, email: cleanEmail }, password)
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
  const errorText = (key: Field) =>
    errors[key] && (
      <p id={`${ids}-${key}-err`} className={styles.error}>
        {errors[key]}
      </p>
    );
  const label = (key: Field, text: string) => (
    <label htmlFor={`${ids}-${key}`}>
      {text} <span className={styles.req}>· {t.required}</span>
    </label>
  );

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.authShell}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      >
        <section className={styles.authAside}>
          <span className={styles.authBrand}>
            <span aria-hidden="true">🛡️</span> {companyConfig.gameTitle}
          </span>
          <h1 ref={heading} tabIndex={-1} className={styles.authHeading}>
            {t.heading}
          </h1>
          <p className={styles.authLead}>{t.lead}</p>
          <ul className={styles.authBenefits}>
            {t.benefits.map((b, i) => (
              <motion.li key={b.text} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}>
                <span className={styles.authBenefitIcon} aria-hidden="true">
                  {b.icon}
                </span>
                {b.text}
              </motion.li>
            ))}
          </ul>
          <div className={styles.authStage} aria-hidden="true">
            <span className={styles.authPodium} />
            <CharacterArt character={CHARACTERS.bek} height="100%" float />
            <CharacterArt character={CHARACTERS.guli} height="93%" float />
            <motion.span
              className={[styles.authBadge, styles.authBadgeStars].join(' ')}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              ⭐ ⭐ ⭐
            </motion.span>
            <motion.span
              className={[styles.authBadge, styles.authBadgeRank].join(' ')}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.4, delay: 0.6 }}
            >
              🏆 {t.asideBadge}
            </motion.span>
          </div>
        </section>

        <section className={styles.authMain}>
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
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={styles.envelope} aria-hidden="true">
                    <span>📬</span>
                  </div>
                  <h2>{t.forgot.sentTitle}</h2>
                  <p role="status" className={styles.muted}>
                    {t.forgot.sentText(resetSentTo)}
                  </p>
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
                <motion.div key="sent" className={styles.sent} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className={styles.envelope} aria-hidden="true">
                    <span>✉️</span>
                  </div>
                  <h2>{t.confirmTitle}</h2>
                  <p role="status" className={styles.muted}>
                    {t.confirmText(confirmTo)}
                  </p>
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
                  {mode !== 'forgot' && (
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

                  <motion.div key={mode} className={styles.formIntro} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <h2>{mode === 'forgot' ? `🔑 ${t.forgot.title}` : t.formTitle[mode]}</h2>
                    <p className={styles.muted}>{mode === 'forgot' ? t.forgot.lead : t.formLead[mode]}</p>
                  </motion.div>

                  {mode === 'register' && (
                    <>
                      <p className={styles.formSection}>
                        <span aria-hidden="true">1</span> {t.sections.about}
                      </p>
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          {label('name', t.fullName)}
                          <IconInput
                            icon="👤"
                            id={`${ids}-name`}
                            type="text"
                            autoComplete="given-name"
                            maxLength={80}
                            placeholder={t.fullNamePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            {...field('name')}
                          />
                          {errorText('name')}
                        </div>
                        <div className={styles.field}>
                          {label('position', t.position)}
                          <Select
                            id={`${ids}-position`}
                            value={position}
                            options={companyConfig.positions}
                            placeholder={t.positionPlaceholder}
                            onChange={setPosition}
                            invalid={!!errors.position}
                            describedBy={errors.position ? `${ids}-position-err` : undefined}
                          />
                          {errorText('position')}
                        </div>
                      </div>
                      <GenderPicker
                        name={`${ids}-gender`}
                        legend={t.gender}
                        hint={t.required}
                        value={gender}
                        options={t.genderOptions}
                        onChange={setGender}
                        error={errors.gender}
                        errorId={`${ids}-gender-err`}
                      />
                      <p className={styles.formSection}>
                        <span aria-hidden="true">2</span> {t.sections.account}
                      </p>
                    </>
                  )}

                  <div className={styles.field}>
                    {label('email', t.email)}
                    <IconInput
                      icon="✉️"
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
                    {errorText('email')}
                  </div>

                  {mode !== 'forgot' && (
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        {label('password', t.password)}
                        {mode === 'login' && (
                          <button type="button" className={styles.linkButton} onClick={() => switchMode('forgot')}>
                            {t.forgotLink}
                          </button>
                        )}
                      </div>
                      <PasswordInput
                        id={`${ids}-password`}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        placeholder={mode === 'register' ? t.passwordHint : ''}
                        value={password}
                        onChange={setPassword}
                        meter={mode === 'register'}
                        {...field('password')}
                      />
                      {errorText('password')}
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
                    <p className={styles.switchPrompt}>
                      {t.switchPrompt[mode]}{' '}
                      <button type="button" className={styles.linkButton} onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                        {t.tabs[mode === 'register' ? 'login' : 'register']}
                      </button>
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          )}

          <div className={styles.orDivider}>
            <span>{t.or}</span>
          </div>
          <Button variant="secondary" className={styles.submit} onClick={closeAux}>
            <span aria-hidden="true">🎮</span> {t.guest}
          </Button>
          <p className={styles.privacy}>
            <span aria-hidden="true">🔒</span> {t.privacy}
          </p>
        </section>
      </motion.div>
    </main>
  );
}

/** Chap tomonida belgisi bor matn maydoni */
function IconInput({ icon, ...input }: InputHTMLAttributes<HTMLInputElement> & { icon: string }) {
  return (
    <div className={styles.inputWrap}>
      <span className={styles.inputIcon} aria-hidden="true">
        {icon}
      </span>
      <input {...input} />
    </div>
  );
}

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange(value: string): void;
  /** Ro‘yxatdan o‘tishda — parol kuchi ko‘rsatkichi */
  meter?: boolean;
}

/** Parol maydoni: ko‘rsatish/yashirish tugmasi va (ixtiyoriy) kuch ko‘rsatkichi */
function PasswordInput({ value, onChange, meter, ...input }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const strength = passwordStrength(value);
  return (
    <>
      <div className={[styles.inputWrap, styles.passwordRow].join(' ')}>
        <span className={styles.inputIcon} aria-hidden="true">
          🔒
        </span>
        <input {...input} type={show ? 'text' : 'password'} minLength={MIN_PASSWORD} maxLength={72} value={value} onChange={(e) => onChange(e.target.value)} />
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
      {meter && value.length > 0 && (
        <div className={styles.strength} data-level={strength}>
          <span className={styles.strengthBars} aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={n <= strength ? styles.strengthOn : undefined} />
            ))}
          </span>
          <span className={styles.strengthText}>
            {t.strength.label}: <strong>{t.strength.levels[strength]}</strong>
          </span>
        </div>
      )}
    </>
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
      <motion.div className={styles.sent} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
        <div className={styles.envelope} aria-hidden="true">
          <span>⌛</span>
        </div>
        <h2>{t.reset.invalidTitle}</h2>
        <p role="alert" className={styles.muted}>
          {t.reset.invalidText}
        </p>
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
        <PasswordInput id={`${ids}-new`} autoComplete="new-password" value={password} onChange={setPassword} meter data-autofocus />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${ids}-confirm`}>{t.reset.confirm}</label>
        <PasswordInput id={`${ids}-confirm`} autoComplete="new-password" value={confirm} onChange={setConfirm} />
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
