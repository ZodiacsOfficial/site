create table if not exists public.chart_deletions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists chart_deletions_user_deleted_idx
  on public.chart_deletions (user_id, deleted_at desc);

alter table public.chart_deletions enable row level security;

revoke all on public.chart_deletions from anon;

grant select, insert, update, delete on public.chart_deletions to authenticated;

drop policy if exists "chart_deletions_select_own" on public.chart_deletions;
drop policy if exists "chart_deletions_insert_own" on public.chart_deletions;
drop policy if exists "chart_deletions_update_own" on public.chart_deletions;
drop policy if exists "chart_deletions_delete_own" on public.chart_deletions;

create policy "chart_deletions_select_own"
on public.chart_deletions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "chart_deletions_insert_own"
on public.chart_deletions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "chart_deletions_update_own"
on public.chart_deletions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "chart_deletions_delete_own"
on public.chart_deletions
for delete
to authenticated
using ((select auth.uid()) = user_id);
