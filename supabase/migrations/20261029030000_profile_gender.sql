-- Profil: jins (erkak/ayol) — qahramon shunga qarab belgilanadi (erkak → Bek, ayol → Guli).
-- Ustun avvalgi migratsiyada o‘chirilgan bo‘lishi mumkin — shuning uchun «if not exists».

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));

-- Ro‘yxatdan o‘tishda yuborilgan ism, jins va kasb → profil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, gender, position)
  values (
    new.id,
    coalesce(nullif(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when meta->>'gender' in ('male', 'female') then meta->>'gender' end,
    nullif(left(btrim(meta->>'position'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
