-- Phase 4 private compatibility invitations.
--
-- The three tables in this migration are server-owned. Browser roles receive
-- no table policies or privileges; every operation goes through the
-- service-role-only RPCs below. An invitation stores one already-computed
-- positions wire. It never stores birth input, email, a saved-chart id, or
-- any recipient data.

create or replace function public.is_valid_compatibility_invite_token_hash(
  candidate text
)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select candidate is not null
    and octet_length(candidate) = 64
    and candidate ~ '^[0-9a-f]{64}$';
$$;

create or replace function public.compatibility_invite_sun_sign(
  candidate_longitude numeric
)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case floor(candidate_longitude / 30)::integer
    when 0 then 'aries'
    when 1 then 'taurus'
    when 2 then 'gemini'
    when 3 then 'cancer'
    when 4 then 'leo'
    when 5 then 'virgo'
    when 6 then 'libra'
    when 7 then 'scorpio'
    when 8 then 'sagittarius'
    when 9 then 'capricorn'
    when 10 then 'aquarius'
    when 11 then 'pisces'
    else null
  end;
$$;

-- Validate the exact compact v2 positions wire from share-positions.ts:
--   b: twelve longitudes in canonical body order
--   a: optional [ASC, MC]
--   h: whole/placidus marker
--   v: bounded engine version
-- No unknown key or birth-shaped field can enter the persistence layer.
create or replace function public.is_valid_compatibility_invite_positions(
  candidate jsonb,
  candidate_time_known boolean,
  candidate_sun_sign text
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public
as $$
declare
  wire_key text;
  longitude_value jsonb;
  longitude_number numeric;
  body_count integer := 0;
  angle_count integer := 0;
  expected_key_count integer;
begin
  if candidate is null
    or jsonb_typeof(candidate) <> 'object'
    or candidate_time_known is null
    or candidate_sun_sign is null
    or candidate_sun_sign not in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )
    or octet_length(candidate::text) > 1024
  then
    return false;
  end if;

  expected_key_count := case when candidate ? 'a' then 4 else 3 end;
  if (select count(*) from jsonb_object_keys(candidate)) <> expected_key_count then
    return false;
  end if;

  for wire_key in select jsonb_object_keys(candidate)
  loop
    if wire_key not in ('b', 'a', 'h', 'v') then
      return false;
    end if;
  end loop;

  if jsonb_typeof(candidate->'b') <> 'array'
    or jsonb_array_length(candidate->'b') <> 12
    or jsonb_typeof(candidate->'h') <> 'string'
    or candidate->>'h' not in ('w', 'p')
    or jsonb_typeof(candidate->'v') <> 'string'
    or octet_length(candidate->>'v') not between 1 and 32
    or candidate->>'v' !~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$'
  then
    return false;
  end if;

  for longitude_value in select value from jsonb_array_elements(candidate->'b')
  loop
    if jsonb_typeof(longitude_value) <> 'number' then
      return false;
    end if;
    longitude_number := (longitude_value #>> '{}')::numeric;
    if longitude_number < 0
      or longitude_number >= 360
      or scale(longitude_number) > 3
    then
      return false;
    end if;
    body_count := body_count + 1;
  end loop;
  if body_count <> 12 then
    return false;
  end if;

  if candidate_time_known <> (candidate ? 'a') then
    return false;
  end if;

  if candidate ? 'a' then
    if jsonb_typeof(candidate->'a') <> 'array'
      or jsonb_array_length(candidate->'a') <> 2
    then
      return false;
    end if;
    for longitude_value in select value from jsonb_array_elements(candidate->'a')
    loop
      if jsonb_typeof(longitude_value) <> 'number' then
        return false;
      end if;
      longitude_number := (longitude_value #>> '{}')::numeric;
      if longitude_number < 0
        or longitude_number >= 360
        or scale(longitude_number) > 3
      then
        return false;
      end if;
      angle_count := angle_count + 1;
    end loop;
    if angle_count <> 2 then
      return false;
    end if;
  end if;

  return public.compatibility_invite_sun_sign(
    (candidate->'b'->>0)::numeric
  ) = candidate_sun_sign;
exception
  when others then
    return false;
end;
$$;

create table if not exists public.compatibility_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text unique,
  -- A domain-separated replay digest is written only after completion. It
  -- cannot open/read an invitation and lets a lost completion response be
  -- retried without retaining token authority.
  completion_replay_hash text unique,
  label text not null,
  sun_sign text not null,
  positions jsonb,
  time_known boolean not null,
  status text not null default 'active',
  notify_on_complete boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  authority_destroyed_at timestamptz,
  delete_after timestamptz,
  owner_hidden_at timestamptz,
  constraint compatibility_invites_token_hash_valid
    check (
      token_hash is null
      or public.is_valid_compatibility_invite_token_hash(token_hash)
    ),
  constraint compatibility_invites_completion_replay_hash_valid
    check (
      completion_replay_hash is null
      or public.is_valid_compatibility_invite_token_hash(completion_replay_hash)
    ),
  constraint compatibility_invites_label_valid
    check (
      char_length(label) between 1 and 24
      and octet_length(label) <= 96
      and label = btrim(label)
      and label !~ '[[:cntrl:]]'
    ),
  constraint compatibility_invites_sun_sign_valid
    check (
      sun_sign in (
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
      )
    ),
  constraint compatibility_invites_positions_valid
    check (
      positions is null
      or public.is_valid_compatibility_invite_positions(
        positions,
        time_known,
        sun_sign
      )
    ),
  constraint compatibility_invites_status_valid
    check (status in ('active', 'completed', 'revoked', 'expired')),
  constraint compatibility_invites_expiry_exact
    check (expires_at = created_at + interval '14 days'),
  constraint compatibility_invites_opened_valid
    check (
      opened_at is null
      or (
        opened_at >= created_at
        and opened_at <= expires_at
      )
    ),
  constraint compatibility_invites_owner_hidden_valid
    check (
      owner_hidden_at is null
      or (
        status <> 'active'
        and authority_destroyed_at is not null
        and owner_hidden_at >= authority_destroyed_at
      )
    ),
  constraint compatibility_invites_state_valid
    check (
      (
        status = 'active'
        and token_hash is not null
        and completion_replay_hash is null
        and positions is not null
        and completed_at is null
        and revoked_at is null
        and expired_at is null
        and authority_destroyed_at is null
        and delete_after is null
      )
      or (
        status = 'completed'
        and token_hash is null
        and completion_replay_hash is not null
        and positions is null
        and completed_at is not null
        and revoked_at is null
        and expired_at is null
        and authority_destroyed_at = completed_at
        and delete_after = authority_destroyed_at + interval '30 days'
      )
      or (
        status = 'revoked'
        and token_hash is null
        and completion_replay_hash is null
        and positions is null
        and completed_at is null
        and revoked_at is not null
        and expired_at is null
        and authority_destroyed_at = revoked_at
        and delete_after = authority_destroyed_at + interval '30 days'
      )
      or (
        status = 'expired'
        and token_hash is null
        and completion_replay_hash is null
        and positions is null
        and completed_at is null
        and revoked_at is null
        and expired_at is not null
        and authority_destroyed_at = expired_at
        and delete_after = authority_destroyed_at + interval '30 days'
      )
    )
);

create index if not exists compatibility_invites_owner_created_idx
  on public.compatibility_invites (owner_user_id, created_at desc);

create index if not exists compatibility_invites_owner_active_idx
  on public.compatibility_invites (owner_user_id, expires_at)
  where status = 'active';

create index if not exists compatibility_invites_active_expiry_idx
  on public.compatibility_invites (expires_at, id)
  where status = 'active';

create index if not exists compatibility_invites_delete_after_idx
  on public.compatibility_invites (delete_after, id)
  where delete_after is not null;

create table if not exists public.compatibility_invite_delivery_claims (
  invite_id uuid not null
    references public.compatibility_invites(id) on delete cascade,
  channel text not null default 'email',
  state text not null default 'reserved',
  claim_token uuid not null,
  recipient_hash text not null,
  provider_receipt text,
  provider_status smallint,
  claimed_at timestamptz not null default clock_timestamp(),
  finalized_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (invite_id, channel),
  constraint compatibility_invite_delivery_channel_valid
    check (channel = 'email'),
  constraint compatibility_invite_delivery_state_valid
    check (state in ('reserved', 'sent', 'failed')),
  constraint compatibility_invite_delivery_recipient_hash_valid
    check (public.is_valid_compatibility_invite_token_hash(recipient_hash)),
  constraint compatibility_invite_delivery_provider_receipt_valid
    check (
      provider_receipt is null
      or octet_length(provider_receipt) between 1 and 512
    ),
  constraint compatibility_invite_delivery_provider_status_valid
    check (
      provider_status is null
      or provider_status between 100 and 599
    ),
  constraint compatibility_invite_delivery_final_state_valid
    check (
      (
        state = 'reserved'
        and provider_receipt is null
        and provider_status is null
        and finalized_at is null
      )
      or (
        state = 'sent'
        and provider_receipt is not null
        and provider_status is not null
        and finalized_at is not null
      )
      or (
        state = 'failed'
        and provider_receipt is null
        and finalized_at is not null
      )
    )
);

create index if not exists compatibility_invite_delivery_state_idx
  on public.compatibility_invite_delivery_claims (state, claimed_at);

create table if not exists public.compatibility_invite_events (
  invite_id uuid not null
    references public.compatibility_invites(id) on delete cascade,
  event text not null,
  occurred_at timestamptz not null default clock_timestamp(),
  primary key (invite_id, event),
  constraint compatibility_invite_events_event_valid
    check (event in ('created', 'opened', 'completed', 'revoked', 'expired'))
);

create index if not exists compatibility_invite_events_occurred_idx
  on public.compatibility_invite_events (occurred_at, invite_id);

-- Close overdue authority and delete terminal skeletons in bounded batches.
-- FOR UPDATE SKIP LOCKED keeps this maintenance path from blocking a
-- completion or revocation already in progress.
create or replace function public.prune_compatibility_invites(
  candidate_limit integer default 64
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  expired_ids uuid[];
  removed_ids uuid[];
begin
  if candidate_limit is null or candidate_limit < 1 or candidate_limit > 256 then
    raise exception 'invalid compatibility invite prune limit'
      using errcode = '22023';
  end if;

  with candidates as materialized (
    select id
    from public.compatibility_invites
    where status = 'active'
      and expires_at <= operation_time
    order by expires_at, id
    for update skip locked
    limit candidate_limit
  ), closed as (
    update public.compatibility_invites as invites
    set status = 'expired',
        token_hash = null,
        positions = null,
        expired_at = operation_time,
        authority_destroyed_at = operation_time,
        delete_after = operation_time + interval '30 days'
    from candidates
    where invites.id = candidates.id
      and invites.status = 'active'
      and invites.expires_at <= operation_time
    returning invites.id
  )
  select coalesce(array_agg(id), array[]::uuid[])
  into expired_ids
  from closed;

  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  )
  select invite_id, 'expired', operation_time
  from unnest(expired_ids) as invite_id
  on conflict (invite_id, event) do nothing;

  with candidates as materialized (
    select id
    from public.compatibility_invites
    where delete_after <= operation_time
    order by delete_after, id
    for update skip locked
    limit candidate_limit
  ), removed as (
    delete from public.compatibility_invites as invites
    using candidates
    where invites.id = candidates.id
      and invites.delete_after <= operation_time
    returning invites.id
  )
  select coalesce(array_agg(id), array[]::uuid[])
  into removed_ids
  from removed;

  return jsonb_build_object(
    'expired', cardinality(expired_ids),
    'pruned', cardinality(removed_ids)
  );
end;
$$;

create or replace function public.create_compatibility_invite(
  candidate_owner_user_id uuid,
  candidate_label text,
  candidate_sun_sign text,
  candidate_positions jsonb,
  candidate_time_known boolean,
  candidate_notify_on_complete boolean,
  candidate_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz;
  active_count integer;
  rolling_count integer;
  new_invite_id uuid;
  new_expires_at timestamptz;
begin
  if candidate_owner_user_id is null
    or candidate_label is null
    or char_length(candidate_label) not between 1 and 24
    or octet_length(candidate_label) > 96
    or candidate_label <> btrim(candidate_label)
    or candidate_label ~ '[[:cntrl:]]'
    or candidate_notify_on_complete is null
    or not public.is_valid_compatibility_invite_token_hash(candidate_token_hash)
    or not public.is_valid_compatibility_invite_positions(
      candidate_positions,
      candidate_time_known,
      candidate_sun_sign
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  -- The lock is taken before the clocks and counts. Concurrent creates for
  -- one account therefore observe one exact rolling-window order.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_owner_user_id::text, 7312030)
  );
  operation_time := clock_timestamp();

  if not exists (
    select 1 from auth.users where id = candidate_owner_user_id
  ) then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  with closed as (
    update public.compatibility_invites
    set status = 'expired',
        token_hash = null,
        positions = null,
        expired_at = operation_time,
        authority_destroyed_at = operation_time,
        delete_after = operation_time + interval '30 days'
    where owner_user_id = candidate_owner_user_id
      and status = 'active'
      and expires_at <= operation_time
    returning id
  )
  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  )
  select id, 'expired', operation_time
  from closed
  on conflict (invite_id, event) do nothing;

  delete from public.compatibility_invites
  where owner_user_id = candidate_owner_user_id
    and delete_after <= operation_time;

  select count(*)
  into active_count
  from public.compatibility_invites
  where owner_user_id = candidate_owner_user_id
    and status = 'active';
  if active_count >= 12 then
    return jsonb_build_object('outcome', 'active_limit');
  end if;

  select count(*)
  into rolling_count
  from public.compatibility_invites
  where owner_user_id = candidate_owner_user_id
    and created_at > operation_time - interval '24 hours';
  if rolling_count >= 20 then
    return jsonb_build_object('outcome', 'creation_rate_limit');
  end if;

  new_invite_id := gen_random_uuid();
  new_expires_at := operation_time + interval '14 days';
  insert into public.compatibility_invites (
    id,
    owner_user_id,
    token_hash,
    label,
    sun_sign,
    positions,
    time_known,
    notify_on_complete,
    created_at,
    expires_at
  ) values (
    new_invite_id,
    candidate_owner_user_id,
    candidate_token_hash,
    candidate_label,
    candidate_sun_sign,
    candidate_positions,
    candidate_time_known,
    candidate_notify_on_complete,
    operation_time,
    new_expires_at
  );

  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  ) values (
    new_invite_id,
    'created',
    operation_time
  );

  return jsonb_build_object(
    'outcome', 'created',
    'invite_id', new_invite_id,
    'expires_at', new_expires_at
  );
exception
  when unique_violation then
    return jsonb_build_object('outcome', 'token_conflict');
end;
$$;

create or replace function public.open_compatibility_invite(
  candidate_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
begin
  if not public.is_valid_compatibility_invite_token_hash(candidate_token_hash) then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select *
  into current_invite
  from public.compatibility_invites
  where token_hash = candidate_token_hash
  for update;
  if not found then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  if current_invite.status <> 'active'
    or current_invite.expires_at <= operation_time
  then
    if current_invite.status = 'active' then
      update public.compatibility_invites
      set status = 'expired',
          token_hash = null,
          positions = null,
          expired_at = operation_time,
          authority_destroyed_at = operation_time,
          delete_after = operation_time + interval '30 days'
      where id = current_invite.id;
      insert into public.compatibility_invite_events (
        invite_id,
        event,
        occurred_at
      ) values (
        current_invite.id,
        'expired',
        operation_time
      ) on conflict (invite_id, event) do nothing;
    end if;
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  update public.compatibility_invites
  set opened_at = coalesce(opened_at, operation_time)
  where id = current_invite.id;

  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  ) values (
    current_invite.id,
    'opened',
    operation_time
  ) on conflict (invite_id, event) do nothing;

  return jsonb_build_object(
    'outcome', 'ready',
    'expires_at', current_invite.expires_at
  );
end;
$$;

create or replace function public.read_compatibility_invite(
  candidate_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
begin
  if not public.is_valid_compatibility_invite_token_hash(candidate_token_hash) then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select *
  into current_invite
  from public.compatibility_invites
  where token_hash = candidate_token_hash
  for update;
  if not found then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  if current_invite.status <> 'active'
    or current_invite.expires_at <= operation_time
  then
    if current_invite.status = 'active' then
      update public.compatibility_invites
      set status = 'expired',
          token_hash = null,
          positions = null,
          expired_at = operation_time,
          authority_destroyed_at = operation_time,
          delete_after = operation_time + interval '30 days'
      where id = current_invite.id;
      insert into public.compatibility_invite_events (
        invite_id,
        event,
        occurred_at
      ) values (
        current_invite.id,
        'expired',
        operation_time
      ) on conflict (invite_id, event) do nothing;
    end if;
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  return jsonb_build_object(
    'outcome', 'ready',
    'label', current_invite.label,
    'sun_sign', current_invite.sun_sign,
    'positions', current_invite.positions,
    'time_known', current_invite.time_known,
    'expires_at', current_invite.expires_at
  );
end;
$$;

create or replace function public.complete_compatibility_invite(
  candidate_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
  replay_hash text;
begin
  if not public.is_valid_compatibility_invite_token_hash(candidate_token_hash) then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  replay_hash := encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        'zodiacs.compatibility.complete.v1:' || candidate_token_hash,
        'UTF8'
      )
    ),
    'hex'
  );

  select *
  into current_invite
  from public.compatibility_invites
  where token_hash = candidate_token_hash
  for update;

  if not found then
    select *
    into current_invite
    from public.compatibility_invites
    where completion_replay_hash = replay_hash
      and status = 'completed'
    for update;
    if not found then
      return jsonb_build_object('outcome', 'unavailable');
    end if;
    return jsonb_build_object(
      'outcome', 'duplicate',
      'invite_id', current_invite.id,
      'owner_user_id', current_invite.owner_user_id,
      'label', current_invite.label,
      'notify_on_complete', current_invite.notify_on_complete,
      'completed_at', current_invite.completed_at
    );
  end if;

  if current_invite.status <> 'active'
    or current_invite.expires_at <= operation_time
  then
    if current_invite.status = 'active' then
      update public.compatibility_invites
      set status = 'expired',
          token_hash = null,
          positions = null,
          expired_at = operation_time,
          authority_destroyed_at = operation_time,
          delete_after = operation_time + interval '30 days'
      where id = current_invite.id;
      insert into public.compatibility_invite_events (
        invite_id,
        event,
        occurred_at
      ) values (
        current_invite.id,
        'expired',
        operation_time
      ) on conflict (invite_id, event) do nothing;
    end if;
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  update public.compatibility_invites
  set status = 'completed',
      token_hash = null,
      completion_replay_hash = replay_hash,
      positions = null,
      completed_at = operation_time,
      authority_destroyed_at = operation_time,
      delete_after = operation_time + interval '30 days'
  where id = current_invite.id;

  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  ) values (
    current_invite.id,
    'completed',
    operation_time
  ) on conflict (invite_id, event) do nothing;

  return jsonb_build_object(
    'outcome', 'completed',
    'invite_id', current_invite.id,
    'owner_user_id', current_invite.owner_user_id,
    'label', current_invite.label,
    'notify_on_complete', current_invite.notify_on_complete,
    'completed_at', operation_time
  );
end;
$$;

create or replace function public.revoke_compatibility_invite(
  candidate_owner_user_id uuid,
  candidate_invite_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
begin
  if candidate_owner_user_id is null or candidate_invite_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  select *
  into current_invite
  from public.compatibility_invites
  where id = candidate_invite_id
    and owner_user_id = candidate_owner_user_id
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if current_invite.status <> 'active' then
    return jsonb_build_object(
      'outcome', current_invite.status,
      'invite_id', current_invite.id
    );
  end if;

  if current_invite.expires_at <= operation_time then
    update public.compatibility_invites
    set status = 'expired',
        token_hash = null,
        positions = null,
        expired_at = operation_time,
        authority_destroyed_at = operation_time,
        delete_after = operation_time + interval '30 days'
    where id = current_invite.id;
    insert into public.compatibility_invite_events (
      invite_id,
      event,
      occurred_at
    ) values (
      current_invite.id,
      'expired',
      operation_time
    ) on conflict (invite_id, event) do nothing;
    return jsonb_build_object(
      'outcome', 'expired',
      'invite_id', current_invite.id
    );
  end if;

  update public.compatibility_invites
  set status = 'revoked',
      token_hash = null,
      positions = null,
      revoked_at = operation_time,
      authority_destroyed_at = operation_time,
      delete_after = operation_time + interval '30 days'
  where id = current_invite.id;

  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  ) values (
    current_invite.id,
    'revoked',
    operation_time
  ) on conflict (invite_id, event) do nothing;

  return jsonb_build_object(
    'outcome', 'revoked',
    'invite_id', current_invite.id
  );
end;
$$;

create or replace function public.list_compatibility_invites(
  candidate_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz;
  invite_rows jsonb;
begin
  if candidate_owner_user_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(candidate_owner_user_id::text, 7312030)
  );
  operation_time := clock_timestamp();

  with closed as (
    update public.compatibility_invites
    set status = 'expired',
        token_hash = null,
        positions = null,
        expired_at = operation_time,
        authority_destroyed_at = operation_time,
        delete_after = operation_time + interval '30 days'
    where owner_user_id = candidate_owner_user_id
      and status = 'active'
      and expires_at <= operation_time
    returning id
  )
  insert into public.compatibility_invite_events (
    invite_id,
    event,
    occurred_at
  )
  select id, 'expired', operation_time
  from closed
  on conflict (invite_id, event) do nothing;

  delete from public.compatibility_invites
  where owner_user_id = candidate_owner_user_id
    and delete_after <= operation_time;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'label', label,
        'sun_sign', sun_sign,
        'status', status,
        'notify_on_complete', notify_on_complete,
        'created_at', created_at,
        'expires_at', expires_at,
        'opened_at', opened_at,
        'completed_at', completed_at,
        'revoked_at', revoked_at,
        'expired_at', expired_at
      )
      order by created_at desc, id
    ),
    '[]'::jsonb
  )
  into invite_rows
  from public.compatibility_invites
  where owner_user_id = candidate_owner_user_id
    and owner_hidden_at is null;

  return jsonb_build_object(
    'outcome', 'ok',
    'invites', invite_rows
  );
end;
$$;

-- Hiding is an owner-only presentation action, not early erasure. It is
-- accepted only after authority has already ended, retains the 30-day
-- evidence skeleton, and is idempotent.
create or replace function public.hide_compatibility_invite(
  candidate_owner_user_id uuid,
  candidate_invite_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
begin
  if candidate_owner_user_id is null or candidate_invite_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  select *
  into current_invite
  from public.compatibility_invites
  where id = candidate_invite_id
    and owner_user_id = candidate_owner_user_id
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if current_invite.status = 'active' then
    return jsonb_build_object(
      'outcome', 'active',
      'invite_id', current_invite.id
    );
  end if;

  update public.compatibility_invites
  set owner_hidden_at = coalesce(owner_hidden_at, operation_time)
  where id = current_invite.id;

  return jsonb_build_object(
    'outcome', 'hidden',
    'invite_id', current_invite.id
  );
end;
$$;

create or replace function public.reserve_compatibility_invite_delivery(
  candidate_invite_id uuid,
  candidate_recipient_hash text,
  candidate_claim_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_invite public.compatibility_invites%rowtype;
  current_claim public.compatibility_invite_delivery_claims%rowtype;
begin
  if candidate_invite_id is null
    or candidate_claim_token is null
    or not public.is_valid_compatibility_invite_token_hash(
      candidate_recipient_hash
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select *
  into current_invite
  from public.compatibility_invites
  where id = candidate_invite_id
  for update;
  if not found
    or current_invite.status <> 'completed'
    or not current_invite.notify_on_complete
  then
    return jsonb_build_object('outcome', 'skipped');
  end if;

  insert into public.compatibility_invite_delivery_claims (
    invite_id,
    channel,
    state,
    claim_token,
    recipient_hash,
    claimed_at,
    updated_at
  ) values (
    candidate_invite_id,
    'email',
    'reserved',
    candidate_claim_token,
    candidate_recipient_hash,
    operation_time,
    operation_time
  )
  on conflict (invite_id, channel) do nothing;

  if found then
    return jsonb_build_object(
      'outcome', 'reserved',
      'state', 'reserved'
    );
  end if;

  select *
  into current_claim
  from public.compatibility_invite_delivery_claims
  where invite_id = candidate_invite_id
    and channel = 'email';

  return jsonb_build_object(
    'outcome', 'duplicate',
    'state', current_claim.state
  );
end;
$$;

create or replace function public.finalize_compatibility_invite_delivery(
  candidate_invite_id uuid,
  candidate_claim_token uuid,
  candidate_outcome text,
  candidate_provider_receipt text,
  candidate_provider_status integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  operation_time timestamptz := clock_timestamp();
  current_claim public.compatibility_invite_delivery_claims%rowtype;
begin
  if candidate_invite_id is null
    or candidate_claim_token is null
    or candidate_outcome is null
    or candidate_outcome not in ('sent', 'failed')
    or (
      candidate_outcome = 'sent'
      and (
        candidate_provider_receipt is null
        or octet_length(candidate_provider_receipt) not between 1 and 512
        or candidate_provider_status is null
        or candidate_provider_status not between 100 and 599
      )
    )
    or (
      candidate_outcome = 'failed'
      and (
        candidate_provider_receipt is not null
        or (
          candidate_provider_status is not null
          and candidate_provider_status not between 100 and 599
        )
      )
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select *
  into current_claim
  from public.compatibility_invite_delivery_claims
  where invite_id = candidate_invite_id
    and channel = 'email'
  for update;
  if not found or current_claim.claim_token <> candidate_claim_token then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  if current_claim.state <> 'reserved' then
    return jsonb_build_object(
      'outcome', 'duplicate',
      'state', current_claim.state
    );
  end if;

  update public.compatibility_invite_delivery_claims
  set state = candidate_outcome,
      provider_receipt = candidate_provider_receipt,
      provider_status = candidate_provider_status,
      finalized_at = operation_time,
      updated_at = operation_time
  where invite_id = candidate_invite_id
    and channel = 'email'
    and claim_token = candidate_claim_token
    and state = 'reserved';

  return jsonb_build_object(
    'outcome', 'finalized',
    'state', candidate_outcome
  );
end;
$$;

alter table public.compatibility_invites enable row level security;
alter table public.compatibility_invite_delivery_claims enable row level security;
alter table public.compatibility_invite_events enable row level security;

-- Revoke first so both legacy automatic grants and the 2026 secure defaults
-- converge on the same no-browser, RPC-only posture.
revoke all on table public.compatibility_invites
  from public, anon, authenticated, service_role;
revoke all on table public.compatibility_invite_delivery_claims
  from public, anon, authenticated, service_role;
revoke all on table public.compatibility_invite_events
  from public, anon, authenticated, service_role;

revoke all on function public.is_valid_compatibility_invite_token_hash(text)
  from public, anon, authenticated;
revoke all on function public.compatibility_invite_sun_sign(numeric)
  from public, anon, authenticated;
revoke all on function public.is_valid_compatibility_invite_positions(jsonb, boolean, text)
  from public, anon, authenticated;
revoke all on function public.prune_compatibility_invites(integer)
  from public, anon, authenticated;
revoke all on function public.create_compatibility_invite(uuid, text, text, jsonb, boolean, boolean, text)
  from public, anon, authenticated;
revoke all on function public.open_compatibility_invite(text)
  from public, anon, authenticated;
revoke all on function public.read_compatibility_invite(text)
  from public, anon, authenticated;
revoke all on function public.complete_compatibility_invite(text)
  from public, anon, authenticated;
revoke all on function public.revoke_compatibility_invite(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_compatibility_invites(uuid)
  from public, anon, authenticated;
revoke all on function public.hide_compatibility_invite(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reserve_compatibility_invite_delivery(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_compatibility_invite_delivery(uuid, uuid, text, text, integer)
  from public, anon, authenticated;

grant execute on function public.is_valid_compatibility_invite_token_hash(text)
  to service_role;
grant execute on function public.compatibility_invite_sun_sign(numeric)
  to service_role;
grant execute on function public.is_valid_compatibility_invite_positions(jsonb, boolean, text)
  to service_role;
grant execute on function public.prune_compatibility_invites(integer)
  to service_role;
grant execute on function public.create_compatibility_invite(uuid, text, text, jsonb, boolean, boolean, text)
  to service_role;
grant execute on function public.open_compatibility_invite(text)
  to service_role;
grant execute on function public.read_compatibility_invite(text)
  to service_role;
grant execute on function public.complete_compatibility_invite(text)
  to service_role;
grant execute on function public.revoke_compatibility_invite(uuid, uuid)
  to service_role;
grant execute on function public.list_compatibility_invites(uuid)
  to service_role;
grant execute on function public.hide_compatibility_invite(uuid, uuid)
  to service_role;
grant execute on function public.reserve_compatibility_invite_delivery(uuid, text, uuid)
  to service_role;
grant execute on function public.finalize_compatibility_invite_delivery(uuid, uuid, text, text, integer)
  to service_role;

comment on table public.compatibility_invites is
  'Server-owned 14-day, one-reading compatibility invitations. Birth input, email, chart ids, and recipient data are never stored.';
comment on column public.compatibility_invites.token_hash is
  'SHA-256 of a 32-byte random bearer token. Null immediately at completion, revocation, or expiry.';
comment on column public.compatibility_invites.completion_replay_hash is
  'Domain-separated, non-authoritative digest retained only to make completion retries idempotent after token authority is destroyed.';
comment on column public.compatibility_invites.positions is
  'Strict compact v2 twelve-body positions wire. Null immediately when invitation authority ends.';
comment on table public.compatibility_invite_delivery_claims is
  'At-most-once completion-email claims. Recipient identity is a keyed HMAC; raw email is never stored.';
comment on table public.compatibility_invite_events is
  'Non-sensitive invitation lifecycle evidence with no token, label, positions, URL, IP, user agent, or recipient data.';
