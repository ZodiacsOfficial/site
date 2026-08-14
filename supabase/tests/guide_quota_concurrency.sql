-- Guide atomic-quota concurrency proof (disposable PostgreSQL 17 only).
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

-- Leave exactly one global slot. The contenders use different principal
-- hashes, proving per-row UPSERT locking alone would not be sufficient.
delete from public.assistant_quota
where quota_day = (now() at time zone 'utc')::date;

insert into public.assistant_quota (visitor_hash, quota_day, request_count)
values (
  repeat('a', 64),
  (now() at time zone 'utc')::date,
  9
);

select dblink_connect(
  'guide_quota_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'guide_quota_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('guide_quota_a', 'set role service_role');
select dblink_exec('guide_quota_b', 'set role service_role');
select dblink_exec('guide_quota_a', 'set statement_timeout = ''5s''');
select dblink_exec('guide_quota_b', 'set statement_timeout = ''5s''');

-- Session A holds the same UTC-day transaction lock used by the RPC. B must
-- wait; A takes slot ten, then B wakes and returns global_limit without a row.
select dblink_exec('guide_quota_a', 'begin');
select dblink_exec(
  'guide_quota_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      151462741,
      (pg_catalog.now() at time zone 'utc')::date - date '2000-01-01'
    );
  end $block$;$$
);

select dblink_send_query(
  'guide_quota_b',
  $$select public.guide_quota_reserve_v1(
    repeat('b', 64),
    repeat('d', 64),
    10
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('guide_quota_b') = 1,
  'second principal must wait behind the UTC-day reservation lock'
);

create temporary table guide_quota_concurrency_results (
  contender text primary key,
  result jsonb not null
);

insert into guide_quota_concurrency_results
select 'a', result
from dblink(
  'guide_quota_a',
  $$select public.guide_quota_reserve_v1(
    repeat('c', 64),
    repeat('e', 64),
    10
  )$$
) as response(result jsonb);

select dblink_exec('guide_quota_a', 'commit');

insert into guide_quota_concurrency_results
select 'b', result
from dblink_get_result('guide_quota_b') as response(result jsonb);

select pg_temp.assert_true(
  not exists (
    select 1
    from dblink_get_result('guide_quota_b') as drained(result jsonb)
  ),
  'async quota result must be fully drained'
);

select pg_temp.assert_true(
  (select result->>'status' = 'reserved'
     and (result->>'visitor')::integer = 1
     and (result->>'global')::integer = 10
   from guide_quota_concurrency_results where contender = 'a')
  and
  (select result->>'status' = 'global_limit'
     and (result->>'visitor')::integer = 0
     and (result->>'global')::integer = 10
   from guide_quota_concurrency_results where contender = 'b')
  and (
    select sum(request_count) = 10
       and count(*) = 2
    from public.assistant_quota
    where quota_day = (now() at time zone 'utc')::date
  )
  and not exists (
    select 1
    from public.assistant_quota
    where visitor_hash = repeat('b', 64)
      and quota_day = (now() at time zone 'utc')::date
  ),
  'two distributed principals with one slot must yield one charge and one denial'
);

-- Two instances racing the same logical operation serialize on the global
-- operation lock before the UTC-day lock. The loser observes the durable
-- receipt and cannot charge quota or start another model call.
delete from public.assistant_quota
where quota_day = (now() at time zone 'utc')::date;

delete from public.guide_quota_operation_receipts
where operation_hash = repeat('6', 64);

select dblink_exec('guide_quota_a', 'begin');
select dblink_exec(
  'guide_quota_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      151462742,
      pg_catalog.hashtext(repeat('6', 64))
    );
  end $block$;$$
);

select dblink_send_query(
  'guide_quota_b',
  $$select public.guide_quota_reserve_v1(
    repeat('7', 64),
    repeat('6', 64),
    10
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('guide_quota_b') = 1,
  'duplicate operation must wait behind the global operation lock'
);

create temporary table guide_quota_replay_results (
  contender text primary key,
  result jsonb not null
);

insert into guide_quota_replay_results
select 'a', result
from dblink(
  'guide_quota_a',
  $$select public.guide_quota_reserve_v1(
    repeat('7', 64),
    repeat('6', 64),
    10
  )$$
) as response(result jsonb);

select dblink_exec('guide_quota_a', 'commit');

insert into guide_quota_replay_results
select 'b', result
from dblink_get_result('guide_quota_b') as response(result jsonb);

select pg_temp.assert_true(
  not exists (
    select 1
    from dblink_get_result('guide_quota_b') as drained(result jsonb)
  ),
  'async replay result must be fully drained'
);

select pg_temp.assert_true(
  (select result->>'status' = 'reserved'
     and (result->>'visitor')::integer = 1
     and (result->>'global')::integer = 1
   from guide_quota_replay_results where contender = 'a')
  and
  (select result->>'status' = 'operation_replay'
     and (result->>'visitor')::integer = 0
     and (result->>'global')::integer = 0
   from guide_quota_replay_results where contender = 'b')
  and (
    select sum(request_count) = 1
       and count(*) = 1
    from public.assistant_quota
    where quota_day = (now() at time zone 'utc')::date
  )
  and (
    select count(*) = 1
    from public.guide_quota_operation_receipts
    where operation_hash = repeat('6', 64)
  ),
  'duplicate distributed operation must yield one charge and one replay denial'
);

select dblink_disconnect('guide_quota_a');
select dblink_disconnect('guide_quota_b');

select 'Guide atomic quota concurrency OK' as result;
