\set ON_ERROR_STOP on

create extension if not exists dblink;

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

truncate table public.assistant_turns, public.assistant_threads;

insert into auth.users (id) values
  ('92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000003'),
  ('92000000-0000-4000-8000-000000000004')
on conflict (id) do nothing;

insert into public.profiles (user_id, assistant_memory_opt_in) values
  ('92000000-0000-4000-8000-000000000001', true),
  ('92000000-0000-4000-8000-000000000002', true),
  ('92000000-0000-4000-8000-000000000003', true),
  ('92000000-0000-4000-8000-000000000004', true)
on conflict (user_id) do update set assistant_memory_opt_in = true;

create temporary table assistant_memory_concurrency_results (
  scenario text not null,
  lane text not null,
  result jsonb,
  error_message text
);

select dblink_connect(
  'assistant_memory_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'assistant_memory_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('assistant_memory_a', 'set role authenticated');
select dblink_exec('assistant_memory_b', 'set role authenticated');
select dblink_exec('assistant_memory_a', 'set statement_timeout = ''5s''');
select dblink_exec('assistant_memory_b', 'set statement_timeout = ''5s''');

-- THREAD CAP: start at 19, hold the per-user lock in lane A, and queue lane B.
set role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', false);
do $$
declare item integer;
begin
  for item in 1..19 loop
    perform public.assistant_memory_import_thread(
      pg_temp.uuid_for('concurrent-thread-' || item),
      'en', 'Thread ' || item, null, '[]'::jsonb
    );
  end loop;
end;
$$;
reset role;

select dblink_exec(
  'assistant_memory_a',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000001'''
);
select dblink_exec(
  'assistant_memory_b',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000001'''
);
select dblink_exec('assistant_memory_a', 'begin');
select dblink_exec(
  'assistant_memory_a',
  'do $lock$ begin
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(''ask-zodiacs-memory:92000000-0000-4000-8000-000000000001'', 0)
      );
    end $lock$'
);
select dblink_send_query(
  'assistant_memory_b',
  $$select public.assistant_memory_import_thread(
      '92100000-0000-4000-8000-000000000021',
      'en', 'Concurrent thread B', null, '[]'::jsonb
    )$$
);
select pg_temp.assert_true(
  dblink_is_busy('assistant_memory_b') = 1,
  'the competing 20th/21st thread insert must wait on the owner lock'
);
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'thread', 'a', value
from dblink(
  'assistant_memory_a',
  $$select public.assistant_memory_import_thread(
      '92100000-0000-4000-8000-000000000020',
      'en', 'Concurrent thread A', null, '[]'::jsonb
    )$$
) as response(value jsonb);
select dblink_exec('assistant_memory_a', 'commit');
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'thread', 'b', value
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);
insert into assistant_memory_concurrency_results (scenario, lane, error_message)
values ('thread', 'b-error', dblink_error_message('assistant_memory_b'));
-- libpq async queries require one additional empty-result read before the
-- connection can accept the next scenario's command.
select count(*) as drained_results
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 20 from public.assistant_threads
   where user_id = '92000000-0000-4000-8000-000000000001'
     and expires_at > statement_timestamp())
  and (select count(*) = 1 from assistant_memory_concurrency_results
       where scenario = 'thread' and lane = 'a' and result is not null)
  and (select error_message like '%assistant_memory_limit:thread_limit%'
       from assistant_memory_concurrency_results
       where scenario = 'thread' and lane = 'b-error'),
  'concurrent thread inserts must commit exactly the 20th and reject the 21st'
);

-- PER-THREAD CAP: at 99 turns, exactly one of two queued saves reaches 100.
set role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', false);
do $$
declare turns jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'id', pg_temp.uuid_for('concurrent-per-thread-' || item),
    'question', 'Question ' || item,
    'answer', 'Answer ' || item,
    'completedAt', statement_timestamp()
  ) order by item)
  into turns
  from generate_series(1, 99) as item;
  perform public.assistant_memory_enable_and_import_thread(
    '92200000-0000-4000-8000-000000000001',
    'en', 'Concurrent turn cap', null, turns
  );
end;
$$;
reset role;

select dblink_exec(
  'assistant_memory_a',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000002'''
);
select dblink_exec(
  'assistant_memory_b',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000002'''
);
select dblink_exec('assistant_memory_a', 'begin');
select dblink_exec(
  'assistant_memory_a',
  'do $lock$ begin
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(''ask-zodiacs-memory:92000000-0000-4000-8000-000000000002'', 0)
      );
    end $lock$'
);
select dblink_send_query(
  'assistant_memory_b',
  $$select public.assistant_memory_save_turn(
      '92200000-0000-4000-8000-000000000001',
      '92200000-0000-4000-8000-000000000102',
      'Question B', 'Answer B', statement_timestamp()
    )$$
);
select pg_temp.assert_true(
  dblink_is_busy('assistant_memory_b') = 1,
  'the competing 100th/101st thread turns must serialize'
);
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'thread_turn', 'a', value
from dblink(
  'assistant_memory_a',
  $$select public.assistant_memory_save_turn(
      '92200000-0000-4000-8000-000000000001',
      '92200000-0000-4000-8000-000000000101',
      'Question A', 'Answer A', statement_timestamp()
    )$$
) as response(value jsonb);
select dblink_exec('assistant_memory_a', 'commit');
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'thread_turn', 'b', value
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);
insert into assistant_memory_concurrency_results (scenario, lane, error_message)
values ('thread_turn', 'b-error', dblink_error_message('assistant_memory_b'));
select count(*) as drained_results
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 100 from public.assistant_turns
   where thread_id = '92200000-0000-4000-8000-000000000001')
  and (select result->>'outcome' = 'saved'
       from assistant_memory_concurrency_results
       where scenario = 'thread_turn' and lane = 'a')
  and (select error_message like '%assistant_memory_limit:thread_turn_limit%'
       from assistant_memory_concurrency_results
       where scenario = 'thread_turn' and lane = 'b-error'),
  'concurrent per-thread saves must stop at exactly 100 turns'
);

-- TOTAL CAP: populate 499 active turns. Lane A reaches 500 on an empty sixth
-- thread; lane B targets a 99-turn thread and must receive total_turn_limit.
set role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000003', false);
do $$
declare
  thread_number integer;
  turn_count integer;
  turns jsonb;
begin
  for thread_number in 1..5 loop
    turn_count := case when thread_number = 5 then 99 else 100 end;
    select jsonb_agg(jsonb_build_object(
      'id', pg_temp.uuid_for('concurrent-total-' || thread_number || '-' || item),
      'question', 'Question ' || item,
      'answer', 'Answer ' || item,
      'completedAt', statement_timestamp()
    ) order by item)
    into turns
    from generate_series(1, turn_count) as item;
    perform public.assistant_memory_enable_and_import_thread(
      ('92300000-0000-4000-8000-' || lpad(thread_number::text, 12, '0'))::uuid,
      'en', 'Total thread ' || thread_number, null, turns
    );
  end loop;
  perform public.assistant_memory_import_thread(
    '92300000-0000-4000-8000-000000000006',
    'en', 'Total thread 6', null, '[]'::jsonb
  );
end;
$$;
reset role;

select dblink_exec(
  'assistant_memory_a',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000003'''
);
select dblink_exec(
  'assistant_memory_b',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000003'''
);
select dblink_exec('assistant_memory_a', 'begin');
select dblink_exec(
  'assistant_memory_a',
  'do $lock$ begin
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(''ask-zodiacs-memory:92000000-0000-4000-8000-000000000003'', 0)
      );
    end $lock$'
);
select dblink_send_query(
  'assistant_memory_b',
  $$select public.assistant_memory_save_turn(
      '92300000-0000-4000-8000-000000000005',
      '92300000-0000-4000-8000-000000000502',
      'Question B', 'Answer B', statement_timestamp()
    )$$
);
select pg_temp.assert_true(
  dblink_is_busy('assistant_memory_b') = 1,
  'competing owner-total turns must serialize at 500'
);
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'total_turn', 'a', value
from dblink(
  'assistant_memory_a',
  $$select public.assistant_memory_save_turn(
      '92300000-0000-4000-8000-000000000006',
      '92300000-0000-4000-8000-000000000501',
      'Question A', 'Answer A', statement_timestamp()
    )$$
) as response(value jsonb);
select dblink_exec('assistant_memory_a', 'commit');
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'total_turn', 'b', value
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);
insert into assistant_memory_concurrency_results (scenario, lane, error_message)
values ('total_turn', 'b-error', dblink_error_message('assistant_memory_b'));
select count(*) as drained_results
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 500
   from public.assistant_turns as turn_row
   join public.assistant_threads as thread
     on thread.id = turn_row.thread_id
    and thread.user_id = turn_row.user_id
   where turn_row.user_id = '92000000-0000-4000-8000-000000000003'
     and thread.expires_at > statement_timestamp())
  and (select result->>'outcome' = 'saved'
       from assistant_memory_concurrency_results
       where scenario = 'total_turn' and lane = 'a')
  and (select error_message like '%assistant_memory_limit:total_turn_limit%'
       from assistant_memory_concurrency_results
       where scenario = 'total_turn' and lane = 'b-error'),
  'concurrent owner-total saves must stop at exactly 500 active turns'
);

-- IDEMPOTENT RETRY: both lanes submit the same visible turn. The lock must
-- cover the RPC's duplicate lookup, not only the trigger's eventual INSERT,
-- so the second lane returns `duplicate` instead of a primary-key error.
set role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000004', false);
select public.assistant_memory_enable_and_import_thread(
  '92400000-0000-4000-8000-000000000001',
  'en', 'Concurrent retry', null, '[]'::jsonb
);
reset role;

select dblink_exec(
  'assistant_memory_a',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000004'''
);
select dblink_exec(
  'assistant_memory_b',
  'set request.jwt.claim.sub = ''92000000-0000-4000-8000-000000000004'''
);
select dblink_exec('assistant_memory_a', 'begin');
select dblink_exec(
  'assistant_memory_a',
  'do $lock$ begin
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(''ask-zodiacs-memory:92000000-0000-4000-8000-000000000004'', 0)
      );
    end $lock$'
);
select dblink_send_query(
  'assistant_memory_b',
  $$select public.assistant_memory_save_turn(
      '92400000-0000-4000-8000-000000000001',
      '92400000-0000-4000-8000-000000000002',
      'Same question', 'Same answer', statement_timestamp()
    )$$
);
select pg_temp.assert_true(
  dblink_is_busy('assistant_memory_b') = 1,
  'a concurrent retry of the same turn must wait before its duplicate lookup'
);
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'same_turn', 'a', value
from dblink(
  'assistant_memory_a',
  $$select public.assistant_memory_save_turn(
      '92400000-0000-4000-8000-000000000001',
      '92400000-0000-4000-8000-000000000002',
      'Same question', 'Same answer', statement_timestamp()
    )$$
) as response(value jsonb);
select dblink_exec('assistant_memory_a', 'commit');
insert into assistant_memory_concurrency_results (scenario, lane, result)
select 'same_turn', 'b', value
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);
select count(*) as drained_results
from dblink_get_result('assistant_memory_b', false) as response(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 1 from public.assistant_turns
   where thread_id = '92400000-0000-4000-8000-000000000001'
     and id = '92400000-0000-4000-8000-000000000002')
  and (select result->>'outcome' = 'saved'
       from assistant_memory_concurrency_results
       where scenario = 'same_turn' and lane = 'a')
  and (select result->>'outcome' = 'duplicate'
       from assistant_memory_concurrency_results
       where scenario = 'same_turn' and lane = 'b'),
  'concurrent same-turn retries must store once and return saved then duplicate'
);

select dblink_disconnect('assistant_memory_a');
select dblink_disconnect('assistant_memory_b');

select 'assistant memory caps concurrency contract OK' as result;
