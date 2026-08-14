-- Guide atomic-quota contract tests (disposable PostgreSQL 17 only).
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

select pg_temp.assert_true(
  (
    select pg_catalog.array_agg(attribute.attname order by attribute.attnum)
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'public.assistant_quota'::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) = array['visitor_hash', 'quota_day', 'request_count']::name[],
  'assistant quota storage must expose only the canonical column shape'
);

-- Guide quota persistence stays RPC-only. service_role may reserve but has no
-- direct row authority; browser roles have neither path.
select pg_temp.assert_true(
  not has_table_privilege(
    'service_role',
    'public.assistant_quota',
    'select,insert,update,delete'
  )
  and not has_table_privilege(
    'anon',
    'public.assistant_quota',
    'select,insert,update,delete'
  )
  and not has_table_privilege(
    'authenticated',
    'public.assistant_quota',
    'select,insert,update,delete'
  )
  and not has_table_privilege(
    'service_role',
    'public.guide_quota_operation_receipts',
    'select,insert,update,delete'
  )
  and not has_table_privilege(
    'anon',
    'public.guide_quota_operation_receipts',
    'select,insert,update,delete'
  )
  and not has_table_privilege(
    'authenticated',
    'public.guide_quota_operation_receipts',
    'select,insert,update,delete'
  ),
  'quota and operation-receipt rows must not be directly reachable by API roles'
);

select pg_temp.assert_true(
  (select relrowsecurity from pg_catalog.pg_class
   where oid = 'public.guide_quota_operation_receipts'::regclass)
  and (
    select pg_catalog.array_agg(attname order by attnum)
    from pg_catalog.pg_attribute
    where attrelid = 'public.guide_quota_operation_receipts'::regclass
      and attnum > 0
      and not attisdropped
  ) = array['operation_hash', 'visitor_hash', 'quota_day', 'reserved_at']::name[]
  and pg_catalog.to_regprocedure(
    'public.guide_quota_reserve_v1(text,integer)'
  ) is null,
  'receipt storage must be RLS-protected, opaque, bounded, and use only the fenced RPC'
);

select pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.guide_quota_reserve_v1(text,text,integer)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.guide_quota_reserve_v1(text,text,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.guide_quota_reserve_v1(text,text,integer)',
    'execute'
  )
  and (
    select prosecdef
       and 'search_path=""' = any(coalesce(proconfig, array[]::text[]))
    from pg_catalog.pg_proc
    where oid = 'public.guide_quota_reserve_v1(text,text,integer)'::regprocedure
  ),
  'reservation RPC must be service-only SECURITY DEFINER with empty search_path'
);

-- A successful reservation advances totals once. Its exact replay returns a
-- durable replay result without a second quota charge.
set role service_role;

do $$
declare
  principal text := repeat('1', 64);
  first_operation text := repeat('a', 64);
  second_operation text := repeat('b', 64);
  first_result jsonb;
  replay_result jsonb;
  second_result jsonb;
begin
  first_result := public.guide_quota_reserve_v1(principal, first_operation, 10000);
  replay_result := public.guide_quota_reserve_v1(principal, first_operation, 10000);
  second_result := public.guide_quota_reserve_v1(principal, second_operation, 10000);

  if first_result->>'status' <> 'reserved'
     or (first_result->>'visitor')::integer <> 1 then
    raise exception 'unexpected first reservation: %', first_result;
  end if;

  if replay_result->>'status' <> 'operation_replay'
     or (replay_result->>'visitor')::integer <> 0
     or (replay_result->>'global')::integer <> 0 then
    raise exception 'unexpected replay result: %', replay_result;
  end if;

  if second_result->>'status' <> 'reserved'
     or (second_result->>'visitor')::integer <> 2
     or (second_result->>'global')::bigint
        <> (first_result->>'global')::bigint + 1 then
    raise exception 'unexpected second reservation: %', second_result;
  end if;

end;
$$;

reset role;

select pg_temp.assert_true(
  (select count(*) from public.guide_quota_operation_receipts
   where operation_hash in (repeat('a', 64), repeat('b', 64))) = 2,
  'successful operations must produce exactly two opaque receipts'
);

-- Malformed hashes and unbounded/empty service ceilings fail before writes.
do $$
declare
  before_count bigint;
  after_count bigint;
  candidate_limit integer;
begin
  select coalesce(sum(request_count), 0)
  into before_count
  from public.assistant_quota;

  begin
    perform public.guide_quota_reserve_v1('not-a-hash', repeat('c', 64), 3000);
    raise exception 'malformed hash accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.guide_quota_reserve_v1(repeat('2', 64), 'not-a-hash', 3000);
    raise exception 'malformed operation hash accepted';
  exception when sqlstate '22023' then
    null;
  end;

  foreach candidate_limit in array array[0, 10001] loop
    begin
      perform public.guide_quota_reserve_v1(
        repeat('2', 64),
        repeat('c', 64),
        candidate_limit
      );
      raise exception 'invalid global limit accepted: %', candidate_limit;
    exception when sqlstate '22023' then
      null;
    end;
  end loop;

  begin
    perform public.guide_quota_reserve_v1(repeat('2', 64), repeat('d', 64), null);
    raise exception 'null global limit accepted';
  exception when sqlstate '22023' then
    null;
  end;

  select coalesce(sum(request_count), 0)
  into after_count
  from public.assistant_quota;

  if after_count <> before_count then
    raise exception 'invalid requests changed quota: % -> %', before_count, after_count;
  end if;
end;
$$;

-- Opaque replay receipts expire after the bounded 48-hour window and may then
-- reserve again. Cleanup never stores a protocol ID or message preimage.
do $$
declare
  expired_operation text := repeat('9', 64);
  result jsonb;
begin
  insert into public.guide_quota_operation_receipts (
    operation_hash,
    visitor_hash,
    quota_day,
    reserved_at
  ) values (
    expired_operation,
    repeat('8', 64),
    (now() at time zone 'utc')::date - 3,
    clock_timestamp() - interval '49 hours'
  );

  result := public.guide_quota_reserve_v1(
    repeat('8', 64),
    expired_operation,
    10000
  );

  if result->>'status' <> 'reserved'
     or (select count(*) from public.guide_quota_operation_receipts
         where operation_hash = expired_operation) <> 1
     or (select reserved_at < clock_timestamp() - interval '1 minute'
         from public.guide_quota_operation_receipts
         where operation_hash = expired_operation) then
    raise exception 'expired operation receipt was not replaced cleanly: %', result;
  end if;
end;
$$;

-- The receipt key is global rather than day-scoped. A retry after UTC midnight
-- remains a replay throughout the 48-hour retention window.
do $$
declare
  cross_day_operation text := repeat('7', 64);
  before_total bigint;
  after_total bigint;
  result jsonb;
begin
  insert into public.guide_quota_operation_receipts (
    operation_hash,
    visitor_hash,
    quota_day,
    reserved_at
  ) values (
    cross_day_operation,
    repeat('6', 64),
    (now() at time zone 'utc')::date - 1,
    clock_timestamp() - interval '1 hour'
  );

  select coalesce(sum(request_count), 0)
  into before_total
  from public.assistant_quota;

  result := public.guide_quota_reserve_v1(
    repeat('6', 64),
    cross_day_operation,
    10000
  );

  select coalesce(sum(request_count), 0)
  into after_total
  from public.assistant_quota;

  if result->>'status' <> 'operation_replay'
     or before_total <> after_total then
    raise exception 'cross-day replay was charged: %', result;
  end if;
end;
$$;

-- Neither cap is charged after denial.
do $$
declare
  today date := (now() at time zone 'utc')::date;
  capped_hash text := repeat('3', 64);
  global_hash text := repeat('4', 64);
  result jsonb;
  before_total bigint;
  after_total bigint;
begin
  insert into public.assistant_quota (visitor_hash, quota_day, request_count)
  values (capped_hash, today, 30)
  on conflict (visitor_hash, quota_day)
  do update set request_count = excluded.request_count;

  select coalesce(sum(request_count), 0)
  into before_total
  from public.assistant_quota
  where quota_day = today;

  result := public.guide_quota_reserve_v1(capped_hash, repeat('e', 64), 10000);

  if result->>'status' <> 'visitor_limit'
     or (result->>'visitor')::integer <> 30 then
    raise exception 'visitor cap did not deny cleanly: %', result;
  end if;

  result := public.guide_quota_reserve_v1(
    global_hash,
    repeat('f', 64),
    before_total::integer
  );

  if result->>'status' <> 'global_limit'
     or (result->>'visitor')::integer <> 0
     or (result->>'global')::bigint <> before_total then
    raise exception 'global cap did not deny cleanly: %', result;
  end if;

  select coalesce(sum(request_count), 0)
  into after_total
  from public.assistant_quota
  where quota_day = today;

  if after_total <> before_total
     or exists (
       select 1 from public.assistant_quota
       where assistant_quota.visitor_hash = global_hash
         and quota_day = today
     ) then
    raise exception 'denied reservation was charged';
  end if;
end;
$$;

select 'Guide atomic quota contract OK' as result;
