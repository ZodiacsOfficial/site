-- Phase 7 Living Chart sync.
--
-- This is deliberately independent of Account Sync v2 so it can ship on the
-- existing Supabase Auth + Data API foundation. Living Chart content is normal
-- Postgres JSON protected by owner-only RLS and Supabase's platform encryption
-- at rest; it is not end-to-end encrypted and is not opaque to the service.
--
-- All mutations are replay-safe RPCs. Browser roles can select only their own
-- consent and the rows for the currently granted consent epoch. Withdrawal
-- atomically erases all remote moments before advancing the epoch, preventing
-- a stale tab from restoring withdrawn data.

create schema if not exists living_chart_private;

revoke all on schema living_chart_private from public, anon;
grant usage on schema living_chart_private to authenticated, service_role;

-- Remove superseded development overloads before installing the final wire
-- contract. DROP removes any legacy EXECUTE ACL with the object and avoids a
-- default-argument overload silently receiving browser calls during upgrade.
do $$
begin
  if to_regprocedure('public.living_chart_sync_snapshot(bigint)') is not null then
    execute 'revoke all on function public.living_chart_sync_snapshot(bigint) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('public.set_living_chart_sync_consent(text,uuid,text)') is not null then
    execute 'revoke all on function public.set_living_chart_sync_consent(text,uuid,text) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('public.set_living_chart_sync_consent(text,uuid,bigint)') is not null then
    execute 'revoke all on function public.set_living_chart_sync_consent(text,uuid,bigint) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('living_chart_private.set_living_chart_sync_consent_impl(text,uuid,text)') is not null then
    execute 'revoke all on function living_chart_private.set_living_chart_sync_consent_impl(text,uuid,text) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('living_chart_private.set_living_chart_sync_consent_impl(text,uuid,bigint)') is not null then
    execute 'revoke all on function living_chart_private.set_living_chart_sync_consent_impl(text,uuid,bigint) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('living_chart_private.living_chart_record_mutation(uuid,uuid,text,text,jsonb)') is not null then
    execute 'revoke all on function living_chart_private.living_chart_record_mutation(uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role';
  end if;
end;
$$;

drop function if exists public.living_chart_sync_snapshot(bigint);
drop function if exists public.set_living_chart_sync_consent(text, uuid, text);
drop function if exists public.set_living_chart_sync_consent(text, uuid, bigint);
drop function if exists living_chart_private.set_living_chart_sync_consent_impl(text, uuid, text);
drop function if exists living_chart_private.set_living_chart_sync_consent_impl(text, uuid, bigint);
drop function if exists living_chart_private.living_chart_record_mutation(
  uuid, uuid, text, text, jsonb
);

create or replace function living_chart_private.living_chart_actor_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  anonymous_claim text;
begin
  actor_id := (select auth.uid());
  anonymous_claim := (select auth.jwt() ->> 'is_anonymous');
  -- Older non-anonymous JWTs may omit this newer claim. Reject only an
  -- explicit anonymous session; ownership still comes exclusively from
  -- auth.uid(), never user-editable metadata.
  if actor_id is null or anonymous_claim = 'true' then
    raise insufficient_privilege using message = 'authenticated account required';
  end if;
  return actor_id;
end;
$$;

revoke all on function living_chart_private.living_chart_actor_id() from public, anon;
grant execute on function living_chart_private.living_chart_actor_id() to authenticated, service_role;

create or replace function living_chart_private.living_chart_valid_date(candidate text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  parsed date;
begin
  if candidate is null
    or candidate !~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$' then
    return false;
  end if;
  parsed := make_date(
    substring(candidate from 1 for 4)::integer,
    substring(candidate from 6 for 2)::integer,
    substring(candidate from 9 for 2)::integer
  );
  return parsed between date '1800-01-01' and date '2199-12-31';
exception when others then
  return false;
end;
$$;

create or replace function living_chart_private.living_chart_valid_instant(candidate text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(
    candidate ~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$'
    and living_chart_private.living_chart_valid_date(substring(candidate from 1 for 10)),
    false
  );
$$;

create or replace function living_chart_private.living_chart_iso(candidate timestamptz)
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select to_char(
    candidate at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );
$$;

create or replace function living_chart_private.living_chart_text_safe(
  candidate text,
  allow_note_whitespace boolean
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  character_index integer;
  code_point integer;
begin
  if candidate is null then
    return false;
  end if;

  for character_index in 1..char_length(candidate) loop
    code_point := ascii(substring(candidate from character_index for 1));

    -- JavaScript String#trim uses this Unicode WhiteSpace/LineTerminator set.
    -- Reject it at either edge so a direct RPC cannot create a value which
    -- the strict browser parser would normalize and then refuse to load.
    if character_index in (1, char_length(candidate))
      and (
        code_point between 9 and 13
        or code_point in (
          32, 160, 5760, 8232, 8233, 8239, 8287, 12288, 65279
        )
        or code_point between 8192 and 8202
      ) then
      return false;
    end if;

    -- Match the browser parsers' Unicode Cc/Cf rejection. Notes alone may
    -- contain tab/LF; forecast lines and receipts are single-line values.
    -- CR is rejected because the note normalizer canonicalizes it to LF.
    if (code_point between 0 and 31
        and not (allow_note_whitespace and code_point in (9, 10)))
      or code_point between 127 and 159
      or code_point = 173
      or code_point between 1536 and 1541
      or code_point in (1564, 1757, 1807, 2274, 6158, 65279, 69821, 69837, 917505)
      or code_point between 2192 and 2193
      or code_point between 8203 and 8207
      or code_point between 8234 and 8238
      or code_point between 8288 and 8292
      or code_point between 8294 and 8303
      or code_point between 65529 and 65531
      or code_point between 78896 and 78911
      or code_point between 113824 and 113827
      or code_point between 119155 and 119162
      or code_point between 917536 and 917631 then
      return false;
    end if;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function living_chart_private.living_chart_payload_valid(candidate_payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  forecast jsonb;
  lines jsonb;
  line jsonb;
  precision text;
  category text;
  note text;
begin
  if candidate_payload is null
    or jsonb_typeof(candidate_payload) <> 'object'
    or octet_length(candidate_payload::text) > 32768
    or candidate_payload ->> 'schema' <> 'zodiacs.living-chart.cloud-moment.v1'
    or not candidate_payload ?& array[
      'schema',
      'primaryChartId',
      'occurredAt',
      'timePrecision',
      'forecast',
      'reflectionQuestionId'
    ]
    or jsonb_typeof(candidate_payload -> 'schema') <> 'string'
    or jsonb_typeof(candidate_payload -> 'primaryChartId') <> 'string'
    or jsonb_typeof(candidate_payload -> 'occurredAt') <> 'string'
    or jsonb_typeof(candidate_payload -> 'timePrecision') <> 'string'
    or jsonb_typeof(candidate_payload -> 'forecast') <> 'object'
    or jsonb_typeof(candidate_payload -> 'reflectionQuestionId') <> 'string'
    or (candidate_payload - array[
      'schema',
      'primaryChartId',
      'occurredAt',
      'timePrecision',
      'category',
      'note',
      'forecast',
      'reflectionQuestionId'
    ]) <> '{}'::jsonb
    or (candidate_payload ->> 'primaryChartId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or (candidate_payload ->> 'reflectionQuestionId') !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then
    return false;
  end if;

  precision := candidate_payload ->> 'timePrecision';
  if precision not in ('exact', 'approximate', 'date_only')
    or (precision = 'date_only'
      and not living_chart_private.living_chart_valid_date(candidate_payload ->> 'occurredAt'))
    or (precision <> 'date_only'
      and not living_chart_private.living_chart_valid_instant(candidate_payload ->> 'occurredAt')) then
    return false;
  end if;

  if not (candidate_payload ? 'category') and not (candidate_payload ? 'note') then
    return false;
  end if;
  if candidate_payload ? 'category' then
    category := candidate_payload ->> 'category';
    if jsonb_typeof(candidate_payload -> 'category') <> 'string'
      or category not in (
        'work', 'relationships', 'home', 'creativity',
        'change', 'wellbeing', 'other'
      ) then
      return false;
    end if;
  end if;
  if candidate_payload ? 'note' then
    note := candidate_payload ->> 'note';
    if jsonb_typeof(candidate_payload -> 'note') <> 'string'
      or note <> btrim(note)
      or length(note) not between 1 and 500
      or octet_length(note) > 2000
      or not living_chart_private.living_chart_text_safe(note, true) then
      return false;
    end if;
  end if;

  forecast := candidate_payload -> 'forecast';
  if forecast is null
    or jsonb_typeof(forecast) <> 'object'
    or not forecast ?& array[
      'schema', 'editionDate', 'chartId', 'source',
      'generatorVersion', 'capturedAt', 'lines'
    ]
    or jsonb_typeof(forecast -> 'schema') <> 'string'
    or jsonb_typeof(forecast -> 'editionDate') <> 'string'
    or jsonb_typeof(forecast -> 'chartId') <> 'string'
    or jsonb_typeof(forecast -> 'source') <> 'string'
    or jsonb_typeof(forecast -> 'generatorVersion') <> 'string'
    or jsonb_typeof(forecast -> 'capturedAt') <> 'string'
    or jsonb_typeof(forecast -> 'lines') <> 'array'
    or (forecast - array[
      'schema', 'editionDate', 'chartId', 'source',
      'generatorVersion', 'capturedAt', 'lines'
    ]) <> '{}'::jsonb
    or forecast ->> 'schema' <> 'zodiacs.living-chart.today-forecast.v1'
    or forecast ->> 'chartId' <> candidate_payload ->> 'primaryChartId'
    or not living_chart_private.living_chart_valid_date(forecast ->> 'editionDate')
    or forecast ->> 'source' not in ('personalized', 'sun_sign', 'quiet')
    or (forecast ->> 'generatorVersion') !~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'
    or not living_chart_private.living_chart_valid_instant(forecast ->> 'capturedAt') then
    return false;
  end if;

  lines := forecast -> 'lines';
  if lines is null
    or jsonb_typeof(lines) <> 'array'
    or jsonb_array_length(lines) not between 1 and 3 then
    return false;
  end if;
  for line in select value from jsonb_array_elements(lines) loop
    if jsonb_typeof(line) <> 'object'
      or not line ?& array['id', 'text', 'receipt']
      or (line - array['id', 'text', 'receipt']) <> '{}'::jsonb
      or jsonb_typeof(line -> 'id') <> 'string'
      or jsonb_typeof(line -> 'text') <> 'string'
      or jsonb_typeof(line -> 'receipt') <> 'string'
      or (line ->> 'id') !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      or line ->> 'text' <> btrim(line ->> 'text')
      or length(line ->> 'text') not between 1 and 1200
      or octet_length(line ->> 'text') > 4800
      or not living_chart_private.living_chart_text_safe(line ->> 'text', false)
      or line ->> 'receipt' <> btrim(line ->> 'receipt')
      or length(line ->> 'receipt') not between 1 and 800
      or octet_length(line ->> 'receipt') > 3200
      or not living_chart_private.living_chart_text_safe(line ->> 'receipt', false) then
      return false;
    end if;
  end loop;
  if (
    select count(distinct value ->> 'id')
    from jsonb_array_elements(lines)
  ) <> jsonb_array_length(lines) then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function living_chart_private.living_chart_valid_date(text) from public, anon;
revoke all on function living_chart_private.living_chart_valid_instant(text) from public, anon;
revoke all on function living_chart_private.living_chart_iso(timestamptz) from public, anon;
revoke all on function living_chart_private.living_chart_text_safe(text, boolean) from public, anon;
revoke all on function living_chart_private.living_chart_payload_valid(jsonb) from public, anon;
grant execute on function living_chart_private.living_chart_valid_date(text) to service_role;
grant execute on function living_chart_private.living_chart_valid_instant(text) to service_role;
grant execute on function living_chart_private.living_chart_iso(timestamptz) to authenticated, service_role;
grant execute on function living_chart_private.living_chart_text_safe(text, boolean) to service_role;
grant execute on function living_chart_private.living_chart_payload_valid(jsonb) to service_role;

create table if not exists public.living_chart_sync_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  purpose text not null default 'living_chart_sync',
  state text not null,
  consent_epoch bigint not null,
  policy_version text,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint living_chart_sync_consents_purpose_check
    check (purpose = 'living_chart_sync'),
  constraint living_chart_sync_consents_state_check
    check (state in ('granted', 'withdrawn')),
  constraint living_chart_sync_consents_epoch_check
    check (consent_epoch between 1 and 9007199254740990),
  constraint living_chart_sync_consents_policy_check
    check (
      (state = 'granted'
        and policy_version = 'living-chart-sync-2026-08-18.v1'
        and granted_at is not null
        and withdrawn_at is null)
      or
      (state = 'withdrawn' and policy_version is null and withdrawn_at is not null)
    ),
  constraint living_chart_sync_consents_dates_check
    check (updated_at >= created_at)
);

create table if not exists public.living_chart_moments (
  user_id uuid not null references auth.users(id) on delete cascade,
  moment_id uuid not null,
  consent_epoch bigint not null,
  revision bigint not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, moment_id),
  constraint living_chart_moments_epoch_check
    check (consent_epoch between 1 and 9007199254740990),
  constraint living_chart_moments_revision_check
    check (revision between 1 and 9007199254740990),
  constraint living_chart_moments_payload_check
    check (
      (deleted_at is null and living_chart_private.living_chart_payload_valid(payload))
      or
      (deleted_at is not null and payload is null)
    ),
  constraint living_chart_moments_dates_check
    check (
      updated_at >= created_at
      and (deleted_at is null or deleted_at = updated_at)
    )
);

create index if not exists living_chart_moments_user_epoch_updated_idx
  on public.living_chart_moments (user_id, consent_epoch, updated_at desc, moment_id);

create index if not exists living_chart_moments_user_epoch_revision_idx
  on public.living_chart_moments (user_id, consent_epoch, revision, moment_id);

create index if not exists living_chart_moments_user_epoch_moment_idx
  on public.living_chart_moments (user_id, consent_epoch, moment_id);

create index if not exists living_chart_moments_active_cap_idx
  on public.living_chart_moments (user_id, consent_epoch)
  where deleted_at is null;

create table if not exists living_chart_private.living_chart_mutations (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  action text not null,
  moment_id uuid,
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, mutation_id),
  constraint living_chart_mutations_action_check
    check (action in ('consent', 'put', 'delete')),
  constraint living_chart_mutations_moment_check
    check (
      (action = 'consent' and moment_id is null)
      or (action in ('put', 'delete') and moment_id is not null)
    ),
  constraint living_chart_mutations_hash_check
    check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint living_chart_mutations_result_check
    check (jsonb_typeof(result) = 'object')
);

alter table living_chart_private.living_chart_mutations
  add column if not exists moment_id uuid;

-- A pre-release development ledger did not carry moment_id. Those data
-- receipts cannot be safely invalidated per moment, so discard them on
-- upgrade; consent receipts remain useful replay fences.
delete from living_chart_private.living_chart_mutations
where action in ('put', 'delete') and moment_id is null;

alter table living_chart_private.living_chart_mutations
  drop constraint if exists living_chart_mutations_moment_check;
alter table living_chart_private.living_chart_mutations
  add constraint living_chart_mutations_moment_check
  check (
    (action = 'consent' and moment_id is null)
    or (action in ('put', 'delete') and moment_id is not null)
  );

create index if not exists living_chart_mutations_user_created_idx
  on living_chart_private.living_chart_mutations (user_id, created_at desc);

create index if not exists living_chart_mutations_user_moment_action_idx
  on living_chart_private.living_chart_mutations (user_id, moment_id, action)
  where moment_id is not null;

create table if not exists living_chart_private.living_chart_runtime_settings (
  singleton boolean primary key default true,
  new_writes_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint living_chart_runtime_settings_singleton_check check (singleton)
);

insert into living_chart_private.living_chart_runtime_settings (
  singleton, new_writes_enabled
) values (true, true)
on conflict (singleton) do nothing;

create or replace function living_chart_private.living_chart_new_writes_enabled()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce((
    select new_writes_enabled
    from living_chart_private.living_chart_runtime_settings
    where singleton
  ), false);
$$;

alter table public.living_chart_sync_consents enable row level security;
alter table public.living_chart_moments enable row level security;
alter table living_chart_private.living_chart_mutations enable row level security;
alter table living_chart_private.living_chart_runtime_settings enable row level security;

revoke all on table public.living_chart_sync_consents from public, anon, authenticated, service_role;
revoke all on table public.living_chart_moments from public, anon, authenticated, service_role;
revoke all on table living_chart_private.living_chart_mutations from public, anon, authenticated, service_role;
revoke all on table living_chart_private.living_chart_runtime_settings from public, anon, authenticated, service_role;

grant select on table public.living_chart_sync_consents to authenticated;
grant select on table public.living_chart_moments to authenticated;
grant select, insert, update, delete on table public.living_chart_sync_consents to service_role;
grant select, insert, update, delete on table public.living_chart_moments to service_role;
grant select, insert, update, delete on table living_chart_private.living_chart_mutations to service_role;
grant select, update on table living_chart_private.living_chart_runtime_settings to service_role;

revoke all on function living_chart_private.living_chart_new_writes_enabled()
  from public, anon, authenticated;
grant execute on function living_chart_private.living_chart_new_writes_enabled()
  to service_role;

drop policy if exists living_chart_sync_consents_select_own
  on public.living_chart_sync_consents;
create policy living_chart_sync_consents_select_own
on public.living_chart_sync_consents
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (select auth.jwt() ->> 'is_anonymous') is distinct from 'true'
);

drop policy if exists living_chart_moments_select_current_epoch
  on public.living_chart_moments;
create policy living_chart_moments_select_current_epoch
on public.living_chart_moments
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (select auth.jwt() ->> 'is_anonymous') is distinct from 'true'
  and exists (
    select 1
    from public.living_chart_sync_consents as consent
    where consent.user_id = living_chart_moments.user_id
      and consent.state = 'granted'
      and consent.consent_epoch = living_chart_moments.consent_epoch
  )
);

create or replace function living_chart_private.living_chart_record_mutation(
  candidate_user_id uuid,
  candidate_mutation_id uuid,
  candidate_action text,
  candidate_moment_id uuid,
  candidate_request_hash text,
  candidate_result jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  insert into living_chart_private.living_chart_mutations (
    user_id, mutation_id, action, moment_id, request_hash, result, created_at
  ) values (
    candidate_user_id,
    candidate_mutation_id,
    candidate_action,
    candidate_moment_id,
    candidate_request_hash,
    candidate_result,
    clock_timestamp()
  );

  -- User-scoped advisory locking makes pruning deterministic. Retain enough
  -- receipts for ordinary offline retries without an unbounded ledger.
  delete from living_chart_private.living_chart_mutations as old
  where old.user_id = candidate_user_id
    and old.mutation_id in (
      select mutation_id
      from living_chart_private.living_chart_mutations
      where user_id = candidate_user_id
      order by created_at desc, mutation_id desc
      offset 512
    );
end;
$$;

revoke all on function living_chart_private.living_chart_record_mutation(
  uuid, uuid, text, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function living_chart_private.living_chart_record_mutation(
  uuid, uuid, text, uuid, text, jsonb
) to service_role;

create or replace function living_chart_private.set_living_chart_sync_consent_impl(
  candidate_decision text,
  candidate_mutation_id uuid,
  candidate_expected_consent_epoch bigint,
  candidate_policy_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  request_fingerprint text;
  prior_mutation living_chart_private.living_chart_mutations%rowtype;
  consent_row public.living_chart_sync_consents%rowtype;
  current_state text;
  current_epoch bigint;
  next_epoch bigint;
  event_time timestamptz;
  response jsonb;
begin
  actor_id := living_chart_private.living_chart_actor_id();
  if candidate_mutation_id is null
    or candidate_expected_consent_epoch is null
    or candidate_expected_consent_epoch < 0
    or candidate_expected_consent_epoch > 9007199254740990
    or candidate_decision is null
    or candidate_decision not in ('grant', 'withdraw')
    or (candidate_decision = 'grant'
      and candidate_policy_version is distinct from 'living-chart-sync-2026-08-18.v1')
    or (candidate_decision = 'withdraw' and candidate_policy_version is not null) then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  request_fingerprint := encode(sha256(convert_to(
    candidate_decision || E'\n'
    || candidate_expected_consent_epoch::text || E'\n'
    || coalesce(candidate_policy_version, '<null>'),
    'UTF8'
  )), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 714207));

  select * into consent_row
  from public.living_chart_sync_consents
  where user_id = actor_id
  for update;
  if found then
    current_state := consent_row.state;
    current_epoch := consent_row.consent_epoch;
  else
    current_state := 'pending';
    current_epoch := 0;
  end if;

  select * into prior_mutation
  from living_chart_private.living_chart_mutations
  where user_id = actor_id and mutation_id = candidate_mutation_id;
  if found then
    if prior_mutation.action = 'consent'
      and prior_mutation.request_hash = request_fingerprint then
      -- A receipt may be replayed as success only while the consent state it
      -- produced is still current. Once another consent transition advances
      -- the epoch, the delayed intent is fenced as stale.
      if prior_mutation.result ->> 'outcome' in ('granted', 'withdrawn')
        and prior_mutation.result ->> 'outcome' = current_state
        and (prior_mutation.result ->> 'consent_epoch')::bigint = current_epoch then
        return prior_mutation.result;
      end if;
      if prior_mutation.result ->> 'outcome' = 'consent_stale' then
        -- A stale receipt is durable proof that the original intent did not
        -- transition consent, but its diagnostic state must describe now.
        return jsonb_build_object(
          'outcome', 'consent_stale',
          'state', current_state,
          'current_consent_epoch', current_epoch
        );
      end if;
      return jsonb_build_object(
        'outcome', 'consent_stale',
        'state', current_state,
        'current_consent_epoch', current_epoch
      );
    end if;
    return jsonb_build_object('outcome', 'mutation_conflict');
  end if;

  -- The operator kill switch stops only new grants. Withdrawals remain
  -- available so a user can always erase cloud data. Disabled attempts are
  -- deliberately not receipted and can be retried after recovery.
  if candidate_decision = 'grant'
    and not living_chart_private.living_chart_new_writes_enabled() then
    return jsonb_build_object('outcome', 'temporarily_disabled');
  end if;

  if candidate_expected_consent_epoch <> current_epoch
    or (candidate_decision = 'grant' and current_state not in ('pending', 'withdrawn'))
    or (candidate_decision = 'withdraw' and current_state <> 'granted') then
    response := jsonb_build_object(
      'outcome', 'consent_stale',
      'state', current_state,
      'current_consent_epoch', current_epoch
    );
    perform living_chart_private.living_chart_record_mutation(
      actor_id,
      candidate_mutation_id,
      'consent',
      null,
      request_fingerprint,
      response
    );
    return response;
  end if;

  -- The maximum epoch is terminal. Withdrawal at that boundary remains
  -- available (state itself fences writers), but a later regrant cannot safely
  -- advance the epoch and therefore fails without touching consent.
  if candidate_decision = 'grant'
    and current_state = 'withdrawn'
    and current_epoch = 9007199254740990 then
    return jsonb_build_object('outcome', 'consent_epoch_limit_reached');
  end if;

  event_time := clock_timestamp();
  if candidate_decision = 'grant' and current_state = 'pending' then
    next_epoch := 1;
    insert into public.living_chart_sync_consents (
      user_id,
      state,
      consent_epoch,
      policy_version,
      granted_at,
      withdrawn_at,
      created_at,
      updated_at
    ) values (
      actor_id,
      'granted',
      next_epoch,
      candidate_policy_version,
      event_time,
      null,
      event_time,
      event_time
    )
    returning * into consent_row;
  elsif candidate_decision = 'grant' then
    next_epoch := case
      when consent_row.consent_epoch = 9007199254740990 then 9007199254740990
      else consent_row.consent_epoch + 1
    end;
    update public.living_chart_sync_consents
    set state = 'granted',
        consent_epoch = next_epoch,
        policy_version = candidate_policy_version,
        granted_at = event_time,
        withdrawn_at = null,
        updated_at = event_time
    where user_id = actor_id
    returning * into consent_row;
  else
    -- Erase payloads and all data-mutation receipts in the same transaction.
    -- Consent receipts remain as durable fences for delayed grant/withdraw
    -- retries; expected_consent_epoch protects even after receipt pruning.
    delete from public.living_chart_moments where user_id = actor_id;
    delete from living_chart_private.living_chart_mutations
    where user_id = actor_id and action in ('put', 'delete');
    next_epoch := case
      when consent_row.consent_epoch = 9007199254740990 then 9007199254740990
      else consent_row.consent_epoch + 1
    end;
    update public.living_chart_sync_consents
    set state = 'withdrawn',
        consent_epoch = next_epoch,
        policy_version = null,
        withdrawn_at = event_time,
        updated_at = event_time
    where user_id = actor_id
    returning * into consent_row;
  end if;

  response := jsonb_build_object(
    'outcome', consent_row.state,
    'purpose', 'living_chart_sync',
    'consent_epoch', consent_row.consent_epoch,
    'policy_version', consent_row.policy_version,
    'updated_at', living_chart_private.living_chart_iso(consent_row.updated_at)
  );
  perform living_chart_private.living_chart_record_mutation(
    actor_id,
    candidate_mutation_id,
    'consent',
    null,
    request_fingerprint,
    response
  );
  return response;
end;
$$;

create or replace function public.set_living_chart_sync_consent(
  candidate_decision text,
  candidate_mutation_id uuid,
  candidate_expected_consent_epoch bigint,
  candidate_policy_version text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select living_chart_private.set_living_chart_sync_consent_impl(
    candidate_decision,
    candidate_mutation_id,
    candidate_expected_consent_epoch,
    candidate_policy_version
  );
$$;

create or replace function living_chart_private.put_living_chart_moment_impl(
  candidate_moment_id uuid,
  candidate_base_revision bigint,
  candidate_consent_epoch bigint,
  candidate_mutation_id uuid,
  candidate_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  request_fingerprint text;
  prior_mutation living_chart_private.living_chart_mutations%rowtype;
  consent_row public.living_chart_sync_consents%rowtype;
  moment_row public.living_chart_moments%rowtype;
  moment_exists boolean;
  active_count bigint;
  total_count bigint;
  next_revision bigint;
  event_time timestamptz;
  response jsonb;
begin
  actor_id := living_chart_private.living_chart_actor_id();
  if candidate_moment_id is null
    or candidate_mutation_id is null
    or candidate_base_revision is null
    or candidate_base_revision < 0
    or candidate_base_revision >= 9007199254740990
    or candidate_consent_epoch is null
    or candidate_consent_epoch < 1
    or candidate_consent_epoch > 9007199254740990
    or not living_chart_private.living_chart_payload_valid(candidate_payload) then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  request_fingerprint := encode(sha256(convert_to(
    candidate_moment_id::text || E'\n'
    || candidate_base_revision::text || E'\n'
    || candidate_consent_epoch::text || E'\n'
    || candidate_payload::text,
    'UTF8'
  )), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 714207));

  select * into prior_mutation
  from living_chart_private.living_chart_mutations
  where user_id = actor_id and mutation_id = candidate_mutation_id;
  if found then
    if prior_mutation.action = 'put'
      and prior_mutation.request_hash = request_fingerprint then
      return prior_mutation.result;
    end if;
    return jsonb_build_object('outcome', 'mutation_conflict');
  end if;

  -- Do not ledger a disabled attempt: the same queued mutation id may safely
  -- succeed once an operator re-enables writes.
  if not living_chart_private.living_chart_new_writes_enabled() then
    return jsonb_build_object('outcome', 'temporarily_disabled');
  end if;

  select * into consent_row
  from public.living_chart_sync_consents
  where user_id = actor_id
  for update;
  if not found then
    response := jsonb_build_object('outcome', 'consent_required');
  elsif consent_row.state <> 'granted'
    or consent_row.consent_epoch <> candidate_consent_epoch then
    response := jsonb_build_object(
      'outcome', 'consent_stale',
      'state', consent_row.state,
      'current_consent_epoch', consent_row.consent_epoch
    );
  else
    select * into moment_row
    from public.living_chart_moments
    where user_id = actor_id and moment_id = candidate_moment_id
    for update;
    -- FOUND is global PL/pgSQL statement state. Capture this row lookup before
    -- aggregate cap queries overwrite FOUND with true.
    moment_exists := found;

    if moment_exists and (
      moment_row.revision <> candidate_base_revision
      or moment_row.deleted_at is not null
      or moment_row.consent_epoch <> candidate_consent_epoch
    ) then
      response := jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', moment_row.revision,
        'deleted', moment_row.deleted_at is not null,
        'consent_epoch', consent_row.consent_epoch
      );
    elsif not moment_exists and candidate_base_revision <> 0 then
      response := jsonb_build_object(
        'outcome', 'conflict',
        -- No row exists for the caller's positive base. Conservatively report
        -- deletion-wins; active-epoch tombstones themselves are never pruned.
        'current_revision', candidate_base_revision,
        'deleted', true,
        'consent_epoch', consent_row.consent_epoch
      );
    else
      if not moment_exists then
        select
          count(*) filter (where deleted_at is null),
          count(*)
        into active_count, total_count
        from public.living_chart_moments
        where user_id = actor_id
          and consent_epoch = candidate_consent_epoch;
      else
        active_count := 0;
        total_count := 0;
      end if;

      if not moment_exists and active_count >= 250 then
        response := jsonb_build_object(
          'outcome', 'moment_limit_reached',
          'limit', 250
        );
      elsif not moment_exists and total_count >= 1000 then
        response := jsonb_build_object(
          'outcome', 'moment_limit_reached',
          'limit', 1000,
          'reason', 'consent_epoch_storage_limit'
        );
      else
        event_time := clock_timestamp();
        next_revision := candidate_base_revision + 1;
        insert into public.living_chart_moments (
          user_id,
          moment_id,
          consent_epoch,
          revision,
          payload,
          created_at,
          updated_at,
          deleted_at
        ) values (
          actor_id,
          candidate_moment_id,
          candidate_consent_epoch,
          next_revision,
          candidate_payload,
          event_time,
          event_time,
          null
        )
        on conflict (user_id, moment_id) do update
        set consent_epoch = excluded.consent_epoch,
            revision = excluded.revision,
            payload = excluded.payload,
            updated_at = excluded.updated_at,
            deleted_at = null
        returning * into moment_row;
        response := jsonb_build_object(
          'outcome', 'saved',
          'moment_id', moment_row.moment_id,
          'revision', moment_row.revision,
          'consent_epoch', moment_row.consent_epoch,
          'created_at', living_chart_private.living_chart_iso(moment_row.created_at),
          'updated_at', living_chart_private.living_chart_iso(moment_row.updated_at)
        );
      end if;
    end if;
  end if;

  -- The active cap is recoverable when another moment is deleted. Do not
  -- poison the queued mutation ID with a permanent limit receipt. The 1,000
  -- distinct-ID lifetime cap is terminal for this epoch and remains receipted.
  if response ->> 'outcome' = 'moment_limit_reached'
    and response ->> 'limit' = '250' then
    return response;
  end if;

  perform living_chart_private.living_chart_record_mutation(
    actor_id,
    candidate_mutation_id,
    'put',
    candidate_moment_id,
    request_fingerprint,
    response
  );
  return response;
end;
$$;

create or replace function public.put_living_chart_moment(
  candidate_moment_id uuid,
  candidate_base_revision bigint,
  candidate_consent_epoch bigint,
  candidate_mutation_id uuid,
  candidate_payload jsonb
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select living_chart_private.put_living_chart_moment_impl(
    candidate_moment_id,
    candidate_base_revision,
    candidate_consent_epoch,
    candidate_mutation_id,
    candidate_payload
  );
$$;

create or replace function living_chart_private.delete_living_chart_moment_impl(
  candidate_moment_id uuid,
  candidate_base_revision bigint,
  candidate_consent_epoch bigint,
  candidate_mutation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  request_fingerprint text;
  prior_mutation living_chart_private.living_chart_mutations%rowtype;
  consent_row public.living_chart_sync_consents%rowtype;
  moment_row public.living_chart_moments%rowtype;
  total_count bigint;
  event_time timestamptz;
  response jsonb;
begin
  actor_id := living_chart_private.living_chart_actor_id();
  if candidate_moment_id is null
    or candidate_mutation_id is null
    or candidate_base_revision is null
    or candidate_base_revision < 0
    or candidate_base_revision > 9007199254740990
    or candidate_consent_epoch is null
    or candidate_consent_epoch < 1
    or candidate_consent_epoch > 9007199254740990 then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  request_fingerprint := encode(sha256(convert_to(
    candidate_moment_id::text || E'\n'
    || candidate_base_revision::text || E'\n'
    || candidate_consent_epoch::text,
    'UTF8'
  )), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 714207));

  select * into prior_mutation
  from living_chart_private.living_chart_mutations
  where user_id = actor_id and mutation_id = candidate_mutation_id;
  if found then
    if prior_mutation.action = 'delete'
      and prior_mutation.request_hash = request_fingerprint then
      return prior_mutation.result;
    end if;
    return jsonb_build_object('outcome', 'mutation_conflict');
  end if;

  select * into consent_row
  from public.living_chart_sync_consents
  where user_id = actor_id
  for update;
  if not found then
    response := jsonb_build_object('outcome', 'consent_required');
  elsif consent_row.state <> 'granted'
    or consent_row.consent_epoch <> candidate_consent_epoch then
    response := jsonb_build_object(
      'outcome', 'consent_stale',
      'state', consent_row.state,
      'current_consent_epoch', consent_row.consent_epoch
    );
  else
    select * into moment_row
    from public.living_chart_moments
    where user_id = actor_id and moment_id = candidate_moment_id
    for update;
    if not found then
      event_time := clock_timestamp();
      select count(*) into total_count
      from public.living_chart_moments
      where user_id = actor_id
        and consent_epoch = candidate_consent_epoch;
      if total_count < 1000 then
        insert into public.living_chart_moments (
          user_id,
          moment_id,
          consent_epoch,
          revision,
          payload,
          created_at,
          updated_at,
          deleted_at
        ) values (
          actor_id,
          candidate_moment_id,
          candidate_consent_epoch,
          case
            when candidate_base_revision = 9007199254740990 then 9007199254740990
            else greatest(candidate_base_revision + 1, 1)
          end,
          null,
          event_time,
          event_time,
          event_time
        )
        returning * into moment_row;
        response := jsonb_build_object(
          'outcome', 'deleted',
          'moment_id', moment_row.moment_id,
          'revision', moment_row.revision,
          'consent_epoch', moment_row.consent_epoch,
          'updated_at', living_chart_private.living_chart_iso(moment_row.updated_at),
          'deleted_at', living_chart_private.living_chart_iso(moment_row.deleted_at)
        );
      else
        -- At the distinct-id ceiling a missing create could not have committed,
        -- so a synthetic already_deleted response is safe and does not widen
        -- the lifetime consent-epoch budget.
        response := jsonb_build_object(
          'outcome', 'already_deleted',
          'moment_id', candidate_moment_id,
          'revision', greatest(candidate_base_revision, 1),
          'consent_epoch', consent_row.consent_epoch,
          'updated_at', living_chart_private.living_chart_iso(event_time),
          'deleted_at', living_chart_private.living_chart_iso(event_time)
        );
      end if;
    elsif moment_row.deleted_at is not null then
      response := jsonb_build_object(
        'outcome', 'already_deleted',
        'moment_id', moment_row.moment_id,
        'revision', moment_row.revision,
        'consent_epoch', moment_row.consent_epoch,
        'updated_at', living_chart_private.living_chart_iso(moment_row.updated_at),
        'deleted_at', living_chart_private.living_chart_iso(moment_row.deleted_at)
      );
    elsif (
      moment_row.revision <> candidate_base_revision
      and not (candidate_base_revision = 0 and moment_row.revision = 1)
    )
      or moment_row.consent_epoch <> candidate_consent_epoch then
      response := jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', moment_row.revision,
        'deleted', false,
        'consent_epoch', consent_row.consent_epoch
      );
    else
      event_time := clock_timestamp();
      update public.living_chart_moments
      set revision = case
            when revision = 9007199254740990 then 9007199254740990
            else revision + 1
          end,
          payload = null,
          updated_at = event_time,
          deleted_at = event_time
      where user_id = actor_id and moment_id = candidate_moment_id
      returning * into moment_row;
      response := jsonb_build_object(
        'outcome', 'deleted',
        'moment_id', moment_row.moment_id,
        'revision', moment_row.revision,
        'consent_epoch', moment_row.consent_epoch,
        'updated_at', living_chart_private.living_chart_iso(moment_row.updated_at),
        'deleted_at', living_chart_private.living_chart_iso(moment_row.deleted_at)
      );
    end if;
  end if;

  if response ->> 'outcome' in ('deleted', 'already_deleted') then
    -- A delete supersedes lost acknowledgements for prior puts. Clearing put
    -- receipts forces a delayed original create to observe the tombstone and
    -- return deletion-wins instead of replaying a stale saved response.
    delete from living_chart_private.living_chart_mutations
    where user_id = actor_id
      and action = 'put'
      and moment_id = candidate_moment_id;
  end if;

  perform living_chart_private.living_chart_record_mutation(
    actor_id,
    candidate_mutation_id,
    'delete',
    candidate_moment_id,
    request_fingerprint,
    response
  );
  return response;
end;
$$;

create or replace function public.delete_living_chart_moment(
  candidate_moment_id uuid,
  candidate_base_revision bigint,
  candidate_consent_epoch bigint,
  candidate_mutation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select living_chart_private.delete_living_chart_moment_impl(
    candidate_moment_id,
    candidate_base_revision,
    candidate_consent_epoch,
    candidate_mutation_id
  );
$$;

create or replace function public.living_chart_sync_snapshot(
  candidate_consent_epoch bigint,
  candidate_after_moment_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  consent_row public.living_chart_sync_consents%rowtype;
  moment_rows jsonb;
  has_more boolean;
  next_after uuid;
begin
  actor_id := living_chart_private.living_chart_actor_id();
  if candidate_consent_epoch is null
    or candidate_consent_epoch < 1
    or candidate_consent_epoch > 9007199254740990 then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into consent_row
  from public.living_chart_sync_consents
  where user_id = actor_id;
  if not found then
    return jsonb_build_object('outcome', 'consent_required');
  end if;
  if consent_row.state <> 'granted'
    or consent_row.consent_epoch <> candidate_consent_epoch then
    return jsonb_build_object(
      'outcome', 'consent_stale',
      'state', consent_row.state,
      'current_consent_epoch', consent_row.consent_epoch
    );
  end if;

  with page as (
    select
      moment_id,
      consent_epoch,
      revision,
      payload,
      created_at,
      updated_at,
      deleted_at,
      row_number() over (order by moment_id) as page_position
    from public.living_chart_moments
    where user_id = actor_id
      and consent_epoch = candidate_consent_epoch
      and (
        candidate_after_moment_id is null
        or moment_id > candidate_after_moment_id
      )
    order by moment_id
    limit 51
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'moment_id', moment_id,
          'consent_epoch', consent_epoch,
          'revision', revision,
          'payload', payload,
          'created_at', living_chart_private.living_chart_iso(created_at),
          'updated_at', living_chart_private.living_chart_iso(updated_at),
          'deleted_at', case
            when deleted_at is null then null
            else living_chart_private.living_chart_iso(deleted_at)
          end
        ) order by moment_id
      ) filter (where page_position <= 50),
      '[]'::jsonb
    ),
    count(*) > 50
  into moment_rows, has_more
  from page;

  if has_more then
    next_after := (moment_rows -> 49 ->> 'moment_id')::uuid;
  else
    next_after := null;
  end if;

  return jsonb_build_object(
    'outcome', 'ready',
    'purpose', 'living_chart_sync',
    'consent_epoch', candidate_consent_epoch,
    'moments', moment_rows,
    'has_more', has_more,
    'next_after', next_after
  );
end;
$$;

revoke all on function living_chart_private.set_living_chart_sync_consent_impl(text, uuid, bigint, text)
  from public, anon;
revoke all on function living_chart_private.put_living_chart_moment_impl(uuid, bigint, bigint, uuid, jsonb)
  from public, anon;
revoke all on function living_chart_private.delete_living_chart_moment_impl(uuid, bigint, bigint, uuid)
  from public, anon;

grant execute on function living_chart_private.set_living_chart_sync_consent_impl(text, uuid, bigint, text)
  to authenticated, service_role;
grant execute on function living_chart_private.put_living_chart_moment_impl(uuid, bigint, bigint, uuid, jsonb)
  to authenticated, service_role;
grant execute on function living_chart_private.delete_living_chart_moment_impl(uuid, bigint, bigint, uuid)
  to authenticated, service_role;

revoke all on function public.set_living_chart_sync_consent(text, uuid, bigint, text)
  from public, anon;
revoke all on function public.put_living_chart_moment(uuid, bigint, bigint, uuid, jsonb)
  from public, anon;
revoke all on function public.delete_living_chart_moment(uuid, bigint, bigint, uuid)
  from public, anon;
revoke all on function public.living_chart_sync_snapshot(bigint, uuid)
  from public, anon;

grant execute on function public.set_living_chart_sync_consent(text, uuid, bigint, text)
  to authenticated, service_role;
grant execute on function public.put_living_chart_moment(uuid, bigint, bigint, uuid, jsonb)
  to authenticated, service_role;
grant execute on function public.delete_living_chart_moment(uuid, bigint, bigint, uuid)
  to authenticated, service_role;
grant execute on function public.living_chart_sync_snapshot(bigint, uuid)
  to authenticated, service_role;

comment on table public.living_chart_sync_consents is
  'Separate Living Chart cloud-sync consent. Epoch changes invalidate stale clients.';
comment on table public.living_chart_moments is
  'Owner-readable Living Chart cloud moments. Supabase encryption at rest; not end-to-end encrypted.';
comment on table living_chart_private.living_chart_runtime_settings is
  'Service-role-only Living Chart operational controls; missing row fails new writes closed.';
comment on function public.set_living_chart_sync_consent(text, uuid, bigint, text) is
  'Replay-safe grant/withdraw boundary. Withdrawal erases remote moments and advances consent_epoch.';
comment on function public.living_chart_sync_snapshot(bigint, uuid) is
  'Owner-only Living Chart sync/export page (at most 50 rows) for one active consent epoch.';
