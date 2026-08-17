-- Zodiac Games contract tests (disposable PostgreSQL 17 only).
\set ON_ERROR_STOP 1

do $$ begin
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role login;
  end if;
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

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

-- 1. RLS is on with zero policies on every Games table: no browser path.
do $$
declare tbl text; enabled boolean; policy_count integer;
begin
  foreach tbl in array array[
    'zodiac_games_participants', 'zodiac_games_checkins',
    'zodiac_games_sign_totals', 'zodiac_games_join_quota'
  ] loop
    select relrowsecurity into enabled
      from pg_class where oid = format('public.%I', tbl)::regclass;
    if not enabled then raise exception 'RLS disabled on %', tbl; end if;
    select count(*) into policy_count from pg_policies
      where schemaname = 'public' and tablename = tbl;
    if policy_count <> 0 then
      raise exception '% has unexpected policies: %', tbl, policy_count;
    end if;
  end loop;
end $$;

-- 2. No role holds a table privilege; only service_role can execute the RPCs.
do $$
declare tbl text; role_name text;
begin
  foreach tbl in array array[
    'zodiac_games_participants', 'zodiac_games_checkins',
    'zodiac_games_sign_totals', 'zodiac_games_join_quota'
  ] loop
    foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
      if has_table_privilege(role_name, format('public.%I', tbl), 'SELECT')
        or has_table_privilege(role_name, format('public.%I', tbl), 'INSERT')
        or has_table_privilege(role_name, format('public.%I', tbl), 'UPDATE')
        or has_table_privilege(role_name, format('public.%I', tbl), 'DELETE') then
        raise exception '% holds a table privilege on %', role_name, tbl;
      end if;
    end loop;
  end loop;

  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if has_table_privilege(role_name, 'private.zodiac_games_secrets', 'SELECT')
      or has_table_privilege(role_name, 'private.zodiac_games_secrets', 'INSERT')
      or has_table_privilege(role_name, 'private.zodiac_games_secrets', 'UPDATE')
      or has_table_privilege(role_name, 'private.zodiac_games_secrets', 'DELETE') then
      raise exception '% can read or change the Games secret', role_name;
    end if;
  end loop;

  if has_function_privilege('anon',
      'public.zodiac_games_join_v1(text, text, text, text, integer)', 'EXECUTE')
    or has_function_privilege('anon',
      'public.zodiac_games_checkin_v1(text, text, integer, integer, text, text)', 'EXECUTE')
    or has_function_privilege('anon',
      'public.zodiac_games_standings_v1(text, integer, integer, text)', 'EXECUTE') then
    raise exception 'anon can execute a Games RPC';
  end if;
  if not has_function_privilege('service_role',
      'public.zodiac_games_join_v1(text, text, text, text, integer)', 'EXECUTE')
    or not has_function_privilege('service_role',
      'public.zodiac_games_checkin_v1(text, text, integer, integer, text, text)', 'EXECUTE')
    or not has_function_privilege('service_role',
      'public.zodiac_games_standings_v1(text, integer, integer, text)', 'EXECUTE') then
    raise exception 'service_role cannot execute a Games RPC';
  end if;
end $$;

-- 3. Every RPC pins an empty search_path.
do $$
declare fn regprocedure; cfg text[];
begin
  foreach fn in array array[
    'public.zodiac_games_join_v1(text, text, text, text, integer)'::regprocedure,
    'public.zodiac_games_checkin_v1(text, text, integer, integer, text, text)'::regprocedure,
    'public.zodiac_games_standings_v1(text, integer, integer, text)'::regprocedure
  ] loop
    select proconfig into cfg from pg_proc where oid = fn;
    if cfg is null or not ('search_path=""' = any(cfg)) then
      raise exception 'search_path not pinned on %: %', fn, cfg;
    end if;
  end loop;
end $$;

-- 4. Join: first join scores exactly once; a replay is structural.
do $$
declare result jsonb; total record; stored_bucket text;
begin
  delete from public.zodiac_games_checkins;
  delete from public.zodiac_games_participants;
  delete from public.zodiac_games_sign_totals;
  delete from public.zodiac_games_join_quota;

  select public.zodiac_games_join_v1(
    repeat('a', 64), repeat('1', 64), 'scorpio', 'virgo-2026', 30
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'joined',
    format('first join returned %s', result->>'status'));
  perform pg_temp.assert_true((result->>'points_awarded')::integer = 1,
    'join awarded unexpected points');

  select public.zodiac_games_join_v1(
    repeat('a', 64), repeat('1', 64), 'leo', 'virgo-2026', 30
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'already_joined',
    format('replayed join returned %s', result->>'status'));
  perform pg_temp.assert_true(result->>'sign' = 'scorpio',
    'replayed join lost the original sign');

  select points, joins, checkins into total
  from public.zodiac_games_sign_totals
  where season_id = 'virgo-2026' and sign = 'scorpio';
  perform pg_temp.assert_true(total.points = 1 and total.joins = 1,
    format('join totals wrong: %s points, %s joins', total.points, total.joins));
  select q.bucket_hash into stored_bucket
  from public.zodiac_games_join_quota as q
  limit 1;
  perform pg_temp.assert_true(stored_bucket <> repeat('1', 64),
    'daily connection fingerprint was stored without DB protection');
  perform pg_temp.assert_true(
    (select count(*) from private.zodiac_games_secrets
      where secret_name = 'join_bucket_v1'
        and octet_length(secret_value) = 32) = 1,
    'database-private join key is missing or malformed');
  perform pg_temp.assert_true(
    not exists (select 1 from public.zodiac_games_sign_totals where sign = 'leo'),
    'replayed join created a second sign total');
end $$;

-- 5. Malformed inputs are rejected outright.
do $$
declare probe text;
begin
  foreach probe in array array[
    'bad-hash', 'not-a-sign', 'virgo-19', 'virgo2026'
  ] loop
    begin
      case probe
        when 'bad-hash' then
          perform public.zodiac_games_join_v1(probe, repeat('1', 64), 'leo', 'virgo-2026', 30);
        when 'not-a-sign' then
          perform public.zodiac_games_join_v1(repeat('b', 64), repeat('1', 64), probe, 'virgo-2026', 30);
        else
          perform public.zodiac_games_join_v1(repeat('b', 64), repeat('1', 64), 'leo', probe, 30);
      end case;
      raise exception 'malformed input accepted: %', probe;
    exception when sqlstate '22023' then
      null; -- rejected as intended
    end;
  end loop;

  begin
    perform public.zodiac_games_join_v1(repeat('b', 64), repeat('1', 64), 'leo', 'virgo-2026', 0);
    raise exception 'zero bucket limit accepted';
  exception when sqlstate '22023' then
    null;
  end;
end $$;

-- 6. The join rate limit counts distinct participants per bucket per UTC day,
--    and stale quota rows self-expire.
do $$
declare result jsonb;
begin
  insert into public.zodiac_games_join_quota (bucket_hash, quota_day, join_count)
  values (repeat('9', 64), (now() at time zone 'utc')::date - 3, 50);

  select public.zodiac_games_join_v1(
    repeat('c', 64), repeat('2', 64), 'aries', 'virgo-2026', 2
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'joined', 'bucket join 1 failed');

  select public.zodiac_games_join_v1(
    repeat('d', 64), repeat('2', 64), 'aries', 'virgo-2026', 2
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'joined', 'bucket join 2 failed');

  select public.zodiac_games_join_v1(
    repeat('e', 64), repeat('2', 64), 'aries', 'virgo-2026', 2
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'rate_limited',
    format('third bucket join returned %s', result->>'status'));
  perform pg_temp.assert_true(
    not exists (select 1 from public.zodiac_games_participants
      where participant_hash = repeat('e', 64)),
    'rate-limited join still created a participant');

  perform pg_temp.assert_true(
    not exists (select 1 from public.zodiac_games_join_quota
      where quota_day < (now() at time zone 'utc')::date - 1),
    'stale join-quota rows survived');
end $$;

-- 7. Check-in: unknown participants score nothing; one week counts once.
do $$
declare result jsonb; total record;
begin
  select public.zodiac_games_checkin_v1(
    repeat('f', 64), 'virgo-2026', 2026, 35,
    'trust-2026-w35', 'actions'
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'not_joined',
    format('unknown check-in returned %s', result->>'status'));

  select public.zodiac_games_checkin_v1(
    repeat('a', 64), 'virgo-2026', 2026, 35,
    'trust-2026-w35', 'actions'
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'checked_in',
    format('first check-in returned %s', result->>'status'));
  perform pg_temp.assert_true(result->>'sign' = 'scorpio',
    'check-in ignored the joined sign');
  perform pg_temp.assert_true((result->>'points_awarded')::integer = 1,
    'check-in awarded unexpected points');
  perform pg_temp.assert_true(result->>'answer_key' = 'actions',
    'check-in lost the bounded answer');

  select public.zodiac_games_checkin_v1(
    repeat('a', 64), 'virgo-2026', 2026, 35,
    'trust-2026-w35', 'words'
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'already_counted',
    format('replayed check-in returned %s', result->>'status'));
  perform pg_temp.assert_true(result->>'answer_key' = 'actions',
    'a replay changed the first weekly answer');

  -- A zodiac season can turn over inside one ISO week. The fresh seasonal
  -- board must still accept that week's answer once.
  select public.zodiac_games_checkin_v1(
    repeat('a', 64), 'libra-2026', 2026, 35,
    'trust-2026-w35', 'time'
  ) into result;
  perform pg_temp.assert_true(
    result->>'status' = 'checked_in'
      and result->>'season_id' = 'libra-2026'
      and result->>'answer_key' = 'time',
    'mid-week season rollover did not count on the fresh board');

  select public.zodiac_games_checkin_v1(
    repeat('a', 64), 'virgo-2026', 2026, 36,
    'pressure-2026-w36', 'plan'
  ) into result;
  perform pg_temp.assert_true(result->>'status' = 'checked_in',
    'next-week check-in was refused');

  begin
    perform public.zodiac_games_checkin_v1(
      repeat('a', 64), 'virgo-2026', 2026, 37,
      'trust-2026-w37', 'write in'
    );
    raise exception 'free-text answer key was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  select points, joins, checkins into total
  from public.zodiac_games_sign_totals
  where season_id = 'virgo-2026' and sign = 'scorpio';
  perform pg_temp.assert_true(
    total.points = 3 and total.joins = 1 and total.checkins = 2,
    format('check-in totals wrong: %s points, %s joins, %s check-ins',
      total.points, total.joins, total.checkins));
  perform pg_temp.assert_true(
    (select points = 1 and checkins = 1
      from public.zodiac_games_sign_totals
      where season_id = 'libra-2026' and sign = 'scorpio'),
    'mid-week season rollover scored the wrong total');
end $$;

-- 8. Standings return one ordered season, and only that season.
do $$
declare result jsonb;
begin
  select public.zodiac_games_standings_v1(
    'virgo-2026', 2026, 35, 'trust-2026-w35'
  ) into result;
  perform pg_temp.assert_true(result->>'season_id' = 'virgo-2026',
    'standings season mismatch');
  perform pg_temp.assert_true(
    jsonb_array_length(result->'standings') = 2,
    format('expected 2 standings rows, got %s',
      jsonb_array_length(result->'standings')));
  perform pg_temp.assert_true(
    result->'standings'->0->>'sign' = 'scorpio'
      and (result->'standings'->0->>'points')::bigint = 3
      and result->'standings'->1->>'sign' = 'aries'
      and (result->'standings'->1->>'points')::bigint = 2,
    'standings are not ordered by points');
  perform pg_temp.assert_true(
    jsonb_array_length(result->'responses') = 1
      and result->'responses'->0->>'sign' = 'scorpio'
      and result->'responses'->0->>'answer_key' = 'actions'
      and (result->'responses'->0->>'count')::integer = 1,
    'weekly answer totals are wrong');

  select public.zodiac_games_standings_v1(
    'capricorn-2026', 2026, 35, 'trust-2026-w35'
  ) into result;
  perform pg_temp.assert_true(
    jsonb_array_length(result->'standings') = 0,
    'empty season returned rows');

  begin
    perform public.zodiac_games_standings_v1(
      'nonsense', 2026, 35, 'trust-2026-w35'
    );
    raise exception 'malformed standings season accepted';
  exception when sqlstate '22023' then
    null;
  end;
end $$;

-- Leave no fixture rows behind for later test files.
delete from public.zodiac_games_checkins;
delete from public.zodiac_games_participants;
delete from public.zodiac_games_sign_totals;
delete from public.zodiac_games_join_quota;
