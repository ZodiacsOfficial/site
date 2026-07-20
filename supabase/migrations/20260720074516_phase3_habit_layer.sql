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
  confirmation_token_hash text,
  confirmation_state text not null default 'pending',
  confirmed_at timestamptz,
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
    ),
  constraint daily_sun_preferences_confirmation_token_hash_valid
    check (
      confirmation_token_hash is null
      or (
        octet_length(confirmation_token_hash) = 64
        and confirmation_token_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint daily_sun_preferences_confirmation_state_valid
    check (
      (
        confirmation_state in ('pending', 'confirming')
        and confirmation_token_hash is not null
        and confirmed_at is null
      )
      or (
        confirmation_state = 'confirmed'
        and confirmation_token_hash is null
        and confirmed_at is not null
      )
      or (
        confirmation_state = 'revoked'
        and confirmation_token_hash is null
        and confirmed_at is null
      )
    )
);

create index daily_sun_preferences_state_updated_idx
  on public.daily_sun_preferences (confirmation_state, updated_at);

create or replace function public.stage_daily_sun_confirmation(
  candidate_recipient_hash text,
  candidate_sign text,
  candidate_token_hash text
)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_state text;
begin
  insert into public.daily_sun_preferences (
    recipient_hash,
    sign,
    confirmation_token_hash,
    confirmation_state,
    confirmed_at
  ) values (
    candidate_recipient_hash,
    candidate_sign,
    candidate_token_hash,
    'pending',
    null
  )
  on conflict (recipient_hash) do nothing;

  if found then
    return 'pending';
  end if;

  -- Pending links may be replaced and a revoked address may explicitly start
  -- over. Never overwrite confirmed consent or an in-flight confirmation.
  update public.daily_sun_preferences
  set sign = candidate_sign,
      confirmation_token_hash = candidate_token_hash,
      confirmation_state = 'pending',
      confirmed_at = null
  where recipient_hash = candidate_recipient_hash
    and confirmation_state in ('pending', 'revoked')
  returning confirmation_state into current_state;

  if found then
    return 'pending';
  end if;

  select confirmation_state
  into current_state
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;

  if current_state = 'confirmed' then
    return 'already_on';
  end if;
  if current_state = 'confirming' then
    return 'already_pending';
  end if;

  raise exception 'daily sun confirmation state changed unexpectedly';
end;
$$;

revoke all on function public.stage_daily_sun_confirmation(text, text, text)
  from public, anon, authenticated;
grant execute on function public.stage_daily_sun_confirmation(text, text, text)
  to service_role;

-- Either daily unsubscribe link revokes both authoritative tiers in one
-- transaction. Provider segments are routing metadata only and are cleaned up
-- afterward; a provider outage can never leave chart delivery authorized.
create or replace function public.revoke_daily_email_preferences(
  candidate_recipient_hash text
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

  update public.daily_sun_preferences
  set confirmation_token_hash = null,
      confirmation_state = 'revoked',
      confirmed_at = null
  where recipient_hash = candidate_recipient_hash;

  delete from public.daily_chart_preferences
  where recipient_hash = candidate_recipient_hash;
end;
$$;

revoke all on function public.revoke_daily_email_preferences(text)
  from public, anon, authenticated;
grant execute on function public.revoke_daily_email_preferences(text)
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

create table public.push_subscriptions (
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

create trigger daily_chart_preferences_touch_updated_at
before update on public.daily_chart_preferences
for each row
execute function public.touch_phase3_updated_at();

create trigger daily_sun_preferences_touch_updated_at
before update on public.daily_sun_preferences
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
alter table public.daily_email_deliveries enable row level security;
alter table public.push_subscriptions enable row level security;

-- Revoke first so projects with legacy automatic public-schema grants end in
-- the same least-privilege state as projects using the 2026 secure defaults.
revoke all on table public.daily_chart_preferences
  from public, anon, authenticated, service_role;
revoke all on table public.daily_sun_preferences
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
  'Non-reversible HMAC used only to make either daily unsubscribe link revoke both daily tiers.';
comment on column public.daily_chart_preferences.confirmation_token_hash is
  'SHA-256 of the one current pending confirmation token; cleared on confirmation so cancel and replacement invalidate prior links.';
comment on table public.daily_sun_preferences is
  'Server-owned sun-sign daily consent state; stores only HMAC and token digests, never a raw email address.';
comment on column public.daily_sun_preferences.recipient_hash is
  'Non-reversible HMAC of the normalized recipient email.';
comment on column public.daily_sun_preferences.confirmation_token_hash is
  'SHA-256 of the one current pending or in-flight confirmation token; cleared after confirmation or revocation.';
comment on column public.daily_sun_preferences.confirmation_state is
  'CAS lifecycle for scanner-safe DOI: pending, confirming, confirmed, or revoked.';
comment on table public.daily_email_deliveries is
  'Idempotency and provider receipts for daily email; raw email is never stored.';
comment on column public.daily_email_deliveries.recipient_hash is
  'Lowercase hexadecimal HMAC-SHA256 of the normalized recipient email.';
comment on column public.daily_email_deliveries.lease_token is
  'Opaque per-attempt owner token required to finalize or fail a reservation.';
comment on table public.push_subscriptions is
  'Server-owned Web Push delivery endpoints and browser-generated encryption keys.';
