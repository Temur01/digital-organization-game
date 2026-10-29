import type { AuthError, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isBackendConfigured, supabase, type Profile } from '../lib/supabase';
import { hashForScreen } from './router';
import { useGameStore } from './store';
import { flushPending, pullServerBest } from './sync';

/** Magic link yuborilgandan keyin profil ma’lumotlarini tiklash uchun (trigger ishlamasa ham) */
const PENDING_PROFILE_KEY = 'raqamli-qalqon:pending-profile';
const PROFILE_COLUMNS = 'id, full_name, email, age, gender, department, position';

export interface RegisterInput {
  fullName: string;
  email: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  department: string;
  position: string;
}

export type AuthStatus = 'loading' | 'guest' | 'signedIn';

interface AuthStore {
  configured: boolean;
  status: AuthStatus;
  email: string | null;
  userId: string | null;
  profile: Profile | null;
  syncing: boolean;
  init(): () => void;
  sendMagicLink(mode: 'register' | 'login', input: RegisterInput): Promise<{ ok: true } | { ok: false; error: string }>;
  saveProfile(patch: Partial<Pick<Profile, 'full_name' | 'age' | 'gender' | 'department' | 'position'>>): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
}

/** Supabase xatolarini foydalanuvchi tushunadigan matnga o‘giradi */
export function authErrorText(error: AuthError | Error | { message?: string; status?: number; code?: string }): string {
  const e = error as { message?: string; status?: number; code?: string };
  const msg = (e.message ?? '').toLowerCase();
  if (e.status === 429 || e.code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return 'Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.';
  if (e.code === 'otp_disabled' || msg.includes('signups not allowed'))
    return 'Bu email bilan hisob topilmadi. «Ro‘yxatdan o‘tish» bo‘limini tanlang.';
  if (msg.includes('invalid') && msg.includes('email')) return 'Email manzil noto‘g‘ri ko‘rinadi.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Serverga ulanib bo‘lmadi. Internetni tekshiring.';
  return 'Nimadir xato ketdi. Keyinroq qayta urinib ko‘ring.';
}

/** Havoladan keyin foydalanuvchi kirishdan oldingi sahifaga qaytadi */
function redirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}${hashForScreen(useGameStore.getState().auxReturnTo)}`;
}

export const useAuthStore = create<AuthStore>()((set, get) => {
  const loadProfile = async (session: Session) => {
    if (!supabase) return;
    const user = session.user;
    let { data: profile } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle();
    if (!profile) {
      // Zaxira yo‘l: trigger ishlamagan bo‘lsa — ro‘yxatdan o‘tishda kiritilgan ma’lumotdan profil yaratamiz
      let pending: Partial<RegisterInput> = {};
      try {
        pending = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) ?? '{}') as Partial<RegisterInput>;
      } catch {
        /* e’tiborsiz */
      }
      const meta = user.user_metadata as Record<string, unknown>;
      const row = {
        id: user.id,
        email: user.email ?? '',
        full_name: String(pending.fullName ?? meta.full_name ?? (user.email ?? 'Foydalanuvchi').split('@')[0]),
        age: pending.age ?? null,
        gender: pending.gender ?? null,
        department: pending.department?.trim() || (typeof meta.department === 'string' && meta.department.trim()) || null,
        position: pending.position?.trim() || (typeof meta.position === 'string' && meta.position.trim()) || null,
      };
      const res = await supabase.from('profiles').upsert(row).select(PROFILE_COLUMNS).single();
      profile = res.data;
    }
    try {
      localStorage.removeItem(PENDING_PROFILE_KEY);
    } catch {
      /* e’tiborsiz */
    }
    set({ profile: (profile as Profile | null) ?? null });
  };

  const syncAll = async () => {
    set({ syncing: true });
    try {
      await flushPending();
      const best = await pullServerBest();
      if (best) useGameStore.getState().mergeServerProgress(best);
    } finally {
      set({ syncing: false });
    }
  };

  const applySession = async (session: Session | null) => {
    if (!session) {
      set({ status: 'guest', email: null, userId: null, profile: null });
      return;
    }
    set({ status: 'signedIn', email: session.user.email ?? null, userId: session.user.id });
    await loadProfile(session);
    await syncAll();
  };

  return {
    configured: isBackendConfigured,
    status: isBackendConfigured ? 'loading' : 'guest',
    email: null,
    userId: null,
    profile: null,
    syncing: false,

    init: () => {
      if (!supabase) return () => {};
      void supabase.auth.getSession().then(({ data }) => applySession(data.session));
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Supabase tavsiyasi: callback ichida await qilmaslik — keyingi tikka o‘tkazamiz
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setTimeout(() => void applySession(session), 0);
        }
      });
      return () => data.subscription.unsubscribe();
    },

    sendMagicLink: async (mode, input) => {
      if (!supabase) return { ok: false, error: 'Server ulanmagan (Supabase sozlanmagan).' };
      if (mode === 'register') {
        try {
          localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(input));
        } catch {
          /* e’tiborsiz */
        }
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: input.email.trim(),
        options: {
          emailRedirectTo: redirectUrl(),
          shouldCreateUser: mode === 'register',
          data:
            mode === 'register'
              ? {
                  full_name: input.fullName.trim(),
                  age: input.age ?? '',
                  gender: input.gender ?? '',
                  department: input.department.trim(),
                  position: input.position.trim(),
                }
              : undefined,
        },
      });
      return error ? { ok: false, error: authErrorText(error) } : { ok: true };
    },

    saveProfile: async (patch) => {
      const { userId, profile } = get();
      if (!supabase || !userId) return { ok: false, error: 'Avval tizimga kiring.' };
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) return { ok: false, error: 'Profilni saqlab bo‘lmadi. Qayta urinib ko‘ring.' };
      set({ profile: (data as Profile) ?? profile });
      return { ok: true };
    },

    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      set({ status: 'guest', email: null, userId: null, profile: null });
    },
  };
});
