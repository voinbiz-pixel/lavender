-- Lavender, October 2026: cheers between crew members.
-- Run this once in Supabase → SQL Editor (it is also included in schema.sql, and safe to run twice).

create table if not exists public.cheers (
  id bigserial primary key,
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  session_id text not null,
  title text,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_user, session_id)                -- one cheer per person per workout
);
alter table public.cheers enable row level security;
-- you can see cheers you sent or got, and mark the ones you got as seen; the server adds them
drop policy if exists "cheers read" on public.cheers;
create policy "cheers read" on public.cheers for select using (to_user = auth.uid() or from_user = auth.uid());
drop policy if exists "cheers seen" on public.cheers;
create policy "cheers seen" on public.cheers for update using (to_user = auth.uid()) with check (to_user = auth.uid());
