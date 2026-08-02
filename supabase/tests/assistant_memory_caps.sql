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

create or replace function pg_temp.uuid_for(label text)
returns uuid
language sql
immutable
strict
as $$
  select (
    substr(md5(label), 1, 8) || '-' ||
    substr(md5(label), 9, 4) || '-' ||
    substr(md5(label), 13, 4) || '-' ||
    substr(md5(label), 17, 4) || '-' ||
    substr(md5(label), 21, 12)
  )::uuid;
$$;

select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.assistant_threads', 'select')
  and has_table_privilege('authenticated', 'public.assistant_turns', 'select')
  and not has_table_privilege('authenticated', 'public.assistant_threads', 'insert,update,delete')
  and not has_table_privilege('authenticated', 'public.assistant_turns', 'insert,update,delete')
  and not has_table_privilege('anon', 'public.assistant_threads', 'select,insert,update,delete')
  and not has_table_privilege('service_role', 'public.assistant_threads', 'select,insert,update,delete'),
  'remembered-conversation tables must expose reads only to authenticated owners'
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
        'search_path=pg_catalog, public' = any(proconfig), false
      ) from pg_catalog.pg_proc where oid = routine.signature::regprocedure)
  ),
  'memory mutation RPCs must be authenticated-only pinned definers'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from (values
      ('public.assistant_memory_enforce_thread_insert_cap()'),
      ('public.assistant_memory_enforce_turn_insert_caps()')
    ) as helper(signature)
    where has_function_privilege('anon', helper.signature, 'execute')
      or has_function_privilege('authenticated', helper.signature, 'execute')
      or has_function_privilege('service_role', helper.signature, 'execute')
      or (select prosecdef from pg_catalog.pg_proc
          where oid = helper.signature::regprocedure)
      or not (select coalesce(
        'search_path=pg_catalog, public' = any(proconfig), false
      ) from pg_catalog.pg_proc where oid = helper.signature::regprocedure)
  )
  and exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.assistant_threads'::regclass
      and tgname = 'assistant_threads_enforce_insert_cap'
      and tgenabled = 'O'
  )
  and exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.assistant_turns'::regclass
      and tgname = 'assistant_turns_enforce_insert_caps'
      and tgenabled = 'O'
  ),
  'cap triggers must be enabled owner-only SECURITY INVOKER helpers'
);

truncate table public.assistant_turns, public.assistant_threads;

insert into auth.users (id) values
  ('91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000002'),
  ('91000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

insert into public.profiles (user_id, assistant_memory_opt_in) values
  ('91000000-0000-4000-8000-000000000001', true),
  ('91000000-0000-4000-8000-000000000002', true),
  ('91000000-0000-4000-8000-000000000003', true)
on conflict (user_id) do update set assistant_memory_opt_in = true;

-- Even an RLS-valid owner cannot bypass the RPC validation/caps with a direct
-- table write after the grant hardening migration.
set role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', false);
do $$
begin
  begin
    insert into public.assistant_threads (id, user_id, locale, title)
    values (
      pg_temp.uuid_for('direct-write-denied'),
      '91000000-0000-4000-8000-000000000001',
      'en',
      'Direct write'
    );
    raise exception 'direct memory insert was accepted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Twenty unexpired threads are allowed. The 21st produces a stable marker,
-- while replaying an existing ID at the cap remains idempotent.
do $$
declare
  item integer;
  result jsonb;
begin
  for item in 1..20 loop
    perform public.assistant_memory_import_thread(
      pg_temp.uuid_for('thread-cap-' || item),
      'en',
      'Thread ' || item,
      null,
      '[]'::jsonb
    );
  end loop;

  begin
    perform public.assistant_memory_import_thread(
      pg_temp.uuid_for('thread-cap-21'), 'en', 'Thread 21', null, '[]'::jsonb
    );
    raise exception 'expected thread_limit';
  exception when others then
    if sqlerrm <> 'assistant_memory_limit:thread_limit' then raise; end if;
  end;

  result := public.assistant_memory_import_thread(
    pg_temp.uuid_for('thread-cap-1'), 'en', 'Thread 1', null, '[]'::jsonb
  );
  if (result->>'inserted_turns')::integer <> 0 then
    raise exception 'thread replay was not idempotent at cap';
  end if;
end;
$$;
reset role;

-- An expired row is physically retained but excluded from the active-thread
-- ceiling; replacing it with a new active ID succeeds.
alter table public.assistant_threads disable trigger assistant_threads_stamp_fixed_expiry;
update public.assistant_threads
set created_at = statement_timestamp() - interval '91 days',
    expires_at = statement_timestamp() - interval '1 day'
where id = pg_temp.uuid_for('thread-cap-1');
alter table public.assistant_threads enable trigger assistant_threads_stamp_fixed_expiry;

set role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', false);
select public.assistant_memory_import_thread(
  pg_temp.uuid_for('thread-cap-21'), 'en', 'Thread 21', null, '[]'::jsonb
);
select pg_temp.assert_true(
  (select count(*) = 20 from public.assistant_threads),
  'expired threads must not consume the 20-active-thread allowance'
);

-- Cross-user definer calls remain owner-scoped and reveal no foreign row.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', false);
select pg_temp.assert_true(
  not public.assistant_memory_delete_thread(pg_temp.uuid_for('thread-cap-2'))
  and public.assistant_memory_save_turn(
    pg_temp.uuid_for('thread-cap-2'),
    pg_temp.uuid_for('cross-user-turn'),
    'Foreign question',
    'Foreign answer',
    statement_timestamp()
  )->>'outcome' = 'unavailable',
  'SECURITY DEFINER RPCs must deny cross-user memory access'
);

-- A single thread is capped at 100 visible turns, with duplicates still
-- accepted as idempotent at the boundary.
do $$
declare
  turns jsonb;
  result jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'id', pg_temp.uuid_for('thread-turn-' || item),
    'question', 'Question ' || item,
    'answer', 'Answer ' || item,
    'completedAt', statement_timestamp()
  ) order by item)
  into turns
  from generate_series(1, 100) as item;

  perform public.assistant_memory_enable_and_import_thread(
    pg_temp.uuid_for('thread-turn-cap'), 'en', 'Turn cap', null, turns
  );

  begin
    perform public.assistant_memory_save_turn(
      pg_temp.uuid_for('thread-turn-cap'),
      pg_temp.uuid_for('thread-turn-101'),
      'Question 101', 'Answer 101', statement_timestamp()
    );
    raise exception 'expected thread_turn_limit';
  exception when others then
    if sqlerrm <> 'assistant_memory_limit:thread_turn_limit' then raise; end if;
  end;

  result := public.assistant_memory_save_turn(
    pg_temp.uuid_for('thread-turn-cap'),
    pg_temp.uuid_for('thread-turn-1'),
    'Question 1', 'Answer 1', statement_timestamp()
  );
  if result->>'outcome' <> 'duplicate' then
    raise exception 'turn replay was not idempotent at per-thread cap';
  end if;
end;
$$;
reset role;

-- Five full active threads reach the 500-turn owner ceiling. A sixth thread
-- may exist, but its first new turn is rejected with a distinct stable marker.
set role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', false);
do $$
declare
  thread_number integer;
  turns jsonb;
  result jsonb;
begin
  for thread_number in 1..5 loop
    select jsonb_agg(jsonb_build_object(
      'id', pg_temp.uuid_for('total-' || thread_number || '-turn-' || item),
      'question', 'Question ' || item,
      'answer', 'Answer ' || item,
      'completedAt', statement_timestamp()
    ) order by item)
    into turns
    from generate_series(1, 100) as item;

    perform public.assistant_memory_enable_and_import_thread(
      pg_temp.uuid_for('total-thread-' || thread_number),
      'en', 'Total thread ' || thread_number, null, turns
    );
  end loop;

  perform public.assistant_memory_import_thread(
    pg_temp.uuid_for('total-thread-6'), 'en', 'Total thread 6', null, '[]'::jsonb
  );

  begin
    perform public.assistant_memory_save_turn(
      pg_temp.uuid_for('total-thread-6'),
      pg_temp.uuid_for('total-turn-501'),
      'Question 501', 'Answer 501', statement_timestamp()
    );
    raise exception 'expected total_turn_limit';
  exception when others then
    if sqlerrm <> 'assistant_memory_limit:total_turn_limit' then raise; end if;
  end;

  result := public.assistant_memory_save_turn(
    pg_temp.uuid_for('total-thread-1'),
    pg_temp.uuid_for('total-1-turn-1'),
    'Question 1', 'Answer 1', statement_timestamp()
  );
  if result->>'outcome' <> 'duplicate' then
    raise exception 'turn replay was not idempotent at total cap';
  end if;
end;
$$;
reset role;

-- Expiring one 100-turn thread releases that capacity immediately even before
-- the hourly physical cleanup deletes it.
alter table public.assistant_threads disable trigger assistant_threads_stamp_fixed_expiry;
update public.assistant_threads
set created_at = statement_timestamp() - interval '91 days',
    expires_at = statement_timestamp() - interval '1 day'
where id = pg_temp.uuid_for('total-thread-1');
alter table public.assistant_threads enable trigger assistant_threads_stamp_fixed_expiry;

set role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', false);
select pg_temp.assert_true(
  public.assistant_memory_save_turn(
    pg_temp.uuid_for('total-thread-6'),
    pg_temp.uuid_for('total-turn-after-expiry'),
    'Question after expiry', 'Answer after expiry', statement_timestamp()
  )->>'outcome' = 'saved',
  'expired-thread turns must not consume the 500-active-turn allowance'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 401
   from public.assistant_turns as turn_row
   join public.assistant_threads as thread
     on thread.id = turn_row.thread_id
    and thread.user_id = turn_row.user_id
   where turn_row.user_id = '91000000-0000-4000-8000-000000000003'
     and thread.expires_at > statement_timestamp()),
  'active-turn count must exclude physically retained expired memory'
);

select 'assistant memory storage caps contract OK' as result;
