import { motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuthStore } from '../app/auth';
import { useScreenHeading } from '../app/hooks';
import { totalStars, useGameStore } from '../app/store';
import { auth as ta, profile as t } from '../content/uz/extra';
import { MISSION_LIST } from '../missions/data';
import { Button } from '../ui/Button';
import styles from './aux.module.css';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function ProfileScreen() {
  const { status, profile, email, syncing, saveProfile, signOut } = useAuthStore();
  const progress = useGameStore((s) => s.progress);
  const closeAux = useGameStore((s) => s.closeAux);
  const openAux = useGameStore((s) => s.openAux);
  const pushToast = useGameStore((s) => s.pushToast);
  const heading = useScreenHeading<HTMLHeadingElement>();
  const ids = useId();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [position, setPosition] = useState(profile?.position ?? '');
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '');
  const [gender, setGender] = useState(profile?.gender ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setDepartment(profile?.department ?? '');
    setPosition(profile?.position ?? '');
    setAge(profile?.age != null ? String(profile.age) : '');
    setGender(profile?.gender ?? null);
  }, [profile]);

  const completed = MISSION_LIST.filter((m) => progress.missions[m.id].status === 'completed').length;
  const stats = [
    { label: t.stats.missions, value: `${completed}/${MISSION_LIST.length}`, icon: '🎯' },
    { label: t.stats.stars, value: `${totalStars(progress)}`, icon: '⭐' },
    { label: t.stats.quiz, value: `${progress.quizBest ?? 0}`, icon: '🧠' },
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const a = age.trim() === '' ? null : Number(age);
    const d = department.trim();
    const p = position.trim();
    if (n.length < 2) return setError(ta.errors.name);
    if (!d) return setError(ta.errors.department);
    if (!p) return setError(ta.errors.position);
    if (a !== null && (!Number.isInteger(a) || a < 10 || a > 100)) return setError(ta.errors.age);
    setError(null);
    setSaving(true);
    const res = await saveProfile({ full_name: n, department: d, position: p, age: a, gender });
    setSaving(false);
    if (res.ok) pushToast(t.saved, 'success');
    else setError(res.error ?? null);
  };

  return (
    <main className={styles.page}>
      <motion.section
        className={[styles.card, styles.profileCard].join(' ')}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
      >
        <span className={styles.pill}>👤 {t.eyebrow}</span>
        <div className={styles.profileHead}>
          <motion.span
            className={styles.bigAvatar}
            aria-hidden="true"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          >
            {status === 'signedIn' ? initials(profile?.full_name ?? email ?? '?') : '👤'}
          </motion.span>
          <div>
            <h1 ref={heading} tabIndex={-1} className={styles.cardHeading}>
              {status === 'signedIn' ? profile?.full_name ?? t.heading : t.guestHeading}
            </h1>
            {status === 'signedIn' && profile?.department && profile.position && (
              <p className={styles.muted}>
                {profile.department} · {profile.position}
              </p>
            )}
            <p className={styles.muted}>{status === 'signedIn' ? email : t.guestText}</p>
            {status === 'signedIn' && <p className={styles.syncChip}>{syncing ? t.syncing : `☁️ ${t.synced}`}</p>}
          </div>
        </div>

        <ul className={styles.statGrid}>
          {stats.map((s, i) => (
            <motion.li key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <span aria-hidden="true">{s.icon}</span>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </motion.li>
          ))}
        </ul>

        {status === 'signedIn' ? (
          <form onSubmit={(e) => void submit(e)} noValidate>
            <div className={styles.field}>
              <label htmlFor={`${ids}-name`}>
                {ta.fullName} <span className={styles.req}>· {ta.required}</span>
              </label>
              <input id={`${ids}-name`} type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.twoCols}>
              <div className={styles.field}>
                <label htmlFor={`${ids}-department`}>
                  {ta.department} <span className={styles.req}>· {ta.required}</span>
                </label>
                <input id={`${ids}-department`} type="text" autoComplete="organization" maxLength={80} placeholder={ta.departmentPlaceholder} value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor={`${ids}-position`}>
                  {ta.position} <span className={styles.req}>· {ta.required}</span>
                </label>
                <input id={`${ids}-position`} type="text" autoComplete="organization-title" maxLength={80} placeholder={ta.positionPlaceholder} value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
            </div>
            <div className={styles.twoCols}>
              <div className={styles.field}>
                <label htmlFor={`${ids}-age`}>
                  {ta.age} <span className={styles.opt}>· {ta.ageHint}</span>
                </label>
                <input id={`${ids}-age`} type="number" inputMode="numeric" min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <fieldset className={styles.field}>
                <legend>
                  {ta.gender} <span className={styles.opt}>· {ta.ageHint}</span>
                </legend>
                <div className={styles.segmented}>
                  {(['none', 'male', 'female'] as const).map((g) => (
                    <label key={g} className={styles.segment}>
                      <input type="radio" name={`${ids}-gender`} checked={(gender ?? 'none') === g} onChange={() => setGender(g === 'none' ? null : g)} />
                      <span>{ta.genderOptions[g]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {error && (
              <p className={styles.serverError} role="alert">
                {error}
              </p>
            )}
            <div className={styles.row}>
              <Button type="submit" disabled={saving}>
                {t.save}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void signOut().then(() => pushToast(t.signedOut));
                }}
              >
                {t.signOut}
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.row}>
            <Button onClick={() => openAux('auth')}>{t.signIn}</Button>
          </div>
        )}

        <div className={styles.cardFooter}>
          <Button variant="ghost" onClick={closeAux}>
            ← {ta.back}
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
