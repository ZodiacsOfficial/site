create table if not exists public.weekly_digest_unsubscribe_tokens (
  token_hash text primary key
    check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  lease_token uuid not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (week_start, user_id, lease_token),
  check (pg_catalog.date_part('isodow', week_start) = 1),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index if not exists weekly_digest_unsubscribe_tokens_user_idx
  on public.weekly_digest_unsubscribe_tokens (user_id);

create index if not exists weekly_digest_unsubscribe_tokens_expiry_idx
  on public.weekly_digest_unsubscribe_tokens (expires_at)
  where used_at is null;

create table if not exists public.weekly_digest_deliveries (
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  slot smallint,
  lease_token uuid,
  provider_receipt text,
  provider_status smallint,
  provider_code text,
  idempotency_key text,
  envelope_digest text,
  content_digest text,
  sealed_envelope text,
  max_charts smallint,
  reserved_at timestamptz,
  dispatch_started_at timestamptz,
  recovery_claimed_at timestamptz,
  cancel_requested_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (week_start, user_id),
  check (pg_catalog.date_part('isodow', week_start) = 1),
  check (status in (
    'reserved', 'dispatching', 'sent', 'failed', 'cancelled', 'reconciliation'
  )),
  check (slot is null or slot between 1 and 80),
  check (provider_receipt is null or (
    pg_catalog.length(provider_receipt) between 1 and 256
    and provider_receipt !~ '[[:cntrl:]]'
  )),
  check (provider_status is null or provider_status between 400 and 499),
  check (provider_code is null or provider_code ~ '^[a-z0-9_]{1,64}$'),
  check (idempotency_key is null or idempotency_key ~ '^weekly-digest-v1/[0-9a-f]{64}$'),
  check (envelope_digest is null or envelope_digest ~ '^[0-9a-f]{64}$'),
  check (content_digest is null or content_digest ~ '^[0-9a-f]{64}$'),
  check (sealed_envelope is null or (
    pg_catalog.length(sealed_envelope) between 32 and 262144
    and sealed_envelope !~ '[[:space:][:cntrl:]]'
  )),
  check (max_charts is null or max_charts between 1 and 5),
  check (dispatch_started_at is null or dispatch_started_at >= reserved_at),
  check (recovery_claimed_at is null or recovery_claimed_at >= dispatch_started_at),
  check (cancel_requested_at is null or cancel_requested_at >= reserved_at),
  check (
    (status = 'reserved'
      and slot is not null
      and lease_token is not null
      and provider_receipt is null
      and provider_status is null
      and provider_code is null
      and idempotency_key is null
      and envelope_digest is null
      and content_digest is null
      and sealed_envelope is null
      and max_charts is null
      and reserved_at is not null
      and dispatch_started_at is null
      and recovery_claimed_at is null
      and cancel_requested_at is null
      and sent_at is null)
    or (status = 'dispatching'
      and slot is not null
      and lease_token is not null
      and provider_receipt is null
      and provider_status is null
      and provider_code is null
      and idempotency_key is not null
      and envelope_digest is not null
      and content_digest is not null
      and sealed_envelope is not null
      and max_charts is not null
      and reserved_at is not null
      and dispatch_started_at is not null
      and sent_at is null)
    or (status = 'sent'
      and slot is not null
      and lease_token is not null
      and provider_receipt is not null
      and provider_status is null
      and provider_code is null
      and idempotency_key is not null
      and envelope_digest is not null
      and content_digest is not null
      and sealed_envelope is null
      and max_charts is not null
      and reserved_at is not null
      and dispatch_started_at is not null
      and recovery_claimed_at is null
      and sent_at is not null)
    or (status = 'failed'
      and slot is not null
      and lease_token is not null
      and provider_receipt is null
      and provider_status is not null
      and provider_code is not null
      and idempotency_key is not null
      and envelope_digest is not null
      and content_digest is not null
      and sealed_envelope is null
      and max_charts is not null
      and reserved_at is not null
      and dispatch_started_at is not null
      and recovery_claimed_at is null
      and sent_at is null)
    or (status = 'reconciliation'
      and slot is not null
      and lease_token is not null
      and provider_receipt is null
      and provider_status is null
      and provider_code is null
      and idempotency_key is not null
      and envelope_digest is not null
      and content_digest is not null
      and sealed_envelope is null
      and max_charts is not null
      and reserved_at is not null
      and dispatch_started_at is not null
      and recovery_claimed_at is null
      and sent_at is null)
    or (status = 'cancelled'
      and slot is null
      and lease_token is null
      and provider_receipt is null
      and provider_status is null
      and provider_code is null
      and idempotency_key is null
      and envelope_digest is null
      and content_digest is null
      and sealed_envelope is null
      and max_charts is null
      and reserved_at is not null
      and dispatch_started_at is null
      and recovery_claimed_at is null
      and sent_at is null)
  )
);

create index if not exists weekly_digest_deliveries_status_idx
  on public.weekly_digest_deliveries (status, dispatch_started_at, recovery_claimed_at);

create unique index if not exists weekly_digest_deliveries_slot_unique
  on public.weekly_digest_deliveries (week_start, slot)
  where slot is not null;

alter table public.weekly_digest_unsubscribe_tokens enable row level security;
alter table public.weekly_digest_deliveries enable row level security;

-- The public endpoint and sender use purpose-specific SECURITY DEFINER
-- functions. No API role receives direct access to either internal table.
revoke all on table public.weekly_digest_unsubscribe_tokens
  from public, anon, authenticated, service_role;
revoke all on table public.weekly_digest_deliveries
  from public, anon, authenticated, service_role;

-- Returns at most 80 opaque account identifiers. It excludes existing
-- tombstones and accounts without a current email or minimally valid chart,
-- while keeping both the Auth row and chart payload behind the function.
create or replace function public.weekly_digest_candidates_v1(
  candidate_week_start date,
  candidate_limit integer
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_week date := pg_catalog.date_trunc(
    'week', pg_catalog.statement_timestamp() at time zone 'UTC'
  )::date;
begin
  if candidate_week_start is null
    or candidate_week_start <> current_week
    or candidate_limit is null
    or candidate_limit not between 1 and 80
  then
    return;
  end if;

  return query
  select profiles.user_id
  from public.profiles as profiles
  join auth.users as users on users.id = profiles.user_id
  where profiles.digest_opt_in
    and pg_catalog.octet_length(pg_catalog.btrim(users.email)) between 3 and 320
    and pg_catalog.btrim(users.email) ~ '^[^[:space:]@]+@[^[:space:]@]+$'
    and exists (
      select 1
      from public.charts as charts
      where charts.user_id = profiles.user_id
        and pg_catalog.jsonb_typeof(charts.payload -> 'name') = 'string'
        and pg_catalog.length(charts.payload ->> 'name') between 1 and 200
        and charts.payload ->> 'name' !~ '[[:cntrl:]]'
        and case
          when pg_catalog.jsonb_typeof(charts.payload #> '{summary,bodies}') = 'array'
          then pg_catalog.jsonb_array_length(
            charts.payload #> '{summary,bodies}'
          ) between 1 and 64
            and not exists (
              select 1
              from pg_catalog.jsonb_array_elements(
                charts.payload #> '{summary,bodies}'
              ) as projected_bodies(body)
              where not coalesce(
                pg_catalog.jsonb_typeof(projected_bodies.body) = 'object'
                and pg_catalog.jsonb_typeof(projected_bodies.body -> 'body') = 'string'
                and pg_catalog.length(projected_bodies.body ->> 'body') between 1 and 32
                and projected_bodies.body ->> 'body' !~ '[[:cntrl:]]'
                and case
                  when pg_catalog.jsonb_typeof(projected_bodies.body -> 'lon') = 'number'
                  then (projected_bodies.body ->> 'lon')::numeric >= 0
                    and (projected_bodies.body ->> 'lon')::numeric < 360
                  else false
                end,
                false
              )
            )
          else false
        end
    )
    and not exists (
      select 1
      from public.weekly_digest_deliveries as deliveries
      where deliveries.week_start = candidate_week_start
        and deliveries.user_id = profiles.user_id
    )
  order by pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('weekly-digest-order-v1', 'UTF8')
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(candidate_week_start::text, 'UTF8')
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(pg_catalog.lower(profiles.user_id::text), 'UTF8')
    ),
    'hex'
  )
  limit candidate_limit;
end;
$$;

-- Projects only the current destination plus chart name and natal body
-- longitudes. Birth dates, places, profile settings, and Auth metadata never
-- cross the sender boundary. The database supplies a canonical snapshot digest
-- that authorization recomputes immediately before dispatch.
create or replace function public.weekly_digest_content_v1(
  candidate_user_id uuid,
  candidate_max_charts integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  chart_list jsonb;
  destination text;
begin
  if candidate_user_id is null
    or candidate_max_charts is null
    or candidate_max_charts not between 1 and 5
  then
    return null;
  end if;

  select pg_catalog.btrim(users.email)
  into destination
  from auth.users as users
  join public.profiles as profiles on profiles.user_id = users.id
  where users.id = candidate_user_id
    and profiles.digest_opt_in
    and pg_catalog.octet_length(pg_catalog.btrim(users.email)) between 3 and 320
    and pg_catalog.btrim(users.email) ~ '^[^[:space:]@]+@[^[:space:]@]+$';

  if not found then
    return null;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(projected.chart order by projected.updated_at desc, projected.id),
    '[]'::jsonb
  )
  into chart_list
  from (
    select
      charts.id,
      charts.updated_at,
      pg_catalog.jsonb_build_object(
        'name', charts.payload ->> 'name',
        'bodies', coalesce((
          select pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'body', bodies.body ->> 'body',
              'lon', bodies.body -> 'lon'
            )
            order by bodies.ordinality
          )
          from pg_catalog.jsonb_array_elements(
            charts.payload #> '{summary,bodies}'
          ) with ordinality as bodies(body, ordinality)
          where pg_catalog.jsonb_typeof(bodies.body) = 'object'
            and pg_catalog.jsonb_typeof(bodies.body -> 'body') = 'string'
            and pg_catalog.length(bodies.body ->> 'body') between 1 and 32
            and bodies.body ->> 'body' !~ '[[:cntrl:]]'
            and case
              when pg_catalog.jsonb_typeof(bodies.body -> 'lon') = 'number'
              then (bodies.body ->> 'lon')::numeric >= 0
                and (bodies.body ->> 'lon')::numeric < 360
              else false
            end
        ), '[]'::jsonb)
      ) as chart
    from public.charts as charts
    where charts.user_id = candidate_user_id
      and pg_catalog.jsonb_typeof(charts.payload -> 'name') = 'string'
      and pg_catalog.length(charts.payload ->> 'name') between 1 and 200
      and charts.payload ->> 'name' !~ '[[:cntrl:]]'
      and case
        when pg_catalog.jsonb_typeof(charts.payload #> '{summary,bodies}') = 'array'
        then pg_catalog.jsonb_array_length(
          charts.payload #> '{summary,bodies}'
        ) between 1 and 64
          and not exists (
            select 1
            from pg_catalog.jsonb_array_elements(
              charts.payload #> '{summary,bodies}'
            ) as projected_bodies(body)
            where not coalesce(
              pg_catalog.jsonb_typeof(projected_bodies.body) = 'object'
              and pg_catalog.jsonb_typeof(projected_bodies.body -> 'body') = 'string'
              and pg_catalog.length(projected_bodies.body ->> 'body') between 1 and 32
              and projected_bodies.body ->> 'body' !~ '[[:cntrl:]]'
              and case
                when pg_catalog.jsonb_typeof(projected_bodies.body -> 'lon') = 'number'
                then (projected_bodies.body ->> 'lon')::numeric >= 0
                  and (projected_bodies.body ->> 'lon')::numeric < 360
                else false
              end,
              false
            )
          )
        else false
      end
    order by charts.updated_at desc, charts.id
    limit candidate_max_charts
  ) as projected;

  if pg_catalog.jsonb_array_length(chart_list) = 0 then
    return null;
  end if;

  snapshot := pg_catalog.jsonb_build_object(
    'email', destination,
    'charts', chart_list
  );

  return pg_catalog.jsonb_build_object(
    'snapshot', snapshot,
    'digest', pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(snapshot::text, 'UTF8')),
      'hex'
    )
  );
end;
$$;

-- Atomically reserves one current-week account delivery and stores only the
-- unsubscribe digest. The profile lock serializes issuance with unsubscribe;
-- the advisory lock and constrained slots make the 80-recipient ceiling
-- authoritative across concurrent callers.
create or replace function public.weekly_digest_issue_v1(
  candidate_week_start date,
  candidate_user_id uuid,
  candidate_lease_token uuid,
  candidate_token_hash text,
  candidate_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  current_reserved_at timestamptz;
  previous_lease uuid;
  issued_at timestamptz := pg_catalog.statement_timestamp();
  current_week date := pg_catalog.date_trunc(
    'week', issued_at at time zone 'UTC'
  )::date;
  profile_digest_opt_in boolean;
  chosen_slot smallint;
begin
  if candidate_week_start is null
    or candidate_week_start <> current_week
    or candidate_user_id is null
    or candidate_lease_token is null
    or candidate_token_hash is null
    or candidate_token_hash !~ '^[0-9a-f]{64}$'
    or candidate_expires_at is null
    or candidate_expires_at <= issued_at
    or candidate_expires_at > issued_at + interval '401 days'
  then
    return false;
  end if;

  -- FK checks on the delivery/capability inserts also touch this Auth row.
  -- Acquire it before the profile lock so account deletion and every sender
  -- transition share Auth -> profile -> delivery -> capability ordering.
  perform 1
  from auth.users as users
  where users.id = candidate_user_id
  for update;

  if not found then
    return false;
  end if;

  select profiles.digest_opt_in
  into profile_digest_opt_in
  from public.profiles as profiles
  where profiles.user_id = candidate_user_id
  for update;

  if not found or not coalesce(profile_digest_opt_in, false) then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(743294189432110120);

  select deliveries.status, deliveries.reserved_at, deliveries.lease_token
  into current_status, current_reserved_at, previous_lease
  from public.weekly_digest_deliveries as deliveries
  where deliveries.week_start = candidate_week_start
    and deliveries.user_id = candidate_user_id
  for update;

  if found then
    if current_status <> 'reserved'
      or current_reserved_at > issued_at - interval '30 minutes'
    then
      return false;
    end if;

    delete from public.weekly_digest_unsubscribe_tokens as tokens
    where tokens.week_start = candidate_week_start
      and tokens.user_id = candidate_user_id
      and tokens.lease_token = previous_lease
      and tokens.used_at is null;

    update public.weekly_digest_deliveries
    set lease_token = candidate_lease_token,
        reserved_at = issued_at,
        updated_at = issued_at
    where week_start = candidate_week_start
      and user_id = candidate_user_id;
  else
    select slots.slot::smallint
    into chosen_slot
    from pg_catalog.generate_series(1, 80) as slots(slot)
    where not exists (
      select 1
      from public.weekly_digest_deliveries as deliveries
      where deliveries.week_start = candidate_week_start
        and deliveries.slot = slots.slot
    )
    order by slots.slot
    limit 1;

    if not found then
      return false;
    end if;

    insert into public.weekly_digest_deliveries (
      week_start,
      user_id,
      status,
      slot,
      lease_token,
      reserved_at,
      created_at,
      updated_at
    )
    values (
      candidate_week_start,
      candidate_user_id,
      'reserved',
      chosen_slot,
      candidate_lease_token,
      issued_at,
      issued_at,
      issued_at
    );
  end if;

  insert into public.weekly_digest_unsubscribe_tokens (
    token_hash,
    user_id,
    week_start,
    lease_token,
    expires_at,
    created_at
  )
  values (
    candidate_token_hash,
    candidate_user_id,
    candidate_week_start,
    candidate_lease_token,
    candidate_expires_at,
    issued_at
  );

  return true;
end;
$$;

-- Persists the sealed, immutable provider envelope and then crosses the durable
-- dispatch fence. The current opt-in and minimal content digest are rechecked
-- under the profile lock immediately before the transition.
create or replace function public.weekly_digest_authorized_v1(
  candidate_week_start date,
  candidate_user_id uuid,
  candidate_lease_token uuid,
  candidate_idempotency_key text,
  candidate_envelope_digest text,
  candidate_content_digest text,
  candidate_sealed_envelope text,
  candidate_max_charts integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_digest_opt_in boolean;
  current_content jsonb;
  expected_idempotency_key text;
  authorized_at timestamptz := pg_catalog.statement_timestamp();
begin
  if candidate_week_start is null or candidate_user_id is null then
    return false;
  end if;

  expected_idempotency_key := 'weekly-digest-v1/' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('weekly-digest-v1', 'UTF8')
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(candidate_week_start::text, 'UTF8')
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(pg_catalog.lower(candidate_user_id::text), 'UTF8')
    ),
    'hex'
  );

  if candidate_week_start <> pg_catalog.date_trunc(
      'week', authorized_at at time zone 'UTC'
    )::date
    or candidate_lease_token is null
    or candidate_idempotency_key is null
    or candidate_idempotency_key <> expected_idempotency_key
    or candidate_envelope_digest is null
    or candidate_envelope_digest !~ '^[0-9a-f]{64}$'
    or candidate_content_digest is null
    or candidate_content_digest !~ '^[0-9a-f]{64}$'
    or candidate_sealed_envelope is null
    or pg_catalog.length(candidate_sealed_envelope) not between 32 and 262144
    or candidate_sealed_envelope ~ '[[:space:][:cntrl:]]'
    or candidate_max_charts is null
    or candidate_max_charts not between 1 and 5
  then
    return false;
  end if;

  -- Freeze the current Auth destination through the content recheck and
  -- dispatch transition. Auth/account deletion takes this lock before its
  -- cascading profile work, so this ordering also avoids an inverse-lock race.
  perform 1
  from auth.users as users
  where users.id = candidate_user_id
  for update;

  if not found then
    return false;
  end if;

  select profiles.digest_opt_in
  into profile_digest_opt_in
  from public.profiles as profiles
  where profiles.user_id = candidate_user_id
  for update;

  if not found or not coalesce(profile_digest_opt_in, false) then
    return false;
  end if;

  current_content := public.weekly_digest_content_v1(
    candidate_user_id,
    candidate_max_charts
  );
  if current_content is null
    or current_content ->> 'digest' <> candidate_content_digest
  then
    return false;
  end if;

  update public.weekly_digest_deliveries
  set status = 'dispatching',
      idempotency_key = candidate_idempotency_key,
      envelope_digest = candidate_envelope_digest,
      content_digest = candidate_content_digest,
      sealed_envelope = candidate_sealed_envelope,
      max_charts = candidate_max_charts,
      dispatch_started_at = authorized_at,
      recovery_claimed_at = null,
      updated_at = authorized_at
  where week_start = candidate_week_start
    and user_id = candidate_user_id
    and status = 'reserved'
    and lease_token = candidate_lease_token;

  return found;
end;
$$;

-- Claims one abandoned dispatch only after its original 30-second provider
-- attempt has had ample time to finish. The five-minute tail before Resend's
-- 24-hour key expiry is reserved for the sender's bounded retries. Consent and
-- the exact content/destination digest must still match. A changed or opted-out
-- recipient is quarantined for explicit reconciliation and is never resent.
create or replace function public.weekly_digest_recover_v1(
  candidate_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_at timestamptz := pg_catalog.statement_timestamp();
  candidate_week date;
  candidate_user uuid;
  candidate_old_lease uuid;
  candidate_digest text;
  candidate_max smallint;
  profile_digest_opt_in boolean;
  current_content jsonb;
  recovered public.weekly_digest_deliveries%rowtype;
begin
  if candidate_lease_token is null then
    return null;
  end if;

  select
    deliveries.week_start,
    deliveries.user_id,
    deliveries.lease_token,
    deliveries.content_digest,
    deliveries.max_charts
  into
    candidate_week,
    candidate_user,
    candidate_old_lease,
    candidate_digest,
    candidate_max
  from public.weekly_digest_deliveries as deliveries
  where deliveries.status = 'dispatching'
    and deliveries.dispatch_started_at > claimed_at - interval '23 hours 55 minutes'
    and deliveries.dispatch_started_at <= claimed_at - interval '2 minutes'
    and (
      deliveries.recovery_claimed_at is null
      or deliveries.recovery_claimed_at <= claimed_at - interval '2 minutes'
    )
  order by deliveries.dispatch_started_at, deliveries.week_start, deliveries.user_id
  limit 1;

  if not found then
    return null;
  end if;

  perform 1
  from auth.users as users
  where users.id = candidate_user
  for update;

  if not found then
    return null;
  end if;

  select profiles.digest_opt_in
  into profile_digest_opt_in
  from public.profiles as profiles
  where profiles.user_id = candidate_user
  for update;

  if not found or not coalesce(profile_digest_opt_in, false) then
    update public.weekly_digest_deliveries
    set status = 'reconciliation',
        sealed_envelope = null,
        recovery_claimed_at = null,
        cancel_requested_at = coalesce(cancel_requested_at, claimed_at),
        updated_at = claimed_at
    where week_start = candidate_week
      and user_id = candidate_user
      and status = 'dispatching'
      and lease_token = candidate_old_lease;
    if found then
      return pg_catalog.jsonb_build_object('outcome', 'reconciliation');
    end if;
    return null;
  end if;

  -- An unsubscribe that lands after provider dispatch cannot revoke a request
  -- already in flight, so it leaves a durable cancel marker. Even if the user
  -- opts back in before recovery, that marked envelope must never be replayed.
  -- Quarantine it after the Auth/profile locks but before content checks so the
  -- oldest marked row cannot starve later ambiguous deliveries.
  update public.weekly_digest_deliveries
  set status = 'reconciliation',
      sealed_envelope = null,
      recovery_claimed_at = null,
      updated_at = claimed_at
  where week_start = candidate_week
    and user_id = candidate_user
    and status = 'dispatching'
    and lease_token = candidate_old_lease
    and cancel_requested_at is not null;

  if found then
    return pg_catalog.jsonb_build_object('outcome', 'reconciliation');
  end if;

  current_content := public.weekly_digest_content_v1(candidate_user, candidate_max);
  if current_content is null
    or current_content ->> 'digest' <> candidate_digest
  then
    update public.weekly_digest_deliveries
    set status = 'reconciliation',
        sealed_envelope = null,
        recovery_claimed_at = null,
        updated_at = claimed_at
    where week_start = candidate_week
      and user_id = candidate_user
      and status = 'dispatching'
      and lease_token = candidate_old_lease;
    if found then
      return pg_catalog.jsonb_build_object('outcome', 'reconciliation');
    end if;
    return null;
  end if;

  update public.weekly_digest_deliveries
  set lease_token = candidate_lease_token,
      recovery_claimed_at = claimed_at,
      updated_at = claimed_at
  where week_start = candidate_week
    and user_id = candidate_user
    and status = 'dispatching'
    and lease_token = candidate_old_lease
    and cancel_requested_at is null
    and dispatch_started_at > claimed_at - interval '23 hours 55 minutes'
    and (
      recovery_claimed_at is null
      or recovery_claimed_at <= claimed_at - interval '2 minutes'
    )
  returning * into recovered;

  if not found then
    return null;
  end if;

  -- The capability is part of the same fenced delivery. Rotate its lease only
  -- after the delivery row so cancel/finalize/unsubscribe keep the global
  -- delivery -> capability lock order. Missing unpublished state fails closed
  -- into reconciliation rather than replaying an email with a dead link.
  update public.weekly_digest_unsubscribe_tokens as tokens
  set lease_token = candidate_lease_token
  where tokens.week_start = candidate_week
    and tokens.user_id = candidate_user
    and tokens.lease_token = candidate_old_lease
    and tokens.used_at is null;

  if not found then
    update public.weekly_digest_deliveries
    set status = 'reconciliation',
        sealed_envelope = null,
        recovery_claimed_at = null,
        updated_at = claimed_at
    where week_start = candidate_week
      and user_id = candidate_user
      and status = 'dispatching'
      and lease_token = candidate_lease_token;
    if found then
      return pg_catalog.jsonb_build_object('outcome', 'reconciliation');
    end if;
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'outcome', 'claimed',
    'weekStart', recovered.week_start::text,
    'userId', recovered.user_id::text,
    'leaseToken', recovered.lease_token::text,
    'idempotencyKey', recovered.idempotency_key,
    'envelopeDigest', recovered.envelope_digest,
    'sealedEnvelope', recovered.sealed_envelope,
    'dispatchStartedAt', recovered.dispatch_started_at
  );
end;
$$;

create or replace function public.weekly_digest_cancel_v1(
  candidate_week_start date,
  candidate_user_id uuid,
  candidate_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_at timestamptz := pg_catalog.statement_timestamp();
begin
  -- Serialize with Auth deletion before touching either cascading child table.
  perform 1
  from auth.users as users
  where users.id = candidate_user_id
  for update;

  if not found then
    return false;
  end if;

  update public.weekly_digest_deliveries
  set status = 'cancelled',
      slot = null,
      lease_token = null,
      updated_at = cancelled_at
  where week_start = candidate_week_start
    and user_id = candidate_user_id
    and status = 'reserved'
    and lease_token = candidate_lease_token;

  if not found then
    return false;
  end if;

  delete from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.week_start = candidate_week_start
    and tokens.user_id = candidate_user_id
    and tokens.lease_token = candidate_lease_token
    and tokens.used_at is null;

  return true;
end;
$$;

-- Terminalization is idempotent for a matching lease and receipt/result. Only
-- explicitly recipient-specific error codes may become `failed`; provider-wide,
-- retryable, and unknown failures must remain dispatching and abort the sender.
create or replace function public.weekly_digest_finish_v1(
  candidate_week_start date,
  candidate_user_id uuid,
  candidate_lease_token uuid,
  candidate_delivered boolean,
  candidate_provider_receipt text default null,
  candidate_provider_status integer default null,
  candidate_provider_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  finished_at timestamptz := pg_catalog.statement_timestamp();
begin
  if candidate_week_start is null
    or candidate_user_id is null
    or candidate_lease_token is null
    or candidate_delivered is null
    or (candidate_delivered and (
      candidate_provider_receipt is null
      or pg_catalog.length(candidate_provider_receipt) not between 1 and 256
      or candidate_provider_receipt ~ '[[:cntrl:]]'
      or candidate_provider_status is not null
      or candidate_provider_code is not null
    ))
    or (not candidate_delivered and (
      candidate_provider_receipt is not null
      or candidate_provider_status is null
      or candidate_provider_status not between 400 and 499
      or candidate_provider_code not in (
        'invalid_recipient',
        'invalid_recipient_address',
        'recipient_suppressed'
      )
    ))
  then
    return false;
  end if;

  -- Auth owns both weekly child rows. Taking the parent first prevents an
  -- account-deletion cascade from choosing the opposite child lock order.
  perform 1
  from auth.users as users
  where users.id = candidate_user_id
  for update;

  if not found then
    return false;
  end if;

  update public.weekly_digest_deliveries
  set status = case when candidate_delivered then 'sent' else 'failed' end,
      provider_receipt = case when candidate_delivered then candidate_provider_receipt else null end,
      provider_status = case when candidate_delivered then null else candidate_provider_status::smallint end,
      provider_code = case when candidate_delivered then null else candidate_provider_code end,
      sealed_envelope = null,
      recovery_claimed_at = null,
      sent_at = case when candidate_delivered then finished_at else null end,
      updated_at = finished_at
  where week_start = candidate_week_start
    and user_id = candidate_user_id
    and status in ('dispatching', 'reconciliation')
    and lease_token = candidate_lease_token;

  if found then
    if not candidate_delivered then
      delete from public.weekly_digest_unsubscribe_tokens as tokens
      where tokens.week_start = candidate_week_start
        and tokens.user_id = candidate_user_id
        and tokens.lease_token = candidate_lease_token
        and tokens.used_at is null;
    end if;
    return true;
  end if;

  if candidate_delivered then
    return exists (
      select 1
      from public.weekly_digest_deliveries as deliveries
      where deliveries.week_start = candidate_week_start
        and deliveries.user_id = candidate_user_id
        and deliveries.status = 'sent'
        and deliveries.lease_token = candidate_lease_token
        and deliveries.provider_receipt = candidate_provider_receipt
    );
  end if;

  return exists (
    select 1
    from public.weekly_digest_deliveries as deliveries
    where deliveries.week_start = candidate_week_start
      and deliveries.user_id = candidate_user_id
      and deliveries.status = 'failed'
      and deliveries.lease_token = candidate_lease_token
      and deliveries.provider_status = candidate_provider_status
      and deliveries.provider_code = candidate_provider_code
  );
end;
$$;

-- Releases abandoned pre-provider reservations, quarantines dispatches whose
-- safe 24-hour Resend replay window elapsed, and prunes only unsubscribe
-- capabilities. Delivery tombstones are retained permanently.
create or replace function public.weekly_digest_prune_v1()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer := 0;
  operation_count integer := 0;
  pruned_at timestamptz := pg_catalog.statement_timestamp();
begin
  -- Freeze every Auth parent this invocation can mutate, in UUID order, before
  -- either cascading child table or the global slot lock. Rows cannot newly
  -- age past these fixed statement-time thresholds while this transaction runs.
  perform 1
  from auth.users as users
  join (
    select deliveries.user_id
    from public.weekly_digest_deliveries as deliveries
    where (deliveries.status = 'reserved'
        and deliveries.reserved_at <= pruned_at - interval '30 minutes')
      or (deliveries.status = 'dispatching'
        and deliveries.dispatch_started_at <= pruned_at - interval '24 hours')
    union
    select tokens.user_id
    from public.weekly_digest_unsubscribe_tokens as tokens
    where tokens.expires_at <= pruned_at
      or tokens.used_at < pruned_at - interval '1 day'
  ) as affected on affected.user_id = users.id
  order by users.id
  for update of users;

  perform pg_catalog.pg_advisory_xact_lock(743294189432110120);

  -- Keep delivery-before-token lock order consistent with issue, cancel,
  -- terminal rejection, and unsubscribe. The CTE dependency prevents a stale
  -- capability cleanup from deadlocking an in-flight unsubscribe.
  with stale_deliveries as (
    delete from public.weekly_digest_deliveries as deliveries
    where deliveries.status = 'reserved'
      and deliveries.reserved_at <= pruned_at - interval '30 minutes'
    returning deliveries.week_start, deliveries.user_id, deliveries.lease_token
  ), deleted_tokens as (
    delete from public.weekly_digest_unsubscribe_tokens as tokens
    using stale_deliveries
    where tokens.week_start = stale_deliveries.week_start
      and tokens.user_id = stale_deliveries.user_id
      and tokens.lease_token = stale_deliveries.lease_token
      and tokens.used_at is null
    returning 1
  )
  select
    (select pg_catalog.count(*) from stale_deliveries)
    + (select pg_catalog.count(*) from deleted_tokens)
  into operation_count;
  changed_count := changed_count + operation_count;

  update public.weekly_digest_deliveries as deliveries
  set status = 'reconciliation',
      sealed_envelope = null,
      recovery_claimed_at = null,
      updated_at = pruned_at
  where deliveries.status = 'dispatching'
    and deliveries.dispatch_started_at <= pruned_at - interval '24 hours';
  get diagnostics operation_count = row_count;
  changed_count := changed_count + operation_count;

  delete from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.expires_at <= pruned_at
    or tokens.used_at < pruned_at - interval '1 day';
  get diagnostics operation_count = row_count;
  changed_count := changed_count + operation_count;

  return changed_count;
end;
$$;

create or replace function public.weekly_digest_unsubscribe_v1(candidate_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_owner uuid;
  token_used_at timestamptz;
  profile_digest_opt_in boolean;
  candidate_hash text;
  checked_at timestamptz := pg_catalog.statement_timestamp();
begin
  if candidate_token is null
    or candidate_token !~ '^[A-Za-z0-9_-]{43}$'
  then
    return false;
  end if;

  candidate_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(candidate_token, 'UTF8')),
    'hex'
  );

  select tokens.user_id
  into token_owner
  from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.token_hash = candidate_hash
    and tokens.expires_at > checked_at
    and (tokens.used_at is null or tokens.used_at > checked_at - interval '1 day');

  if not found then
    return false;
  end if;

  -- The token lookup above is intentionally lock-free. The Auth parent is the
  -- first durable lock, followed by profile, delivery, then capability.
  perform 1
  from auth.users as users
  where users.id = token_owner
  for update;

  if not found then
    return false;
  end if;

  select profiles.digest_opt_in
  into profile_digest_opt_in
  from public.profiles as profiles
  where profiles.user_id = token_owner
  for update;

  if not found then
    return false;
  end if;

  select tokens.used_at
  into token_used_at
  from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.token_hash = candidate_hash
    and tokens.user_id = token_owner
    and tokens.expires_at > checked_at
    and (tokens.used_at is null or tokens.used_at > checked_at - interval '1 day');

  if not found then
    return false;
  end if;

  if token_used_at is not null then
    return not coalesce(profile_digest_opt_in, false);
  end if;

  update public.profiles
  set digest_opt_in = false,
      updated_at = checked_at
  where user_id = token_owner;

  update public.weekly_digest_deliveries
  set status = 'cancelled',
      slot = null,
      lease_token = null,
      updated_at = checked_at
  where user_id = token_owner
    and status = 'reserved';

  update public.weekly_digest_deliveries
  set cancel_requested_at = coalesce(cancel_requested_at, checked_at),
      updated_at = checked_at
  where user_id = token_owner
    and status in ('dispatching', 'reconciliation');

  update public.weekly_digest_unsubscribe_tokens
  set used_at = checked_at
  where user_id = token_owner
    and used_at is null;

  return true;
end;
$$;

alter function public.weekly_digest_candidates_v1(date, integer)
  owner to postgres;
alter function public.weekly_digest_content_v1(uuid, integer)
  owner to postgres;
alter function public.weekly_digest_issue_v1(date, uuid, uuid, text, timestamptz)
  owner to postgres;
alter function public.weekly_digest_authorized_v1(date, uuid, uuid, text, text, text, text, integer)
  owner to postgres;
alter function public.weekly_digest_recover_v1(uuid)
  owner to postgres;
alter function public.weekly_digest_cancel_v1(date, uuid, uuid)
  owner to postgres;
alter function public.weekly_digest_finish_v1(date, uuid, uuid, boolean, text, integer, text)
  owner to postgres;
alter function public.weekly_digest_prune_v1()
  owner to postgres;
alter function public.weekly_digest_unsubscribe_v1(text)
  owner to postgres;

revoke all on function public.weekly_digest_candidates_v1(date, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_content_v1(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_issue_v1(date, uuid, uuid, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_authorized_v1(date, uuid, uuid, text, text, text, text, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_recover_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_cancel_v1(date, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_finish_v1(date, uuid, uuid, boolean, text, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_prune_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.weekly_digest_unsubscribe_v1(text)
  from public, anon, authenticated, service_role;

grant execute on function public.weekly_digest_candidates_v1(date, integer)
  to service_role;
grant execute on function public.weekly_digest_content_v1(uuid, integer)
  to service_role;
grant execute on function public.weekly_digest_issue_v1(date, uuid, uuid, text, timestamptz)
  to service_role;
grant execute on function public.weekly_digest_authorized_v1(date, uuid, uuid, text, text, text, text, integer)
  to service_role;
grant execute on function public.weekly_digest_recover_v1(uuid)
  to service_role;
grant execute on function public.weekly_digest_cancel_v1(date, uuid, uuid)
  to service_role;
grant execute on function public.weekly_digest_finish_v1(date, uuid, uuid, boolean, text, integer, text)
  to service_role;
grant execute on function public.weekly_digest_prune_v1()
  to service_role;
grant execute on function public.weekly_digest_unsubscribe_v1(text)
  to anon;
