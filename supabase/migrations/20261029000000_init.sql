-- Raqamli Qalqon — boshlang‘ich sxema
-- Supabase Dashboard → SQL Editor’da bir marta ishga tushiring (yoki `supabase db push`).
-- Har bir jadvalda RLS yoqilgan: foydalanuvchi faqat o‘z yozuvlarini ko‘radi va yozadi.

-- ============================================================
-- Profil: ism va email majburiy, yosh va jins ixtiyoriy
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  email text not null,
  age smallint check (age between 10 and 100),
  gender text check (gender in ('male', 'female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: o‘zini o‘qish" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: o‘zini yaratish" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: o‘zini yangilash" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Ro‘yxatdan o‘tishda (magic link) yuborilgan ism/yosh/jins → profil
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
  insert into public.profiles (id, full_name, email, age, gender)
  values (
    new.id,
    coalesce(nullif(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when v_age between 10 and 100 then v_age end,
    case when meta->>'gender' in ('male', 'female') then meta->>'gender' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Missiya natijalari
-- ============================================================
create table if not exists public.mission_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id text not null check (char_length(mission_id) <= 64),
  outcome text not null check (outcome in ('passed', 'failed')),
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0 and score <= max_score),
  stars smallint not null check (stars between 0 and 3),
  clues_found smallint not null default 0 check (clues_found >= 0),
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Mehmon rejimidan sinxronlashda takror yozilmasligi uchun
  unique (user_id, mission_id, finished_at)
);

create index if not exists mission_results_user_idx on public.mission_results (user_id, mission_id);
alter table public.mission_results enable row level security;

create policy "mission_results: o‘zini o‘qish" on public.mission_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "mission_results: o‘ziga yozish" on public.mission_results
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ============================================================
-- Bilim sinovi (ssenariyli savollar) natijalari
-- ============================================================
create table if not exists public.quiz_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id text not null check (char_length(quiz_id) <= 64),
  score integer not null check (score >= 0 and score <= 1000),
  correct smallint not null check (correct >= 0),
  total smallint not null check (total > 0 and correct <= total),
  best_streak smallint not null default 0,
  duration_ms integer check (duration_ms >= 0),
  answers jsonb not null default '{}'::jsonb,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, quiz_id, finished_at)
);

create index if not exists quiz_results_user_idx on public.quiz_results (user_id);
alter table public.quiz_results enable row level security;

create policy "quiz_results: o‘zini o‘qish" on public.quiz_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "quiz_results: o‘ziga yozish" on public.quiz_results
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ============================================================
-- Reyting: faqat ko‘rsatiladigan ism va ballar (email/yosh/jins qaytarilmaydi)
-- Ball = har bir missiyadagi eng yaxshi natija yig‘indisi + eng yaxshi sinov natijasi
-- ============================================================
create or replace function public.get_leaderboard(limit_count integer default 20)
returns table (rank bigint, display_name text, points bigint, stars bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with best_missions as (
    select user_id, mission_id, max(score) as score, max(stars) as stars
    from public.mission_results
    group by user_id, mission_id
  ),
  mission_totals as (
    select user_id, sum(score) as points, sum(stars) as stars
    from best_missions group by user_id
  ),
  quiz_best as (
    select user_id, max(score) as points from public.quiz_results group by user_id
  ),
  totals as (
    select p.id as user_id,
           -- «Ism F.» ko‘rinishi: familiya to‘liq ko‘rsatilmaydi
           btrim(split_part(btrim(p.full_name), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(btrim(p.full_name), ' ', 2), 1), '') || '.', '')) as display_name,
           coalesce(m.points, 0) + coalesce(q.points, 0) as points,
           coalesce(m.stars, 0) as stars
    from public.profiles p
    left join mission_totals m on m.user_id = p.id
    left join quiz_best q on q.user_id = p.id
    where coalesce(m.points, 0) + coalesce(q.points, 0) > 0
  )
  select rank() over (order by points desc, stars desc) as rank,
         display_name, points, stars,
         user_id = (select auth.uid()) as is_me
  from totals
  order by points desc, stars desc
  limit greatest(1, least(limit_count, 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
