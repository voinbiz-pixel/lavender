-- Lavender · Supabase schema (v3)
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run again.

create extension if not exists pgcrypto;

-- ---------- core data ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  data jsonb not null default '{}'::jsonb,   -- profile, settings, program, routines done, water, body weight
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,                         -- generated on the phone, so offline sessions sync cleanly
  user_id uuid not null references auth.users on delete cascade,
  data jsonb not null,                         -- the full session: exercises, sets, notes, records
  status text not null default 'done',
  day_name text,
  volume numeric default 0,
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists sessions_user_started on public.sessions (user_id, started_at desc);

-- ---------- crews: you and up to five others ----------
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id uuid not null references public.crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  color text,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id),
  unique (user_id)                             -- one crew per person for now
);

-- ---------- notifications ----------
create table if not exists public.push_subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rest_timers (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  fire_at timestamptz,
  cancelled boolean not null default false,
  sent boolean not null default false
);

create table if not exists public.notification_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  day date not null,
  primary key (user_id, kind, day)
);

-- ---------- helpers ----------
create or replace function public.shares_crew(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from crew_members a join crew_members b on a.crew_id = b.crew_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create or replace function public.create_crew(crew_name text)
returns json language plpgsql security definer set search_path = public as $$
declare
  c crews;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from crew_members where user_id = auth.uid()) then raise exception 'You are already in a crew'; end if;
  loop
    new_code := '';
    for i in 1..6 loop new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from crews where code = new_code);
  end loop;
  insert into crews (name, code, created_by) values (coalesce(nullif(crew_name, ''), 'Crew'), new_code, auth.uid()) returning * into c;
  insert into crew_members (crew_id, user_id, color) values (c.id, auth.uid(), '#A6CFB8');
  return row_to_json(c);
end;
$$;

create or replace function public.join_crew(invite text)
returns json language plpgsql security definer set search_path = public as $$
declare
  c crews;
  n int;
  palette text[] := array['#A6CFB8', '#D0A8C9', '#457BF1', '#F08A4B', '#8FD3F4', '#DC308F'];
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into c from crews where code = upper(trim(invite));
  if c.id is null then raise exception 'No crew with that code'; end if;
  if exists (select 1 from crew_members where user_id = auth.uid()) then raise exception 'You are already in a crew'; end if;
  select count(*) into n from crew_members where crew_id = c.id;
  if n >= 6 then raise exception 'That crew is full'; end if;
  insert into crew_members (crew_id, user_id, color) values (c.id, auth.uid(), palette[(n % 6) + 1]);
  return row_to_json(c);
end;
$$;

grant execute on function public.create_crew(text) to authenticated;
grant execute on function public.join_crew(text) to authenticated;
grant execute on function public.shares_crew(uuid) to authenticated;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rest_timers enable row level security;        -- server only (no policies)
alter table public.notification_log enable row level security;   -- server only (no policies)

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.shares_crew(id));
drop policy if exists "profiles write" on public.profiles;
create policy "profiles write" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "sessions read" on public.sessions;
create policy "sessions read" on public.sessions for select using (user_id = auth.uid() or public.shares_crew(user_id));
drop policy if exists "sessions insert" on public.sessions;
create policy "sessions insert" on public.sessions for insert with check (user_id = auth.uid());
drop policy if exists "sessions update" on public.sessions;
create policy "sessions update" on public.sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sessions delete" on public.sessions;
create policy "sessions delete" on public.sessions for delete using (user_id = auth.uid());

drop policy if exists "crews read" on public.crews;
create policy "crews read" on public.crews for select using (exists (select 1 from public.crew_members m where m.crew_id = crews.id and m.user_id = auth.uid()));

drop policy if exists "members read" on public.crew_members;
create policy "members read" on public.crew_members for select using (user_id = auth.uid() or public.shares_crew(user_id));
drop policy if exists "members leave" on public.crew_members;
create policy "members leave" on public.crew_members for delete using (user_id = auth.uid());

drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- reminders every 15 minutes (optional, needed for training-day reminders) ----------
-- 1. Database → Extensions: enable pg_cron and pg_net.
-- 2. Replace YOUR-APP and YOUR_CRON_SECRET below, then run these two lines on their own:
--
-- select cron.schedule('lavender-reminders', '*/15 * * * *',
--   $$ select net.http_get(url := 'https://YOUR-APP.vercel.app/api/cron?key=YOUR_CRON_SECRET') $$);

