\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(ok boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'assertion failed: %', message;
  end if;
end;
$$;

-- Public memory tables are exposed only to authenticated owners under RLS.
select pg_temp.assert_true(
  (select relrowsecurity from pg_catalog.pg_class
   where oid = 'public.assistant_threads'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class
       where oid = 'public.assistant_turns'::regclass),
  'assistant memory tables must have RLS enabled'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.assistant_threads', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.assistant_turns', 'select,insert,update,delete')
  and has_table_privilege('authenticated', 'public.assistant_threads', 'select')
  and not has_table_privilege('authenticated', 'public.assistant_threads', 'insert,update,delete')
  and has_table_privilege('authenticated', 'public.assistant_turns', 'select')
  and not has_table_privilege('authenticated', 'public.assistant_turns', 'insert,update,delete')
  and not has_table_privilege('service_role', 'public.assistant_threads', 'select,insert,update,delete')
  and not has_table_privilege('service_role', 'public.assistant_turns', 'select,insert,update,delete'),
  'memory tables must be browser-read-only; writes are RPC-only'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from (values
      ('public.assistant_memory_set_opt_in(boolean)'),
      ('public.assistant_memory_import_thread(uuid,text,text,uuid,jsonb)'),
      ('public.assistant_memory_enable_and_import_thread(uuid,text,text,uuid,jsonb)'),
      ('public.assistant_memory_save_turn(uuid,uuid,text,text,timestamptz)'),
      ('public.assistant_memory_delete_thread(uuid)'),
      ('public.assistant_memory_delete_all()')
    ) as routine(signature)
    where not has_function_privilege('authenticated', routine.signature, 'execute')
      or has_function_privilege('anon', routine.signature, 'execute')
      or has_function_privilege('service_role', routine.signature, 'execute')
      or not (select prosecdef from pg_catalog.pg_proc
              where oid = routine.signature::regprocedure)
      or not (select coalesce(
        'search_path=pg_catalog, public' = any(proconfig),
        false
      ) from pg_catalog.pg_proc where oid = routine.signature::regprocedure)
  ),
  'account-memory mutations must be authenticated-only pinned SECURITY DEFINER RPCs'
);

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.assistant_quota_cleanup(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.assistant_quota_cleanup(integer)', 'execute')
  and not has_function_privilege('service_role', 'public.assistant_quota_cleanup(integer)', 'execute')
  and not (select prosecdef from pg_catalog.pg_proc
           where oid = 'public.assistant_quota_cleanup(integer)'::regprocedure)
  and (select coalesce(
        'search_path=pg_catalog, public' = any(proconfig),
        false
      ) from pg_catalog.pg_proc
      where oid = 'public.assistant_quota_cleanup(integer)'::regprocedure),
  'scheduled quota cleanup must remain owner-only with a pinned invoker search path'
);

-- Budget persistence is service-only, has no policies, and carries no content
-- or account identifiers.
select pg_temp.assert_true(
  not exists (
    select 1 from pg_catalog.pg_policy
    where polrelid in (
      'public.assistant_budget_daily'::regclass,
      'public.assistant_budget_monthly'::regclass,
      'public.assistant_budget_reservations'::regclass
    )
  )
  and not has_table_privilege('anon', 'public.assistant_budget_daily', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.assistant_budget_daily', 'select,insert,update,delete')
  and not has_table_privilege('service_role', 'public.assistant_budget_daily', 'select,insert,update,delete')
  and not has_table_privilege('service_role', 'public.assistant_budget_reservations', 'select,insert,update,delete'),
  'budget tables must be RPC-only with zero browser policies'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'assistant_budget_%'
      and column_name ~ '(visitor|user|question|answer|message|prompt|chart|content|ip)'
  ),
  'aggregate and reservation ledgers must contain no content or visitor identity'
);

select pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.assistant_budget_reserve_v1(text,text,bigint,integer,bigint,bigint)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.assistant_budget_settle_v1(text,bigint)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.assistant_budget_reserve_v1(text,text,bigint,integer,bigint,bigint)',
    'execute'
  )
  and (select prosecdef from pg_catalog.pg_proc
       where oid = 'public.assistant_budget_reserve_v1(text,text,bigint,integer,bigint,bigint)'::regprocedure)
  and (select prosecdef from pg_catalog.pg_proc
       where oid = 'public.assistant_budget_settle_v1(text,bigint)'::regprocedure),
  'only service_role may execute the locked budget definer functions'
);

select pg_temp.assert_true(
  (select coalesce(
     'search_path=pg_catalog, public, pg_temp' = any(proconfig),
     false
   ) from pg_catalog.pg_proc
   where oid = 'public.assistant_budget_reserve_v1(text,text,bigint,integer,bigint,bigint)'::regprocedure)
  and (select coalesce(
        'search_path=pg_catalog, public, pg_temp' = any(proconfig),
        false
      ) from pg_catalog.pg_proc
      where oid = 'public.assistant_budget_settle_v1(text,bigint)'::regprocedure),
  'budget definer functions must pin trusted schemas before pg_temp'
);

insert into auth.users (id) values
  ('81000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.profiles (user_id) values
  ('81000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002')
on conflict (user_id) do nothing;

insert into public.charts (id, user_id, payload) values
  (
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    '{}'::jsonb
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    '{}'::jsonb
  )
on conflict (id) do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);

create temporary table memory_results (key text primary key, value jsonb);
insert into memory_results values (
  'import',
  public.assistant_memory_enable_and_import_thread(
    '83000000-0000-4000-8000-000000000001',
    'en',
    'Strongest chart pattern',
    '82000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '84000000-0000-4000-8000-000000000001',
      'question', 'What is the strongest pattern in this chart?',
      'answer', 'The visible facts emphasize a Sun-Saturn square.',
      'completedAt', statement_timestamp()
    ))
  )
);

select pg_temp.assert_true(
  (select value->>'thread_id' = '83000000-0000-4000-8000-000000000001'
     and (value->>'inserted_turns')::integer = 1
   from memory_results where key = 'import')
  and exists (
    select 1 from public.assistant_threads
    where id = '83000000-0000-4000-8000-000000000001'
      and user_id = '81000000-0000-4000-8000-000000000001'
      and chart_id = '82000000-0000-4000-8000-000000000001'
      and expires_at = created_at + interval '90 days'
  )
  and exists (
    select 1 from public.assistant_turns
    where thread_id = '83000000-0000-4000-8000-000000000001'
      and question = 'What is the strongest pattern in this chart?'
      and answer = 'The visible facts emphasize a Sun-Saturn square.'
  )
  and (select assistant_memory_opt_in from public.profiles
       where user_id = '81000000-0000-4000-8000-000000000001'),
  'consent must atomically enable memory and store one fixed-expiry thread with visible completed pairs'
);

insert into memory_results values (
  'import_replay',
  public.assistant_memory_enable_and_import_thread(
    '83000000-0000-4000-8000-000000000001',
    'en',
    'Strongest chart pattern',
    '82000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '84000000-0000-4000-8000-000000000001',
      'question', 'What is the strongest pattern in this chart?',
      'answer', 'The visible facts emphasize a Sun-Saturn square.',
      'completedAt', statement_timestamp()
    ))
  )
);

select pg_temp.assert_true(
  (select (value->>'inserted_turns')::integer = 0
   from memory_results where key = 'import_replay')
  and (select count(*) = 1 from public.assistant_turns
       where thread_id = '83000000-0000-4000-8000-000000000001'),
  'lost import responses must replay without duplicating visible turns'
);

select pg_temp.assert_true(
  public.assistant_memory_save_turn(
    '83000000-0000-4000-8000-000000000001',
    '84000000-0000-4000-8000-000000000002',
    'What can I work with?',
    'Use the pattern as a reflective prompt, not a prediction.',
    statement_timestamp()
  )->>'outcome' = 'saved'
  and public.assistant_memory_save_turn(
    '83000000-0000-4000-8000-000000000001',
    '84000000-0000-4000-8000-000000000002',
    'What can I work with?',
    'Use the pattern as a reflective prompt, not a prediction.',
    statement_timestamp()
  )->>'outcome' = 'duplicate',
  'completed-turn persistence must be atomic and idempotent'
);

do $$
begin
  begin
    perform public.assistant_memory_save_turn(
      '83000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000002',
      'What can I work with?',
      'Conflicting replay must not overwrite the visible answer.',
      statement_timestamp()
    );
    raise exception 'conflicting turn replay was accepted';
  exception when others then
    if sqlerrm = 'conflicting turn replay was accepted' then raise; end if;
  end;

  begin
    perform public.assistant_memory_import_thread(
      '83000000-0000-4000-8000-000000000001',
      'en',
      'Strongest chart pattern',
      '82000000-0000-4000-8000-000000000001',
      jsonb_build_array(jsonb_build_object(
        'id', '84000000-0000-4000-8000-000000000001',
        'question', 'What is the strongest pattern in this chart?',
        'answer', 'A conflicting imported answer.',
        'completedAt', statement_timestamp()
      ))
    );
    raise exception 'conflicting import replay was accepted';
  exception when others then
    if sqlerrm = 'conflicting import replay was accepted' then raise; end if;
  end;

  begin
    perform public.assistant_memory_import_thread(
      '83000000-0000-4000-8000-000000000002',
      'en',
      'Cross-owner chart',
      '82000000-0000-4000-8000-000000000002',
      '[]'::jsonb
    );
    raise exception 'cross-owner chart was accepted';
  exception when others then
    if sqlerrm = 'cross-owner chart was accepted' then raise; end if;
  end;
end;
$$;

select pg_temp.assert_true(
  (select answer = 'The visible facts emphasize a Sun-Saturn square.'
   from public.assistant_turns
   where thread_id = '83000000-0000-4000-8000-000000000001'
     and id = '84000000-0000-4000-8000-000000000001'),
  'conflicting import replay must not overwrite a completed visible answer'
);

-- Exercise the fixed-expiry trigger as the database owner. Authenticated
-- clients cannot update memory tables directly after the storage-cap
-- hardening migration; the dedicated cap contract proves that denial.
reset role;
update public.assistant_threads
set expires_at = statement_timestamp() + interval '10 years'
where id = '83000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(
  (select expires_at = created_at + interval '90 days'
   from public.assistant_threads
   where id = '83000000-0000-4000-8000-000000000001'),
  'thread expiry must remain fixed under owner updates'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', false);
do $$
begin
  begin
    perform public.assistant_memory_enable_and_import_thread(
      '83000000-0000-4000-8000-000000000004',
      'not-released',
      'Must roll back',
      null,
      '[]'::jsonb
    );
    raise exception 'invalid atomic consent import was accepted';
  exception when others then
    if sqlerrm = 'invalid atomic consent import was accepted' then raise; end if;
  end;
end;
$$;
select pg_temp.assert_true(
  (select count(*) = 0 from public.assistant_threads)
  and not public.assistant_memory_delete_thread('83000000-0000-4000-8000-000000000001')
  and not (select assistant_memory_opt_in from public.profiles
           where user_id = '81000000-0000-4000-8000-000000000002')
  and not exists (
    select 1 from public.assistant_threads
    where id = '83000000-0000-4000-8000-000000000004'
  ),
  'another account must neither see/delete owner data nor retain opt-in after a failed atomic import'
);

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
insert into memory_results values (
  'opt_out',
  public.assistant_memory_set_opt_in(false)
);
select pg_temp.assert_true(
  (select value->>'enabled' = 'false'
   from memory_results where key = 'opt_out')
  and (select count(*) = 0 from public.assistant_threads),
  'opt-out must atomically delete all remembered conversations'
);
reset role;

-- Create an expired row as the database owner, prove it is hidden immediately,
-- then exercise the same bounded cleanup function used by the hourly Cron job.
update public.profiles
set assistant_memory_opt_in = true
where user_id = '81000000-0000-4000-8000-000000000001';
insert into public.assistant_threads (
  id, user_id, locale, title
) values (
  '83000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000001',
  'en',
  'Expired thread'
);
alter table public.assistant_threads disable trigger assistant_threads_stamp_fixed_expiry;
update public.assistant_threads
set created_at = statement_timestamp() - interval '91 days',
    expires_at = statement_timestamp() - interval '1 day'
where id = '83000000-0000-4000-8000-000000000003';
alter table public.assistant_threads enable trigger assistant_threads_stamp_fixed_expiry;

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
select pg_temp.assert_true(
  (select count(*) = 0 from public.assistant_threads),
  'RLS must hide expired threads before physical cleanup runs'
);

do $$
begin
  begin
    perform public.assistant_memory_import_thread(
      '83000000-0000-4000-8000-000000000003',
      'en',
      'Expired thread replay',
      null,
      '[]'::jsonb
    );
    raise exception 'expired thread import was accepted';
  exception when others then
    if sqlerrm = 'expired thread import was accepted' then raise; end if;
  end;
end;
$$;
reset role;
select pg_temp.assert_true(
  exists (
    select 1 from public.assistant_threads
    where id = '83000000-0000-4000-8000-000000000003'
      and expires_at <= statement_timestamp()
      and created_at <= statement_timestamp() - interval '90 days'
  ),
  'a stale import must not resurrect or extend an expired thread ID'
);
insert into memory_results values (
  'cleanup',
  jsonb_build_object('deleted', public.assistant_memory_cleanup(1))
);
select pg_temp.assert_true(
  (select (value->>'deleted')::integer = 1
   from memory_results where key = 'cleanup')
  and not exists (
    select 1 from public.assistant_threads
    where id = '83000000-0000-4000-8000-000000000003'
  ),
  'bounded cleanup must physically delete expired memory'
);

-- Budget reservation semantics use the production launch defaults.
-- The preceding legacy-quota contract intentionally leaves rows behind; the
-- cost-budget assertions own a fresh ledger so their visitor counts are exact.
truncate table
  public.assistant_budget_reservations,
  public.assistant_budget_daily,
  public.assistant_budget_monthly,
  public.assistant_quota;

do $$
declare
  sequence_number integer;
  result json;
begin
  for sequence_number in 1..10 loop
    result := public.assistant_budget_reserve_v1(
      repeat('a', 64),
      'budget-visitor-a-' || lpad(sequence_number::text, 2, '0'),
      30000,
      10,
      3000000,
      100000000
    );
    if not (result->>'allowed')::boolean
       or result->>'reason' <> 'ok'
       or (result->>'visitor')::integer <> sequence_number then
      raise exception 'reservation % failed: %', sequence_number, result;
    end if;
  end loop;
end;
$$;

insert into memory_results values (
  'visitor_denied',
  public.assistant_budget_reserve_v1(
    repeat('a', 64), 'budget-visitor-a-11', 30000,
    10, 3000000, 100000000
  )::jsonb
), (
  'daily_denied',
  public.assistant_budget_reserve_v1(
    repeat('b', 64), 'budget-daily-denied', 30000,
    10, 300000, 100000000
  )::jsonb
);

select pg_temp.assert_true(
  (select value->>'reason' = 'visitor_limit' and value->>'allowed' = 'false'
   from memory_results where key = 'visitor_denied')
  and (select value->>'reason' = 'daily_budget' and value->>'allowed' = 'false'
       from memory_results where key = 'daily_denied')
  and (select request_count = 10 from public.assistant_quota
       where visitor_hash = repeat('a', 64)
         and quota_day = (statement_timestamp() at time zone 'utc')::date)
  and not exists (
    select 1 from public.assistant_budget_reservations
    where id in ('budget-visitor-a-11', 'budget-daily-denied')
  )
  and not exists (
    select 1 from public.assistant_quota where visitor_hash = repeat('b', 64)
  ),
  'visitor and daily denials must not consume quota or reserve provider spend'
);

-- Simulate prior-day month spend so the monthly branch is independently
-- reachable while today's daily allowance remains open.
update public.assistant_budget_monthly
set committed_microusd = 890000
where budget_month = date_trunc(
  'month', statement_timestamp() at time zone 'utc'
)::date;
insert into memory_results values (
  'monthly_denied',
  public.assistant_budget_reserve_v1(
    repeat('c', 64), 'budget-monthly-denied', 30000,
    10, 500000, 900000
  )::jsonb
);
select pg_temp.assert_true(
  (select value->>'reason' = 'monthly_budget' and value->>'allowed' = 'false'
   from memory_results where key = 'monthly_denied')
  and not exists (
    select 1 from public.assistant_budget_reservations
    where id = 'budget-monthly-denied'
  )
  and not exists (
    select 1 from public.assistant_quota where visitor_hash = repeat('c', 64)
  ),
  'monthly denial must not create a reservation or consume visitor quota'
);

-- Restore the aggregate to the sum of real reservations before settlement.
update public.assistant_budget_monthly
set committed_microusd = 300000
where budget_month = date_trunc(
  'month', statement_timestamp() at time zone 'utc'
)::date;

insert into memory_results values (
  'settled',
  to_jsonb(public.assistant_budget_settle_v1('budget-visitor-a-01', 10000))
);
insert into memory_results values (
  'settled_replay',
  to_jsonb(public.assistant_budget_settle_v1('budget-visitor-a-01', 10000))
);
insert into memory_results values (
  'settled_conflict',
  to_jsonb(public.assistant_budget_settle_v1('budget-visitor-a-01', 20000))
);
insert into memory_results values (
  'settled_missing',
  to_jsonb(public.assistant_budget_settle_v1('budget-missing-reservation', 10000))
);
insert into memory_results values (
  'settled_overage',
  to_jsonb(public.assistant_budget_settle_v1('budget-visitor-a-02', 30001))
);

select pg_temp.assert_true(
  (select value = 'true'::jsonb from memory_results where key = 'settled')
  and (select value = 'true'::jsonb from memory_results where key = 'settled_replay')
  and (select value = 'false'::jsonb from memory_results where key = 'settled_conflict')
  and (select value = 'false'::jsonb from memory_results where key = 'settled_missing')
  and (select value = 'false'::jsonb from memory_results where key = 'settled_overage')
  and (select committed_microusd = 280000 and settled_microusd = 10000
       from public.assistant_budget_daily
       where budget_day = (statement_timestamp() at time zone 'utc')::date)
  and (select committed_microusd = 280000 and settled_microusd = 10000
       from public.assistant_budget_monthly
       where budget_month = date_trunc(
         'month', statement_timestamp() at time zone 'utc'
       )::date)
  and (select count(*) = 10 from public.assistant_budget_reservations),
  'settlement must be idempotent, release only unused reservations, and never create spend'
);

-- Retention cleanup must work without a new Ask reservation. Exercise its
-- bound first, then clear the remaining backlog while preserving yesterday.
insert into public.assistant_quota (visitor_hash, quota_day, request_count)
values
  (repeat('d', 64), (statement_timestamp() at time zone 'utc')::date - 2, 1),
  (repeat('e', 64), (statement_timestamp() at time zone 'utc')::date - 3, 1),
  (repeat('f', 64), (statement_timestamp() at time zone 'utc')::date - 1, 1);
insert into memory_results values (
  'quota_cleanup_bounded',
  to_jsonb(public.assistant_quota_cleanup(1))
);
select pg_temp.assert_true(
  (select value = '1'::jsonb from memory_results where key = 'quota_cleanup_bounded')
  and (select count(*) = 1 from public.assistant_quota
       where quota_day < (statement_timestamp() at time zone 'utc')::date - 1),
  'quota cleanup must honor its batch bound without a new assistant request'
);
insert into memory_results values (
  'quota_cleanup_remaining',
  to_jsonb(public.assistant_quota_cleanup(5000))
);
select pg_temp.assert_true(
  (select value = '1'::jsonb from memory_results where key = 'quota_cleanup_remaining')
  and not exists (
    select 1 from public.assistant_quota
    where quota_day < (statement_timestamp() at time zone 'utc')::date - 1
  )
  and exists (
    select 1 from public.assistant_quota
    where visitor_hash = repeat('f', 64)
      and quota_day = (statement_timestamp() at time zone 'utc')::date - 1
  )
  and (select committed_microusd = 280000
       from public.assistant_budget_daily
       where budget_day = (statement_timestamp() at time zone 'utc')::date),
  'scheduled cleanup must retain only today/yesterday and never alter aggregate budget totals'
);

select 'assistant memory and cost budget contract OK' as result;
