create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"houseSystem":"whole"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint charts_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists charts_user_updated_idx
  on public.charts (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.charts enable row level security;

revoke all on public.profiles from anon;
revoke all on public.charts from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.charts to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "charts_select_own" on public.charts;
drop policy if exists "charts_insert_own" on public.charts;
drop policy if exists "charts_update_own" on public.charts;
drop policy if exists "charts_delete_own" on public.charts;

create policy "charts_select_own"
on public.charts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "charts_insert_own"
on public.charts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "charts_update_own"
on public.charts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "charts_delete_own"
on public.charts
for delete
to authenticated
using ((select auth.uid()) = user_id);
