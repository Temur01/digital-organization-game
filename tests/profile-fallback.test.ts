import { beforeEach, describe, expect, it, vi } from 'vitest';

// Soxta Supabase: «gender» ustuni yo‘q baza (20261029030000 migratsiyasi qo‘llanmagan)
const updates: Record<string, unknown>[] = [];
vi.mock('../src/lib/supabase', () => {
  const missing = { code: '42703', message: 'column profiles.gender does not exist' };
  const query = (columns: string, patch?: Record<string, unknown>) => {
    const fails = columns.includes('gender') || (patch !== undefined && 'gender' in patch);
    const result = fails
      ? { data: null, error: missing }
      : { data: { id: 'u1', full_name: 'Temur', email: 't@k.uz', position: 'Yurist', ...patch }, error: null };
    return { eq: () => ({ single: async () => result, maybeSingle: async () => result }) };
  };
  return {
    isBackendConfigured: true,
    supabase: {
      from: () => ({
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          return { eq: () => ({ select: (columns: string) => query(columns, patch).eq() }) };
        },
        select: (columns: string) => query(columns),
      }),
    },
  };
});

const { useAuthStore } = await import('../src/app/auth');

describe('profil: bazada «gender» ustuni bo‘lmasa', () => {
  beforeEach(() => {
    updates.length = 0;
    useAuthStore.setState({
      status: 'signedIn',
      userId: 'u1',
      profile: { id: 'u1', full_name: 'Temur', email: 't@k.uz', gender: null, position: 'Dasturchi' },
    });
  });

  it('ism va kasb saqlanadi, jins haqida ogohlantirish qaytadi', async () => {
    const res = await useAuthStore.getState().saveProfile({ full_name: 'Temur', gender: 'male', position: 'Yurist' });
    expect(res.ok).toBe(true);
    expect(res.warning).toMatch(/jins saqlanmadi/);
    // Ikkinchi urinish jinssiz yuborildi
    expect(updates.at(-1)).toEqual({ full_name: 'Temur', position: 'Yurist' });
    expect(useAuthStore.getState().profile).toMatchObject({ position: 'Yurist', gender: null });
  });

  it('keyingi saqlashlar to‘g‘ridan-to‘g‘ri jinssiz yuboriladi', async () => {
    await useAuthStore.getState().saveProfile({ full_name: 'Temur', gender: 'male', position: 'Menejer' });
    expect(updates).toEqual([{ full_name: 'Temur', position: 'Menejer' }]);
  });
});
