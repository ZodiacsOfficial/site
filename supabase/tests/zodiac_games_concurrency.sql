-- Zodiac Games concurrency proof (disposable PostgreSQL 17 only).
--
-- Two serverless instances replaying one participant's join, and one
-- participant's same-week check-in, must score exactly once between them.
\set ON_ERROR_STOP 1

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

delete from public.zodiac_games_checkins;
delete from public.zodiac_games_participants;
delete from public.zodiac_games_sign_totals;
delete from public.zodiac_games_join_quota;

select dblink_connect(
  'games_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'games_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('games_a', 'set statement_timeout = ''5s''');
select dblink_exec('games_b', 'set statement_timeout = ''5s''');

-- Session A takes the participant advisory lock inside an open transaction,
-- then B's join for the same participant must wait for A's commit rather
-- than double-insert.
select dblink_exec('games_a', 'begin');
select dblink_exec(
  'games_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      151462745,
      pg_catalog.hashtext(repeat('a', 64))
    );
    perform public.zodiac_games_join_v1(
      repeat('a', 64), repeat('1', 64), 'scorpio', 'virgo-2026', 30
    );
  end $block$;$$
);

select dblink_send_query(
  'games_b',
  $$select public.zodiac_games_join_v1(
    repeat('a', 64), repeat('1', 64), 'scorpio', 'virgo-2026', 30
  )::text$$
);

-- B must be parked on the advisory lock, not completed.
select pg_sleep(0.5);
select pg_temp.assert_true(
  dblink_is_busy('games_b') = 1,
  'second join did not wait for the participant lock'
);

select dblink_exec('games_a', 'commit');

do $$
declare result jsonb;
begin
  select r::jsonb into result
  from dblink_get_result('games_b') as t(r text);
  perform pg_temp.assert_true(result->>'status' = 'already_joined',
    format('racing join returned %s', result->>'status'));
end $$;
-- Drain the trailing empty result set from the async call.
select * from dblink_get_result('games_b') as t(r text);

do $$
declare total record;
begin
  select points, joins into total
  from public.zodiac_games_sign_totals
  where season_id = 'virgo-2026' and sign = 'scorpio';
  perform pg_temp.assert_true(total.points = 100 and total.joins = 1,
    format('racing joins scored twice: %s points, %s joins', total.points, total.joins));
end $$;

-- The same race for one week's check-in: exactly one of two racing calls
-- may count.
select dblink_exec('games_a', 'begin');
select dblink_exec(
  'games_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      151462745,
      pg_catalog.hashtext(repeat('a', 64))
    );
    perform public.zodiac_games_checkin_v1(
      repeat('a', 64), 'virgo-2026', 2026, 35
    );
  end $block$;$$
);

select dblink_send_query(
  'games_b',
  $$select public.zodiac_games_checkin_v1(
    repeat('a', 64), 'virgo-2026', 2026, 35
  )::text$$
);

select pg_sleep(0.5);
select pg_temp.assert_true(
  dblink_is_busy('games_b') = 1,
  'second check-in did not wait for the participant lock'
);

select dblink_exec('games_a', 'commit');

do $$
declare result jsonb;
begin
  select r::jsonb into result
  from dblink_get_result('games_b') as t(r text);
  perform pg_temp.assert_true(result->>'status' = 'already_counted',
    format('racing check-in returned %s', result->>'status'));
end $$;
select * from dblink_get_result('games_b') as t(r text);

do $$
declare total record;
begin
  select points, checkins into total
  from public.zodiac_games_sign_totals
  where season_id = 'virgo-2026' and sign = 'scorpio';
  perform pg_temp.assert_true(total.points = 125 and total.checkins = 1,
    format('racing check-ins scored twice: %s points, %s check-ins',
      total.points, total.checkins));
end $$;

select dblink_disconnect('games_a');
select dblink_disconnect('games_b');

delete from public.zodiac_games_checkins;
delete from public.zodiac_games_participants;
delete from public.zodiac_games_sign_totals;
delete from public.zodiac_games_join_quota;
