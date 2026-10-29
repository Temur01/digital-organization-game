-- Profil: yosh, jins va bo‘lim maydonlari olib tashlandi — endi faqat ism, email va kasb
-- Diqqat: ustunlardagi mavjud ma’lumotlar butunlay o‘chiriladi.

-- Ro‘yxatdan o‘tishda yuborilgan ism va kasb → profil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, position)
  values (
    new.id,
    coalesce(nullif(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(left(btrim(meta->>'position'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

alter table public.profiles
  drop column if exists age,
  drop column if exists gender,
  drop column if exists department;
