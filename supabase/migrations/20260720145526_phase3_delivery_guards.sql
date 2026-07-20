-- Phase 3 delivery-side safety rails. These ledgers are deliberately
-- independent of the mutable preference/subscription rows whose actions they
-- rate-limit. All access is server-side through SECURITY INVOKER RPCs.

create table public.daily_chart_confirmation_send_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_token uuid not null,
  claimed_at timestamptz not null default clock_timestamp(),
  primary key (user_id, claim_token)
);

-- Equality by account followed by an exact rolling-time range is the hot
-- path. A separate time-first index keeps bounded global cleanup index-backed.
create index daily_chart_confirmation_claims_user_time_idx
  on public.daily_chart_confirmation_send_claims (user_id, claimed_at desc);

create index daily_chart_confirmation_claims_time_user_idx
  on public.daily_chart_confirmation_send_claims (claimed_at, user_id);

create or replace function public.prune_daily_chart_confirmation_send_claims(
  candidate_limit integer default 128
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  removed integer;
begin
  if candidate_limit is null or candidate_limit < 1 or candidate_limit > 1024 then
    raise exception 'invalid chart confirmation claim prune limit' using errcode = '22023';
  end if;

  with candidates as materialized (
    select user_id, claim_token
    from public.daily_chart_confirmation_send_claims
    where claimed_at <= clock_timestamp() - interval '24 hours'
    order by claimed_at, user_id, claim_token
    limit candidate_limit
  ), locked as materialized (
    select user_id, claim_token
    from candidates
    where pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended(user_id::text, 7312027)
    )
  )
  delete from public.daily_chart_confirmation_send_claims as claims
  using locked
  where claims.user_id = locked.user_id
    and claims.claim_token = locked.claim_token
    and claims.claimed_at <= clock_timestamp() - interval '24 hours';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_daily_chart_confirmation_send_claims(integer)
  from public, anon, authenticated;
grant execute on function public.prune_daily_chart_confirmation_send_claims(integer)
  to service_role;

create or replace function public.claim_daily_chart_confirmation_send(
  candidate_user_id uuid,
  candidate_claim_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  observed_at timestamptz;
  existing_claimed_at timestamptz;
  latest_claimed_at timestamptz;
  oldest_claimed_at timestamptz;
  claims_in_day integer;
  cadence_allowed_at timestamptz;
  daily_allowed_at timestamptz;
  next_allowed_at timestamptz;
  cap_outcome text;
  retry_after_seconds integer;
begin
  if candidate_user_id is null or candidate_claim_token is null then
    raise exception 'invalid chart confirmation send claim' using errcode = '22023';
  end if;

  -- This lock exists even before the account has a claim row, closing the
  -- empty-ledger race. Acquire it before global pruning: the pruner uses
  -- non-blocking per-account locks, so this order cannot form a cross-account
  -- wait cycle. A hash collision only serializes unrelated accounts.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_user_id::text, 7312027)
  );

  -- Keep cleanup bounded. The per-account delete below remains the authority
  -- for exact window edges.
  perform public.prune_daily_chart_confirmation_send_claims(128);
  observed_at := clock_timestamp();

  delete from public.daily_chart_confirmation_send_claims
  where user_id = candidate_user_id
    and claimed_at <= observed_at - interval '24 hours';

  select claimed_at
  into existing_claimed_at
  from public.daily_chart_confirmation_send_claims
  where user_id = candidate_user_id
    and claim_token = candidate_claim_token;

  if found then
    return jsonb_build_object(
      'outcome', 'claimed',
      'claimed_at', existing_claimed_at,
      'retry_after_seconds', 0
    );
  end if;

  select max(claimed_at), min(claimed_at), count(*)::integer
  into latest_claimed_at, oldest_claimed_at, claims_in_day
  from public.daily_chart_confirmation_send_claims
  where user_id = candidate_user_id
    and claimed_at > observed_at - interval '24 hours';

  if latest_claimed_at is not null
    and latest_claimed_at + interval '60 seconds' > observed_at
  then
    cadence_allowed_at := latest_claimed_at + interval '60 seconds';
  end if;

  if claims_in_day >= 6 then
    daily_allowed_at := oldest_claimed_at + interval '24 hours';
  end if;

  if cadence_allowed_at is not null or daily_allowed_at is not null then
    next_allowed_at := case
      when cadence_allowed_at is null then daily_allowed_at
      when daily_allowed_at is null then cadence_allowed_at
      else greatest(cadence_allowed_at, daily_allowed_at)
    end;
    cap_outcome := case
      when daily_allowed_at is not null
        and daily_allowed_at >= coalesce(cadence_allowed_at, '-infinity'::timestamptz)
        then 'capped_24h'
      else 'capped_60s'
    end;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (next_allowed_at - observed_at)))::integer
    );
    return jsonb_build_object(
      'outcome', cap_outcome,
      'next_allowed_at', next_allowed_at,
      'retry_after_seconds', retry_after_seconds
    );
  end if;

  insert into public.daily_chart_confirmation_send_claims (
    user_id,
    claim_token,
    claimed_at
  ) values (
    candidate_user_id,
    candidate_claim_token,
    observed_at
  );

  return jsonb_build_object(
    'outcome', 'claimed',
    'claimed_at', observed_at,
    'retry_after_seconds', 0
  );
end;
$$;

revoke all on function public.claim_daily_chart_confirmation_send(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_daily_chart_confirmation_send(uuid, uuid)
  to service_role;

-- A compact surrogate lets the worker claim against the exact subscription
-- snapshot without copying a potentially 2 KB endpoint into every receipt.
alter table public.push_subscriptions
  add column if not exists subscription_id bigint generated always as identity;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_subscription_id_key'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_subscription_id_key unique (subscription_id);
  end if;
end;
$$;

create table public.push_delivery_claims (
  endpoint_hash text not null,
  event_key text not null,
  claim_token uuid not null,
  -- This is a snapshot identifier, intentionally not a foreign key: deleting
  -- and re-creating the same endpoint must not erase its rolling cap history.
  subscription_id bigint not null,
  subscription_updated_at timestamptz not null,
  status text not null default 'reserved',
  provider_status smallint,
  claimed_at timestamptz not null default clock_timestamp(),
  finalized_at timestamptz,
  primary key (endpoint_hash, claim_token),
  constraint push_delivery_claims_event_unique
    unique (endpoint_hash, event_key),
  constraint push_delivery_claims_endpoint_hash_valid
    check (
      octet_length(endpoint_hash) = 64
      and endpoint_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint push_delivery_claims_event_key_valid
    check (
      octet_length(event_key) between 1 and 160
      and event_key ~ '^[a-z0-9][a-z0-9._:-]*$'
    ),
  constraint push_delivery_claims_subscription_id_valid
    check (subscription_id > 0),
  constraint push_delivery_claims_status_valid
    check (status in ('reserved', 'sent', 'failed', 'expired')),
  constraint push_delivery_claims_provider_status_valid
    check (provider_status is null or provider_status between 100 and 599),
  constraint push_delivery_claims_final_state_valid
    check (
      (
        status = 'reserved'
        and provider_status is null
        and finalized_at is null
      )
      or (
        status = 'sent'
        and provider_status between 200 and 299
        and finalized_at is not null
      )
      or (
        status = 'failed'
        and finalized_at is not null
      )
      or (
        status = 'expired'
        and provider_status in (404, 410)
        and finalized_at is not null
      )
    )
);

create index push_delivery_claims_endpoint_time_idx
  on public.push_delivery_claims (endpoint_hash, claimed_at desc);

create index push_delivery_claims_time_endpoint_idx
  on public.push_delivery_claims (claimed_at, endpoint_hash);

create index push_delivery_claims_subscription_event_idx
  on public.push_delivery_claims (subscription_id, event_key);

create or replace function public.prune_push_delivery_claims(
  candidate_limit integer default 512
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  removed integer;
begin
  if candidate_limit is null or candidate_limit < 1 or candidate_limit > 4096 then
    raise exception 'invalid push delivery claim prune limit' using errcode = '22023';
  end if;

  with candidates as materialized (
    select endpoint_hash, claim_token
    from public.push_delivery_claims
    where claimed_at <= clock_timestamp() - interval '7 days'
    order by claimed_at, endpoint_hash, claim_token
    limit candidate_limit
  )
  delete from public.push_delivery_claims as claims
  using candidates
  where claims.endpoint_hash = candidates.endpoint_hash
    and claims.claim_token = candidates.claim_token
    and claims.claimed_at <= clock_timestamp() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_push_delivery_claims(integer)
  from public, anon, authenticated;
grant execute on function public.prune_push_delivery_claims(integer)
  to service_role;

create or replace function public.reserve_push_delivery(
  candidate_subscription_id bigint,
  candidate_event_key text,
  candidate_claim_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_endpoint text;
  current_subscription_updated_at timestamptz;
  current_endpoint_hash text;
  observed_at timestamptz;
  existing_event_key text;
  existing_status text;
  existing_claimed_at timestamptz;
  latest_claimed_at timestamptz;
  oldest_claimed_at timestamptz;
  claims_in_day integer;
  claims_in_week integer;
  daily_allowed_at timestamptz;
  weekly_allowed_at timestamptz;
  next_allowed_at timestamptz;
  cap_outcome text;
  retry_after_seconds integer;
begin
  if candidate_subscription_id is null
    or candidate_subscription_id < 1
    or candidate_event_key is null
    or octet_length(candidate_event_key) not between 1 and 160
    or candidate_event_key !~ '^[a-z0-9][a-z0-9._:-]*$'
    or candidate_claim_token is null
  then
    raise exception 'invalid push delivery reservation' using errcode = '22023';
  end if;

  perform public.prune_push_delivery_claims(512);

  select endpoint, updated_at
  into current_endpoint, current_subscription_updated_at
  from public.push_subscriptions
  where subscription_id = candidate_subscription_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'missing');
  end if;

  current_endpoint_hash := encode(
    pg_catalog.sha256(pg_catalog.convert_to(current_endpoint, 'UTF8')),
    'hex'
  );

  -- The endpoint fingerprint survives subscription deletion for seven days,
  -- so serialize on it as well as on the current subscription row.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_endpoint_hash, 7312028)
  );
  observed_at := clock_timestamp();

  delete from public.push_delivery_claims
  where endpoint_hash = current_endpoint_hash
    and claimed_at <= observed_at - interval '7 days';

  select event_key, status, claimed_at
  into existing_event_key, existing_status, existing_claimed_at
  from public.push_delivery_claims
  where endpoint_hash = current_endpoint_hash
    and claim_token = candidate_claim_token;

  if found then
    if existing_event_key is distinct from candidate_event_key then
      raise exception 'push claim token belongs to another event' using errcode = '22023';
    end if;
    if existing_status = 'reserved' then
      return jsonb_build_object(
        'outcome', 'reserved',
        'claimed_at', existing_claimed_at,
        'claim_token', candidate_claim_token
      );
    end if;
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  if exists (
    select 1
    from public.push_delivery_claims
    where endpoint_hash = current_endpoint_hash
      and event_key = candidate_event_key
  ) then
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  select
    max(claimed_at) filter (
      where claimed_at > observed_at - interval '24 hours'
    ),
    min(claimed_at) filter (
      where claimed_at > observed_at - interval '7 days'
    ),
    count(*) filter (
      where claimed_at > observed_at - interval '24 hours'
    )::integer,
    count(*) filter (
      where claimed_at > observed_at - interval '7 days'
    )::integer
  into latest_claimed_at, oldest_claimed_at, claims_in_day, claims_in_week
  from public.push_delivery_claims
  where endpoint_hash = current_endpoint_hash;

  if claims_in_day >= 1 then
    daily_allowed_at := latest_claimed_at + interval '24 hours';
  end if;
  if claims_in_week >= 2 then
    weekly_allowed_at := oldest_claimed_at + interval '7 days';
  end if;

  if daily_allowed_at is not null or weekly_allowed_at is not null then
    next_allowed_at := case
      when daily_allowed_at is null then weekly_allowed_at
      when weekly_allowed_at is null then daily_allowed_at
      else greatest(daily_allowed_at, weekly_allowed_at)
    end;
    cap_outcome := case
      when weekly_allowed_at is not null
        and weekly_allowed_at >= coalesce(daily_allowed_at, '-infinity'::timestamptz)
        then 'capped_7d'
      else 'capped_24h'
    end;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (next_allowed_at - observed_at)))::integer
    );
    return jsonb_build_object(
      'outcome', cap_outcome,
      'next_allowed_at', next_allowed_at,
      'retry_after_seconds', retry_after_seconds
    );
  end if;

  insert into public.push_delivery_claims (
    endpoint_hash,
    event_key,
    claim_token,
    subscription_id,
    subscription_updated_at,
    status,
    claimed_at
  ) values (
    current_endpoint_hash,
    candidate_event_key,
    candidate_claim_token,
    candidate_subscription_id,
    current_subscription_updated_at,
    'reserved',
    observed_at
  );

  return jsonb_build_object(
    'outcome', 'reserved',
    'claimed_at', observed_at,
    'claim_token', candidate_claim_token
  );
end;
$$;

revoke all on function public.reserve_push_delivery(bigint, text, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_push_delivery(bigint, text, uuid)
  to service_role;

create or replace function public.finalize_push_delivery(
  candidate_subscription_id bigint,
  candidate_event_key text,
  candidate_claim_token uuid,
  candidate_outcome text,
  candidate_provider_status integer
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_claim public.push_delivery_claims%rowtype;
  current_endpoint text;
  current_subscription_updated_at timestamptz;
  current_endpoint_hash text;
  subscription_exists boolean;
  removed boolean;
begin
  if candidate_subscription_id is null
    or candidate_subscription_id < 1
    or candidate_event_key is null
    or octet_length(candidate_event_key) not between 1 and 160
    or candidate_event_key !~ '^[a-z0-9][a-z0-9._:-]*$'
    or candidate_claim_token is null
    or candidate_outcome not in ('sent', 'failed', 'expired')
    or (
      candidate_outcome = 'sent'
      and (candidate_provider_status is null or candidate_provider_status not between 200 and 299)
    )
    or (
      candidate_outcome = 'failed'
      and candidate_provider_status is not null
      and candidate_provider_status not between 100 and 599
    )
    or (
      candidate_outcome = 'expired'
      and candidate_provider_status not in (404, 410)
    )
  then
    raise exception 'invalid push delivery finalization' using errcode = '22023';
  end if;

  select *
  into current_claim
  from public.push_delivery_claims
  where subscription_id = candidate_subscription_id
    and event_key = candidate_event_key
  for update;

  if not found then
    return jsonb_build_object('outcome', 'missing');
  end if;
  if current_claim.claim_token is distinct from candidate_claim_token then
    return jsonb_build_object('outcome', 'superseded');
  end if;

  if current_claim.status <> 'reserved' then
    if current_claim.status = candidate_outcome
      and current_claim.provider_status is not distinct from candidate_provider_status::smallint
    then
      return case
        when candidate_outcome = 'expired'
          then jsonb_build_object('outcome', 'expired')
        else jsonb_build_object('outcome', 'finalized', 'status', candidate_outcome)
      end;
    end if;
    return jsonb_build_object('outcome', 'superseded');
  end if;

  if candidate_outcome <> 'expired' then
    update public.push_delivery_claims
    set status = candidate_outcome,
        provider_status = candidate_provider_status::smallint,
        finalized_at = clock_timestamp()
    where endpoint_hash = current_claim.endpoint_hash
      and claim_token = candidate_claim_token
      and status = 'reserved';
    if not found then
      return jsonb_build_object('outcome', 'superseded');
    end if;
    return jsonb_build_object('outcome', 'finalized', 'status', candidate_outcome);
  end if;

  select endpoint, updated_at
  into current_endpoint, current_subscription_updated_at
  from public.push_subscriptions
  where subscription_id = candidate_subscription_id
  for update;
  subscription_exists := found;

  if subscription_exists then
    current_endpoint_hash := encode(
      pg_catalog.sha256(pg_catalog.convert_to(current_endpoint, 'UTF8')),
      'hex'
    );
    if current_endpoint_hash is distinct from current_claim.endpoint_hash
      or current_subscription_updated_at is distinct from current_claim.subscription_updated_at
    then
      return jsonb_build_object('outcome', 'superseded');
    end if;
  end if;

  update public.push_delivery_claims
  set status = 'expired',
      provider_status = candidate_provider_status::smallint,
      finalized_at = clock_timestamp()
  where endpoint_hash = current_claim.endpoint_hash
    and claim_token = candidate_claim_token
    and status = 'reserved';
  if not found then
    return jsonb_build_object('outcome', 'superseded');
  end if;

  removed := false;
  if subscription_exists then
    delete from public.push_subscriptions
    where subscription_id = candidate_subscription_id
      and updated_at = current_claim.subscription_updated_at;
    removed := found;
    if not removed then
      -- A refreshed browser subscription always wins over a stale 404/410.
      update public.push_delivery_claims
      set status = 'failed',
          finalized_at = clock_timestamp()
      where endpoint_hash = current_claim.endpoint_hash
        and claim_token = candidate_claim_token
        and status = 'expired';
      return jsonb_build_object('outcome', 'superseded');
    end if;
  end if;

  return jsonb_build_object('outcome', 'expired');
end;
$$;

revoke all on function public.finalize_push_delivery(bigint, text, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.finalize_push_delivery(bigint, text, uuid, text, integer)
  to service_role;

alter table public.daily_chart_confirmation_send_claims enable row level security;
alter table public.push_delivery_claims enable row level security;

revoke all on table public.daily_chart_confirmation_send_claims
  from public, anon, authenticated, service_role;
revoke all on table public.push_delivery_claims
  from public, anon, authenticated, service_role;

grant select, insert, delete
  on table public.daily_chart_confirmation_send_claims
  to service_role;
grant select, insert, update, delete
  on table public.push_delivery_claims
  to service_role;

revoke all on sequence public.push_subscriptions_subscription_id_seq
  from public, anon, authenticated, service_role;
grant usage, select on sequence public.push_subscriptions_subscription_id_seq
  to service_role;

comment on table public.daily_chart_confirmation_send_claims is
  'Server-only chart confirmation provider-attempt ledger: one minute between attempts and at most six per exact rolling 24 hours.';
comment on column public.daily_chart_confirmation_send_claims.user_id is
  'Authenticated account identity; deliberately independent of recipient and mutable daily-chart preference rows.';
comment on table public.push_delivery_claims is
  'Server-only Sky Alert attempt ledger enforcing at most one claim per exact rolling 24 hours and two per exact rolling seven days.';
comment on column public.push_delivery_claims.endpoint_hash is
  'SHA-256 fingerprint of the high-entropy push endpoint; rows stop affecting caps after seven days and are then eligible for bounded opportunistic pruning.';
comment on column public.push_delivery_claims.subscription_updated_at is
  'Subscription snapshot used to prevent a stale 404/410 worker from deleting refreshed browser keys.';
