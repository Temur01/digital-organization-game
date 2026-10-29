import type { AuthError, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isBackendConfigured, supabase, type Profile } from '../lib/supabase';
import { hashForScreen } from './router';
import { useGameStore } from './store';
import { flushPending, pullServerBest } from './sync';

/** Ro‘yxatdan o‘tishda kiritilgan profil ma’lumotlari (trigger ishlamasa ham profil yaratish uchun) */
const PENDING_PROFILE_KEY = 'raqamli-qalqon:pending-profile';
const PROFILE_COLUMNS = 'id, full_name, email, position';
/** Parolni tiklash havolasidan qaytganini bildiruvchi URL belgisi (?tiklash=1) */
const RECOVERY_PARAM = 'tiklash';

/**
 * Parolni tiklash holati:
 * - pending — havoladan qaytdik, Supabase kodni sessiyaga almashtirmoqda;
 * - ready — yangi parol o‘rnatish mumkin;
 * - invalid — havola eskirgan, allaqachon ishlatilgan yoki boshqa brauzerda ochilgan.
 */
export type RecoveryState = 'none' | 'pending' | 'ready' | 'invalid';

/**
 * Router ishga tushishidan oldin (modul yuklanganda) URL’dagi belgini o‘qiymiz va tozalaymiz.
 * `code` parametriga tegmaymiz — uni Supabase o‘zi almashtiradi va olib tashlaydi.
 * Xato bo‘lsa (masalan, havola eskirgan) Supabase uni `#error=…` ko‘rinishida qo‘shadi — bu hash-router’ni
 * buzmasligi uchun kirish sahifasiga almashtiramiz.
 */
function consumeRecoveryMarker(): RecoveryState {
  if (typeof window === 'undefined') return 'none';
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RECOVERY_PARAM)) return 'none';
  const failed = /(^|[#?&/])error(_code|_description)?=/.test(`${url.search}${url.hash}`);
  const hasCode = url.searchParams.has('code');
  url.searchParams.delete(RECOVERY_PARAM);
  for (const k of ['error', 'error_code', 'error_description']) url.searchParams.delete(k);
  url.hash = '#/kirish';
  window.history.replaceState(window.history.state, '', url.toString());
  return !failed && hasCode ? 'pending' : 'invalid';
}

export interface RegisterInput {
  fullName: string;
  email: string;
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
  recovery: RecoveryState;
  init(): () => void;
  /** Email + parol bilan ro‘yxatdan o‘tish. `needsConfirm` — Supabase’da email tasdiqlash yoqilgan bo‘lsa */
  register(input: RegisterInput, password: string): Promise<{ ok: true; needsConfirm: boolean } | { ok: false; error: string }>;
  signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Emailga parolni tiklash havolasini yuboradi (Supabase Auth email xizmati orqali) */
  requestPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Tiklash havolasidan kelgan sessiyada yangi parol o‘rnatadi */
  updatePassword(password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Tiklash oqimidan chiqish (masalan, «Bekor qilish») */
  clearRecovery(): void;
  saveProfile(patch: Partial<Pick<Profile, 'full_name' | 'position'>>): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
}

/** Supabase xatolarini foydalanuvchi tushunadigan matnga o‘giradi */
export function authErrorText(error: AuthError | Error | { message?: string; status?: number; code?: string }): string {
  const e = error as { message?: string; status?: number; code?: string };
  const msg = (e.message ?? '').toLowerCase();
  if (e.status === 429 || e.code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return 'Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.';
  if (e.code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Email yoki parol noto‘g‘ri.';
  if (e.code === 'user_already_exists' || e.code === 'email_exists' || msg.includes('already registered'))
    return 'Bu email bilan hisob allaqachon bor. «Kirish» bo‘limini tanlang.';
  if (e.code === 'same_password' || msg.includes('different from the old password')) return 'Yangi parol eskisidan farq qilishi kerak.';
  if (e.code === 'weak_password' || msg.includes('password should')) return 'Parol juda oddiy. Kamida 6 ta belgi: harf va raqamlarni aralashtiring.';
  if (e.code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return 'Email hali tasdiqlanmagan. Administrator Supabase’da email tasdiqlashni o‘chirishi kerak.';
  if (e.code === 'signup_disabled' || msg.includes('signups not allowed')) return 'Ro‘yxatdan o‘tish hozircha yopiq.';
  if (msg.includes('invalid') && msg.includes('email')) return 'Email manzil noto‘g‘ri ko‘rinadi.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Serverga ulanib bo‘lmadi. Internetni tekshiring.';
  return 'Nimadir xato ketdi. Keyinroq qayta urinib ko‘ring.';
}

/** Email tasdiqlash yoqilgan bo‘lsa — havoladan keyin foydalanuvchi kirishdan oldingi sahifaga qaytadi */
function redirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}${hashForScreen(useGameStore.getState().auxReturnTo)}`;
}

/** Parolni tiklash havolasi shu manzilga qaytaradi; Supabase unga `&code=…` qo‘shadi */
function recoveryRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}?${RECOVERY_PARAM}=1#/kirish`;
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
      // Kod almashtirilmadi — havola yaroqsiz
      set((s) => ({ status: 'guest', email: null, userId: null, profile: null, recovery: s.recovery === 'pending' ? 'invalid' : s.recovery }));
      return;
    }
    if (get().recovery === 'pending') set({ recovery: 'ready' });
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
    recovery: consumeRecoveryMarker(),

    init: () => {
      if (!supabase) return () => {};
      const client = supabase;
      void client.auth.getSession().then(async ({ data }) => {
        // getSession() faqat brauzerdagi nusxani o‘qiydi. Foydalanuvchi serverda o‘chirilgan bo‘lsa,
        // eski token bilan «kirgan» bo‘lib qolmasligi uchun serverdan tekshiramiz va eskisini tozalaymiz.
        if (data.session) {
          const { error } = await client.auth.getUser();
          if (error && error.status !== undefined && error.status >= 400 && error.status < 500) {
            await client.auth.signOut({ scope: 'local' });
            return applySession(null);
          }
        }
        return applySession(data.session);
      });
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Supabase tavsiyasi: callback ichida await qilmaslik — keyingi tikka o‘tkazamiz
        if (event === 'PASSWORD_RECOVERY') {
          set({ recovery: 'ready' });
          useGameStore.getState().openAux('auth');
        }
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
          setTimeout(() => void applySession(session), 0);
        }
      });
      return () => data.subscription.unsubscribe();
    },

    register: async (input, password) => {
      if (!supabase) return { ok: false, error: 'Server ulanmagan (Supabase sozlanmagan).' };
      try {
        localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(input));
      } catch {
        /* e’tiborsiz */
      }
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl(),
          data: {
            full_name: input.fullName.trim(),
            position: input.position.trim(),
          },
        },
      });
      if (error) return { ok: false, error: authErrorText(error) };
      // Email tasdiqlash o‘chirilgan bo‘lsa sessiya darhol keladi (onAuthStateChange → SIGNED_IN)
      return { ok: true, needsConfirm: !data.session };
    },

    signIn: async (email, password) => {
      if (!supabase) return { ok: false, error: 'Server ulanmagan (Supabase sozlanmagan).' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, error: authErrorText(error) } : { ok: true };
    },

    requestPasswordReset: async (email) => {
      if (!supabase) return { ok: false, error: 'Server ulanmagan (Supabase sozlanmagan).' };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: recoveryRedirectUrl() });
      // Bunday email ro‘yxatda bo‘lmasa ham Supabase xato qaytarmaydi — kimning hisobi borligi oshkor bo‘lmaydi
      return error ? { ok: false, error: authErrorText(error) } : { ok: true };
    },

    updatePassword: async (password) => {
      if (!supabase || get().status !== 'signedIn') return { ok: false, error: 'Havola eskirgan. Yangi havola so‘rang.' };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, error: authErrorText(error) };
      set({ recovery: 'none' });
      return { ok: true };
    },

    clearRecovery: () => set({ recovery: 'none' }),

    saveProfile: async (patch) => {
      const { userId, profile } = get();
      if (!supabase || !userId) return { ok: false, error: 'Avval tizimga kiring.' };
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select(PROFILE_COLUMNS).single();
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
