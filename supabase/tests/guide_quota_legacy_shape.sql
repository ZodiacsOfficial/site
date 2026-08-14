-- Guide legacy assistant_quota upgrade proof (disposable PostgreSQL 17 only).
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
    where attribute.attrelid = 'public.assistant_quota'::pg_catalog.regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) = array['visitor_hash', 'quota_day', 'request_count']::name[],
  'legacy day/count columns must normalize to the canonical shape'
);

select pg_temp.assert_true(
  (select request_count = 7
   from public.assistant_quota
   where visitor_hash = repeat('a', 64)
     and quota_day = (pg_catalog.now() at time zone 'utc')::date)
  and
  (select request_count = 9
   from public.assistant_quota
   where visitor_hash = repeat('b', 64)
     and quota_day = (pg_catalog.now() at time zone 'utc')::date - 1),
  'legacy quota rows and values must survive the metadata-only repair'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.guide_quota_legacy_constraint_audit as expected
    left join pg_catalog.pg_constraint as actual
      on actual.oid = expected.constraint_oid
     and actual.conname = expected.constraint_name
     and actual.conrelid = 'public.assistant_quota'::pg_catalog.regclass
    where actual.oid is null
  )
  and (
    select pg_catalog.pg_get_constraintdef(constraint_record.oid)
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.oid = (
      select expected.constraint_oid
      from public.guide_quota_legacy_constraint_audit as expected
      where expected.constraint_name = 'assistant_quota_pkey'
    )
  ) = 'PRIMARY KEY (visitor_hash, quota_day)'
  and (
    select pg_catalog.pg_get_constraintdef(constraint_record.oid)
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.oid = (
      select expected.constraint_oid
      from public.guide_quota_legacy_constraint_audit as expected
      where expected.constraint_name = 'assistant_quota_count_sane'
    )
  ) = 'CHECK (((request_count >= 0) AND (request_count <= 10000)))',
  'column renames must preserve constraint OIDs, names, and canonical definitions'
);

select pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.assistant_quota_bump(text)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.assistant_quota_bump_v2(text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.assistant_quota_bump(text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.assistant_quota_bump_v2(text)',
    'execute'
  )
  and (
    select 'search_path=""' = any(coalesce(proc.proconfig, array[]::text[]))
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.assistant_quota_bump(text)'::pg_catalog.regprocedure
  )
  and (
    select 'search_path=""' = any(coalesce(proc.proconfig, array[]::text[]))
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.assistant_quota_bump_v2(text)'::pg_catalog.regprocedure
  ),
  'legacy rollback RPCs must remain service-only with fail-closed search paths'
);

set role service_role;

do $$
declare
  v1_count integer;
  v2_result json;
begin
  v1_count := public.assistant_quota_bump(repeat('a', 64));
  if v1_count <> 8 then
    raise exception 'legacy v1 did not continue the preserved count: %', v1_count;
  end if;

  v2_result := public.assistant_quota_bump_v2(repeat('c', 64));
  if (v2_result->>'visitor')::integer <> 1
     or (v2_result->>'global')::bigint <> 9 then
    raise exception 'legacy v2 returned an unexpected result: %', v2_result;
  end if;
end;
$$;

reset role;

-- Leave the common contract and concurrency suites a deterministic empty day.
truncate table public.assistant_quota;
truncate table public.guide_quota_operation_receipts;

select 'Guide legacy quota shape upgrade OK' as result;
