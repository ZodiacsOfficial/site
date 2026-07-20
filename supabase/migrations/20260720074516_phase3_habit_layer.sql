-- Phase 3 server-owned persistence. These tables deliberately have no browser
-- policies: every read and write goes through a server endpoint using the
-- service-role credential.

-- A composite key lets the preference foreign key enforce that a selected
-- chart belongs to the same user as the preference.
create unique index if not exists charts_id_user_unique_idx
  on public.charts (id, user_id);

create or replace function public.is_valid_iana_timezone(candidate text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select candidate is not null
    and octet_length(candidate) between 1 and 255
    and candidate = btrim(candidate)
    and exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = candidate
    );
$$;

revoke all on function public.is_valid_iana_timezone(text)
  from public, anon, authenticated;
grant execute on function public.is_valid_iana_timezone(text)
  to service_role;

create or replace function public.touch_phase3_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_phase3_updated_at()
  from public, anon, authenticated;
grant execute on function public.touch_phase3_updated_at()
  to service_role;

create table public.daily_chart_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Null means the explicitly selected chart was deleted. Keeping the row
  -- lets the profile explain the pause without silently choosing a replacement.
  chart_id uuid,
  recipient_hash text not null,
  confirmation_token_hash text,
  timezone text not null default 'UTC',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_chart_preferences_chart_owner_fkey
    foreign key (chart_id, user_id)
    references public.charts (id, user_id)
    on delete set null (chart_id),
  constraint daily_chart_preferences_timezone_valid
    check (public.is_valid_iana_timezone(timezone)),
  constraint daily_chart_preferences_recipient_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint daily_chart_preferences_confirmation_token_hash_valid
    check (
      confirmation_token_hash is null
      or (
        octet_length(confirmation_token_hash) = 64
        and confirmation_token_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint daily_chart_preferences_confirmation_state_valid
    check (
      (confirmed_at is null and confirmation_token_hash is not null)
      or (confirmed_at is not null and confirmation_token_hash is null)
    )
);

create index daily_chart_preferences_chart_user_idx
  on public.daily_chart_preferences (chart_id, user_id);

create index daily_chart_preferences_confirmed_timezone_idx
  on public.daily_chart_preferences (timezone, user_id)
  where confirmed_at is not null;

create unique index daily_chart_preferences_recipient_hash_idx
  on public.daily_chart_preferences (recipient_hash);

-- One transaction closes the pending-confirmation/confirmed-preference race
-- before a selected chart is removed on the device. A concurrent confirmation
-- either commits first and is paused here, or loses because this function
-- deleted its pending row; there is no read-then-write gap.
create or replace function public.pause_or_cancel_daily_chart_for_deletion(
  candidate_user_id uuid,
  candidate_chart_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_chart_id uuid;
begin
  delete from public.daily_chart_preferences
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
    and confirmed_at is null;

  if found then
    return jsonb_build_object('outcome', 'cancelled', 'selected_chart_id', null);
  end if;

  update public.daily_chart_preferences
  set chart_id = null
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
    and confirmed_at is not null;

  if found then
    return jsonb_build_object('outcome', 'paused', 'selected_chart_id', null);
  end if;

  select chart_id
  into current_chart_id
  from public.daily_chart_preferences
  where user_id = candidate_user_id;

  return jsonb_build_object(
    'outcome', 'not_selected',
    'selected_chart_id', current_chart_id
  );
end;
$$;

revoke all on function public.pause_or_cancel_daily_chart_for_deletion(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.pause_or_cancel_daily_chart_for_deletion(uuid, uuid)
  to service_role;

create table public.daily_sun_preferences (
  recipient_hash text primary key,
  sign text not null,
  confirmed_at timestamptz not null default now(),
  confirmed_by_attempt_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_sun_preferences_recipient_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint daily_sun_preferences_sign_valid
    check (
      sign in (
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
      )
    )
);

create index daily_sun_preferences_sign_recipient_idx
  on public.daily_sun_preferences (sign, recipient_hash);

-- Pending confirmation is deliberately separate from active authority. A
-- sign-change request can therefore never replace the currently authorized
-- sign until its own DOI transaction completes.
create table public.daily_sun_confirmation_requests (
  recipient_hash text primary key,
  requested_sign text not null,
  confirmation_token_hash text not null unique,
  request_kind text not null,
  confirmation_state text not null default 'pending',
  attempt_id uuid,
  claimed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_sun_confirmation_requests_recipient_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint daily_sun_confirmation_requests_sign_valid
    check (
      requested_sign in (
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
      )
    ),
  constraint daily_sun_confirmation_requests_token_hash_valid
    check (
      octet_length(confirmation_token_hash) = 64
      and confirmation_token_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint daily_sun_confirmation_requests_kind_valid
    check (request_kind in ('subscribe', 'sign_change')),
  constraint daily_sun_confirmation_requests_state_valid
    check (
      (
        confirmation_state = 'pending'
        and attempt_id is null
        and claimed_at is null
      )
      or (
        confirmation_state = 'confirming'
        and attempt_id is not null
        and claimed_at is not null
      )
    ),
  constraint daily_sun_confirmation_requests_expiry_valid
    check (expires_at > created_at)
);

create index daily_sun_confirmation_requests_expiry_idx
  on public.daily_sun_confirmation_requests (expires_at);

-- A separate, non-authoritative abuse ledger prevents an unauthenticated
-- caller from flooding one recipient or continuously invalidating a valid
-- DOI link. It contains only the same non-reversible recipient HMAC used by
-- the consent tables and is removed with a signed Sun-tier unsubscribe.
create table public.daily_sun_confirmation_rate_limits (
  recipient_hash text primary key,
  next_allowed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_sun_confirmation_rate_limits_recipient_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    )
);

create index daily_sun_confirmation_rate_limits_expiry_idx
  on public.daily_sun_confirmation_rate_limits (next_allowed_at);

-- Normal signup traffic performs capped, index-backed garbage collection so
-- arbitrary addresses cannot leave permanent rows. A confirmation whose
-- token expired while a worker still owns a fresh lease is preserved until
-- that five-minute lease becomes stale.
create or replace function public.prune_daily_sun_confirmation_state(
  candidate_limit integer default 64
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  removed_requests integer;
  removed_rate_limits integer;
begin
  if candidate_limit is null or candidate_limit < 1 or candidate_limit > 256 then
    raise exception 'invalid daily sun prune limit' using errcode = '22023';
  end if;

  with request_candidates as materialized (
    select recipient_hash
    from public.daily_sun_confirmation_requests
    where expires_at <= clock_timestamp()
      and (
        confirmation_state = 'pending'
        or claimed_at <= clock_timestamp() - interval '5 minutes'
    )
    order by expires_at, recipient_hash
    limit candidate_limit
  ), locked_requests as materialized (
    select recipient_hash
    from request_candidates
    where pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended(recipient_hash, 7312026)
    )
  )
  delete from public.daily_sun_confirmation_requests as requests
  using locked_requests
  where requests.recipient_hash = locked_requests.recipient_hash
    and requests.expires_at <= clock_timestamp()
    and (
      requests.confirmation_state = 'pending'
      or requests.claimed_at <= clock_timestamp() - interval '5 minutes'
    );
  get diagnostics removed_requests = row_count;

  with rate_limit_candidates as materialized (
    select recipient_hash
    from public.daily_sun_confirmation_rate_limits
    where next_allowed_at <= clock_timestamp() - interval '24 hours'
    order by next_allowed_at, recipient_hash
    limit candidate_limit
  ), locked_rate_limits as materialized (
    select recipient_hash
    from rate_limit_candidates
    where pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended(recipient_hash, 7312026)
    )
  )
  delete from public.daily_sun_confirmation_rate_limits as limits
  using locked_rate_limits
  where limits.recipient_hash = locked_rate_limits.recipient_hash
    and limits.next_allowed_at <= clock_timestamp() - interval '24 hours';
  get diagnostics removed_rate_limits = row_count;

  return jsonb_build_object(
    'requests', removed_requests,
    'rate_limits', removed_rate_limits
  );
end;
$$;

revoke all on function public.prune_daily_sun_confirmation_state(integer)
  from public, anon, authenticated;
grant execute on function public.prune_daily_sun_confirmation_state(integer)
  to service_role;

create or replace function public.stage_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_sign text,
  candidate_token_hash text,
  candidate_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  active_sign text;
  next_allowed_at timestamptz;
  current_state text;
  current_claimed_at timestamptz;
  request_exists boolean := false;
  next_kind text;
  next_outcome text;
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_token_hash is null
    or octet_length(candidate_token_hash) <> 64
    or candidate_token_hash !~ '^[0-9a-f]{64}$'
    or candidate_sign is null
    or candidate_sign not in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )
    or candidate_expires_at is null
    or candidate_expires_at <= clock_timestamp()
    or candidate_expires_at > clock_timestamp() + interval '49 hours'
  then
    raise exception 'invalid daily sun confirmation request' using errcode = '22023';
  end if;

  -- Serialize even when neither row exists yet. Hash collisions only cause
  -- harmless extra serialization; they cannot merge recipient state.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
  );
  if candidate_expires_at <= clock_timestamp() then
    raise exception 'expired daily sun confirmation request' using errcode = '22023';
  end if;

  select sign into active_sign
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;

  select limits.next_allowed_at into next_allowed_at
  from public.daily_sun_confirmation_rate_limits as limits
  where limits.recipient_hash = candidate_recipient_hash
  for update;
  if found and next_allowed_at > clock_timestamp() then
    perform public.prune_daily_sun_confirmation_state(64);
    return jsonb_build_object('outcome', 'cooldown', 'active_sign', active_sign);
  end if;

  -- Consume the window before any provider call. Provider failure therefore
  -- cannot reopen an immediate email-bombing path.
  insert into public.daily_sun_confirmation_rate_limits (
    recipient_hash,
    next_allowed_at
  ) values (
    candidate_recipient_hash,
    clock_timestamp() + interval '15 minutes'
  )
  on conflict (recipient_hash) do update
  set next_allowed_at = excluded.next_allowed_at;

  select confirmation_state, claimed_at
  into current_state, current_claimed_at
  from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
  for update;
  request_exists := found;

  -- Re-selecting the active sign is an idempotent success. It must not cancel
  -- a switch: this unauthenticated endpoint has no proof that the submitter
  -- controls the address. Only the signed Keep action may do that.
  if active_sign = candidate_sign then
    perform public.prune_daily_sun_confirmation_state(64);
    return jsonb_build_object('outcome', 'already_on', 'active_sign', active_sign);
  end if;

  -- A live provider worker owns the request for five minutes. A crashed
  -- worker becomes replaceable after that lease instead of stranding consent.
  if current_state = 'confirming'
    and current_claimed_at > clock_timestamp() - interval '5 minutes'
  then
    perform public.prune_daily_sun_confirmation_state(64);
    return jsonb_build_object('outcome', 'in_flight', 'active_sign', active_sign);
  end if;

  next_kind := case when active_sign is null then 'subscribe' else 'sign_change' end;
  next_outcome := case
    when next_kind = 'subscribe' and request_exists then 'replaced_request'
    when next_kind = 'subscribe' then 'new_request'
    when request_exists then 'sign_change_replaced'
    else 'sign_change_request'
  end;

  insert into public.daily_sun_confirmation_requests (
    recipient_hash,
    requested_sign,
    confirmation_token_hash,
    request_kind,
    confirmation_state,
    attempt_id,
    claimed_at,
    expires_at
  ) values (
    candidate_recipient_hash,
    candidate_sign,
    candidate_token_hash,
    next_kind,
    'pending',
    null,
    null,
    candidate_expires_at
  )
  on conflict (recipient_hash) do update
  set requested_sign = excluded.requested_sign,
      confirmation_token_hash = excluded.confirmation_token_hash,
      request_kind = excluded.request_kind,
      confirmation_state = 'pending',
      attempt_id = null,
      claimed_at = null,
      expires_at = excluded.expires_at,
      created_at = clock_timestamp();

  perform public.prune_daily_sun_confirmation_state(64);
  return jsonb_build_object('outcome', next_outcome, 'active_sign', active_sign);
end;
$$;

revoke all on function public.stage_daily_sun_confirmation(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.stage_daily_sun_confirmation(text, text, text, timestamptz)
  to service_role;

create or replace function public.inspect_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_sign text,
  candidate_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_request public.daily_sun_confirmation_requests%rowtype;
  active_sign text;
begin
  select * into current_request
  from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
    and requested_sign = candidate_sign
    and confirmation_token_hash = candidate_token_hash
    and expires_at > clock_timestamp();
  if not found then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select sign into active_sign
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;
  if (current_request.request_kind = 'subscribe' and active_sign is not null)
    or (current_request.request_kind = 'sign_change'
      and (active_sign is null or active_sign = current_request.requested_sign))
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  return jsonb_build_object(
    'outcome', 'valid',
    'request_kind', current_request.request_kind,
    'active_sign', active_sign,
    'confirmation_state', current_request.confirmation_state
  );
end;
$$;

revoke all on function public.inspect_daily_sun_confirmation(text, text, text)
  from public, anon, authenticated;
grant execute on function public.inspect_daily_sun_confirmation(text, text, text)
  to service_role;

create or replace function public.claim_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_sign text,
  candidate_token_hash text,
  candidate_attempt_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_request public.daily_sun_confirmation_requests%rowtype;
  active_sign text;
begin
  if candidate_attempt_id is null then
    return jsonb_build_object('outcome', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
  );
  select * into current_request
  from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
    and requested_sign = candidate_sign
    and confirmation_token_hash = candidate_token_hash
  for update;
  if not found or current_request.expires_at <= clock_timestamp() then
    return jsonb_build_object('outcome', 'unavailable');
  end if;
  if current_request.confirmation_state = 'confirming'
    and current_request.claimed_at > clock_timestamp() - interval '5 minutes'
    and current_request.attempt_id = candidate_attempt_id
  then
    select sign into active_sign
    from public.daily_sun_preferences
    where recipient_hash = candidate_recipient_hash;
    return jsonb_build_object(
      'outcome', 'claimed',
      'request_kind', current_request.request_kind,
      'active_sign', active_sign
    );
  elsif current_request.confirmation_state = 'confirming'
    and current_request.claimed_at > clock_timestamp() - interval '5 minutes'
  then
    return jsonb_build_object('outcome', 'busy');
  end if;

  select sign into active_sign
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;
  if (current_request.request_kind = 'subscribe' and active_sign is not null)
    or (current_request.request_kind = 'sign_change'
      and (active_sign is null or active_sign = current_request.requested_sign))
  then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  update public.daily_sun_confirmation_requests
  set confirmation_state = 'confirming',
      attempt_id = candidate_attempt_id,
      claimed_at = clock_timestamp()
  where recipient_hash = candidate_recipient_hash;

  return jsonb_build_object(
    'outcome', 'claimed',
    'request_kind', current_request.request_kind,
    'active_sign', active_sign
  );
end;
$$;

revoke all on function public.claim_daily_sun_confirmation(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_daily_sun_confirmation(text, text, text, uuid)
  to service_role;

create or replace function public.complete_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_token_hash text,
  candidate_attempt_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_request public.daily_sun_confirmation_requests%rowtype;
  active_sign text;
  active_attempt_id uuid;
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_token_hash is null
    or octet_length(candidate_token_hash) <> 64
    or candidate_token_hash !~ '^[0-9a-f]{64}$'
    or candidate_attempt_id is null
  then
    return jsonb_build_object('outcome', 'gone', 'active_sign', null);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
  );
  select sign, confirmed_by_attempt_id into active_sign, active_attempt_id
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;
  if active_attempt_id = candidate_attempt_id then
    return jsonb_build_object('outcome', 'completed', 'active_sign', active_sign);
  end if;
  select * into current_request
  from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
  for update;
  if not found then
    return jsonb_build_object('outcome', 'gone', 'active_sign', active_sign);
  end if;
  if current_request.confirmation_token_hash is distinct from candidate_token_hash
    or current_request.confirmation_state is distinct from 'confirming'
    or current_request.attempt_id is distinct from candidate_attempt_id
  then
    return jsonb_build_object('outcome', 'superseded', 'active_sign', active_sign);
  end if;
  if current_request.claimed_at <= clock_timestamp() - interval '5 minutes' then
    return jsonb_build_object('outcome', 'expired', 'active_sign', active_sign);
  end if;

  if (current_request.request_kind = 'subscribe' and active_sign is not null)
    or (current_request.request_kind = 'sign_change'
      and (active_sign is null or active_sign = current_request.requested_sign))
  then
    return jsonb_build_object('outcome', 'superseded', 'active_sign', active_sign);
  end if;

  insert into public.daily_sun_preferences (
    recipient_hash,
    sign,
    confirmed_at,
    confirmed_by_attempt_id
  ) values (
    candidate_recipient_hash,
    current_request.requested_sign,
    clock_timestamp(),
    candidate_attempt_id
  )
  on conflict (recipient_hash) do update
  set sign = excluded.sign,
      confirmed_at = excluded.confirmed_at,
      confirmed_by_attempt_id = excluded.confirmed_by_attempt_id;

  delete from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
    and confirmation_token_hash = candidate_token_hash
    and attempt_id = candidate_attempt_id;
  return jsonb_build_object(
    'outcome', 'completed',
    'active_sign', current_request.requested_sign
  );
end;
$$;

revoke all on function public.complete_daily_sun_confirmation(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_daily_sun_confirmation(text, text, uuid)
  to service_role;

create or replace function public.release_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_token_hash text,
  candidate_attempt_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_request public.daily_sun_confirmation_requests%rowtype;
  active_sign text;
  active_attempt_id uuid;
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_token_hash is null
    or octet_length(candidate_token_hash) <> 64
    or candidate_token_hash !~ '^[0-9a-f]{64}$'
    or candidate_attempt_id is null
  then
    return jsonb_build_object('outcome', 'gone', 'active_sign', null);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
  );
  select sign, confirmed_by_attempt_id into active_sign, active_attempt_id
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;
  if active_attempt_id = candidate_attempt_id then
    return jsonb_build_object('outcome', 'already_completed', 'active_sign', active_sign);
  end if;
  select * into current_request
  from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
  for update;
  if not found then
    return jsonb_build_object('outcome', 'gone', 'active_sign', active_sign);
  end if;
  if current_request.confirmation_token_hash is distinct from candidate_token_hash
    or current_request.confirmation_state is distinct from 'confirming'
    or current_request.attempt_id is distinct from candidate_attempt_id
  then
    return jsonb_build_object('outcome', 'superseded', 'active_sign', active_sign);
  end if;
  update public.daily_sun_confirmation_requests
  set confirmation_state = 'pending',
      attempt_id = null,
      claimed_at = null
  where recipient_hash = candidate_recipient_hash;
  return jsonb_build_object('outcome', 'released', 'active_sign', active_sign);
end;
$$;

revoke all on function public.release_daily_sun_confirmation(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.release_daily_sun_confirmation(text, text, uuid)
  to service_role;

create or replace function public.cancel_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_token_hash text,
  require_sign_change boolean
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
  );
  delete from public.daily_sun_confirmation_requests
  where recipient_hash = candidate_recipient_hash
    and confirmation_token_hash = candidate_token_hash
    and (not require_sign_change or request_kind = 'sign_change');
  return found;
end;
$$;

revoke all on function public.cancel_daily_sun_confirmation(text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.cancel_daily_sun_confirmation(text, text, boolean)
  to service_role;

-- Each daily unsubscribe link revokes only the tier named in its signed claim.
-- Provider segments are routing metadata only and are cleaned up afterward;
-- chart revocation leaves confirmed Sun consent intact so it can resume.
create or replace function public.revoke_daily_email_preference(
  candidate_recipient_hash text,
  candidate_tier text,
  candidate_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid daily recipient hash' using errcode = '22023';
  end if;

  if candidate_tier = 'sun_sign' and candidate_user_id is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(candidate_recipient_hash, 7312026)
    );
    delete from public.daily_sun_confirmation_requests
    where recipient_hash = candidate_recipient_hash;
    delete from public.daily_sun_preferences
    where recipient_hash = candidate_recipient_hash;
    delete from public.daily_sun_confirmation_rate_limits
    where recipient_hash = candidate_recipient_hash;
  elsif candidate_tier = 'chart' and candidate_user_id is not null then
    delete from public.daily_chart_preferences
    where recipient_hash = candidate_recipient_hash
      and user_id = candidate_user_id;
  else
    raise exception 'invalid daily preference subject' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.revoke_daily_email_preference(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_daily_email_preference(text, text, uuid)
  to service_role;

create table public.daily_email_deliveries (
  edition_date date not null,
  recipient_hash text not null,
  tier text not null,
  status text not null default 'reserved',
  lease_token uuid not null,
  provider_receipt text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (edition_date, recipient_hash),
  constraint daily_email_deliveries_recipient_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint daily_email_deliveries_tier_valid
    check (tier in ('sun_sign', 'chart')),
  constraint daily_email_deliveries_status_valid
    check (status in ('reserved', 'sent', 'failed', 'skipped')),
  constraint daily_email_deliveries_provider_receipt_valid
    check (
      provider_receipt is null
      or octet_length(provider_receipt) between 1 and 512
    ),
  constraint daily_email_deliveries_sent_state_valid
    check (
      (status = 'sent' and provider_receipt is not null and sent_at is not null)
      or (status <> 'sent' and sent_at is null)
    )
);

create index daily_email_deliveries_status_edition_idx
  on public.daily_email_deliveries (status, edition_date);

-- Phase 1 shipped a narrower server-owned push table before the Phase 3
-- delivery contract existed. Upgrade that exact shape in place so existing
-- browser consent is preserved; fresh projects still create the final shape.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_valid
    check (
      octet_length(endpoint) between 1 and 2048
      and endpoint ~ '^https://'
    ),
  constraint push_subscriptions_p256dh_valid
    check (
      octet_length(p256dh) between 1 and 512
      and p256dh ~ '^[A-Za-z0-9_-]+={0,2}$'
    ),
  constraint push_subscriptions_auth_valid
    check (
      octet_length(auth) between 1 and 512
      and auth ~ '^[A-Za-z0-9_-]+={0,2}$'
    ),
  constraint push_subscriptions_lang_valid
    check (lang in ('en', 'es', 'pt', 'fr', 'it'))
);

alter table public.push_subscriptions
  add column if not exists updated_at timestamptz;

-- Legacy rows may have a nullable language and no update clock. Preserve the
-- subscription/key material and use the row's original creation time as the
-- first stable snapshot timestamp consumed by the delivery guard migration.
update public.push_subscriptions
set lang = 'en'
where lang is null;

alter table public.push_subscriptions
  alter column lang set default 'en',
  alter column lang set not null;

update public.push_subscriptions
set updated_at = created_at
where updated_at is null;

alter table public.push_subscriptions
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_endpoint_valid'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_valid
      check (
        octet_length(endpoint) between 1 and 2048
        and endpoint ~ '^https://'
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_p256dh_valid'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_p256dh_valid
      check (
        octet_length(p256dh) between 1 and 512
        and p256dh ~ '^[A-Za-z0-9_-]+={0,2}$'
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_auth_valid'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_auth_valid
      check (
        octet_length(auth) between 1 and 512
        and auth ~ '^[A-Za-z0-9_-]+={0,2}$'
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass
      and conname = 'push_subscriptions_lang_valid'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_lang_valid
      check (lang in ('en', 'es', 'pt', 'fr', 'it'));
  end if;
end;
$$;

create trigger daily_chart_preferences_touch_updated_at
before update on public.daily_chart_preferences
for each row
execute function public.touch_phase3_updated_at();

create trigger daily_sun_preferences_touch_updated_at
before update on public.daily_sun_preferences
for each row
execute function public.touch_phase3_updated_at();

create trigger daily_sun_confirmation_requests_touch_updated_at
before update on public.daily_sun_confirmation_requests
for each row
execute function public.touch_phase3_updated_at();

create trigger daily_sun_confirmation_rate_limits_touch_updated_at
before update on public.daily_sun_confirmation_rate_limits
for each row
execute function public.touch_phase3_updated_at();

create trigger daily_email_deliveries_touch_updated_at
before update on public.daily_email_deliveries
for each row
execute function public.touch_phase3_updated_at();

create trigger push_subscriptions_touch_updated_at
before update on public.push_subscriptions
for each row
execute function public.touch_phase3_updated_at();

alter table public.daily_chart_preferences enable row level security;
alter table public.daily_sun_preferences enable row level security;
alter table public.daily_sun_confirmation_requests enable row level security;
alter table public.daily_sun_confirmation_rate_limits enable row level security;
alter table public.daily_email_deliveries enable row level security;
alter table public.push_subscriptions enable row level security;

-- Revoke first so projects with legacy automatic public-schema grants end in
-- the same least-privilege state as projects using the 2026 secure defaults.
revoke all on table public.daily_chart_preferences
  from public, anon, authenticated, service_role;
revoke all on table public.daily_sun_preferences
  from public, anon, authenticated, service_role;
revoke all on table public.daily_sun_confirmation_requests
  from public, anon, authenticated, service_role;
revoke all on table public.daily_sun_confirmation_rate_limits
  from public, anon, authenticated, service_role;
revoke all on table public.daily_email_deliveries
  from public, anon, authenticated, service_role;
revoke all on table public.push_subscriptions
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.daily_chart_preferences
  to service_role;
grant select, insert, update, delete
  on table public.daily_sun_preferences
  to service_role;
grant select, insert, update, delete
  on table public.daily_sun_confirmation_requests
  to service_role;
grant select, insert, update, delete
  on table public.daily_sun_confirmation_rate_limits
  to service_role;
grant select, insert, update
  on table public.daily_email_deliveries
  to service_role;
grant select, insert, update, delete
  on table public.push_subscriptions
  to service_role;

comment on table public.daily_chart_preferences is
  'Server-owned daily brief consent for exactly one explicitly selected synced chart.';
comment on column public.daily_chart_preferences.timezone is
  'Canonical IANA timezone used to schedule the chart-tier daily brief.';
comment on column public.daily_chart_preferences.chart_id is
  'Exactly one explicitly selected synced chart; null only after that chart is deleted, which pauses delivery.';
comment on column public.daily_chart_preferences.recipient_hash is
  'Non-reversible HMAC used for identity checks, one-email suppression, and list-specific revocation.';
comment on column public.daily_chart_preferences.confirmation_token_hash is
  'SHA-256 of the one current pending confirmation token; cleared on confirmation so cancel and replacement invalidate prior links.';
comment on table public.daily_sun_preferences is
  'Server-owned active sun-sign daily consent; pending requests can never grant or replace delivery authority.';
comment on column public.daily_sun_preferences.recipient_hash is
  'Non-reversible HMAC of the normalized recipient email.';
comment on column public.daily_sun_preferences.confirmed_by_attempt_id is
  'Last successful confirmation owner, retained so a lost completion response can be retried idempotently.';
comment on table public.daily_sun_confirmation_requests is
  'One replaceable DOI request per recipient, separate from active consent so sign changes preserve the old authority until confirmed.';
comment on column public.daily_sun_confirmation_requests.confirmation_token_hash is
  'SHA-256 of the current sealed confirmation token; raw email and token are never stored.';
comment on column public.daily_sun_confirmation_requests.attempt_id is
  'Opaque CAS owner for a confirming worker; ownership may be reclaimed after the five-minute claimed_at lease.';
comment on table public.daily_sun_confirmation_rate_limits is
  'Server-only per-recipient cooldown for public Sun DOI requests; it is not delivery authority.';
comment on table public.daily_email_deliveries is
  'Idempotency and provider receipts for daily email; raw email is never stored.';
comment on column public.daily_email_deliveries.recipient_hash is
  'Lowercase hexadecimal HMAC-SHA256 of the normalized recipient email.';
comment on column public.daily_email_deliveries.lease_token is
  'Opaque per-attempt owner token required to finalize or fail a reservation.';
comment on table public.push_subscriptions is
  'Server-owned Web Push delivery endpoints and browser-generated encryption keys.';
