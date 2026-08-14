-- Guide -- atomic daily quota reservation.
--
-- This is an additive successor to the Ask Zodiacs assistant_quota RPCs. The
-- earlier v2 RPC increments a principal row and then reads an unlocked SUM,
-- which lets distributed callers race past the service-wide ceiling. Guide
-- uses this new RPC exclusively: every logical operation first takes a global
-- operation lock, then every reservation for a UTC day takes the same day
-- lock, checks both ceilings, and increments only when admitted. The operation
-- receipt is an opaque server HMAC, never a conversation ID or content digest.
--
-- The existing v1/v2 RPCs remain untouched for a code rollback. Replaying this
-- migration is safe: it only tightens existing table grants and replaces this
-- versioned function with the same definition.

alter table public.assistant_quota enable row level security;

create table if not exists public.guide_quota_operation_receipts (
  operation_hash text primary key,
  visitor_hash text not null,
  quota_day date not null,
  reserved_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint guide_quota_operation_hash_format
    check (operation_hash ~ '^[0-9a-f]{64}$'),
  constraint guide_quota_operation_visitor_hash_format
    check (visitor_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists guide_quota_operation_receipts_reserved_at_idx
  on public.guide_quota_operation_receipts (reserved_at);

alter table public.guide_quota_operation_receipts enable row level security;

-- All quota persistence remains RPC-only, including for service_role. The
-- SECURITY DEFINER function below is its sole Guide write authority.
revoke all on table public.assistant_quota
  from public, anon, authenticated, service_role;
revoke all on table public.guide_quota_operation_receipts
  from public, anon, authenticated, service_role;

-- Remove the pre-review draft signature if it exists. Leaving it executable
-- would permit callers to reserve without the cross-instance replay fence.
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

  -- The server may lower this operational ceiling, but cannot pass an
  -- unbounded value that silently disables spend protection.
  if guide_quota_reserve_v1.global_limit is null
     or guide_quota_reserve_v1.global_limit < 1
     or guide_quota_reserve_v1.global_limit > 10000 then
    raise exception using
      errcode = '22023',
      message = 'guide_quota_reserve_v1: global limit out of range';
  end if;

  -- Every caller takes locks in this order: operation, then UTC day. The
  -- operation lock is independent of a day boundary, so two instances racing
  -- across midnight still serialize before either can start model work. A
  -- 32-bit advisory-hash collision only serializes unrelated operations; the
  -- exact 256-bit receipt key still decides replay identity.
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

  -- The first key is a Guide-specific namespace; the second is the UTC-day
  -- offset. Transaction locks participate in rollback and release
  -- automatically, unlike session-scoped advisory locks.
  perform pg_catalog.pg_advisory_xact_lock(
    151462741,
    today - date '2000-01-01'
  );

  delete from public.assistant_quota
  where quota_day < today - 1;

  select coalesce(q.request_count, 0)
  into visitor_count
  from (select 1) as seed
  left join public.assistant_quota as q
    on q.visitor_hash = guide_quota_reserve_v1.visitor_hash
   and q.quota_day = today;

  select coalesce(pg_catalog.sum(q.request_count), 0)
  into day_total
  from public.assistant_quota as q
  where q.quota_day = today;

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

  insert into public.assistant_quota as q (
    visitor_hash,
    quota_day,
    request_count
  )
  values (guide_quota_reserve_v1.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = q.request_count + 1
  returning q.request_count into visitor_count;

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
