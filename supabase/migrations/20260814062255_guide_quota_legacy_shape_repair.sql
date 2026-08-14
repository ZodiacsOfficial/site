-- Guide quota legacy-shape reconciliation.
--
-- Migration 20260813102035 is immutable because production has already
-- recorded it. Early Ask Zodiacs installs used `day` and `count` in
-- assistant_quota; the canonical schema uses `quota_day` and
-- `request_count`. This additive repair performs metadata-only renames,
-- rebuilds both rollback RPCs, and reasserts the Guide RPC/grant boundary.
-- Replaying the file is safe and leaves an already-canonical table unchanged.

do $guide_quota_normalize$
declare
  quota_table regclass := pg_catalog.to_regclass('public.assistant_quota');
  has_legacy_day boolean;
  has_quota_day boolean;
  has_legacy_count boolean;
  has_request_count boolean;
  quota_day_type oid;
  request_count_type oid;
begin
  if quota_table is null then
    raise exception using
      errcode = '42P01',
      message = 'guide quota repair: public.assistant_quota is missing';
  end if;

  -- Serialize the short metadata repair with any in-flight legacy bump. A
  -- RENAME preserves rows, defaults, indexes, constraint OIDs, and policies.
  execute 'lock table public.assistant_quota in access exclusive mode';

  select
    pg_catalog.bool_or(attribute.attname = 'day'),
    pg_catalog.bool_or(attribute.attname = 'quota_day'),
    pg_catalog.bool_or(attribute.attname = 'count'),
    pg_catalog.bool_or(attribute.attname = 'request_count')
  into
    has_legacy_day,
    has_quota_day,
    has_legacy_count,
    has_request_count
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = quota_table
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if has_legacy_day and has_quota_day then
    raise exception using
      errcode = '55000',
      message = 'guide quota repair: both day and quota_day exist; refusing an ambiguous merge';
  elsif has_legacy_day then
    execute 'alter table public.assistant_quota rename column day to quota_day';
  elsif not has_quota_day then
    raise exception using
      errcode = '42703',
      message = 'guide quota repair: neither day nor quota_day exists';
  end if;

  if has_legacy_count and has_request_count then
    raise exception using
      errcode = '55000',
      message = 'guide quota repair: both count and request_count exist; refusing an ambiguous merge';
  elsif has_legacy_count then
    execute 'alter table public.assistant_quota rename column count to request_count';
  elsif not has_request_count then
    raise exception using
      errcode = '42703',
      message = 'guide quota repair: neither count nor request_count exists';
  end if;

  select attribute.atttypid
  into quota_day_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = quota_table
    and attribute.attname = 'quota_day'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.atttypid
  into request_count_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = quota_table
    and attribute.attname = 'request_count'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if quota_day_type <> 'date'::pg_catalog.regtype then
    raise exception using
      errcode = '42804',
      message = 'guide quota repair: quota_day must have type date';
  end if;

  if request_count_type <> 'integer'::pg_catalog.regtype then
    raise exception using
      errcode = '42804',
      message = 'guide quota repair: request_count must have type integer';
  end if;
end;
$guide_quota_normalize$;

alter table public.assistant_quota enable row level security;
alter table public.guide_quota_operation_receipts enable row level security;

revoke all on table public.assistant_quota
  from public, anon, authenticated, service_role;
revoke all on table public.guide_quota_operation_receipts
  from public, anon, authenticated, service_role;

-- Restore the v1 rollback RPC on the canonical columns.
create or replace function public.assistant_quota_bump(visitor_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  today date := (pg_catalog.now() at time zone 'utc')::date;
  new_count integer;
begin
  if assistant_quota_bump.visitor_hash is null
     or assistant_quota_bump.visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'assistant_quota_bump: malformed visitor hash';
  end if;

  delete from public.assistant_quota
  where quota_day < today - 1;

  insert into public.assistant_quota as quota (
    visitor_hash,
    quota_day,
    request_count
  )
  values (assistant_quota_bump.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = quota.request_count + 1
  returning quota.request_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.assistant_quota_bump(text)
  from public, anon, authenticated, service_role;
grant execute on function public.assistant_quota_bump(text)
  to service_role;

-- Restore the v2 rollback RPC on the canonical columns and response shape.
create or replace function public.assistant_quota_bump_v2(visitor_hash text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  today date := (pg_catalog.now() at time zone 'utc')::date;
  new_count integer;
  day_total bigint;
begin
  if assistant_quota_bump_v2.visitor_hash is null
     or assistant_quota_bump_v2.visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'assistant_quota_bump_v2: malformed visitor hash';
  end if;

  delete from public.assistant_quota
  where quota_day < today - 1;

  insert into public.assistant_quota as quota (
    visitor_hash,
    quota_day,
    request_count
  )
  values (assistant_quota_bump_v2.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = quota.request_count + 1
  returning quota.request_count into new_count;

  select coalesce(pg_catalog.sum(quota.request_count), 0)
  into day_total
  from public.assistant_quota as quota
  where quota.quota_day = today;

  return pg_catalog.json_build_object(
    'visitor', new_count,
    'global', day_total
  );
end;
$$;

revoke all on function public.assistant_quota_bump_v2(text)
  from public, anon, authenticated, service_role;
grant execute on function public.assistant_quota_bump_v2(text)
  to service_role;

-- Reassert the reviewed Guide signature and its atomic operation/day locks.
drop function if exists public.guide_quota_reserve_v1(text, integer);

create or replace function public.guide_quota_reserve_v1(
  visitor_hash text,
  operation_hash text,
  global_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  reservation_time timestamptz;
  today date;
  visitor_limit constant integer := 30;
  visitor_count integer;
  day_total bigint;
begin
  if guide_quota_reserve_v1.visitor_hash is null
     or guide_quota_reserve_v1.visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'guide_quota_reserve_v1: malformed visitor hash';
  end if;

  if guide_quota_reserve_v1.operation_hash is null
     or guide_quota_reserve_v1.operation_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'guide_quota_reserve_v1: malformed operation hash';
  end if;

  if guide_quota_reserve_v1.global_limit is null
     or guide_quota_reserve_v1.global_limit < 1
     or guide_quota_reserve_v1.global_limit > 10000 then
    raise exception using
      errcode = '22023',
      message = 'guide_quota_reserve_v1: global limit out of range';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    151462742,
    pg_catalog.hashtext(guide_quota_reserve_v1.operation_hash)
  );

  reservation_time := pg_catalog.clock_timestamp();

  delete from public.guide_quota_operation_receipts
  where reserved_at < reservation_time - interval '48 hours';

  if exists (
    select 1
    from public.guide_quota_operation_receipts as receipt
    where receipt.operation_hash = guide_quota_reserve_v1.operation_hash
  ) then
    return pg_catalog.jsonb_build_object(
      'status', 'operation_replay',
      'visitor', 0,
      'global', 0
    );
  end if;

  today := (reservation_time at time zone 'utc')::date;

  perform pg_catalog.pg_advisory_xact_lock(
    151462741,
    today - date '2000-01-01'
  );

  delete from public.assistant_quota
  where quota_day < today - 1;

  select coalesce(quota.request_count, 0)
  into visitor_count
  from (select 1) as seed
  left join public.assistant_quota as quota
    on quota.visitor_hash = guide_quota_reserve_v1.visitor_hash
   and quota.quota_day = today;

  select coalesce(pg_catalog.sum(quota.request_count), 0)
  into day_total
  from public.assistant_quota as quota
  where quota.quota_day = today;

  if visitor_count >= visitor_limit then
    return pg_catalog.jsonb_build_object(
      'status', 'visitor_limit',
      'visitor', visitor_count,
      'global', day_total
    );
  end if;

  if day_total >= guide_quota_reserve_v1.global_limit then
    return pg_catalog.jsonb_build_object(
      'status', 'global_limit',
      'visitor', visitor_count,
      'global', day_total
    );
  end if;

  insert into public.assistant_quota as quota (
    visitor_hash,
    quota_day,
    request_count
  )
  values (guide_quota_reserve_v1.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = quota.request_count + 1
  returning quota.request_count into visitor_count;

  insert into public.guide_quota_operation_receipts (
    operation_hash,
    visitor_hash,
    quota_day,
    reserved_at
  ) values (
    guide_quota_reserve_v1.operation_hash,
    guide_quota_reserve_v1.visitor_hash,
    today,
    reservation_time
  );

  return pg_catalog.jsonb_build_object(
    'status', 'reserved',
    'visitor', visitor_count,
    'global', day_total + 1
  );
end;
$$;

revoke all on function public.guide_quota_reserve_v1(text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.guide_quota_reserve_v1(text, text, integer)
  to service_role;
