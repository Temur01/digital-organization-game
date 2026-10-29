-- Profil: bo‘lim va kasb (lavozim) maydonlari
-- Mavjud yozuvlar buzilmasligi uchun ustunlar ixtiyoriy (null bo‘lishi mumkin); forma ularni to‘ldirishni talab qiladi.

alter table public.profiles
  add column if not exists department text check (char_length(btrim(department)) between 1 and 80),
  add column if not exists position text check (char_length(btrim(position)) between 1 and 80);

-- Ro‘yxatdan o‘tishda (magic link) yuborilgan bo‘lim/kasb ham profilga yoziladi
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_age smallint;
begin
  begin
    v_age := nullif(meta->>'age', '')::smallint;
  exception when others then
    v_age := null;
  end;
  insert into public.profiles (id, full_name, email, age, gender, department, position)
  values (
    new.id,
    coalesce(nullif(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when v_age between 10 and 100 then v_age end,
    case when meta->>'gender' in ('male', 'female') then meta->>'gender' end,
    nullif(left(btrim(meta->>'department'), 80), ''),
    nullif(left(btrim(meta->>'position'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
