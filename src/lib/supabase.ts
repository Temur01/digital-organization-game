import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase’ning yangi nomi — «publishable key»; eski «anon key» nomi ham qo‘llab-quvvatlanadi
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/**
 * Supabase mijozi. .env.local da VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY bo‘lmasa — null:
 * o‘yin to‘liq mehmon rejimida ishlaydi (hech narsa yuborilmaydi).
 * Faqat «anon» (publishable) kalit ishlatiladi; ma’lumotlarni RLS siyosatlari himoya qiladi.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'raqamli-qalqon:auth',
        },
      })
    : null;

export const isBackendConfigured = supabase !== null;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  gender: 'male' | 'female' | null;
  position: string | null;
}

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  points: number;
  stars: number;
  is_me: boolean;
}
