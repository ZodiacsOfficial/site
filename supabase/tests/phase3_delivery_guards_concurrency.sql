\set ON_ERROR_STOP on

-- Run after phase3_delivery_guards.sql in a disposable PostgreSQL 17
-- database as its owner. dblink supplies genuinely independent sessions: the
-- same-account case uses a lock barrier, and the cross-account case is a
-- bounded stress smoke. This file never runs against production.
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

insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000010'),
  ('a0000000-0000-4000-8000-000000000011'),
  ('a0000000-0000-4000-8000-000000000012')
on conflict (id) do nothing;

delete from public.daily_chart_confirmation_send_claims
where user_id in (
  'a0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000012'
);

select dblink_connect(
  'chart_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'chart_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('chart_guard_a', 'set role service_role');
select dblink_exec('chart_guard_b', 'set role service_role');
select dblink_exec('chart_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('chart_guard_b', 'set statement_timeout = ''5s''');

-- Hold the account lock in session A, then prove session B is genuinely
-- blocked before A records the winning claim and releases the barrier.
select dblink_exec('chart_guard_a', 'begin');
select dblink_exec(
  'chart_guard_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'a0000000-0000-4000-8000-000000000010',
        7312027
      )
    );
  end $block$;$$
);
select dblink_send_query(
  'chart_guard_b',
  $$select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000010',
    'a1000000-0000-4000-8000-000000000011'
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('chart_guard_b') = 1,
  'the second account claim must be in flight behind the advisory-lock barrier'
);

create temporary table chart_guard_results (test text, outcome text);
insert into chart_guard_results
select 'same_account', value->>'outcome'
from dblink(
  'chart_guard_a',
  $$select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000010',
    'a1000000-0000-4000-8000-000000000010'
  )$$
) as result(value jsonb);
select dblink_exec('chart_guard_a', 'commit');
insert into chart_guard_results
select 'same_account', value->>'outcome'
from dblink_get_result('chart_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select array_agg(outcome order by outcome)
   from chart_guard_results
   where test = 'same_account') = array['capped_60s', 'claimed'],
  'concurrent requests for one account must admit exactly one provider attempt'
);

select dblink_disconnect('chart_guard_a');
select dblink_disconnect('chart_guard_b');
select dblink_connect(
  'chart_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'chart_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('chart_guard_a', 'set role service_role');
select dblink_exec('chart_guard_b', 'set role service_role');
select dblink_exec('chart_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('chart_guard_b', 'set statement_timeout = ''5s''');

-- Cross-account stress smoke: seed two unrelated stale accounts so each
-- claimant can encounter the other during bounded global pruning. Both
-- sessions must finish inside the timeout; the source-order assertion in the
-- primary SQL suite proves the blocking lock precedes try-only pruning.
insert into public.daily_chart_confirmation_send_claims (
  user_id,
  claim_token,
  claimed_at
) values
  (
    'a0000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000012',
    clock_timestamp() - interval '25 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000012',
    'a1000000-0000-4000-8000-000000000013',
    clock_timestamp() - interval '25 hours'
  );

select dblink_send_query(
  'chart_guard_a',
  $$select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000014'
  )$$
);
select dblink_send_query(
  'chart_guard_b',
  $$select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000012',
    'a1000000-0000-4000-8000-000000000015'
  )$$
);

insert into chart_guard_results
select 'cross_account', value->>'outcome'
from dblink_get_result('chart_guard_a') as result(value jsonb);
insert into chart_guard_results
select 'cross_account', value->>'outcome'
from dblink_get_result('chart_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 2 and bool_and(outcome = 'claimed')
   from chart_guard_results
   where test = 'cross_account'),
  'cross-account claims must complete without a prune/claim deadlock'
);

select dblink_disconnect('chart_guard_a');
select dblink_disconnect('chart_guard_b');

delete from auth.users
where id in (
  'a0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000012'
);
