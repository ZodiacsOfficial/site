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

insert into auth.users (id) values
  ('81000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

set role authenticated;
set request.jwt.claim.sub = '81000000-0000-4000-8000-000000000001';
set request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false}';
select public.set_living_chart_sync_consent(
  'grant',
  '82000000-0000-4000-8000-000000000001',
  0,
  'living-chart-sync-2026-08-18.v1'
);
reset role;

select dblink_connect(
  'living_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'living_b',
  format('dbname=%L user=%L', current_database(), current_user)
);

select dblink_exec(
  'living_a',
  $$set request.jwt.claim.sub = '81000000-0000-4000-8000-000000000001'$$
);
select dblink_exec(
  'living_a',
  $$set request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false}'$$
);
select dblink_exec('living_a', 'set role authenticated');
select dblink_exec('living_a', 'set statement_timeout = ''5s''');

select dblink_exec(
  'living_b',
  $$set request.jwt.claim.sub = '81000000-0000-4000-8000-000000000001'$$
);
select dblink_exec(
  'living_b',
  $$set request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false}'$$
);
select dblink_exec('living_b', 'set role authenticated');
select dblink_exec('living_b', 'set statement_timeout = ''5s''');

-- Two devices create the same moment from base zero. The first transaction
-- holds the user advisory lock; the second must wait and then conflict.
select dblink_exec('living_a', 'begin');
select dblink_exec(
  'living_a',
  $sql$
  do $block$
  begin
    perform public.put_living_chart_moment(
      '83000000-0000-4000-8000-000000000001',
      0,
      1,
      '82000000-0000-4000-8000-000000000002',
      '{
        "schema":"zodiacs.living-chart.cloud-moment.v1",
        "primaryChartId":"84000000-0000-4000-8000-000000000001",
        "occurredAt":"2026-08-18T09:00:00.000Z",
        "timePrecision":"exact",
        "category":"work",
        "note":"First writer.",
        "forecast":{
          "schema":"zodiacs.living-chart.today-forecast.v1",
          "editionDate":"2026-08-18",
          "chartId":"84000000-0000-4000-8000-000000000001",
          "source":"personalized",
          "generatorVersion":"today-1.0.0",
          "capturedAt":"2026-08-18T08:00:00.000Z",
          "lines":[{"id":"line:1","text":"First line.","receipt":"Mars receipt."}]
        },
        "reflectionQuestionId":"reflection:notice"
      }'::jsonb
    );
  end
  $block$;
  $sql$
);

select dblink_send_query(
  'living_b',
  $sql$
  select public.put_living_chart_moment(
    '83000000-0000-4000-8000-000000000001',
    0,
    1,
    '82000000-0000-4000-8000-000000000003',
    '{
      "schema":"zodiacs.living-chart.cloud-moment.v1",
      "primaryChartId":"84000000-0000-4000-8000-000000000001",
      "occurredAt":"2026-08-18T09:00:00.000Z",
      "timePrecision":"exact",
      "category":"work",
      "note":"Second writer.",
      "forecast":{
        "schema":"zodiacs.living-chart.today-forecast.v1",
        "editionDate":"2026-08-18",
        "chartId":"84000000-0000-4000-8000-000000000001",
        "source":"personalized",
        "generatorVersion":"today-1.0.0",
        "capturedAt":"2026-08-18T08:00:00.000Z",
        "lines":[{"id":"line:1","text":"Second line.","receipt":"Mars receipt."}]
      },
      "reflectionQuestionId":"reflection:notice"
    }'::jsonb
  )
  $sql$
);

select pg_sleep(0.5);
select pg_temp.assert_true(
  dblink_is_busy('living_b') = 1,
  'same-base writer must wait on the account-scoped advisory lock'
);
select dblink_exec('living_a', 'commit');

do $$
declare
  result jsonb;
begin
  select value into result
  from dblink_get_result('living_b') as response(value jsonb);
  perform pg_temp.assert_true(
    result @> '{"outcome":"conflict","current_revision":1,"deleted":false}'::jsonb,
    format('racing same-base write returned %s', result)
  );
end;
$$;
select * from dblink_get_result('living_b') as drained(value jsonb);

select pg_temp.assert_true(
  (select count(*) = 1
   from public.living_chart_moments
   where user_id = '81000000-0000-4000-8000-000000000001'
     and revision = 1),
  'racing creates must commit exactly one revision-one moment'
);

-- Withdrawal racing a stale background write wins. The stale writer waits,
-- observes the advanced epoch, and cannot restore the erased payload.
select dblink_exec('living_a', 'begin');
select dblink_exec(
  'living_a',
  $$do $block$ begin
    perform public.set_living_chart_sync_consent(
      'withdraw',
      '82000000-0000-4000-8000-000000000004',
      1,
      null
    );
  end $block$;$$
);

select dblink_send_query(
  'living_b',
  $sql$
  select public.put_living_chart_moment(
    '83000000-0000-4000-8000-000000000001',
    1,
    1,
    '82000000-0000-4000-8000-000000000005',
    '{
      "schema":"zodiacs.living-chart.cloud-moment.v1",
      "primaryChartId":"84000000-0000-4000-8000-000000000001",
      "occurredAt":"2026-08-18T09:00:00.000Z",
      "timePrecision":"exact",
      "category":"work",
      "note":"Stale background writer.",
      "forecast":{
        "schema":"zodiacs.living-chart.today-forecast.v1",
        "editionDate":"2026-08-18",
        "chartId":"84000000-0000-4000-8000-000000000001",
        "source":"personalized",
        "generatorVersion":"today-1.0.0",
        "capturedAt":"2026-08-18T08:00:00.000Z",
        "lines":[{"id":"line:1","text":"Stale line.","receipt":"Mars receipt."}]
      },
      "reflectionQuestionId":"reflection:notice"
    }'::jsonb
  )
  $sql$
);

select pg_sleep(0.5);
select pg_temp.assert_true(
  dblink_is_busy('living_b') = 1,
  'stale writer must wait behind withdrawal'
);
select dblink_exec('living_a', 'commit');

do $$
declare
  result jsonb;
begin
  select value into result
  from dblink_get_result('living_b') as response(value jsonb);
  perform pg_temp.assert_true(
    result @> '{"outcome":"consent_stale","state":"withdrawn","current_consent_epoch":2}'::jsonb,
    format('writer racing withdrawal returned %s', result)
  );
end;
$$;
select * from dblink_get_result('living_b') as drained(value jsonb);

select pg_temp.assert_true(
  not exists (
    select 1 from public.living_chart_moments
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'withdrawal race must leave no Living Chart payload rows'
);

select dblink_disconnect('living_a');
select dblink_disconnect('living_b');
delete from auth.users where id = '81000000-0000-4000-8000-000000000001';

select 'Living Chart sync concurrency tests passed.' as result;
