\set ON_ERROR_STOP on

-- Two independent provider invocations contend for the final daily slot.
-- The advisory lock must serialize the visitor and both budget periods so
-- exactly one reservation survives.
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

truncate table public.assistant_budget_reservations;
truncate table public.assistant_budget_daily cascade;
truncate table public.assistant_budget_monthly cascade;
delete from public.assistant_quota
where visitor_hash in (repeat('f', 64), repeat('e', 64));

select dblink_connect(
  'assistant_budget_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'assistant_budget_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('assistant_budget_a', 'set role service_role');
select dblink_exec('assistant_budget_b', 'set role service_role');
select dblink_exec('assistant_budget_a', 'set statement_timeout = ''5s''');
select dblink_exec('assistant_budget_b', 'set statement_timeout = ''5s''');

select dblink_exec('assistant_budget_a', 'begin');
select dblink_exec(
  'assistant_budget_a',
  'do $lock$ begin perform pg_catalog.pg_advisory_xact_lock(92147635081023::bigint); end $lock$'
);
select dblink_send_query(
  'assistant_budget_b',
  $$select public.assistant_budget_reserve_v1(
    repeat('e', 64),
    'budget-concurrent-b',
    30000,
    10,
    30000,
    100000
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('assistant_budget_b') = 1,
  'the competing provider request must wait behind the budget lock'
);

create temporary table assistant_budget_concurrency_results (
  reservation_id text,
  result json
);

insert into assistant_budget_concurrency_results
select 'budget-concurrent-a', value
from dblink(
  'assistant_budget_a',
  $$select public.assistant_budget_reserve_v1(
    repeat('f', 64),
    'budget-concurrent-a',
    30000,
    10,
    30000,
    100000
  )$$
) as response(value json);

select dblink_exec('assistant_budget_a', 'commit');

insert into assistant_budget_concurrency_results
select 'budget-concurrent-b', value
from dblink_get_result('assistant_budget_b') as response(value json);

select pg_temp.assert_true(
  (select count(*) = 1
   from assistant_budget_concurrency_results
   where result->>'allowed' = 'true'
     and result->>'reason' = 'ok')
  and (select count(*) = 1
       from assistant_budget_concurrency_results
       where result->>'allowed' = 'false'
         and result->>'reason' = 'daily_budget')
  and (select count(*) = 1 from public.assistant_budget_reservations)
  and (select committed_microusd = 30000
       from public.assistant_budget_daily
       where budget_day = (statement_timestamp() at time zone 'utc')::date)
  and (select coalesce(sum(request_count), 0) = 1
       from public.assistant_quota
       where visitor_hash in (repeat('f', 64), repeat('e', 64))),
  'concurrent requests at the cap must create exactly one reservation and one visitor charge'
);

select dblink_disconnect('assistant_budget_a');
select dblink_disconnect('assistant_budget_b');

select 'assistant budget concurrency contract OK' as result;
