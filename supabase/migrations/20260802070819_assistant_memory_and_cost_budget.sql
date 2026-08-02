-- Ask Zodiacs account memory and cost-aware provider budget.
--
-- Conversation memory is an explicit, owner-only account feature. The
-- browser may read its own unexpired threads through RLS, while transactional
-- writes go through SECURITY INVOKER functions. Provider-budget tables are a
-- separate service-role-only boundary and contain no conversation content or
-- stable account identifiers.

alter table public.profiles
  add column if not exists assistant_memory_opt_in boolean not null default false;

create table if not exists public.assistant_threads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null,
  title text not null,
  chart_id uuid references public.charts(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default (statement_timestamp() + interval '90 days'),
  constraint assistant_threads_owner_key unique (id, user_id),
  constraint assistant_threads_locale_valid check (locale in ('en', 'es', 'pt', 'fr', 'it')),
  constraint assistant_threads_title_valid check (
    title = btrim(title)
    and char_length(title) between 1 and 120
  ),
  constraint assistant_threads_fixed_expiry check (
    expires_at = created_at + interval '90 days'
  )
);

create table if not exists public.assistant_turns (
  id uuid not null,
  thread_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  completed_at timestamptz not null default statement_timestamp(),
  primary key (thread_id, id),
  constraint assistant_turns_thread_owner_fkey
    foreign key (thread_id, user_id)
    references public.assistant_threads(id, user_id)
    on delete cascade,
  constraint assistant_turns_question_valid check (
    char_length(btrim(question)) between 1 and 1200
  ),
  constraint assistant_turns_answer_valid check (
    char_length(btrim(answer)) between 1 and 16000
  )
);

create index if not exists assistant_threads_owner_created_idx
  on public.assistant_threads (user_id, created_at desc);

create index if not exists assistant_threads_expiry_idx
  on public.assistant_threads (expires_at, id);

create index if not exists assistant_threads_chart_idx
  on public.assistant_threads (chart_id)
  where chart_id is not null;

create index if not exists assistant_turns_thread_completed_idx
  on public.assistant_turns (thread_id, completed_at, id);

create index if not exists assistant_turns_owner_completed_idx
  on public.assistant_turns (user_id, completed_at, id);

create index if not exists assistant_turns_thread_owner_idx
  on public.assistant_turns (thread_id, user_id);

alter table public.assistant_threads enable row level security;
alter table public.assistant_turns enable row level security;

revoke all on table public.assistant_threads from public;
revoke all on table public.assistant_threads from anon;
revoke all on table public.assistant_threads from authenticated;
revoke all on table public.assistant_turns from public;
revoke all on table public.assistant_turns from anon;
revoke all on table public.assistant_turns from authenticated;

grant select, insert, update, delete on table public.assistant_threads to authenticated;
grant select, insert, delete on table public.assistant_turns to authenticated;

drop policy if exists "assistant_threads_select_own_active" on public.assistant_threads;
drop policy if exists "assistant_threads_insert_own_opted_in" on public.assistant_threads;
drop policy if exists "assistant_threads_update_own_active" on public.assistant_threads;
drop policy if exists "assistant_threads_delete_own" on public.assistant_threads;

create policy "assistant_threads_select_own_active"
on public.assistant_threads
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and expires_at > statement_timestamp()
  and exists (
    select 1
    from public.profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.assistant_memory_opt_in
  )
);

create policy "assistant_threads_insert_own_opted_in"
on public.assistant_threads
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.assistant_memory_opt_in
  )
  and (
    chart_id is null
    or exists (
      select 1
      from public.charts as chart
      where chart.id = assistant_threads.chart_id
        and chart.user_id = (select auth.uid())
    )
  )
);

create policy "assistant_threads_update_own_active"
on public.assistant_threads
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and expires_at > statement_timestamp()
)
with check (
  (select auth.uid()) = user_id
  and expires_at > statement_timestamp()
  and exists (
    select 1
    from public.profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.assistant_memory_opt_in
  )
  and (
    chart_id is null
    or exists (
      select 1
      from public.charts as chart
      where chart.id = assistant_threads.chart_id
        and chart.user_id = (select auth.uid())
    )
  )
);

create policy "assistant_threads_delete_own"
on public.assistant_threads
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

drop policy if exists "assistant_turns_select_own_active" on public.assistant_turns;
drop policy if exists "assistant_turns_insert_own_active" on public.assistant_turns;
drop policy if exists "assistant_turns_delete_own" on public.assistant_turns;

create policy "assistant_turns_select_own_active"
on public.assistant_turns
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.assistant_threads as thread
    where thread.id = assistant_turns.thread_id
      and thread.user_id = (select auth.uid())
      and thread.expires_at > statement_timestamp()
  )
);

create policy "assistant_turns_insert_own_active"
on public.assistant_turns
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.assistant_threads as thread
    where thread.id = assistant_turns.thread_id
      and thread.user_id = (select auth.uid())
      and thread.expires_at > statement_timestamp()
  )
);

create policy "assistant_turns_delete_own"
on public.assistant_turns
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create or replace function public.assistant_memory_stamp_thread()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    new.expires_at := new.created_at + interval '90 days';
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.expires_at := old.expires_at;
  end if;
  return new;
end;
$$;

revoke all on function public.assistant_memory_stamp_thread() from public;
revoke all on function public.assistant_memory_stamp_thread() from anon;
revoke all on function public.assistant_memory_stamp_thread() from authenticated;

drop trigger if exists assistant_threads_stamp_fixed_expiry on public.assistant_threads;
create trigger assistant_threads_stamp_fixed_expiry
before insert or update on public.assistant_threads
for each row execute function public.assistant_memory_stamp_thread();

create or replace function public.assistant_memory_purge_on_opt_out()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' or not new.assistant_memory_opt_in then
    delete from public.assistant_threads
    where user_id = old.user_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.assistant_memory_purge_on_opt_out() from public;
revoke all on function public.assistant_memory_purge_on_opt_out() from anon;
revoke all on function public.assistant_memory_purge_on_opt_out() from authenticated;

drop trigger if exists profiles_purge_assistant_memory_on_update on public.profiles;
create trigger profiles_purge_assistant_memory_on_update
before update of assistant_memory_opt_in on public.profiles
for each row
when (old.assistant_memory_opt_in is distinct from new.assistant_memory_opt_in)
execute function public.assistant_memory_purge_on_opt_out();

drop trigger if exists profiles_purge_assistant_memory_on_delete on public.profiles;
create trigger profiles_purge_assistant_memory_on_delete
before delete on public.profiles
for each row
execute function public.assistant_memory_purge_on_opt_out();

create or replace function public.assistant_memory_set_opt_in(p_enabled boolean)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
begin
  if owner_id is null or p_enabled is null then
    raise exception 'assistant_memory_set_opt_in: invalid request';
  end if;

  if not p_enabled then
    delete from public.assistant_threads
    where user_id = owner_id;
  end if;

  insert into public.profiles (user_id, assistant_memory_opt_in)
  values (owner_id, p_enabled)
  on conflict (user_id)
  do update set assistant_memory_opt_in = excluded.assistant_memory_opt_in;

  return jsonb_build_object('enabled', p_enabled);
end;
$$;

create or replace function public.assistant_memory_import_thread(
  p_thread_id uuid,
  p_locale text,
  p_title text,
  p_chart_id uuid,
  p_turns jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
  item jsonb;
  item_id uuid;
  item_question text;
  item_answer text;
  item_completed_at timestamptz;
  existing_question text;
  existing_answer text;
  inserted_turns integer := 0;
  affected integer;
  thread_expiry timestamptz;
begin
  if owner_id is null
     or p_thread_id is null
     or p_locale not in ('en', 'es', 'pt', 'fr', 'it')
     or p_title is null
     or p_title <> btrim(p_title)
     or char_length(p_title) not between 1 and 120
     or p_turns is null
     or jsonb_typeof(p_turns) <> 'array'
     or jsonb_array_length(p_turns) > 100 then
    raise exception 'assistant_memory_import_thread: invalid request';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = owner_id and assistant_memory_opt_in
  ) then
    raise exception 'assistant_memory_import_thread: memory is not enabled';
  end if;

  if p_chart_id is not null and not exists (
    select 1 from public.charts
    where id = p_chart_id and user_id = owner_id
  ) then
    raise exception 'assistant_memory_import_thread: chart is not owned';
  end if;

  -- Never delete-and-recreate an expired ID here. An expired thread remains
  -- hidden by RLS until cleanup; its primary-key conflict makes a stale import
  -- fail instead of minting a fresh 90-day retention window.
  insert into public.assistant_threads (id, user_id, locale, title, chart_id)
  values (p_thread_id, owner_id, p_locale, p_title, p_chart_id)
  on conflict (id) do update
    set locale = excluded.locale,
        title = excluded.title,
        chart_id = excluded.chart_id
    where assistant_threads.user_id = owner_id
  returning expires_at into thread_expiry;

  if thread_expiry is null then
    raise exception 'assistant_memory_import_thread: thread unavailable';
  end if;

  for item in select value from jsonb_array_elements(p_turns)
  loop
    if jsonb_typeof(item) <> 'object'
       or not (item ?& array['id', 'question', 'answer', 'completedAt'])
       or exists (
         select 1 from jsonb_object_keys(item) as key
         where key not in ('id', 'question', 'answer', 'completedAt')
       ) then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end if;

    begin
      item_id := (item ->> 'id')::uuid;
      item_completed_at := (item ->> 'completedAt')::timestamptz;
    exception when others then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end;

    item_question := item ->> 'question';
    item_answer := item ->> 'answer';

    if item_id is null
       or item_question is null
       or char_length(btrim(item_question)) not between 1 and 1200
       or item_answer is null
       or char_length(btrim(item_answer)) not between 1 and 16000
       or item_completed_at < statement_timestamp() - interval '90 days'
       or item_completed_at > statement_timestamp() + interval '5 minutes' then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end if;

    select question, answer
    into existing_question, existing_answer
    from public.assistant_turns
    where thread_id = p_thread_id
      and id = item_id
      and user_id = owner_id;

    if found then
      if existing_question <> item_question or existing_answer <> item_answer then
        raise exception 'assistant_memory_import_thread: turn id conflict';
      end if;
      continue;
    end if;

    insert into public.assistant_turns (
      id, thread_id, user_id, question, answer, completed_at
    ) values (
      item_id, p_thread_id, owner_id,
      item_question, item_answer, item_completed_at
    )
    on conflict (thread_id, id) do nothing;

    get diagnostics affected = row_count;
    inserted_turns := inserted_turns + affected;
  end loop;

  return jsonb_build_object(
    'thread_id', p_thread_id,
    'expires_at', thread_expiry,
    'inserted_turns', inserted_turns
  );
end;
$$;

create or replace function public.assistant_memory_save_turn(
  p_thread_id uuid,
  p_turn_id uuid,
  p_question text,
  p_answer text,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
  existing_question text;
  existing_answer text;
begin
  if owner_id is null
     or p_thread_id is null
     or p_turn_id is null
     or p_question is null
     or char_length(btrim(p_question)) not between 1 and 1200
     or p_answer is null
     or char_length(btrim(p_answer)) not between 1 and 16000
     or p_completed_at is null
     or p_completed_at < statement_timestamp() - interval '90 days'
     or p_completed_at > statement_timestamp() + interval '5 minutes' then
    raise exception 'assistant_memory_save_turn: invalid request';
  end if;

  if not exists (
    select 1
    from public.assistant_threads
    where id = p_thread_id
      and user_id = owner_id
      and expires_at > statement_timestamp()
  ) then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select question, answer
  into existing_question, existing_answer
  from public.assistant_turns
  where thread_id = p_thread_id
    and id = p_turn_id
    and user_id = owner_id;

  if found then
    if existing_question <> p_question or existing_answer <> p_answer then
      raise exception 'assistant_memory_save_turn: turn id conflict';
    end if;
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  insert into public.assistant_turns (
    id, thread_id, user_id, question, answer, completed_at
  ) values (
    p_turn_id, p_thread_id, owner_id,
    p_question, p_answer, p_completed_at
  );

  return jsonb_build_object('outcome', 'saved');
end;
$$;

-- The consent action is one transaction: a failed import rolls the profile
-- preference back to false, so the UI never reports remembered mode without
-- the visible conversation that the user agreed to save.
create or replace function public.assistant_memory_enable_and_import_thread(
  p_thread_id uuid,
  p_locale text,
  p_title text,
  p_chart_id uuid,
  p_turns jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
begin
  if owner_id is null then
    raise exception 'assistant_memory_enable_and_import_thread: invalid request';
  end if;

  insert into public.profiles (user_id, assistant_memory_opt_in)
  values (owner_id, true)
  on conflict (user_id)
  do update set assistant_memory_opt_in = true;

  return public.assistant_memory_import_thread(
    p_thread_id,
    p_locale,
    p_title,
    p_chart_id,
    p_turns
  );
end;
$$;

create or replace function public.assistant_memory_delete_thread(p_thread_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted integer;
begin
  if (select auth.uid()) is null or p_thread_id is null then
    return false;
  end if;

  delete from public.assistant_threads
  where id = p_thread_id
    and user_id = (select auth.uid());
  get diagnostics deleted = row_count;
  return deleted = 1;
end;
$$;

create or replace function public.assistant_memory_delete_all()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted integer;
begin
  if (select auth.uid()) is null then
    return 0;
  end if;

  delete from public.assistant_threads
  where user_id = (select auth.uid());
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

create or replace function public.assistant_memory_cleanup(p_limit integer default 500)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'assistant_memory_cleanup: invalid limit';
  end if;

  with doomed as (
    select id
    from public.assistant_threads
    where expires_at <= statement_timestamp()
    order by expires_at, id
    limit p_limit
    for update skip locked
  )
  delete from public.assistant_threads as thread
  using doomed
  where thread.id = doomed.id;

  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- Visitor pseudonyms have a strict two-day retention window independent of
-- Ask traffic. The hourly job calls this bounded function so an idle service
-- cannot leave old quota rows behind indefinitely.
create or replace function public.assistant_quota_cleanup(p_limit integer default 5000)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted integer;
  cutoff date := (statement_timestamp() at time zone 'utc')::date - 1;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50000 then
    raise exception 'assistant_quota_cleanup: invalid limit';
  end if;

  with doomed as (
    select visitor_hash, quota_day
    from public.assistant_quota
    where quota_day < cutoff
    order by quota_day, visitor_hash
    limit p_limit
    for update skip locked
  )
  delete from public.assistant_quota as quota
  using doomed
  where quota.visitor_hash = doomed.visitor_hash
    and quota.quota_day = doomed.quota_day;

  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.assistant_memory_set_opt_in(boolean) from public;
revoke all on function public.assistant_memory_set_opt_in(boolean) from anon;
revoke all on function public.assistant_memory_import_thread(uuid, text, text, uuid, jsonb) from public;
revoke all on function public.assistant_memory_import_thread(uuid, text, text, uuid, jsonb) from anon;
revoke all on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) from public;
revoke all on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) from anon;
revoke all on function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) from public;
revoke all on function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) from anon;
revoke all on function public.assistant_memory_delete_thread(uuid) from public;
revoke all on function public.assistant_memory_delete_thread(uuid) from anon;
revoke all on function public.assistant_memory_delete_all() from public;
revoke all on function public.assistant_memory_delete_all() from anon;
revoke all on function public.assistant_memory_cleanup(integer) from public;
revoke all on function public.assistant_memory_cleanup(integer) from anon;
revoke all on function public.assistant_memory_cleanup(integer) from authenticated;
revoke all on function public.assistant_memory_cleanup(integer) from service_role;
revoke all on function public.assistant_quota_cleanup(integer) from public;
revoke all on function public.assistant_quota_cleanup(integer) from anon;
revoke all on function public.assistant_quota_cleanup(integer) from authenticated;
revoke all on function public.assistant_quota_cleanup(integer) from service_role;

grant execute on function public.assistant_memory_set_opt_in(boolean) to authenticated;
grant execute on function public.assistant_memory_import_thread(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.assistant_memory_delete_thread(uuid) to authenticated;
grant execute on function public.assistant_memory_delete_all() to authenticated;

-- Install Cron when the extension is available (as it is on hosted
-- Supabase). The conditional keeps the migration portable to the plain
-- PostgreSQL image used by the repository's disposable SQL tests.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron'
  ) then
    execute 'create extension if not exists pg_cron';
  end if;

  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    perform cron.schedule(
      'ask-zodiacs-memory-hourly-cleanup',
      '7 * * * *',
      'select public.assistant_memory_cleanup(500), public.assistant_quota_cleanup(5000)'
    );
  end if;
end;
$$;

-- Cost units are millionths of one US dollar (micro-USD). A reservation is
-- charged against both periods before the provider call; settlement releases
-- the unused portion. Aggregate ledgers contain no visitor or message data.
create table if not exists public.assistant_budget_daily (
  budget_day date primary key,
  committed_microusd bigint not null default 0,
  settled_microusd bigint not null default 0,
  reservation_count integer not null default 0,
  updated_at timestamptz not null default statement_timestamp(),
  constraint assistant_budget_daily_amounts_sane check (
    committed_microusd >= 0
    and settled_microusd between 0 and committed_microusd
    and reservation_count >= 0
  )
);

create table if not exists public.assistant_budget_monthly (
  budget_month date primary key,
  committed_microusd bigint not null default 0,
  settled_microusd bigint not null default 0,
  reservation_count integer not null default 0,
  updated_at timestamptz not null default statement_timestamp(),
  constraint assistant_budget_monthly_is_first check (
    budget_month = date_trunc('month', budget_month)::date
  ),
  constraint assistant_budget_monthly_amounts_sane check (
    committed_microusd >= 0
    and settled_microusd between 0 and committed_microusd
    and reservation_count >= 0
  )
);

create table if not exists public.assistant_budget_reservations (
  id text primary key,
  budget_day date not null references public.assistant_budget_daily(budget_day),
  budget_month date not null references public.assistant_budget_monthly(budget_month),
  reserved_microusd bigint not null,
  actual_microusd bigint,
  status text not null default 'reserved',
  created_at timestamptz not null default statement_timestamp(),
  settled_at timestamptz,
  constraint assistant_budget_reservation_id_sane check (
    char_length(id) between 16 and 100
    and id ~ '^[A-Za-z0-9_-]+$'
  ),
  constraint assistant_budget_reservation_amount_sane check (
    reserved_microusd between 1 and 1000000000
    and (actual_microusd is null or actual_microusd between 0 and reserved_microusd)
  ),
  constraint assistant_budget_reservation_state_sane check (
    (status = 'reserved' and actual_microusd is null and settled_at is null)
    or (status = 'settled' and actual_microusd is not null and settled_at is not null)
  )
);

create index if not exists assistant_budget_reservations_created_idx
  on public.assistant_budget_reservations (created_at);

create index if not exists assistant_budget_reservations_day_idx
  on public.assistant_budget_reservations (budget_day);

create index if not exists assistant_budget_reservations_month_idx
  on public.assistant_budget_reservations (budget_month);

alter table public.assistant_budget_daily enable row level security;
alter table public.assistant_budget_monthly enable row level security;
alter table public.assistant_budget_reservations enable row level security;

revoke all on table public.assistant_budget_daily from public;
revoke all on table public.assistant_budget_daily from anon;
revoke all on table public.assistant_budget_daily from authenticated;
revoke all on table public.assistant_budget_daily from service_role;
revoke all on table public.assistant_budget_monthly from public;
revoke all on table public.assistant_budget_monthly from anon;
revoke all on table public.assistant_budget_monthly from authenticated;
revoke all on table public.assistant_budget_monthly from service_role;
revoke all on table public.assistant_budget_reservations from public;
revoke all on table public.assistant_budget_reservations from anon;
revoke all on table public.assistant_budget_reservations from authenticated;
revoke all on table public.assistant_budget_reservations from service_role;

create or replace function public.assistant_budget_reserve_v1(
  visitor_hash text,
  reservation_id text,
  reserved_microusd bigint,
  visitor_daily_limit integer,
  daily_limit_microusd bigint,
  monthly_limit_microusd bigint
)
returns json
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
#variable_conflict use_column
declare
  today date := (statement_timestamp() at time zone 'utc')::date;
  this_month date := date_trunc('month', statement_timestamp() at time zone 'utc')::date;
  visitor_count integer;
  day_committed bigint;
  month_committed bigint;
  existing public.assistant_budget_reservations%rowtype;
begin
  if visitor_hash is null
     or visitor_hash !~ '^[0-9a-f]{64}$'
     or reservation_id is null
     or char_length(reservation_id) not between 16 and 100
     or reservation_id !~ '^[A-Za-z0-9_-]+$'
     or reserved_microusd is null
     or reserved_microusd not between 1 and 1000000000
     or visitor_daily_limit is null
     or visitor_daily_limit not between 1 and 10000
     or daily_limit_microusd is null
     or daily_limit_microusd < reserved_microusd
     or monthly_limit_microusd is null
     or monthly_limit_microusd < daily_limit_microusd then
    raise exception 'assistant_budget_reserve_v1: invalid request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(92147635081023::bigint);

  delete from public.assistant_quota
  where quota_day < today - 1;

  select * into existing
  from public.assistant_budget_reservations
  where id = assistant_budget_reserve_v1.reservation_id;

  if found then
    if existing.reserved_microusd <> assistant_budget_reserve_v1.reserved_microusd then
      raise exception 'assistant_budget_reserve_v1: reservation id conflict';
    end if;
    select coalesce(request_count, 0) into visitor_count
    from public.assistant_quota
    where assistant_quota.visitor_hash = assistant_budget_reserve_v1.visitor_hash
      and quota_day = today;
    select committed_microusd into day_committed
    from public.assistant_budget_daily where budget_day = today;
    select committed_microusd into month_committed
    from public.assistant_budget_monthly where budget_month = this_month;
    return json_build_object(
      'allowed', true,
      'reason', 'ok',
      'visitor', coalesce(visitor_count, 0),
      'daily_reserved_microusd', coalesce(day_committed, 0),
      'monthly_reserved_microusd', coalesce(month_committed, 0)
    );
  end if;

  select coalesce(request_count, 0) into visitor_count
  from public.assistant_quota
  where assistant_quota.visitor_hash = assistant_budget_reserve_v1.visitor_hash
    and quota_day = today;
  visitor_count := coalesce(visitor_count, 0);

  select coalesce(committed_microusd, 0) into day_committed
  from public.assistant_budget_daily
  where budget_day = today;
  day_committed := coalesce(day_committed, 0);

  select coalesce(committed_microusd, 0) into month_committed
  from public.assistant_budget_monthly
  where budget_month = this_month;
  month_committed := coalesce(month_committed, 0);

  if visitor_count >= visitor_daily_limit then
    return json_build_object(
      'allowed', false,
      'reason', 'visitor_limit',
      'visitor', visitor_count,
      'daily_reserved_microusd', day_committed,
      'monthly_reserved_microusd', month_committed
    );
  end if;

  if day_committed + reserved_microusd > daily_limit_microusd then
    return json_build_object(
      'allowed', false,
      'reason', 'daily_budget',
      'visitor', visitor_count,
      'daily_reserved_microusd', day_committed,
      'monthly_reserved_microusd', month_committed
    );
  end if;

  if month_committed + reserved_microusd > monthly_limit_microusd then
    return json_build_object(
      'allowed', false,
      'reason', 'monthly_budget',
      'visitor', visitor_count,
      'daily_reserved_microusd', day_committed,
      'monthly_reserved_microusd', month_committed
    );
  end if;

  insert into public.assistant_quota as quota (
    visitor_hash, quota_day, request_count
  ) values (
    assistant_budget_reserve_v1.visitor_hash, today, 1
  )
  on conflict (visitor_hash, quota_day)
  do update set request_count = quota.request_count + 1
  returning request_count into visitor_count;

  insert into public.assistant_budget_daily as daily (
    budget_day, committed_microusd, reservation_count
  ) values (
    today, assistant_budget_reserve_v1.reserved_microusd, 1
  )
  on conflict (budget_day) do update
    set committed_microusd = daily.committed_microusd + excluded.committed_microusd,
        reservation_count = daily.reservation_count + 1,
        updated_at = statement_timestamp()
  returning committed_microusd into day_committed;

  insert into public.assistant_budget_monthly as monthly (
    budget_month, committed_microusd, reservation_count
  ) values (
    this_month, assistant_budget_reserve_v1.reserved_microusd, 1
  )
  on conflict (budget_month) do update
    set committed_microusd = monthly.committed_microusd + excluded.committed_microusd,
        reservation_count = monthly.reservation_count + 1,
        updated_at = statement_timestamp()
  returning committed_microusd into month_committed;

  insert into public.assistant_budget_reservations (
    id, budget_day, budget_month, reserved_microusd
  ) values (
    assistant_budget_reserve_v1.reservation_id,
    today,
    this_month,
    assistant_budget_reserve_v1.reserved_microusd
  );

  return json_build_object(
    'allowed', true,
    'reason', 'ok',
    'visitor', visitor_count,
    'daily_reserved_microusd', day_committed,
    'monthly_reserved_microusd', month_committed
  );
end;
$$;

create or replace function public.assistant_budget_settle_v1(
  reservation_id text,
  actual_microusd bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
#variable_conflict use_column
declare
  reservation public.assistant_budget_reservations%rowtype;
begin
  if reservation_id is null or actual_microusd is null or actual_microusd < 0 then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(92147635081023::bigint);

  select * into reservation
  from public.assistant_budget_reservations
  where id = assistant_budget_settle_v1.reservation_id
  for update;

  if not found then
    return false;
  end if;

  if actual_microusd > reservation.reserved_microusd then
    return false;
  end if;

  if reservation.status = 'settled' then
    return reservation.actual_microusd = assistant_budget_settle_v1.actual_microusd;
  end if;

  update public.assistant_budget_daily
  set committed_microusd = committed_microusd - reservation.reserved_microusd + actual_microusd,
      settled_microusd = settled_microusd + actual_microusd,
      updated_at = statement_timestamp()
  where budget_day = reservation.budget_day
  ;

  update public.assistant_budget_monthly
  set committed_microusd = committed_microusd - reservation.reserved_microusd + actual_microusd,
      settled_microusd = settled_microusd + actual_microusd,
      updated_at = statement_timestamp()
  where budget_month = reservation.budget_month
  ;

  update public.assistant_budget_reservations
  set actual_microusd = assistant_budget_settle_v1.actual_microusd,
      status = 'settled',
      settled_at = statement_timestamp()
  where id = assistant_budget_settle_v1.reservation_id;

  return true;
end;
$$;

revoke all on function public.assistant_budget_reserve_v1(text, text, bigint, integer, bigint, bigint) from public;
revoke all on function public.assistant_budget_reserve_v1(text, text, bigint, integer, bigint, bigint) from anon;
revoke all on function public.assistant_budget_reserve_v1(text, text, bigint, integer, bigint, bigint) from authenticated;
revoke all on function public.assistant_budget_settle_v1(text, bigint) from public;
revoke all on function public.assistant_budget_settle_v1(text, bigint) from anon;
revoke all on function public.assistant_budget_settle_v1(text, bigint) from authenticated;

grant execute on function public.assistant_budget_reserve_v1(text, text, bigint, integer, bigint, bigint) to service_role;
grant execute on function public.assistant_budget_settle_v1(text, bigint) to service_role;
