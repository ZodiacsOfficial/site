-- Optional account-sync v2 foundation.
--
-- This migration never reads or copies a legacy chart payload. It does replace
-- legacy chart/tombstone write policies so a successful v2 bootstrap is the
-- atomic per-user cutover: accounts with no v2 state retain v1 writes, while
-- bootstrapped accounts can only read v1 until explicit deletion/export.
-- The first canary accepts only a freshly selected chart that the account
-- owner explicitly attests is their own. Legacy chart rows are never read or
-- copied by this migration.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active',
  deletion_request_id uuid,
  daily_sun_recipient_hash text,
  daily_sun_was_confirmed boolean not null default false,
  deletion_started_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint account_states_status_valid
    check (status in ('active', 'deleting')),
  constraint account_states_deletion_valid
    check (
      (
        status = 'active'
        and deletion_request_id is null
        and deletion_started_at is null
      )
      or
      (status = 'deleting' and deletion_request_id is not null and deletion_started_at is not null)
    ),
  constraint account_states_daily_sun_hash_valid
    check (
      daily_sun_recipient_hash is null
      or (
        octet_length(daily_sun_recipient_hash) = 64
        and daily_sun_recipient_hash ~ '^[0-9a-f]{64}$'
      )
    )
);

create unique index if not exists account_states_deletion_request_idx
  on private.account_states (deletion_request_id)
  where deletion_request_id is not null;

-- Email-address changes and HMAC-key rotation can produce more than one
-- opaque Daily Sun recipient alias. Keeping the bounded hashes separately
-- lets deletion revoke every known alias without retaining an email address.
create table if not exists private.account_daily_sun_recipient_aliases (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  recipient_hash text not null,
  locator_ciphertext bytea,
  locator_nonce bytea,
  locator_encryption_format text,
  locator_key_scope text,
  locator_key_version integer,
  locator_wrapped_key bytea,
  authority_attempt_id uuid,
  bound_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, recipient_hash),
  constraint account_daily_sun_recipient_aliases_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint account_daily_sun_recipient_aliases_locator_shape_valid
    check (
      (
        locator_ciphertext is null
        and locator_nonce is null
        and locator_encryption_format is null
        and locator_key_scope is null
        and locator_key_version is null
        and locator_wrapped_key is null
      )
      or (
        octet_length(locator_ciphertext) between 17 and 528
        and octet_length(locator_nonce) = 12
        and locator_encryption_format = 'opaque_v1'
        and locator_key_scope = 'service'
        and locator_key_version between 1 and 1000000
        and octet_length(locator_wrapped_key) = 68
      )
    ),
  constraint account_daily_sun_recipient_aliases_timestamps_valid
    check (updated_at >= bound_at)
);

create table if not exists private.account_consents (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  purpose text not null,
  state text not null,
  policy_version text not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, purpose),
  constraint account_consents_purpose_valid
    check (purpose in (
      'chart_sync',
      'weekly_digest',
      'daily_chart_email',
      'compatibility_invites',
      'ai_memory',
      'public_presentation'
    )),
  constraint account_consents_state_valid
    check (state in ('granted', 'withdrawn')),
  constraint account_consents_policy_version_valid
    check (
      octet_length(policy_version) between 1 and 64
      and policy_version = btrim(policy_version)
      and policy_version !~ '[[:cntrl:]]'
    ),
  constraint account_consents_timestamps_valid
    check (
      (state = 'granted' and granted_at is not null and withdrawn_at is null)
      or
      (state = 'withdrawn' and withdrawn_at is not null)
    )
);

create table if not exists private.account_consent_events (
  event_id bigint generated always as identity primary key,
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  purpose text not null,
  decision text not null,
  policy_version text not null,
  source text not null,
  idempotency_key uuid not null,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint account_consent_events_owner_idempotency_unique
    unique (user_id, idempotency_key),
  constraint account_consent_events_purpose_valid
    check (purpose in (
      'chart_sync',
      'weekly_digest',
      'daily_chart_email',
      'compatibility_invites',
      'ai_memory',
      'public_presentation'
    )),
  constraint account_consent_events_decision_valid
    check (decision in ('grant', 'withdraw')),
  constraint account_consent_events_policy_version_valid
    check (
      octet_length(policy_version) between 1 and 64
      and policy_version = btrim(policy_version)
      and policy_version !~ '[[:cntrl:]]'
    ),
  constraint account_consent_events_source_valid
    check (source in ('web', 'ios', 'support', 'system'))
);

create index if not exists account_consent_events_owner_event_idx
  on private.account_consent_events (user_id, event_id);

create table if not exists private.account_sync_devices (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  device_id uuid not null,
  platform text not null,
  last_cursor bigint not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  primary key (user_id, device_id),
  constraint account_sync_devices_platform_valid
    check (platform in ('web', 'ios', 'unknown')),
  constraint account_sync_devices_cursor_valid
    check (last_cursor >= 0),
  constraint account_sync_devices_timestamps_valid
    check (
      last_seen_at >= created_at
      and (revoked_at is null or revoked_at >= created_at)
    )
);

create index if not exists account_sync_devices_owner_active_idx
  on private.account_sync_devices (user_id, last_seen_at desc)
  where revoked_at is null;

create table if not exists private.account_chart_records (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  chart_id uuid not null,
  subject_kind text not null,
  subject_attestation text not null,
  revision bigint not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, chart_id),
  constraint account_chart_records_subject_kind_valid
    check (subject_kind = 'self'),
  constraint account_chart_records_subject_attestation_valid
    check (subject_attestation = 'self_declared_v1'),
  constraint account_chart_records_revision_valid
    check (revision >= 1),
  constraint account_chart_records_timestamps_valid
    check (updated_at >= created_at)
);

create index if not exists account_chart_records_owner_updated_idx
  on private.account_chart_records (user_id, updated_at desc, chart_id);

-- The first canary synchronizes exactly one active self chart. A deleted chart
-- leaves only its tombstone, so the owner may later select one replacement
-- without allowing a stale device to resurrect the old record.
create unique index if not exists account_chart_records_one_active_self_idx
  on private.account_chart_records (user_id);

-- Exact birth inputs are opaque at rest. No plaintext date, time, place,
-- coordinate, or timezone column exists in v2. The approved server boundary
-- supplies service-managed AES-256-GCM envelopes; encryption keys never enter
-- this database.
create table if not exists private.account_chart_secret_envelopes (
  user_id uuid not null,
  chart_id uuid not null,
  revision bigint not null,
  ciphertext bytea not null,
  nonce bytea not null,
  encryption_format text not null,
  key_scope text not null,
  key_version integer not null,
  wrapped_key bytea not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, chart_id),
  constraint account_chart_secret_envelopes_chart_fkey
    foreign key (user_id, chart_id)
    references private.account_chart_records(user_id, chart_id)
    on delete cascade,
  constraint account_chart_secret_envelopes_revision_valid
    check (revision >= 1),
  constraint account_chart_secret_envelopes_ciphertext_valid
    check (octet_length(ciphertext) between 17 and 16400),
  constraint account_chart_secret_envelopes_nonce_valid
    check (octet_length(nonce) = 12),
  constraint account_chart_secret_envelopes_format_valid
    check (encryption_format = 'opaque_v1'),
  constraint account_chart_secret_envelopes_key_scope_valid
    check (key_scope = 'service'),
  constraint account_chart_secret_envelopes_key_version_valid
    check (key_version between 1 and 1000000),
  constraint account_chart_secret_envelopes_wrapped_key_valid
    check (octet_length(wrapped_key) = 68),
  constraint account_chart_secret_envelopes_timestamps_valid
    check (updated_at >= created_at)
);

-- Prevent accidental AEAD nonce reuse within one account and key version.
create unique index if not exists account_chart_secret_envelopes_nonce_unique_idx
  on private.account_chart_secret_envelopes (
    user_id,
    key_scope,
    key_version,
    nonce
  );

create table if not exists private.account_sync_changes (
  change_seq bigint generated always as identity primary key,
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  operation text not null,
  revision bigint not null,
  mutation_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint account_sync_changes_shape_valid
    check (
      (entity_type = 'chart' and entity_id is not null and operation in ('upsert', 'delete'))
      or
      (entity_type = 'consent' and entity_id is null and operation in ('grant', 'withdraw'))
      or
      (entity_type = 'account' and entity_id is null and operation = 'delete')
    ),
  constraint account_sync_changes_revision_valid
    check (revision >= 0)
);

create index if not exists account_sync_changes_owner_cursor_idx
  on private.account_sync_changes (user_id, change_seq);

create table if not exists private.account_sync_tombstones (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  chart_id uuid not null,
  revision bigint not null,
  mutation_id uuid not null,
  deleted_at timestamptz not null default clock_timestamp(),
  primary key (user_id, chart_id),
  constraint account_sync_tombstones_revision_valid
    check (revision >= 1)
);

create index if not exists account_sync_tombstones_owner_deleted_idx
  on private.account_sync_tombstones (user_id, deleted_at desc, chart_id);

create table if not exists private.account_sync_mutations (
  user_id uuid not null references private.account_states(user_id) on delete cascade,
  mutation_id uuid not null,
  operation text not null,
  request_fingerprint_verifier text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, mutation_id),
  constraint account_sync_mutations_operation_valid
    check (operation in (
      'consent', 'put_chart', 'delete_chart', 'prepare_deletion'
    )),
  constraint account_sync_mutations_request_fingerprint_verifier_valid
    check (
      octet_length(request_fingerprint_verifier) between 66 and 97
      and request_fingerprint_verifier
        ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}:[0-9a-f]{64}$'
    ),
  constraint account_sync_mutations_result_valid
    check (
      jsonb_typeof(result) = 'object'
      and octet_length(result::text) <= 2048
    )
);

create index if not exists account_sync_mutations_owner_created_idx
  on private.account_sync_mutations (user_id, created_at desc);

-- A deletion receipt deliberately has no foreign key to auth.users or to the
-- v2 account row. It is the short-lived recovery handle that survives the
-- Auth hard-delete boundary. The server stores only its secret-HMAC verifier,
-- never the browser semantic hash or a raw recovery secret.
create table if not exists private.account_deletion_receipts (
  request_id uuid primary key,
  user_id uuid not null,
  recovery_verifier text not null,
  prepared_at timestamptz not null,
  completed_at timestamptz,
  daily_sun_was_confirmed boolean not null default false,
  provider_cleanup_alias_count integer not null default 0,
  provider_cleanup_inventory_complete boolean not null default true,
  daily_sun_revoked boolean not null,
  daily_sun_reconciliation_required boolean not null,
  expires_at timestamptz not null,
  constraint account_deletion_receipts_recovery_verifier_valid
    check (
      octet_length(recovery_verifier) between 66 and 97
      and recovery_verifier
        ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}:[0-9a-f]{64}$'
    ),
  constraint account_deletion_receipts_timestamps_valid
    check (
      expires_at > prepared_at
      and (completed_at is null or completed_at >= prepared_at)
    ),
  constraint account_deletion_receipts_alias_count_valid
    check (provider_cleanup_alias_count between 0 and 16)
);

create index if not exists account_deletion_receipts_owner_expiry_idx
  on private.account_deletion_receipts (user_id, expires_at);

create index if not exists account_deletion_receipts_expiry_idx
  on private.account_deletion_receipts (expires_at);

-- Provider cleanup is deliberately non-cascading from Auth/account state.
-- The contact locator is a request-bound service envelope; recipient_hash is
-- authority/routing metadata and no plaintext email is retained.
create table if not exists private.account_deletion_provider_cleanup (
  request_id uuid not null
    references private.account_deletion_receipts(request_id) on delete cascade,
  recipient_hash text not null,
  payload_ciphertext bytea,
  payload_nonce bytea,
  payload_encryption_format text,
  payload_key_scope text,
  payload_key_version integer,
  payload_wrapped_key bytea,
  authority_attempt_id uuid,
  is_current_address boolean not null default false,
  database_revoked_at timestamptz,
  cleanup_claim_id uuid,
  cleanup_claimed_at timestamptz,
  cleanup_claim_expires_at timestamptz,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (request_id, recipient_hash),
  constraint account_deletion_provider_cleanup_recipient_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint account_deletion_provider_cleanup_payload_shape_valid
    check (
      (
        payload_ciphertext is null
        and payload_nonce is null
        and payload_encryption_format is null
        and payload_key_scope is null
        and payload_key_version is null
        and payload_wrapped_key is null
      )
      or (
        octet_length(payload_ciphertext) between 17 and 528
        and octet_length(payload_nonce) = 12
        and payload_encryption_format = 'opaque_v1'
        and payload_key_scope = 'service'
        and payload_key_version between 1 and 1000000
        and octet_length(payload_wrapped_key) = 68
      )
    ),
  constraint account_deletion_provider_cleanup_state_valid
    check (state in ('pending', 'completed', 'superseded')),
  constraint account_deletion_provider_cleanup_attempt_count_valid
    check (attempt_count between 0 and 1000000),
  constraint account_deletion_provider_cleanup_claim_valid
    check (
      (
        cleanup_claim_id is null
        and cleanup_claimed_at is null
        and cleanup_claim_expires_at is null
      ) or (
        cleanup_claim_id is not null
        and cleanup_claimed_at is not null
        and cleanup_claim_expires_at > cleanup_claimed_at
        and cleanup_claim_expires_at <= cleanup_claimed_at + interval '1 minute'
      )
    ),
  constraint account_deletion_provider_cleanup_terminal_valid
    check (
      (state = 'pending' and completed_at is null)
      or (state in ('completed', 'superseded') and completed_at is not null)
    ),
  constraint account_deletion_provider_cleanup_timestamps_valid
    check (
      updated_at >= created_at
      and (last_attempt_at is null or last_attempt_at >= created_at)
      and (database_revoked_at is null or database_revoked_at >= created_at)
      and (cleanup_claimed_at is null or cleanup_claimed_at >= created_at)
      and (completed_at is null or completed_at >= created_at)
    )
);

create index if not exists account_deletion_provider_cleanup_pending_idx
  on private.account_deletion_provider_cleanup (request_id, updated_at, recipient_hash)
  where state = 'pending';

-- A provider add is outside PostgreSQL's transaction boundary. The short lease
-- makes that in-flight write visible to deletion cleanup, which must not claim
-- success until the writer converges or its bounded lease expires.
create table if not exists private.account_daily_sun_provider_mutation_leases (
  recipient_hash text primary key,
  authority_attempt_id uuid not null,
  lease_id uuid not null unique,
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  constraint account_daily_sun_provider_mutation_leases_hash_valid
    check (
      octet_length(recipient_hash) = 64
      and recipient_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint account_daily_sun_provider_mutation_leases_expiry_valid
    check (
      expires_at > started_at
      and expires_at <= started_at + interval '10 minutes'
    )
);

create index if not exists account_daily_sun_provider_mutation_leases_expiry_idx
  on private.account_daily_sun_provider_mutation_leases (expires_at);

-- Keep reviewed SQL-editor retries compatible with a partially applied older
-- snapshot of this same unreleased migration.
alter table private.account_states
  add column if not exists daily_sun_was_confirmed boolean not null default false;
alter table private.account_daily_sun_recipient_aliases
  add column if not exists authority_attempt_id uuid;
alter table private.account_deletion_provider_cleanup
  add column if not exists authority_attempt_id uuid,
  add column if not exists is_current_address boolean not null default false,
  add column if not exists database_revoked_at timestamptz,
  add column if not exists cleanup_claim_id uuid,
  add column if not exists cleanup_claimed_at timestamptz,
  add column if not exists cleanup_claim_expires_at timestamptz;
alter table private.account_deletion_provider_cleanup
  drop constraint if exists account_deletion_provider_cleanup_state_valid;
alter table private.account_deletion_provider_cleanup
  add constraint account_deletion_provider_cleanup_state_valid
    check (state in ('pending', 'completed', 'superseded'));
alter table private.account_deletion_provider_cleanup
  drop constraint if exists account_deletion_provider_cleanup_terminal_valid;
alter table private.account_deletion_provider_cleanup
  add constraint account_deletion_provider_cleanup_terminal_valid
    check (
      (state = 'pending' and completed_at is null)
      or (state in ('completed', 'superseded') and completed_at is not null)
    );
alter table private.account_deletion_provider_cleanup
  drop constraint if exists account_deletion_provider_cleanup_claim_valid;
alter table private.account_deletion_provider_cleanup
  add constraint account_deletion_provider_cleanup_claim_valid
    check (
      (
        cleanup_claim_id is null
        and cleanup_claimed_at is null
        and cleanup_claim_expires_at is null
      ) or (
        cleanup_claim_id is not null
        and cleanup_claimed_at is not null
        and cleanup_claim_expires_at > cleanup_claimed_at
        and cleanup_claim_expires_at <= cleanup_claimed_at + interval '1 minute'
      )
    );

alter table private.account_states enable row level security;
alter table private.account_daily_sun_recipient_aliases enable row level security;
alter table private.account_consents enable row level security;
alter table private.account_consent_events enable row level security;
alter table private.account_sync_devices enable row level security;
alter table private.account_chart_records enable row level security;
alter table private.account_chart_secret_envelopes enable row level security;
alter table private.account_sync_changes enable row level security;
alter table private.account_sync_tombstones enable row level security;
alter table private.account_sync_mutations enable row level security;
alter table private.account_deletion_receipts enable row level security;
alter table private.account_deletion_provider_cleanup enable row level security;
alter table private.account_daily_sun_provider_mutation_leases enable row level security;

revoke all on private.account_states from public, anon, authenticated, service_role;
revoke all on private.account_daily_sun_recipient_aliases from public, anon, authenticated, service_role;
revoke all on private.account_consents from public, anon, authenticated, service_role;
revoke all on private.account_consent_events from public, anon, authenticated, service_role;
revoke all on private.account_sync_devices from public, anon, authenticated, service_role;
revoke all on private.account_chart_records from public, anon, authenticated, service_role;
revoke all on private.account_chart_secret_envelopes from public, anon, authenticated, service_role;
revoke all on private.account_sync_changes from public, anon, authenticated, service_role;
revoke all on private.account_sync_tombstones from public, anon, authenticated, service_role;
revoke all on private.account_sync_mutations from public, anon, authenticated, service_role;
revoke all on private.account_deletion_receipts from public, anon, authenticated, service_role;
revoke all on private.account_deletion_provider_cleanup from public, anon, authenticated, service_role;
revoke all on private.account_daily_sun_provider_mutation_leases from public, anon, authenticated, service_role;

grant select, insert, update, delete on private.account_states to service_role;
grant select, insert, delete on private.account_daily_sun_recipient_aliases to service_role;
grant update (
  locator_ciphertext,
  locator_nonce,
  locator_encryption_format,
  locator_key_scope,
  locator_key_version,
  locator_wrapped_key,
  authority_attempt_id,
  updated_at
) on private.account_daily_sun_recipient_aliases to service_role;
grant select, insert, update, delete on private.account_consents to service_role;
grant select, insert on private.account_consent_events to service_role;
grant select, insert, update, delete on private.account_sync_devices to service_role;
grant select, insert, update, delete on private.account_chart_records to service_role;
grant select, insert, update, delete on private.account_chart_secret_envelopes to service_role;
grant select, insert, delete on private.account_sync_changes to service_role;
grant select, insert, update, delete on private.account_sync_tombstones to service_role;
grant select, insert, delete on private.account_sync_mutations to service_role;
grant select, insert, update, delete on private.account_deletion_receipts to service_role;
grant select, insert, update, delete on private.account_deletion_provider_cleanup to service_role;
grant select, insert, update, delete on private.account_daily_sun_provider_mutation_leases to service_role;

revoke all on sequence private.account_consent_events_event_id_seq
  from public, anon, authenticated, service_role;
revoke all on sequence private.account_sync_changes_change_seq_seq
  from public, anon, authenticated, service_role;
grant usage, select on sequence private.account_consent_events_event_id_seq to service_role;
grant usage, select on sequence private.account_sync_changes_change_seq_seq to service_role;

-- Existing users keep the legacy sync path until their explicit v2 bootstrap.
-- This helper exposes one boolean and no account data; its explicit uid check
-- prevents anonymous execution even if grants drift.
create or replace function public.account_v2_legacy_sync_allowed()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return false;
  end if;

  -- Serialize the last possible v1 write with the first v2 bootstrap. An
  -- absent account row cannot be row-locked, so this transaction advisory lock
  -- closes the otherwise unavoidable check/insert gap.
  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text, 7312025)
  );

  return not exists (
    select 1
    from private.account_states
    where user_id = current_user_id
  );
end;
$$;

revoke all on function public.account_v2_legacy_sync_allowed()
  from public, anon, service_role;
grant execute on function public.account_v2_legacy_sync_allowed()
  to authenticated;

drop policy if exists "charts_insert_own" on public.charts;
drop policy if exists "charts_update_own" on public.charts;
drop policy if exists "charts_delete_own" on public.charts;

create policy "charts_insert_own"
on public.charts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

create policy "charts_update_own"
on public.charts
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
)
with check (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

create policy "charts_delete_own"
on public.charts
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

drop policy if exists "chart_deletions_insert_own" on public.chart_deletions;
drop policy if exists "chart_deletions_update_own" on public.chart_deletions;
drop policy if exists "chart_deletions_delete_own" on public.chart_deletions;

create policy "chart_deletions_insert_own"
on public.chart_deletions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

create policy "chart_deletions_update_own"
on public.chart_deletions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
)
with check (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

create policy "chart_deletions_delete_own"
on public.chart_deletions
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.account_v2_legacy_sync_allowed())
);

create or replace function public.account_v2_bootstrap(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_platform text,
  candidate_daily_sun_recipient_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  current_device private.account_sync_devices%rowtype;
  current_cursor bigint;
  chart_sync_state text;
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_platform not in ('web', 'ios', 'unknown')
    or candidate_daily_sun_recipient_hash is null
    or octet_length(candidate_daily_sun_recipient_hash) <> 64
    or candidate_daily_sun_recipient_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(candidate_user_id::text, 7312025)
  );

  -- Do not establish v2 authority while any raw v1 chart still exists. The
  -- lock is shared with every legacy chart write policy, making this existence
  -- check and the account-state insert one atomic cutover decision.
  if exists (
    select 1
    from public.charts
    where user_id = candidate_user_id
  ) then
    return jsonb_build_object('outcome', 'legacy_migration_required');
  end if;

  insert into private.account_states (user_id, daily_sun_recipient_hash)
  values (candidate_user_id, candidate_daily_sun_recipient_hash)
  on conflict (user_id) do update
  set daily_sun_recipient_hash = excluded.daily_sun_recipient_hash,
      updated_at = case
        when private.account_states.daily_sun_recipient_hash
          is distinct from excluded.daily_sun_recipient_hash
          then clock_timestamp()
        else private.account_states.updated_at
      end
  where private.account_states.status = 'active';

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if current_state.status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  insert into private.account_daily_sun_recipient_aliases (
    user_id,
    recipient_hash
  ) values (
    candidate_user_id,
    candidate_daily_sun_recipient_hash
  )
  on conflict (user_id, recipient_hash) do nothing;

  insert into private.account_sync_devices (
    user_id,
    device_id,
    platform
  ) values (
    candidate_user_id,
    candidate_device_id,
    candidate_platform
  )
  on conflict (user_id, device_id) do update
  set platform = excluded.platform,
      last_seen_at = clock_timestamp()
  where private.account_sync_devices.revoked_at is null;

  select * into current_device
  from private.account_sync_devices
  where user_id = candidate_user_id
    and device_id = candidate_device_id;

  if current_device.revoked_at is not null then
    return jsonb_build_object('outcome', 'device_revoked');
  end if;

  current_cursor := current_device.last_cursor;

  select state into chart_sync_state
  from private.account_consents
  where user_id = candidate_user_id
    and purpose = 'chart_sync';

  return jsonb_build_object(
    'outcome', 'ready',
    'account_state', current_state.status,
    'chart_sync_consent', coalesce(chart_sync_state, 'pending'),
    'cursor', current_cursor
  );
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
end;
$$;

revoke all on function public.account_v2_bootstrap(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.account_v2_bootstrap(uuid, uuid, text, text)
  to service_role;

create or replace function private.account_v2_current_policy_version(
  candidate_purpose text
)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case candidate_purpose
    when 'chart_sync' then 'chart-sync-2026-08-12.v1'
    when 'weekly_digest' then 'weekly-digest-2026-08-12.v1'
    when 'daily_chart_email' then 'daily-chart-email-2026-08-12.v1'
    when 'compatibility_invites' then 'compatibility-invites-2026-08-12.v1'
    when 'ai_memory' then 'ai-memory-2026-08-12.v1'
    when 'public_presentation' then 'public-presentation-2026-08-12.v1'
    else null
  end;
$$;

revoke all on function private.account_v2_current_policy_version(text)
  from public, anon, authenticated;
grant execute on function private.account_v2_current_policy_version(text)
  to service_role;

-- The browser semantic SHA-256 never enters Postgres. The trusted server
-- HMACs the canonical preimage with its active secret and may include up to
-- three retained-key candidates for replay after rotation. Only the first
-- (active) verifier is stored for a new mutation.
create or replace function private.account_v2_valid_request_fingerprints(
  candidate jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  verifier text;
  verifier_count integer := 0;
  distinct_count integer;
begin
  if candidate is null
    or jsonb_typeof(candidate) <> 'array'
    or jsonb_array_length(candidate) not between 1 and 4
  then
    return false;
  end if;

  for verifier in select jsonb_array_elements_text(candidate)
  loop
    if verifier !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}:[0-9a-f]{64}$' then
      return false;
    end if;
    verifier_count := verifier_count + 1;
  end loop;

  select count(distinct value)::integer
  into distinct_count
  from jsonb_array_elements_text(candidate);

  return verifier_count = jsonb_array_length(candidate)
    and distinct_count = verifier_count;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.account_v2_valid_request_fingerprints(jsonb)
  from public, anon, authenticated;
grant execute on function private.account_v2_valid_request_fingerprints(jsonb)
  to service_role;

create or replace function public.account_v2_record_consent(
  candidate_user_id uuid,
  candidate_purpose text,
  candidate_decision text,
  candidate_policy_version text,
  candidate_source text,
  candidate_mutation_id uuid,
  candidate_request_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  current_consent private.account_consents%rowtype;
  replay_mutation private.account_sync_mutations%rowtype;
  event_number bigint;
  effective_policy_version text;
  operation_time timestamptz := clock_timestamp();
  current_chart record;
  deletion_revision bigint;
  result_value jsonb;
begin
  if candidate_user_id is null
    or candidate_mutation_id is null
    or candidate_purpose not in (
      'chart_sync',
      'weekly_digest',
      'daily_chart_email',
      'compatibility_invites',
      'ai_memory',
      'public_presentation'
    )
    or candidate_decision not in ('grant', 'withdraw')
    or candidate_source not in ('web', 'ios', 'support', 'system')
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_mutation_id;

  if found then
    if replay_mutation.operation <> 'consent'
      or not exists (
        select 1
        from jsonb_array_elements_text(candidate_request_fingerprints) as supplied(verifier)
        where supplied.verifier = replay_mutation.request_fingerprint_verifier
      )
    then
      return jsonb_build_object('outcome', 'mutation_conflict');
    end if;
    return replay_mutation.result;
  end if;

  if current_state.status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  effective_policy_version := private.account_v2_current_policy_version(
    candidate_purpose
  );

  if effective_policy_version is null
    or (
      candidate_decision = 'grant'
      and candidate_policy_version is distinct from effective_policy_version
    )
  then
    return jsonb_build_object('outcome', 'policy_version_required');
  end if;

  if candidate_decision = 'withdraw' then
    select policy_version into effective_policy_version
    from private.account_consents
    where user_id = candidate_user_id
      and purpose = candidate_purpose;

    effective_policy_version := coalesce(
      effective_policy_version,
      private.account_v2_current_policy_version(candidate_purpose)
    );
  end if;

  -- A fresh mutation UUID must not turn an already-effective consent choice
  -- into unbounded immutable events/changes. Return the existing audit event;
  -- the no-op UUID is deliberately not persisted in the replay ledger.
  select * into current_consent
  from private.account_consents
  where user_id = candidate_user_id
    and purpose = candidate_purpose;

  if found
    and (
      (candidate_decision = 'grant' and current_consent.state = 'granted')
      or
      (candidate_decision = 'withdraw' and current_consent.state = 'withdrawn')
    )
    and (
      candidate_decision = 'withdraw'
      or current_consent.policy_version = effective_policy_version
    )
  then
    select event_id into event_number
    from private.account_consent_events
    where user_id = candidate_user_id
      and purpose = candidate_purpose
      and decision = candidate_decision
    order by event_id desc
    limit 1;

    if event_number is not null then
      return jsonb_build_object(
        'outcome', case
          when candidate_decision = 'grant' then 'granted'
          else 'withdrawn'
        end,
        'purpose', candidate_purpose,
        'event_id', event_number
      );
    end if;
  end if;

  insert into private.account_consent_events (
    user_id,
    purpose,
    decision,
    policy_version,
    source,
    idempotency_key,
    occurred_at
  ) values (
    candidate_user_id,
    candidate_purpose,
    candidate_decision,
    effective_policy_version,
    candidate_source,
    candidate_mutation_id,
    operation_time
  )
  returning event_id into event_number;

  insert into private.account_consents (
    user_id,
    purpose,
    state,
    policy_version,
    granted_at,
    withdrawn_at,
    updated_at
  ) values (
    candidate_user_id,
    candidate_purpose,
    case when candidate_decision = 'grant' then 'granted' else 'withdrawn' end,
    effective_policy_version,
    case when candidate_decision = 'grant' then operation_time else null end,
    case when candidate_decision = 'withdraw' then operation_time else null end,
    operation_time
  )
  on conflict (user_id, purpose) do update
  set state = excluded.state,
      policy_version = excluded.policy_version,
      granted_at = excluded.granted_at,
      withdrawn_at = excluded.withdrawn_at,
      updated_at = excluded.updated_at;

  if candidate_purpose = 'chart_sync' and candidate_decision = 'withdraw' then
    for current_chart in
      select chart_id, revision
      from private.account_chart_records
      where user_id = candidate_user_id
      order by chart_id
      for update
    loop
      deletion_revision := current_chart.revision + 1;

      insert into private.account_sync_tombstones (
        user_id,
        chart_id,
        revision,
        mutation_id,
        deleted_at
      ) values (
        candidate_user_id,
        current_chart.chart_id,
        deletion_revision,
        candidate_mutation_id,
        operation_time
      )
      on conflict (user_id, chart_id) do update
      set revision = greatest(
            private.account_sync_tombstones.revision,
            excluded.revision
          ),
          mutation_id = excluded.mutation_id,
          deleted_at = excluded.deleted_at;

      delete from private.account_chart_records
      where user_id = candidate_user_id
        and chart_id = current_chart.chart_id;

      insert into private.account_sync_changes (
        user_id,
        entity_type,
        entity_id,
        operation,
        revision,
        mutation_id,
        created_at
      ) values (
        candidate_user_id,
        'chart',
        current_chart.chart_id,
        'delete',
        deletion_revision,
        candidate_mutation_id,
        operation_time
      );
    end loop;
  end if;

  insert into private.account_sync_changes (
    user_id,
    entity_type,
    entity_id,
    operation,
    revision,
    mutation_id,
    created_at
  ) values (
    candidate_user_id,
    'consent',
    null,
    candidate_decision,
    event_number,
    candidate_mutation_id,
    operation_time
  );

  result_value := jsonb_build_object(
    'outcome', case when candidate_decision = 'grant' then 'granted' else 'withdrawn' end,
    'purpose', candidate_purpose,
    'event_id', event_number
  );

  insert into private.account_sync_mutations (
    user_id,
    mutation_id,
    operation,
    request_fingerprint_verifier,
    result
  ) values (
    candidate_user_id,
    candidate_mutation_id,
    'consent',
    candidate_request_fingerprints->>0,
    result_value
  );

  return result_value;
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
end;
$$;

revoke all on function public.account_v2_record_consent(uuid, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_record_consent(uuid, text, text, text, text, uuid, jsonb)
  to service_role;

create or replace function public.account_v2_withdraw_chart_sync(
  candidate_user_id uuid,
  candidate_policy_version text,
  candidate_source text,
  candidate_mutation_id uuid,
  candidate_request_fingerprints jsonb
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select public.account_v2_record_consent(
    candidate_user_id,
    'chart_sync',
    'withdraw',
    candidate_policy_version,
    candidate_source,
    candidate_mutation_id,
    candidate_request_fingerprints
  );
$$;

revoke all on function public.account_v2_withdraw_chart_sync(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_withdraw_chart_sync(uuid, text, text, uuid, jsonb)
  to service_role;

create or replace function public.account_v2_put_chart(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_chart_id uuid,
  candidate_base_revision bigint,
  candidate_mutation_id uuid,
  candidate_request_fingerprints jsonb,
  candidate_subject_kind text,
  candidate_subject_attestation text,
  candidate_ciphertext bytea,
  candidate_nonce bytea,
  candidate_encryption_format text,
  candidate_key_scope text,
  candidate_key_version integer,
  candidate_wrapped_key bytea
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  account_status text;
  consent_state text;
  current_revision bigint;
  deleted_revision bigint;
  next_revision bigint;
  next_change bigint;
  replay_mutation private.account_sync_mutations%rowtype;
  result_value jsonb;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_chart_id is null
    or candidate_mutation_id is null
    or candidate_base_revision is null
    or candidate_base_revision < 0
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
    or candidate_ciphertext is null
    or octet_length(candidate_ciphertext) not between 17 and 16400
    or candidate_nonce is null
    or octet_length(candidate_nonce) <> 12
    or candidate_encryption_format is distinct from 'opaque_v1'
    or candidate_key_scope is distinct from 'service'
    or candidate_key_version is null
    or candidate_key_version not between 1 and 1000000
    or candidate_wrapped_key is null
    or octet_length(candidate_wrapped_key) <> 68
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select status into account_status
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if account_status is null then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_mutation_id;

  if found then
    if replay_mutation.operation <> 'put_chart'
      or not exists (
        select 1
        from jsonb_array_elements_text(candidate_request_fingerprints) as supplied(verifier)
        where supplied.verifier = replay_mutation.request_fingerprint_verifier
      )
    then
      return jsonb_build_object('outcome', 'mutation_conflict');
    end if;
    return replay_mutation.result;
  end if;

  if candidate_subject_kind is distinct from 'self'
    or candidate_subject_attestation is distinct from 'self_declared_v1'
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  if account_status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  if not exists (
    select 1
    from private.account_sync_devices
    where user_id = candidate_user_id
      and device_id = candidate_device_id
      and revoked_at is null
  ) then
    return jsonb_build_object('outcome', 'device_unavailable');
  end if;

  select state into consent_state
  from private.account_consents
  where user_id = candidate_user_id
    and purpose = 'chart_sync';

  if consent_state is distinct from 'granted' then
    return jsonb_build_object('outcome', 'consent_required');
  end if;

  select revision into current_revision
  from private.account_chart_records
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
  for update;

  select revision into deleted_revision
  from private.account_sync_tombstones
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
  for update;

  if current_revision is null and exists (
    select 1
    from private.account_chart_records
    where user_id = candidate_user_id
      and chart_id <> candidate_chart_id
  ) then
    return jsonb_build_object(
      'outcome', 'chart_limit_reached',
      'limit', 1
    );
  end if;

  if current_revision is not null then
    if candidate_base_revision <> current_revision then
      return jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', current_revision,
        'deleted', false
      );
    end if;
    next_revision := current_revision + 1;
  elsif deleted_revision is not null then
    if candidate_base_revision <> deleted_revision then
      return jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', deleted_revision,
        'deleted', true
      );
    end if;
    next_revision := deleted_revision + 1;
  else
    if candidate_base_revision <> 0 then
      return jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', 0,
        'deleted', false
      );
    end if;
    next_revision := 1;
  end if;

  insert into private.account_chart_records (
    user_id,
    chart_id,
    subject_kind,
    subject_attestation,
    revision,
    created_at,
    updated_at
  ) values (
    candidate_user_id,
    candidate_chart_id,
    candidate_subject_kind,
    candidate_subject_attestation,
    next_revision,
    operation_time,
    operation_time
  )
  on conflict (user_id, chart_id) do update
  set subject_kind = excluded.subject_kind,
      subject_attestation = excluded.subject_attestation,
      revision = excluded.revision,
      updated_at = excluded.updated_at;

  insert into private.account_chart_secret_envelopes (
    user_id,
    chart_id,
    revision,
    ciphertext,
    nonce,
    encryption_format,
    key_scope,
    key_version,
    wrapped_key,
    created_at,
    updated_at
  ) values (
    candidate_user_id,
    candidate_chart_id,
    next_revision,
    candidate_ciphertext,
    candidate_nonce,
    candidate_encryption_format,
    candidate_key_scope,
    candidate_key_version,
    candidate_wrapped_key,
    operation_time,
    operation_time
  )
  on conflict (user_id, chart_id) do update
  set revision = excluded.revision,
      ciphertext = excluded.ciphertext,
      nonce = excluded.nonce,
      encryption_format = excluded.encryption_format,
      key_scope = excluded.key_scope,
      key_version = excluded.key_version,
      wrapped_key = excluded.wrapped_key,
      updated_at = excluded.updated_at;

  delete from private.account_sync_tombstones
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id;

  insert into private.account_sync_changes (
    user_id,
    entity_type,
    entity_id,
    operation,
    revision,
    mutation_id,
    created_at
  ) values (
    candidate_user_id,
    'chart',
    candidate_chart_id,
    'upsert',
    next_revision,
    candidate_mutation_id,
    operation_time
  ) returning change_seq into next_change;

  result_value := jsonb_build_object(
    'outcome', 'saved',
    'chart_id', candidate_chart_id,
    'revision', next_revision,
    'change_seq', next_change
  );

  insert into private.account_sync_mutations (
    user_id,
    mutation_id,
    operation,
    request_fingerprint_verifier,
    result
  ) values (
    candidate_user_id,
    candidate_mutation_id,
    'put_chart',
    candidate_request_fingerprints->>0,
    result_value
  );

  update private.account_sync_devices
  set last_seen_at = operation_time
  where user_id = candidate_user_id
    and device_id = candidate_device_id;

  return result_value;
exception
  when check_violation or not_null_violation or string_data_right_truncation then
    return jsonb_build_object('outcome', 'invalid');
end;
$$;

revoke all on function public.account_v2_put_chart(
  uuid, uuid, uuid, bigint, uuid, jsonb, text, text, bytea, bytea, text, text,
  integer, bytea
) from public, anon, authenticated;
grant execute on function public.account_v2_put_chart(
  uuid, uuid, uuid, bigint, uuid, jsonb, text, text, bytea, bytea, text, text,
  integer, bytea
) to service_role;

create or replace function public.account_v2_delete_chart(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_chart_id uuid,
  candidate_base_revision bigint,
  candidate_mutation_id uuid,
  candidate_request_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  account_status text;
  current_revision bigint;
  deleted_revision bigint;
  next_revision bigint;
  next_change bigint;
  replay_mutation private.account_sync_mutations%rowtype;
  result_value jsonb;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_chart_id is null
    or candidate_mutation_id is null
    or candidate_base_revision is null
    or candidate_base_revision < 0
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select status into account_status
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if account_status is null then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_mutation_id;

  if found then
    if replay_mutation.operation <> 'delete_chart'
      or not exists (
        select 1
        from jsonb_array_elements_text(candidate_request_fingerprints) as supplied(verifier)
        where supplied.verifier = replay_mutation.request_fingerprint_verifier
      )
    then
      return jsonb_build_object('outcome', 'mutation_conflict');
    end if;
    return replay_mutation.result;
  end if;

  if account_status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  if not exists (
    select 1
    from private.account_sync_devices
    where user_id = candidate_user_id
      and device_id = candidate_device_id
      and revoked_at is null
  ) then
    return jsonb_build_object('outcome', 'device_unavailable');
  end if;

  select revision into current_revision
  from private.account_chart_records
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
  for update;

  select revision into deleted_revision
  from private.account_sync_tombstones
  where user_id = candidate_user_id
    and chart_id = candidate_chart_id
  for update;

  if current_revision is null then
    if deleted_revision is not null then
      result_value := jsonb_build_object(
        'outcome', 'already_deleted',
        'chart_id', candidate_chart_id,
        'revision', deleted_revision
      );
    elsif candidate_base_revision = 0 then
      next_revision := 1;
      insert into private.account_sync_tombstones (
        user_id, chart_id, revision, mutation_id, deleted_at
      ) values (
        candidate_user_id,
        candidate_chart_id,
        next_revision,
        candidate_mutation_id,
        operation_time
      );
      insert into private.account_sync_changes (
        user_id, entity_type, entity_id, operation, revision, mutation_id, created_at
      ) values (
        candidate_user_id,
        'chart',
        candidate_chart_id,
        'delete',
        next_revision,
        candidate_mutation_id,
        operation_time
      ) returning change_seq into next_change;
      result_value := jsonb_build_object(
        'outcome', 'deleted',
        'chart_id', candidate_chart_id,
        'revision', next_revision,
        'change_seq', next_change
      );
    else
      return jsonb_build_object(
        'outcome', 'conflict',
        'current_revision', 0,
        'deleted', false
      );
    end if;
  elsif candidate_base_revision <> current_revision then
    return jsonb_build_object(
      'outcome', 'conflict',
      'current_revision', current_revision,
      'deleted', false
    );
  else
    next_revision := current_revision + 1;

    insert into private.account_sync_tombstones (
      user_id, chart_id, revision, mutation_id, deleted_at
    ) values (
      candidate_user_id,
      candidate_chart_id,
      next_revision,
      candidate_mutation_id,
      operation_time
    )
    on conflict (user_id, chart_id) do update
    set revision = excluded.revision,
        mutation_id = excluded.mutation_id,
        deleted_at = excluded.deleted_at;

    delete from private.account_chart_records
    where user_id = candidate_user_id
      and chart_id = candidate_chart_id;

    insert into private.account_sync_changes (
      user_id, entity_type, entity_id, operation, revision, mutation_id, created_at
    ) values (
      candidate_user_id,
      'chart',
      candidate_chart_id,
      'delete',
      next_revision,
      candidate_mutation_id,
      operation_time
    ) returning change_seq into next_change;

    result_value := jsonb_build_object(
      'outcome', 'deleted',
      'chart_id', candidate_chart_id,
      'revision', next_revision,
      'change_seq', next_change
    );
  end if;

  insert into private.account_sync_mutations (
    user_id, mutation_id, operation, request_fingerprint_verifier, result
  ) values (
    candidate_user_id,
    candidate_mutation_id,
    'delete_chart',
    candidate_request_fingerprints->>0,
    result_value
  );

  update private.account_sync_devices
  set last_seen_at = operation_time
  where user_id = candidate_user_id
    and device_id = candidate_device_id;

  return result_value;
end;
$$;

revoke all on function public.account_v2_delete_chart(uuid, uuid, uuid, bigint, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_delete_chart(uuid, uuid, uuid, bigint, uuid, jsonb)
  to service_role;

create or replace function public.account_v2_pull(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_after_seq bigint default 0,
  candidate_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  account_status text;
  change_rows jsonb;
  next_cursor bigint;
  more_available boolean;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_after_seq is null
    or candidate_after_seq < 0
    or candidate_limit is null
    or candidate_limit < 1
    or candidate_limit > 200
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select status into account_status
  from private.account_states
  where user_id = candidate_user_id;

  if account_status is null then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  if account_status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  if not exists (
    select 1
    from private.account_sync_devices
    where user_id = candidate_user_id
      and device_id = candidate_device_id
      and revoked_at is null
  ) then
    return jsonb_build_object('outcome', 'device_unavailable');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'seq', selected.change_seq,
        'entity_type', selected.entity_type,
        'entity_id', selected.entity_id,
        'operation', selected.operation,
        'revision', selected.revision,
        'mutation_id', selected.mutation_id,
        'created_at', selected.created_at
      ) order by selected.change_seq
    ),
    '[]'::jsonb
  ), coalesce(max(selected.change_seq), candidate_after_seq)
  into change_rows, next_cursor
  from (
    select change_seq, entity_type, entity_id, operation, revision, mutation_id, created_at
    from private.account_sync_changes
    where user_id = candidate_user_id
      and change_seq > candidate_after_seq
    order by change_seq
    limit candidate_limit
  ) as selected;

  select exists (
    select 1
    from private.account_sync_changes
    where user_id = candidate_user_id
      and change_seq > next_cursor
  ) into more_available;

  update private.account_sync_devices
  set last_cursor = greatest(last_cursor, next_cursor),
      last_seen_at = operation_time
  where user_id = candidate_user_id
    and device_id = candidate_device_id;

  return jsonb_build_object(
    'outcome', 'ready',
    'changes', change_rows,
    'next_cursor', next_cursor,
    'has_more', more_available
  );
end;
$$;

revoke all on function public.account_v2_pull(uuid, uuid, bigint, integer)
  from public, anon, authenticated;
grant execute on function public.account_v2_pull(uuid, uuid, bigint, integer)
  to service_role;

create or replace function public.account_v2_get_chart(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_chart_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  chart_value jsonb;
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_chart_id is null
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  if not exists (
    select 1
    from private.account_states
    where user_id = candidate_user_id
      and status = 'active'
  ) then
    return jsonb_build_object('outcome', 'account_unavailable');
  end if;

  if not exists (
    select 1
    from private.account_consents
    where user_id = candidate_user_id
      and purpose = 'chart_sync'
      and state = 'granted'
  ) then
    return jsonb_build_object('outcome', 'consent_required');
  end if;

  if not exists (
    select 1
    from private.account_sync_devices
    where user_id = candidate_user_id
      and device_id = candidate_device_id
      and revoked_at is null
  ) then
    return jsonb_build_object('outcome', 'device_unavailable');
  end if;

  select jsonb_build_object(
    'outcome', 'ready',
    'chart_id', records.chart_id,
    'subject_kind', records.subject_kind,
    'subject_attestation', records.subject_attestation,
    'revision', records.revision,
    'created_at', records.created_at,
    'updated_at', records.updated_at,
    'encrypted_source', jsonb_build_object(
      'ciphertext', encode(secrets.ciphertext, 'base64'),
      'nonce', encode(secrets.nonce, 'base64'),
      'format', secrets.encryption_format,
      'key_scope', secrets.key_scope,
      'key_version', secrets.key_version,
      'wrapped_key', encode(secrets.wrapped_key, 'base64')
    )
  ) into chart_value
  from private.account_chart_records as records
  join private.account_chart_secret_envelopes as secrets
    on secrets.user_id = records.user_id
   and secrets.chart_id = records.chart_id
   and secrets.revision = records.revision
  where records.user_id = candidate_user_id
    and records.chart_id = candidate_chart_id;

  return coalesce(chart_value, jsonb_build_object('outcome', 'not_found'));
end;
$$;

revoke all on function public.account_v2_get_chart(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_get_chart(uuid, uuid, uuid)
  to service_role;

create or replace function public.account_v2_export(candidate_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  state_value jsonb;
  consent_values jsonb;
  consent_event_values jsonb;
  device_values jsonb;
  daily_sun_alias_values jsonb;
  chart_values jsonb;
  change_values jsonb;
  tombstone_values jsonb;
begin
  if candidate_user_id is null then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select jsonb_build_object(
    'status', status,
    'created_at', created_at,
    'updated_at', updated_at,
    'deletion_started_at', deletion_started_at
  ) into state_value
  from private.account_states
  where user_id = candidate_user_id;

  if state_value is null then
    return jsonb_build_object(
      'outcome', 'ready',
      'schema', 'zodiacs.account-sync-v2.export.v1',
      'account', null,
      'consents', '[]'::jsonb,
      'consent_events', '[]'::jsonb,
      'devices', '[]'::jsonb,
      'daily_sun_aliases', '[]'::jsonb,
      'charts', '[]'::jsonb,
      'changes', '[]'::jsonb,
      'tombstones', '[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'purpose', purpose,
    'state', state,
    'policy_version', policy_version,
    'granted_at', granted_at,
    'withdrawn_at', withdrawn_at,
    'updated_at', updated_at
  ) order by purpose), '[]'::jsonb)
  into consent_values
  from private.account_consents
  where user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id', event_id,
    'purpose', purpose,
    'decision', decision,
    'policy_version', policy_version,
    'source', source,
    'occurred_at', occurred_at
  ) order by event_id), '[]'::jsonb)
  into consent_event_values
  from private.account_consent_events
  where user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'device_id', device_id,
    'platform', platform,
    'last_cursor', last_cursor,
    'created_at', created_at,
    'last_seen_at', last_seen_at,
    'revoked_at', revoked_at
  ) order by created_at, device_id), '[]'::jsonb)
  into device_values
  from private.account_sync_devices
  where user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'recipient_hash', recipient_hash,
    'encrypted_locator', case
      when locator_ciphertext is null then null
      else jsonb_build_object(
        'ciphertext', encode(locator_ciphertext, 'base64'),
        'nonce', encode(locator_nonce, 'base64'),
        'format', locator_encryption_format,
        'key_scope', locator_key_scope,
        'key_version', locator_key_version,
        'wrapped_key', encode(locator_wrapped_key, 'base64')
      )
    end,
    'bound_at', bound_at,
    'updated_at', updated_at
  ) order by bound_at, recipient_hash), '[]'::jsonb)
  into daily_sun_alias_values
  from private.account_daily_sun_recipient_aliases
  where user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'chart_id', records.chart_id,
    'subject_kind', records.subject_kind,
    'subject_attestation', records.subject_attestation,
    'revision', records.revision,
    'created_at', records.created_at,
    'updated_at', records.updated_at,
    'encrypted_source', jsonb_build_object(
      'ciphertext', encode(secrets.ciphertext, 'base64'),
      'nonce', encode(secrets.nonce, 'base64'),
      'format', secrets.encryption_format,
      'key_scope', secrets.key_scope,
      'key_version', secrets.key_version,
      'wrapped_key', encode(secrets.wrapped_key, 'base64')
    )
  ) order by records.created_at, records.chart_id), '[]'::jsonb)
  into chart_values
  from private.account_chart_records as records
  join private.account_chart_secret_envelopes as secrets
    on secrets.user_id = records.user_id
   and secrets.chart_id = records.chart_id
   and secrets.revision = records.revision
  where records.user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'seq', change_seq,
    'entity_type', entity_type,
    'entity_id', entity_id,
    'operation', operation,
    'revision', revision,
    'created_at', created_at
  ) order by change_seq), '[]'::jsonb)
  into change_values
  from private.account_sync_changes
  where user_id = candidate_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'chart_id', chart_id,
    'revision', revision,
    'deleted_at', deleted_at
  ) order by deleted_at, chart_id), '[]'::jsonb)
  into tombstone_values
  from private.account_sync_tombstones
  where user_id = candidate_user_id;

  return jsonb_build_object(
    'outcome', 'ready',
    'schema', 'zodiacs.account-sync-v2.export.v1',
    'account', state_value,
    'consents', consent_values,
    'consent_events', consent_event_values,
    'devices', device_values,
    'daily_sun_aliases', daily_sun_alias_values,
    'charts', chart_values,
    'changes', change_values,
    'tombstones', tombstone_values
  );
end;
$$;

revoke all on function public.account_v2_export(uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_export(uuid)
  to service_role;

-- Compatibility invitations are deliberately RPC-only, including for the
-- service role. This definer exposes only the account owner's portable fields
-- and never token hashes, recipient hashes, provider receipts, or claims.
create or replace function private.account_v2_export_legacy_invites(
  candidate_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_rows jsonb;
begin
  if candidate_user_id is null
    or not exists (select 1 from auth.users where id = candidate_user_id)
  then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'label', label,
    'sun_sign', sun_sign,
    'positions', positions,
    'time_known', time_known,
    'status', status,
    'notify_on_complete', notify_on_complete,
    'created_at', created_at,
    'expires_at', expires_at,
    'opened_at', opened_at,
    'completed_at', completed_at,
    'revoked_at', revoked_at,
    'expired_at', expired_at,
    'authority_destroyed_at', authority_destroyed_at,
    'delete_after', delete_after,
    'owner_hidden_at', owner_hidden_at
  ) order by created_at, id), '[]'::jsonb)
  into invite_rows
  from public.compatibility_invites
  where owner_user_id = candidate_user_id;

  return invite_rows;
end;
$$;

revoke all on function private.account_v2_export_legacy_invites(uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_export_legacy_invites(uuid)
  to service_role;

create or replace function public.account_v2_export_legacy_invites(
  candidate_user_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select private.account_v2_export_legacy_invites(candidate_user_id);
$$;

revoke all on function public.account_v2_export_legacy_invites(uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_export_legacy_invites(uuid)
  to service_role;

-- The compatibility tables intentionally grant no direct service-role table
-- access. This narrowly scoped definer is the deletion exception: it can run
-- only after the same owner and request ID are in terminal deletion state.
create or replace function private.account_v2_destroy_legacy_invites(
  candidate_user_id uuid,
  candidate_request_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count bigint;
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not exists (
      select 1
      from private.account_states
      where user_id = candidate_user_id
        and status = 'deleting'
        and deletion_request_id = candidate_request_id
    )
  then
    raise exception 'account deletion authority is invalid'
      using errcode = '42501';
  end if;

  with removed as (
    delete from public.compatibility_invites
    where owner_user_id = candidate_user_id
    returning 1
  )
  select count(*) into removed_count from removed;

  return removed_count;
end;
$$;

revoke all on function private.account_v2_destroy_legacy_invites(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_destroy_legacy_invites(uuid, uuid)
  to service_role;

-- Raw v1 chart payloads must be gone before the Auth admin call. This helper
-- is the narrow privilege bridge for legacy tables whose browser policies and
-- direct grants are intentionally insufficient for terminal account erasure.
create or replace function private.account_v2_destroy_legacy_account(
  candidate_user_id uuid,
  candidate_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_preferences_removed bigint;
  confirmation_claims_removed bigint;
  tombstones_removed bigint;
  charts_removed bigint;
  profiles_removed bigint;
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not exists (
      select 1
      from private.account_states
      where user_id = candidate_user_id
        and status = 'deleting'
        and deletion_request_id = candidate_request_id
    )
  then
    raise exception 'account deletion authority is invalid'
      using errcode = '42501';
  end if;

  delete from public.daily_chart_preferences
  where user_id = candidate_user_id;
  get diagnostics daily_preferences_removed = row_count;

  delete from public.daily_chart_confirmation_send_claims
  where user_id = candidate_user_id;
  get diagnostics confirmation_claims_removed = row_count;

  delete from public.chart_deletions
  where user_id = candidate_user_id;
  get diagnostics tombstones_removed = row_count;

  delete from public.charts
  where user_id = candidate_user_id;
  get diagnostics charts_removed = row_count;

  delete from public.profiles
  where user_id = candidate_user_id;
  get diagnostics profiles_removed = row_count;

  return jsonb_build_object(
    'daily_chart_preferences', daily_preferences_removed,
    'daily_chart_confirmation_send_claims', confirmation_claims_removed,
    'chart_deletions', tombstones_removed,
    'charts', charts_removed,
    'profiles', profiles_removed
  );
end;
$$;

revoke all on function private.account_v2_destroy_legacy_account(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_destroy_legacy_account(uuid, uuid)
  to service_role;

-- Consent decisions are append-only during normal account operation. Terminal
-- account erasure is the sole deletion path, so keep direct DELETE unavailable
-- and cross that boundary only after verifying deletion authority.
create or replace function private.account_v2_destroy_consent_events(
  candidate_user_id uuid,
  candidate_request_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count bigint;
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not exists (
      select 1
      from private.account_states
      where user_id = candidate_user_id
        and status = 'deleting'
        and deletion_request_id = candidate_request_id
    )
  then
    raise exception 'account deletion authority is invalid'
      using errcode = '42501';
  end if;

  delete from private.account_consent_events
  where user_id = candidate_user_id;
  get diagnostics removed_count = row_count;

  return removed_count;
end;
$$;

revoke all on function private.account_v2_destroy_consent_events(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_destroy_consent_events(uuid, uuid)
  to service_role;

create or replace function public.account_v2_prepare_deletion(
  candidate_user_id uuid,
  candidate_request_id uuid,
  candidate_request_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  replay_mutation private.account_sync_mutations%rowtype;
  result_value jsonb;
  daily_sun_was_confirmed boolean := false;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_request_id;

  if found then
    if replay_mutation.operation <> 'prepare_deletion'
      or not exists (
        select 1
        from jsonb_array_elements_text(candidate_request_fingerprints) as supplied(verifier)
        where supplied.verifier = replay_mutation.request_fingerprint_verifier
      )
    then
      return jsonb_build_object('outcome', 'mutation_conflict');
    end if;
    return replay_mutation.result;
  end if;

  if current_state.status = 'deleting' then
    select coalesce((result->>'daily_sun_revoked')::boolean, false)
    into daily_sun_was_confirmed
    from private.account_sync_mutations
    where user_id = candidate_user_id
      and mutation_id = current_state.deletion_request_id
      and operation = 'prepare_deletion';

    result_value := jsonb_build_object(
      'outcome', 'already_prepared',
      'request_id', candidate_request_id,
      'daily_sun_revoked', daily_sun_was_confirmed,
      'prepared_at', current_state.deletion_started_at
    );

    insert into private.account_sync_mutations (
      user_id,
      mutation_id,
      operation,
      request_fingerprint_verifier,
      result,
      created_at
    ) values (
      candidate_user_id,
      candidate_request_id,
      'prepare_deletion',
      candidate_request_fingerprints->>0,
      result_value,
      operation_time
    );

    return result_value;
  end if;

  update private.account_states
  set status = 'deleting',
      deletion_request_id = candidate_request_id,
      deletion_started_at = operation_time,
      updated_at = operation_time
  where user_id = candidate_user_id;

  insert into private.account_consent_events (
    user_id,
    purpose,
    decision,
    policy_version,
    source,
    idempotency_key,
    occurred_at
  )
  select
    candidate_user_id,
    purpose,
    'withdraw',
    policy_version,
    'system',
    gen_random_uuid(),
    operation_time
  from private.account_consents
  where user_id = candidate_user_id
    and state = 'granted';

  update private.account_consents
  set state = 'withdrawn',
      withdrawn_at = operation_time,
      updated_at = operation_time
  where user_id = candidate_user_id
    and state = 'granted';

  update private.account_sync_devices
  set revoked_at = coalesce(revoked_at, operation_time),
      last_seen_at = greatest(last_seen_at, operation_time)
  where user_id = candidate_user_id;

  delete from private.account_chart_records
  where user_id = candidate_user_id;

  delete from private.account_sync_tombstones
  where user_id = candidate_user_id;

  delete from private.account_sync_changes
  where user_id = candidate_user_id;

  -- Daily Sun is an independently confirmed list keyed by the same
  -- non-reversible recipient HMAC used by its unsubscribe flow. Bootstrap
  -- stores this opaque binding, so terminal erasure never depends on the HMAC
  -- secret or raw account email still being available.
  select exists (
    select 1
    from public.daily_sun_preferences
    where recipient_hash = current_state.daily_sun_recipient_hash
  ) into daily_sun_was_confirmed;

  perform public.revoke_daily_email_preference(
    current_state.daily_sun_recipient_hash,
    'sun_sign',
    null
  );

  perform private.account_v2_destroy_legacy_account(
    candidate_user_id,
    candidate_request_id
  );

  perform private.account_v2_destroy_legacy_invites(
    candidate_user_id,
    candidate_request_id
  );

  insert into private.account_sync_changes (
    user_id,
    entity_type,
    entity_id,
    operation,
    revision,
    mutation_id,
    created_at
  ) values (
    candidate_user_id,
    'account',
    null,
    'delete',
    0,
    candidate_request_id,
    operation_time
  );

  result_value := jsonb_build_object(
    'outcome', 'prepared',
    'request_id', candidate_request_id,
    'daily_sun_revoked', daily_sun_was_confirmed,
    'prepared_at', operation_time
  );

  insert into private.account_sync_mutations (
    user_id,
    mutation_id,
    operation,
    request_fingerprint_verifier,
    result,
    created_at
  ) values (
    candidate_user_id,
    candidate_request_id,
    'prepare_deletion',
    candidate_request_fingerprints->>0,
    result_value,
    operation_time
  );

  return result_value;
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
end;
$$;

revoke all on function public.account_v2_prepare_deletion(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_prepare_deletion(uuid, uuid, jsonb)
  to service_role;

-- Replace the preliminary three-argument deletion contract with the terminal
-- contract. A v1-only account may prepare deletion without first joining the
-- sync canary. The optional Daily Sun HMAC binds same-address ancillary
-- cleanup when available, but its absence can never block core erasure.
drop function public.account_v2_prepare_deletion(uuid, uuid, jsonb);

create or replace function public.account_v2_prepare_deletion(
  candidate_user_id uuid,
  candidate_request_id uuid,
  candidate_request_fingerprints jsonb,
  candidate_daily_sun_recipient_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  replay_mutation private.account_sync_mutations%rowtype;
  result_value jsonb;
  daily_sun_was_confirmed boolean := false;
  daily_sun_reconciliation_required boolean := false;
  recipient_alias text;
  recipient_alias_count integer := 0;
  recipient_alias_was_confirmed boolean;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
    or (
      candidate_daily_sun_recipient_hash is not null
      and (
        octet_length(candidate_daily_sun_recipient_hash) <> 64
        or candidate_daily_sun_recipient_hash !~ '^[0-9a-f]{64}$'
      )
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  -- This insert is intentionally deletion-only bootstrap. It neither creates
  -- a device nor records consent, and therefore does not enroll a legacy-only
  -- account into normal sync. The row is immediately made terminal below.
  insert into private.account_states (
    user_id,
    daily_sun_recipient_hash
  ) values (
    candidate_user_id,
    candidate_daily_sun_recipient_hash
  )
  on conflict (user_id) do update
  set daily_sun_recipient_hash = coalesce(
        private.account_states.daily_sun_recipient_hash,
        excluded.daily_sun_recipient_hash
      ),
      updated_at = case
        when private.account_states.daily_sun_recipient_hash is null
          and excluded.daily_sun_recipient_hash is not null
          then operation_time
        else private.account_states.updated_at
      end;

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if current_state.daily_sun_recipient_hash is not null
    and candidate_daily_sun_recipient_hash is not null
    and current_state.daily_sun_recipient_hash
      is distinct from candidate_daily_sun_recipient_hash
  then
    daily_sun_reconciliation_required := true;
  end if;

  if candidate_daily_sun_recipient_hash is not null then
    insert into private.account_daily_sun_recipient_aliases (
      user_id,
      recipient_hash
    ) values (
      candidate_user_id,
      candidate_daily_sun_recipient_hash
    )
    on conflict (user_id, recipient_hash) do nothing;
  end if;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_request_id;

  if found then
    if replay_mutation.operation <> 'prepare_deletion'
      or not exists (
        select 1
        from jsonb_array_elements_text(candidate_request_fingerprints)
          as supplied(verifier)
        where supplied.verifier = replay_mutation.request_fingerprint_verifier
      )
    then
      return jsonb_build_object('outcome', 'mutation_conflict');
    end if;
    return replay_mutation.result;
  end if;

  if current_state.status = 'deleting' then
    select
      coalesce((result->>'daily_sun_revoked')::boolean, false),
      coalesce(
        (result->>'daily_sun_reconciliation_required')::boolean,
        false
      )
    into daily_sun_was_confirmed, daily_sun_reconciliation_required
    from private.account_sync_mutations
    where user_id = candidate_user_id
      and mutation_id = current_state.deletion_request_id
      and operation = 'prepare_deletion';

    for recipient_alias in
      select recipient_hash
      from private.account_daily_sun_recipient_aliases
      where user_id = candidate_user_id
      union
      select current_state.daily_sun_recipient_hash
      where current_state.daily_sun_recipient_hash is not null
    loop
      recipient_alias_count := recipient_alias_count + 1;
      select exists (
        select 1
        from public.daily_sun_preferences
        where recipient_hash = recipient_alias
      ) into recipient_alias_was_confirmed;
      daily_sun_was_confirmed := coalesce(daily_sun_was_confirmed, false)
        or recipient_alias_was_confirmed;
      perform public.revoke_daily_email_preference(
        recipient_alias,
        'sun_sign',
        null
      );
    end loop;

    daily_sun_reconciliation_required :=
      coalesce(daily_sun_reconciliation_required, false)
      or recipient_alias_count = 0
      or recipient_alias_count > 1;

    result_value := jsonb_build_object(
      'outcome', 'already_prepared',
      'request_id', candidate_request_id,
      'daily_sun_revoked', coalesce(daily_sun_was_confirmed, false),
      'daily_sun_reconciliation_required',
        coalesce(daily_sun_reconciliation_required, false),
      'prepared_at', current_state.deletion_started_at
    );

    insert into private.account_sync_mutations (
      user_id,
      mutation_id,
      operation,
      request_fingerprint_verifier,
      result,
      created_at
    ) values (
      candidate_user_id,
      candidate_request_id,
      'prepare_deletion',
      candidate_request_fingerprints->>0,
      result_value,
      operation_time
    );

    insert into private.account_deletion_receipts (
      request_id,
      user_id,
      recovery_verifier,
      prepared_at,
      daily_sun_revoked,
      daily_sun_reconciliation_required,
      expires_at
    ) values (
      candidate_request_id,
      candidate_user_id,
      candidate_request_fingerprints->>0,
      current_state.deletion_started_at,
      coalesce(daily_sun_was_confirmed, false),
      coalesce(daily_sun_reconciliation_required, false),
      operation_time + interval '7 days'
    );

    return result_value;
  end if;

  update private.account_states
  set status = 'deleting',
      deletion_request_id = candidate_request_id,
      deletion_started_at = operation_time,
      updated_at = operation_time
  where user_id = candidate_user_id;

  insert into private.account_consent_events (
    user_id,
    purpose,
    decision,
    policy_version,
    source,
    idempotency_key,
    occurred_at
  )
  select
    candidate_user_id,
    purpose,
    'withdraw',
    policy_version,
    'system',
    gen_random_uuid(),
    operation_time
  from private.account_consents
  where user_id = candidate_user_id
    and state = 'granted';

  update private.account_consents
  set state = 'withdrawn',
      withdrawn_at = operation_time,
      updated_at = operation_time
  where user_id = candidate_user_id
    and state = 'granted';

  update private.account_sync_devices
  set revoked_at = coalesce(revoked_at, operation_time),
      last_seen_at = greatest(last_seen_at, operation_time)
  where user_id = candidate_user_id;

  -- Chart rows cascade the one full-chart encrypted envelope. Changes and
  -- tombstones are payload-free but are also terminal account data.
  delete from private.account_chart_records
  where user_id = candidate_user_id;

  delete from private.account_sync_tombstones
  where user_id = candidate_user_id;

  delete from private.account_sync_changes
  where user_id = candidate_user_id;

  for recipient_alias in
    select recipient_hash
    from private.account_daily_sun_recipient_aliases
    where user_id = candidate_user_id
    union
    select current_state.daily_sun_recipient_hash
    where current_state.daily_sun_recipient_hash is not null
  loop
    recipient_alias_count := recipient_alias_count + 1;
    select exists (
      select 1
      from public.daily_sun_preferences
      where recipient_hash = recipient_alias
    ) into recipient_alias_was_confirmed;
    daily_sun_was_confirmed := daily_sun_was_confirmed
      or recipient_alias_was_confirmed;

    -- This existing narrow RPC atomically deletes Daily Sun preferences,
    -- pending confirmation requests, and cooldown/rate rows for each HMAC.
    perform public.revoke_daily_email_preference(
      recipient_alias,
      'sun_sign',
      null
    );
  end loop;

  daily_sun_reconciliation_required :=
    daily_sun_reconciliation_required
    or recipient_alias_count = 0
    or recipient_alias_count > 1;

  perform private.account_v2_destroy_legacy_account(
    candidate_user_id,
    candidate_request_id
  );

  perform private.account_v2_destroy_legacy_invites(
    candidate_user_id,
    candidate_request_id
  );

  insert into private.account_sync_changes (
    user_id,
    entity_type,
    entity_id,
    operation,
    revision,
    mutation_id,
    created_at
  ) values (
    candidate_user_id,
    'account',
    null,
    'delete',
    0,
    candidate_request_id,
    operation_time
  );

  result_value := jsonb_build_object(
    'outcome', 'prepared',
    'request_id', candidate_request_id,
    'daily_sun_revoked', daily_sun_was_confirmed,
    'daily_sun_reconciliation_required',
      daily_sun_reconciliation_required,
    'prepared_at', operation_time
  );

  insert into private.account_sync_mutations (
    user_id,
    mutation_id,
    operation,
    request_fingerprint_verifier,
    result,
    created_at
  ) values (
    candidate_user_id,
    candidate_request_id,
    'prepare_deletion',
    candidate_request_fingerprints->>0,
    result_value,
    operation_time
  );

  insert into private.account_deletion_receipts (
    request_id,
    user_id,
    recovery_verifier,
    prepared_at,
    daily_sun_revoked,
    daily_sun_reconciliation_required,
    expires_at
  ) values (
    candidate_request_id,
    candidate_user_id,
    candidate_request_fingerprints->>0,
    operation_time,
    daily_sun_was_confirmed,
    daily_sun_reconciliation_required,
    operation_time + interval '7 days'
  );

  return result_value;
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
  when unique_violation then
    return jsonb_build_object('outcome', 'mutation_conflict');
end;
$$;

revoke all on function public.account_v2_prepare_deletion(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.account_v2_prepare_deletion(uuid, uuid, jsonb, text)
  to service_role;

-- Status is intentionally service-only. Possession of a request UUID alone
-- reveals nothing; a retained-key HMAC candidate must match the receipt.
create or replace function public.account_v2_deletion_status(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  receipt private.account_deletion_receipts%rowtype;
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if receipt.expires_at <= clock_timestamp() then
    return jsonb_build_object('outcome', 'expired');
  end if;

  return jsonb_build_object(
    'outcome', 'ready',
    'request_id', receipt.request_id,
    'user_id', receipt.user_id,
    'state', case
      when receipt.completed_at is null then 'prepared'
      else 'completed'
    end,
    'prepared_at', receipt.prepared_at,
    'completed_at', receipt.completed_at,
    'daily_sun_revoked', receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      receipt.daily_sun_reconciliation_required,
    'expires_at', receipt.expires_at
  );
end;
$$;

revoke all on function public.account_v2_deletion_status(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_deletion_status(uuid, jsonb)
  to service_role;

-- Called only after the Auth admin delete has succeeded. It is idempotent and
-- remains readable through status until the receipt's seven-day TTL expires.
create or replace function public.account_v2_finish_deletion(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  receipt private.account_deletion_receipts%rowtype;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if receipt.expires_at <= operation_time then
    return jsonb_build_object('outcome', 'expired');
  end if;

  update private.account_deletion_receipts
  set completed_at = coalesce(completed_at, operation_time)
  where request_id = candidate_request_id
  returning * into receipt;

  return jsonb_build_object(
    'outcome', 'completed',
    'request_id', receipt.request_id,
    'user_id', receipt.user_id,
    'prepared_at', receipt.prepared_at,
    'completed_at', receipt.completed_at,
    'daily_sun_revoked', receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      receipt.daily_sun_reconciliation_required,
    'expires_at', receipt.expires_at
  );
end;
$$;

revoke all on function public.account_v2_finish_deletion(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_finish_deletion(uuid, jsonb)
  to service_role;

create or replace function public.account_v2_cleanup_deletion_receipts(
  candidate_limit integer default 100
)
returns bigint
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  removed_count bigint;
begin
  if candidate_limit is null
    or candidate_limit < 1
    or candidate_limit > 1000
  then
    return 0;
  end if;

  delete from private.account_daily_sun_provider_mutation_leases as leases
  where leases.recipient_hash in (
    select expired_leases.recipient_hash
    from private.account_daily_sun_provider_mutation_leases as expired_leases
    where expired_leases.expires_at <= clock_timestamp()
    order by expired_leases.expires_at, expired_leases.recipient_hash
    for update skip locked
    limit candidate_limit
  );

  with expired as (
    select request_id
    from private.account_deletion_receipts
    where expires_at <= clock_timestamp()
    order by expires_at, request_id
    for update skip locked
    limit candidate_limit
  ), removed as (
    delete from private.account_deletion_receipts as receipts
    using expired
    where receipts.request_id = expired.request_id
    returning 1
  )
  select count(*) into removed_count from removed;

  return removed_count;
end;
$$;

revoke all on function public.account_v2_cleanup_deletion_receipts(integer)
  from public, anon, authenticated;
grant execute on function public.account_v2_cleanup_deletion_receipts(integer)
  to service_role;

-- P0 terminal-erasure hardening ------------------------------------------------
--
-- The definitions below replace the preliminary bootstrap/deletion contracts
-- above. The file is intentionally replay-safe: each preliminary signature is
-- recreated and dropped on a reviewed SQL Editor retry, while these final
-- signatures remain the only callable contracts after the migration commits.

drop function if exists private.account_v2_valid_encrypted_json(jsonb);

create or replace function private.account_v2_valid_encrypted_json(
  candidate jsonb,
  candidate_max_ciphertext_bytes integer
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  decoded_ciphertext bytea;
  decoded_nonce bytea;
  decoded_wrapped_key bytea;
  decoded_key_version integer;
begin
  if candidate_max_ciphertext_bytes not in (528, 16400)
    or candidate is null
    or jsonb_typeof(candidate) <> 'object'
    or (select count(*) from jsonb_object_keys(candidate)) <> 6
    or not candidate ?& array[
      'ciphertext', 'nonce', 'format', 'key_scope', 'key_version', 'wrapped_key'
    ]
    or jsonb_typeof(candidate->'ciphertext') <> 'string'
    or jsonb_typeof(candidate->'nonce') <> 'string'
    or jsonb_typeof(candidate->'format') <> 'string'
    or jsonb_typeof(candidate->'key_scope') <> 'string'
    or jsonb_typeof(candidate->'key_version') <> 'number'
    or jsonb_typeof(candidate->'wrapped_key') <> 'string'
    or candidate->>'format' <> 'opaque_v1'
    or candidate->>'key_scope' <> 'service'
  then
    return false;
  end if;

  decoded_ciphertext := decode(candidate->>'ciphertext', 'base64');
  decoded_nonce := decode(candidate->>'nonce', 'base64');
  decoded_wrapped_key := decode(candidate->>'wrapped_key', 'base64');
  decoded_key_version := (candidate->>'key_version')::integer;

  return octet_length(decoded_ciphertext)
      between 17 and candidate_max_ciphertext_bytes
    and octet_length(decoded_nonce) = 12
    and decoded_key_version between 1 and 1000000
    and octet_length(decoded_wrapped_key) = 68;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.account_v2_valid_encrypted_json(jsonb, integer)
  from public, anon, authenticated;
grant execute on function private.account_v2_valid_encrypted_json(jsonb, integer)
  to service_role;

create or replace function private.account_v2_valid_provider_cleanup_entries(
  candidate jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  entry_value jsonb;
  entry_count integer := 0;
  distinct_count integer;
begin
  if candidate is null
    or jsonb_typeof(candidate) <> 'array'
    or jsonb_array_length(candidate) > 16
  then
    return false;
  end if;

  for entry_value in select value from jsonb_array_elements(candidate)
  loop
    if jsonb_typeof(entry_value) <> 'object'
      or (select count(*) from jsonb_object_keys(entry_value)) <> 2
      or not entry_value ?& array['recipient_hash', 'encrypted_payload']
      or jsonb_typeof(entry_value->'recipient_hash') <> 'string'
      or octet_length(entry_value->>'recipient_hash') <> 64
      or entry_value->>'recipient_hash' !~ '^[0-9a-f]{64}$'
      or (
        jsonb_typeof(entry_value->'encrypted_payload') <> 'null'
        and not private.account_v2_valid_encrypted_json(
          entry_value->'encrypted_payload',
          528
        )
      )
    then
      return false;
    end if;
    entry_count := entry_count + 1;
  end loop;

  select count(distinct value->>'recipient_hash')::integer
  into distinct_count
  from jsonb_array_elements(candidate);

  return entry_count = distinct_count;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.account_v2_valid_provider_cleanup_entries(jsonb)
  from public, anon, authenticated;
grant execute on function private.account_v2_valid_provider_cleanup_entries(jsonb)
  to service_role;

create or replace function public.account_v2_begin_daily_sun_provider_mutation(
  candidate_recipient_hash text,
  candidate_authority_attempt_id uuid,
  candidate_lease_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_authority_attempt_id uuid;
  current_lease private.account_daily_sun_provider_mutation_leases%rowtype;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_authority_attempt_id is null
    or candidate_lease_id is null
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(candidate_recipient_hash, 7312026)
  );

  delete from private.account_daily_sun_provider_mutation_leases
  where recipient_hash = candidate_recipient_hash
    and expires_at <= operation_time;

  update private.account_deletion_provider_cleanup
  set cleanup_claim_id = null,
      cleanup_claimed_at = null,
      cleanup_claim_expires_at = null,
      updated_at = greatest(operation_time, created_at)
  where recipient_hash = candidate_recipient_hash
    and state = 'pending'
    and cleanup_claim_expires_at <= operation_time;

  if exists (
    select 1
    from private.account_deletion_provider_cleanup
    where recipient_hash = candidate_recipient_hash
      and state = 'pending'
      and cleanup_claim_expires_at > operation_time
  ) then
    return jsonb_build_object('outcome', 'busy');
  end if;

  select confirmed_by_attempt_id
  into current_authority_attempt_id
  from public.daily_sun_preferences
  where recipient_hash = candidate_recipient_hash;

  if not found
    or current_authority_attempt_id <> candidate_authority_attempt_id
  then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select * into current_lease
  from private.account_daily_sun_provider_mutation_leases
  where recipient_hash = candidate_recipient_hash
  for update;

  if found then
    if current_lease.lease_id = candidate_lease_id
      and current_lease.authority_attempt_id = candidate_authority_attempt_id
    then
      return jsonb_build_object('outcome', 'ready');
    end if;
    return jsonb_build_object('outcome', 'busy');
  end if;

  insert into private.account_daily_sun_provider_mutation_leases (
    recipient_hash,
    authority_attempt_id,
    lease_id,
    started_at,
    expires_at
  ) values (
    candidate_recipient_hash,
    candidate_authority_attempt_id,
    candidate_lease_id,
    operation_time,
    operation_time + interval '5 minutes'
  );

  return jsonb_build_object('outcome', 'ready');
end;
$$;

revoke all on function public.account_v2_begin_daily_sun_provider_mutation(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_begin_daily_sun_provider_mutation(text, uuid, uuid)
  to service_role;

create or replace function public.account_v2_finish_daily_sun_provider_mutation(
  candidate_recipient_hash text,
  candidate_authority_attempt_id uuid,
  candidate_lease_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_authority_attempt_id is null
    or candidate_lease_id is null
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(candidate_recipient_hash, 7312026)
  );

  delete from private.account_daily_sun_provider_mutation_leases
  where recipient_hash = candidate_recipient_hash
    and authority_attempt_id = candidate_authority_attempt_id
    and lease_id = candidate_lease_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  return jsonb_build_object('outcome', 'released');
end;
$$;

revoke all on function public.account_v2_finish_daily_sun_provider_mutation(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_finish_daily_sun_provider_mutation(text, uuid, uuid)
  to service_role;

-- This trigger is a final database backstop for service/browser paths that do
-- not use account-v2 RPCs. Owner-bound writes stay blocked while that owner is
-- deleting. Recipient-only Daily Sun authority is generation-fenced instead:
-- an address can legitimately move to a later owner and must remain reusable.
create or replace function private.account_v2_reject_terminal_recreation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  recipient_alias text;
begin
  owner_id := coalesce(
    nullif(to_jsonb(new)->>'user_id', '')::uuid,
    nullif(to_jsonb(new)->>'owner_user_id', '')::uuid
  );
  recipient_alias := to_jsonb(new)->>'recipient_hash';

  -- Serialize owner writes with prepare/terminal cleanup. Daily Sun writes use
  -- the same recipient advisory lock as confirmation/revocation so a write
  -- cannot observe `active`, wait behind deletion, and commit afterward.
  if recipient_alias is not null then
    perform pg_advisory_xact_lock(hashtextextended(recipient_alias, 7312026));
  end if;

  if owner_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(owner_id::text, 7312025)
    );

    perform 1
    from private.account_states
    where user_id = owner_id
    for update;
  end if;

  if (
    owner_id is not null
    and exists (
      select 1
      from private.account_states
      where user_id = owner_id
        and status = 'deleting'
    )
  ) then
    raise exception 'account is deleting'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.account_v2_reject_terminal_recreation()
  from public, anon, authenticated, service_role;

drop trigger if exists account_v2_terminal_gate on public.profiles;
create trigger account_v2_terminal_gate
before insert or update on public.profiles
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.charts;
create trigger account_v2_terminal_gate
before insert or update on public.charts
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.chart_deletions;
create trigger account_v2_terminal_gate
before insert or update on public.chart_deletions
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.daily_chart_preferences;
create trigger account_v2_terminal_gate
before insert or update on public.daily_chart_preferences
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.daily_chart_confirmation_send_claims;
create trigger account_v2_terminal_gate
before insert or update on public.daily_chart_confirmation_send_claims
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.compatibility_invites;
create trigger account_v2_terminal_gate
before insert or update on public.compatibility_invites
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.daily_sun_preferences;
create trigger account_v2_terminal_gate
before insert or update on public.daily_sun_preferences
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.daily_sun_confirmation_requests;
create trigger account_v2_terminal_gate
before insert or update on public.daily_sun_confirmation_requests
for each row execute function private.account_v2_reject_terminal_recreation();

drop trigger if exists account_v2_terminal_gate on public.daily_sun_confirmation_rate_limits;
create trigger account_v2_terminal_gate
before insert or update on public.daily_sun_confirmation_rate_limits
for each row execute function private.account_v2_reject_terminal_recreation();

create or replace function private.account_v2_stage_provider_cleanup(
  candidate_request_id uuid,
  candidate_user_id uuid,
  candidate_entries jsonb,
  candidate_inventory_complete boolean
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  entry_value jsonb;
  envelope_value jsonb;
  alias_count integer;
  known_alias_count integer;
  remaining_capacity integer;
  inventory_overflow boolean;
  current_recipient_hash text;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_inventory_complete is null
    or not private.account_v2_valid_provider_cleanup_entries(candidate_entries)
  then
    return false;
  end if;

  select count(*)::integer
  into known_alias_count
  from (
    select recipient_hash
    from private.account_daily_sun_recipient_aliases
    where user_id = candidate_user_id
    union
    select value->>'recipient_hash'
    from jsonb_array_elements(candidate_entries)
  ) as aliases;

  inventory_overflow := known_alias_count > 16;

  select supplied.value->>'recipient_hash'
  into current_recipient_hash
  from jsonb_array_elements(candidate_entries) with ordinality
    as supplied(value, position)
  order by supplied.position
  limit 1;

  if current_recipient_hash is null then
    select daily_sun_recipient_hash into current_recipient_hash
    from private.account_states
    where user_id = candidate_user_id;
  end if;

  -- Supplied entries are ordered by the service with the current verified
  -- address first. Stage them before historical aliases so a 16+new overflow
  -- cannot omit the current address or block core erasure.
  insert into private.account_deletion_provider_cleanup (
    request_id,
    recipient_hash,
    authority_attempt_id,
    is_current_address
  )
  select
    candidate_request_id,
    supplied.value->>'recipient_hash',
    case
      when supplied.value->>'recipient_hash' = current_recipient_hash
        then preferences.confirmed_by_attempt_id
      else aliases.authority_attempt_id
    end,
    supplied.value->>'recipient_hash' = current_recipient_hash
  from jsonb_array_elements(candidate_entries) with ordinality
    as supplied(value, position)
  left join private.account_daily_sun_recipient_aliases as aliases
    on aliases.user_id = candidate_user_id
   and aliases.recipient_hash = supplied.value->>'recipient_hash'
  left join public.daily_sun_preferences as preferences
    on preferences.recipient_hash = supplied.value->>'recipient_hash'
   and supplied.value->>'recipient_hash' = current_recipient_hash
  where true
  on conflict (request_id, recipient_hash) do nothing;

  select greatest(
    16 - count(*)::integer,
    0
  ) into remaining_capacity
  from private.account_deletion_provider_cleanup
  where request_id = candidate_request_id;

  insert into private.account_deletion_provider_cleanup (
    request_id,
    recipient_hash,
    authority_attempt_id,
    is_current_address
  )
  select
    candidate_request_id,
    aliases.recipient_hash,
    case
      when aliases.recipient_hash = current_recipient_hash
        then preferences.confirmed_by_attempt_id
      else aliases.authority_attempt_id
    end,
    aliases.recipient_hash = current_recipient_hash
  from private.account_daily_sun_recipient_aliases as aliases
  left join public.daily_sun_preferences as preferences
    on preferences.recipient_hash = aliases.recipient_hash
   and aliases.recipient_hash = current_recipient_hash
  where aliases.user_id = candidate_user_id
    and not exists (
      select 1
      from private.account_deletion_provider_cleanup as staged
      where staged.request_id = candidate_request_id
        and staged.recipient_hash = aliases.recipient_hash
    )
  order by aliases.bound_at desc, aliases.recipient_hash
  limit remaining_capacity
  on conflict (request_id, recipient_hash) do nothing;

  for entry_value in select value from jsonb_array_elements(candidate_entries)
  loop
    envelope_value := entry_value->'encrypted_payload';
    if jsonb_typeof(envelope_value) <> 'null' then
      update private.account_deletion_provider_cleanup
      set payload_ciphertext = decode(envelope_value->>'ciphertext', 'base64'),
          payload_nonce = decode(envelope_value->>'nonce', 'base64'),
          payload_encryption_format = envelope_value->>'format',
          payload_key_scope = envelope_value->>'key_scope',
          payload_key_version = (envelope_value->>'key_version')::integer,
          payload_wrapped_key = decode(envelope_value->>'wrapped_key', 'base64'),
          updated_at = greatest(operation_time, created_at)
      where request_id = candidate_request_id
        and recipient_hash = entry_value->>'recipient_hash'
        and state = 'pending';
    end if;
  end loop;

  select count(*)::integer into alias_count
  from private.account_deletion_provider_cleanup
  where request_id = candidate_request_id;

  update private.account_deletion_receipts
  set provider_cleanup_alias_count = alias_count,
      provider_cleanup_inventory_complete =
        provider_cleanup_inventory_complete
        and candidate_inventory_complete
        and not inventory_overflow
  where request_id = candidate_request_id;

  return true;
end;
$$;

revoke all on function private.account_v2_stage_provider_cleanup(uuid, uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function private.account_v2_stage_provider_cleanup(uuid, uuid, jsonb, boolean)
  to service_role;

create or replace function private.account_v2_refresh_deletion_receipt(
  candidate_request_id uuid
)
returns private.account_deletion_receipts
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
  total_count integer;
  incomplete_count integer;
  superseded_count integer;
begin
  select
    count(*)::integer,
    count(*) filter (where state = 'pending')::integer,
    count(*) filter (where state = 'superseded')::integer
  into total_count, incomplete_count, superseded_count
  from private.account_deletion_provider_cleanup
  where request_id = candidate_request_id;

  update private.account_deletion_receipts
  set provider_cleanup_alias_count = total_count,
      daily_sun_reconciliation_required = (
        not provider_cleanup_inventory_complete
        or total_count = 0
        or incomplete_count > 0
      ),
      daily_sun_revoked = (
        daily_sun_was_confirmed
        and provider_cleanup_inventory_complete
        and total_count > 0
        and incomplete_count = 0
        and superseded_count = 0
      )
  where request_id = candidate_request_id
  returning * into current_receipt;

  return current_receipt;
end;
$$;

revoke all on function private.account_v2_refresh_deletion_receipt(uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_refresh_deletion_receipt(uuid)
  to service_role;

create or replace function private.account_v2_reassert_terminal_cleanup(
  candidate_request_id uuid,
  candidate_entries jsonb,
  candidate_inventory_complete boolean
)
returns private.account_deletion_receipts
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
  current_state private.account_states%rowtype;
  current_alias text;
  current_cleanup private.account_deletion_provider_cleanup%rowtype;
  current_authority_attempt_id uuid;
  preference_found boolean;
  should_revoke boolean;
  any_confirmed boolean := false;
  state_found boolean;
  operation_time timestamptz := clock_timestamp();
begin
  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return null;
  end if;

  -- Match the Daily Sun subscription lock order: recipient aliases first,
  -- then owner state, then the non-cascading receipt. This prevents both
  -- post-prepare recreation and account/recipient deadlocks.
  for current_alias in
    select distinct aliases.recipient_hash
    from (
      select recipient_hash
      from private.account_daily_sun_recipient_aliases
      where user_id = current_receipt.user_id
      union all
      select recipient_hash
      from private.account_deletion_provider_cleanup
      where request_id = candidate_request_id
      union all
      select value->>'recipient_hash'
      from jsonb_array_elements(candidate_entries)
    ) as aliases
    order by aliases.recipient_hash
  loop
    perform pg_advisory_xact_lock(hashtextextended(current_alias, 7312026));
  end loop;

  perform pg_advisory_xact_lock(
    hashtextextended(current_receipt.user_id::text, 7312030)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(current_receipt.user_id::text, 7312025)
  );

  select * into current_state
  from private.account_states
  where user_id = current_receipt.user_id
  for update;
  state_found := found;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id
  for update;

  if not found then
    return null;
  end if;

  if not state_found then
    return private.account_v2_refresh_deletion_receipt(candidate_request_id);
  end if;

  if current_state.status <> 'deleting' then
    raise exception 'account deletion authority is invalid'
      using errcode = '42501';
  end if;

  if not private.account_v2_stage_provider_cleanup(
    candidate_request_id,
    current_receipt.user_id,
    candidate_entries,
    candidate_inventory_complete
  ) then
    raise exception 'invalid provider cleanup entries'
      using errcode = '22023';
  end if;

  insert into private.account_consent_events (
    user_id,
    purpose,
    decision,
    policy_version,
    source,
    idempotency_key,
    occurred_at
  )
  select
    current_receipt.user_id,
    purpose,
    'withdraw',
    policy_version,
    'system',
    gen_random_uuid(),
    operation_time
  from private.account_consents
  where user_id = current_receipt.user_id
    and state = 'granted';

  update private.account_consents
  set state = 'withdrawn',
      withdrawn_at = operation_time,
      updated_at = operation_time
  where user_id = current_receipt.user_id
    and state = 'granted';

  -- Erase all v2 account-owned operational/audit rows before the Auth admin
  -- boundary can fail. Only terminal state, encrypted alias recovery material,
  -- and the non-cascading receipt/outbox remain for resumability.
  perform private.account_v2_destroy_consent_events(
    current_receipt.user_id,
    current_state.deletion_request_id
  );

  delete from private.account_consents
  where user_id = current_receipt.user_id;

  delete from private.account_sync_devices
  where user_id = current_receipt.user_id;

  delete from private.account_chart_records
  where user_id = current_receipt.user_id;

  delete from private.account_sync_tombstones
  where user_id = current_receipt.user_id;

  delete from private.account_sync_changes
  where user_id = current_receipt.user_id;

  delete from private.account_sync_mutations
  where user_id = current_receipt.user_id;

  for current_cleanup in
    select *
    from private.account_deletion_provider_cleanup
    where request_id = candidate_request_id
    order by recipient_hash
  loop
    current_alias := current_cleanup.recipient_hash;

    if current_cleanup.state <> 'pending' then
      continue;
    end if;

    select confirmed_by_attempt_id
    into current_authority_attempt_id
    from public.daily_sun_preferences
    where recipient_hash = current_alias;
    preference_found := found;

    -- Once this request has revoked its bound database generation, any later
    -- committed consent generation belongs to a newer holder and resolves this
    -- old provider job as superseded. An unconfirmed request or cooldown is not
    -- consent and must never suppress provider removal for the deleted owner.
    if current_cleanup.database_revoked_at is not null then
      if preference_found then
        update private.account_deletion_provider_cleanup
        set state = 'superseded',
            completed_at = coalesce(completed_at, greatest(operation_time, created_at)),
            updated_at = greatest(operation_time, created_at)
        where request_id = candidate_request_id
          and recipient_hash = current_alias
          and state = 'pending';
      end if;
      continue;
    end if;

    should_revoke := current_cleanup.is_current_address
      or (
        preference_found
        and current_cleanup.authority_attempt_id is not null
        and current_cleanup.authority_attempt_id = current_authority_attempt_id
      )
      or not preference_found;

    if not should_revoke then
      update private.account_deletion_provider_cleanup
      set state = 'superseded',
          completed_at = coalesce(completed_at, greatest(operation_time, created_at)),
          updated_at = greatest(operation_time, created_at)
      where request_id = candidate_request_id
        and recipient_hash = current_alias
        and state = 'pending';
      continue;
    end if;

    any_confirmed := any_confirmed or preference_found;

    perform public.revoke_daily_email_preference(
      current_alias,
      'sun_sign',
      null
    );

    update private.account_deletion_provider_cleanup
    set database_revoked_at = coalesce(
          database_revoked_at,
          greatest(operation_time, created_at)
        ),
        updated_at = greatest(operation_time, created_at)
    where request_id = candidate_request_id
      and recipient_hash = current_alias
      and state = 'pending';
  end loop;

  update private.account_deletion_receipts
  set daily_sun_was_confirmed = daily_sun_was_confirmed or any_confirmed
  where request_id = candidate_request_id;

  update private.account_states
  set daily_sun_was_confirmed = daily_sun_was_confirmed or any_confirmed,
      updated_at = case
        when any_confirmed then greatest(operation_time, updated_at)
        else updated_at
      end
  where user_id = current_receipt.user_id;

  perform private.account_v2_destroy_legacy_account(
    current_receipt.user_id,
    current_state.deletion_request_id
  );

  perform private.account_v2_destroy_legacy_invites(
    current_receipt.user_id,
    current_state.deletion_request_id
  );

  return private.account_v2_refresh_deletion_receipt(candidate_request_id);
end;
$$;

revoke all on function private.account_v2_reassert_terminal_cleanup(uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function private.account_v2_reassert_terminal_cleanup(uuid, jsonb, boolean)
  to service_role;

drop function public.account_v2_bootstrap(uuid, uuid, text, text);

create or replace function public.account_v2_bootstrap(
  candidate_user_id uuid,
  candidate_device_id uuid,
  candidate_platform text,
  candidate_daily_sun_recipient_hash text,
  candidate_daily_sun_encrypted_locator jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  current_device private.account_sync_devices%rowtype;
  chart_sync_state text;
  existing_alias_count integer;
  existing_device_count integer;
  current_authority_attempt_id uuid;
begin
  if candidate_user_id is null
    or candidate_device_id is null
    or candidate_platform not in ('web', 'ios', 'unknown')
    or candidate_daily_sun_recipient_hash is null
    or octet_length(candidate_daily_sun_recipient_hash) <> 64
    or candidate_daily_sun_recipient_hash !~ '^[0-9a-f]{64}$'
    or not private.account_v2_valid_encrypted_json(
      candidate_daily_sun_encrypted_locator,
      528
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(candidate_user_id::text, 7312030)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(candidate_user_id::text, 7312025)
  );

  if not exists (
    select 1
    from private.account_states
    where user_id = candidate_user_id
  ) and exists (
    select 1
    from public.charts
    where user_id = candidate_user_id
  ) then
    return jsonb_build_object('outcome', 'legacy_migration_required');
  end if;

  insert into private.account_states (user_id, daily_sun_recipient_hash)
  values (candidate_user_id, candidate_daily_sun_recipient_hash)
  on conflict (user_id) do nothing;

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  if current_state.status = 'deleting' then
    return jsonb_build_object('outcome', 'deleting');
  end if;

  select count(*)::integer into existing_device_count
  from private.account_sync_devices
  where user_id = candidate_user_id;

  if existing_device_count >= 100
    and not exists (
      select 1
      from private.account_sync_devices
      where user_id = candidate_user_id
        and device_id = candidate_device_id
    )
  then
    return jsonb_build_object('outcome', 'device_limit_reached');
  end if;

  select count(*)::integer into existing_alias_count
  from private.account_daily_sun_recipient_aliases
  where user_id = candidate_user_id;

  if existing_alias_count >= 16
    and not exists (
      select 1
      from private.account_daily_sun_recipient_aliases
      where user_id = candidate_user_id
        and recipient_hash = candidate_daily_sun_recipient_hash
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select confirmed_by_attempt_id
  into current_authority_attempt_id
  from public.daily_sun_preferences
  where recipient_hash = candidate_daily_sun_recipient_hash;

  insert into private.account_daily_sun_recipient_aliases (
    user_id,
    recipient_hash,
    locator_ciphertext,
    locator_nonce,
    locator_encryption_format,
    locator_key_scope,
    locator_key_version,
    locator_wrapped_key,
    authority_attempt_id
  ) values (
    candidate_user_id,
    candidate_daily_sun_recipient_hash,
    decode(candidate_daily_sun_encrypted_locator->>'ciphertext', 'base64'),
    decode(candidate_daily_sun_encrypted_locator->>'nonce', 'base64'),
    candidate_daily_sun_encrypted_locator->>'format',
    candidate_daily_sun_encrypted_locator->>'key_scope',
    (candidate_daily_sun_encrypted_locator->>'key_version')::integer,
    decode(candidate_daily_sun_encrypted_locator->>'wrapped_key', 'base64'),
    current_authority_attempt_id
  )
  on conflict (user_id, recipient_hash) do update
  set locator_ciphertext = excluded.locator_ciphertext,
      locator_nonce = excluded.locator_nonce,
      locator_encryption_format = excluded.locator_encryption_format,
      locator_key_scope = excluded.locator_key_scope,
      locator_key_version = excluded.locator_key_version,
      locator_wrapped_key = excluded.locator_wrapped_key,
      authority_attempt_id = excluded.authority_attempt_id,
      updated_at = clock_timestamp();

  update private.account_states
  set daily_sun_recipient_hash = candidate_daily_sun_recipient_hash,
      updated_at = case
        when daily_sun_recipient_hash is distinct from candidate_daily_sun_recipient_hash
          then clock_timestamp()
        else updated_at
      end
  where user_id = candidate_user_id;

  insert into private.account_sync_devices (
    user_id,
    device_id,
    platform
  ) values (
    candidate_user_id,
    candidate_device_id,
    candidate_platform
  )
  on conflict (user_id, device_id) do update
  set platform = excluded.platform,
      last_seen_at = clock_timestamp()
  where private.account_sync_devices.revoked_at is null;

  select * into current_device
  from private.account_sync_devices
  where user_id = candidate_user_id
    and device_id = candidate_device_id;

  if current_device.revoked_at is not null then
    return jsonb_build_object('outcome', 'device_revoked');
  end if;

  select state into chart_sync_state
  from private.account_consents
  where user_id = candidate_user_id
    and purpose = 'chart_sync';

  return jsonb_build_object(
    'outcome', 'ready',
    'account_state', 'active',
    'chart_sync_consent', coalesce(chart_sync_state, 'pending'),
    'cursor', current_device.last_cursor
  );
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
end;
$$;

revoke all on function public.account_v2_bootstrap(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_bootstrap(uuid, uuid, text, text, jsonb)
  to service_role;

create or replace function public.account_v2_list_daily_sun_aliases(
  candidate_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  alias_values jsonb;
begin
  if candidate_user_id is null then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  if not exists (
    select 1
    from private.account_states
    where user_id = candidate_user_id
  ) then
    return jsonb_build_object('outcome', 'not_bootstrapped');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'recipient_hash', recipient_hash,
    'encrypted_locator', case
      when locator_ciphertext is null then null
      else jsonb_build_object(
        'ciphertext', encode(locator_ciphertext, 'base64'),
        'nonce', encode(locator_nonce, 'base64'),
        'format', locator_encryption_format,
        'key_scope', locator_key_scope,
        'key_version', locator_key_version,
        'wrapped_key', encode(locator_wrapped_key, 'base64')
      )
    end
  ) order by bound_at, recipient_hash), '[]'::jsonb)
  into alias_values
  from private.account_daily_sun_recipient_aliases
  where user_id = candidate_user_id;

  return jsonb_build_object(
    'outcome', 'ready',
    'aliases', alias_values
  );
end;
$$;

revoke all on function public.account_v2_list_daily_sun_aliases(uuid)
  from public, anon, authenticated;
grant execute on function public.account_v2_list_daily_sun_aliases(uuid)
  to service_role;

drop function public.account_v2_prepare_deletion(uuid, uuid, jsonb, text);

create or replace function public.account_v2_prepare_deletion(
  candidate_user_id uuid,
  candidate_request_id uuid,
  candidate_request_fingerprints jsonb,
  candidate_provider_cleanup_entries jsonb,
  candidate_provider_cleanup_inventory_complete boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_state private.account_states%rowtype;
  current_receipt private.account_deletion_receipts%rowtype;
  replay_mutation private.account_sync_mutations%rowtype;
  result_value jsonb;
  operation_time timestamptz := clock_timestamp();
  response_outcome text;
  current_alias text;
begin
  if candidate_user_id is null
    or candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_request_fingerprints
    )
    or not private.account_v2_valid_provider_cleanup_entries(
      candidate_provider_cleanup_entries
    )
    or candidate_provider_cleanup_inventory_complete is null
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  -- Lock every known/supplied recipient before the owner row, matching Daily
  -- Sun subscribe/confirm ordering. The API supplies the current alias first;
  -- the stable alias table contributes historical aliases, including overflow.
  for current_alias in
    select distinct aliases.recipient_hash
    from (
      select recipient_hash
      from private.account_daily_sun_recipient_aliases
      where user_id = candidate_user_id
      union all
      select value->>'recipient_hash'
      from jsonb_array_elements(candidate_provider_cleanup_entries)
    ) as aliases
    order by aliases.recipient_hash
  loop
    perform pg_advisory_xact_lock(hashtextextended(current_alias, 7312026));
  end loop;

  -- Match compatibility-invite and terminal-cleanup lock ordering. Taking the
  -- invite authority before the legacy cutover lock prevents prepare from
  -- deadlocking with an invite transaction whose terminal trigger acquires
  -- the cutover lock after its own authority lock.
  perform pg_advisory_xact_lock(
    hashtextextended(candidate_user_id::text, 7312030)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(candidate_user_id::text, 7312025)
  );

  insert into private.account_states (user_id)
  values (candidate_user_id)
  on conflict (user_id) do nothing;

  select * into current_state
  from private.account_states
  where user_id = candidate_user_id
  for update;

  select * into replay_mutation
  from private.account_sync_mutations
  where user_id = candidate_user_id
    and mutation_id = candidate_request_id;

  if found and (
    replay_mutation.operation <> 'prepare_deletion'
    or not exists (
      select 1
      from jsonb_array_elements_text(candidate_request_fingerprints)
        as supplied(verifier)
      where supplied.verifier = replay_mutation.request_fingerprint_verifier
    )
  ) then
    return jsonb_build_object('outcome', 'mutation_conflict');
  end if;

  -- Recovery rotation is serialized by the owner row above. Prune this
  -- account's expired capabilities inline, then cap live receipts so repeated
  -- fresh request IDs cannot amplify durable/provider work without bound.
  delete from private.account_deletion_receipts
  where user_id = candidate_user_id
    and expires_at <= operation_time;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id
  for update;

  if found and (
    current_receipt.user_id <> candidate_user_id
    or not exists (
      select 1
      from jsonb_array_elements_text(candidate_request_fingerprints)
        as supplied(verifier)
      where supplied.verifier = current_receipt.recovery_verifier
    )
  ) then
    return jsonb_build_object('outcome', 'mutation_conflict');
  end if;

  if current_receipt.request_id is null and (
    select count(*)
    from private.account_deletion_receipts
    where user_id = candidate_user_id
      and expires_at > operation_time
  ) >= 3 then
    return jsonb_build_object('outcome', 'receipt_limit_reached');
  end if;

  if current_state.status = 'active' then
    update private.account_states
    set status = 'deleting',
        deletion_request_id = candidate_request_id,
        deletion_started_at = operation_time,
        updated_at = operation_time
    where user_id = candidate_user_id
    returning * into current_state;
    response_outcome := 'prepared';
  else
    response_outcome := case
      when current_state.deletion_request_id = candidate_request_id
        then 'prepared'
      else 'already_prepared'
    end;
  end if;

  if current_receipt.request_id is null then
    insert into private.account_deletion_receipts (
      request_id,
      user_id,
      recovery_verifier,
      prepared_at,
      daily_sun_was_confirmed,
      provider_cleanup_alias_count,
      provider_cleanup_inventory_complete,
      daily_sun_revoked,
      daily_sun_reconciliation_required,
      expires_at
    ) values (
      candidate_request_id,
      candidate_user_id,
      candidate_request_fingerprints->>0,
      current_state.deletion_started_at,
      current_state.daily_sun_was_confirmed or coalesce((
        select bool_or(existing.daily_sun_was_confirmed)
        from private.account_deletion_receipts as existing
        where existing.user_id = candidate_user_id
      ), false),
      0,
      candidate_provider_cleanup_inventory_complete,
      false,
      true,
      operation_time + interval '7 days'
    );
  end if;

  current_receipt := private.account_v2_reassert_terminal_cleanup(
    candidate_request_id,
    candidate_provider_cleanup_entries,
    candidate_provider_cleanup_inventory_complete
  );

  result_value := jsonb_build_object(
    'outcome', response_outcome,
    'request_id', candidate_request_id,
    'daily_sun_revoked', current_receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      current_receipt.daily_sun_reconciliation_required,
    'prepared_at', current_receipt.prepared_at
  );

  return result_value;
exception
  when foreign_key_violation then
    return jsonb_build_object('outcome', 'user_not_found');
  when unique_violation then
    return jsonb_build_object('outcome', 'mutation_conflict');
end;
$$;

revoke all on function public.account_v2_prepare_deletion(uuid, uuid, jsonb, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.account_v2_prepare_deletion(uuid, uuid, jsonb, jsonb, boolean)
  to service_role;

create or replace function private.account_v2_authorized_deletion_receipt(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns private.account_deletion_receipts
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return null;
  end if;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id
  for update;

  if not found or not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return null;
  end if;

  return current_receipt;
end;
$$;

revoke all on function private.account_v2_authorized_deletion_receipt(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function private.account_v2_authorized_deletion_receipt(uuid, jsonb)
  to service_role;

create or replace function public.account_v2_terminal_cleanup(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb,
  candidate_provider_cleanup_entries jsonb,
  candidate_provider_cleanup_inventory_complete boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
    or not private.account_v2_valid_provider_cleanup_entries(
      candidate_provider_cleanup_entries
    )
    or candidate_provider_cleanup_inventory_complete is null
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if current_receipt.expires_at <= clock_timestamp() then
    return jsonb_build_object('outcome', 'expired');
  end if;

  current_receipt := private.account_v2_reassert_terminal_cleanup(
    candidate_request_id,
    candidate_provider_cleanup_entries,
    candidate_provider_cleanup_inventory_complete
  );

  return jsonb_build_object(
    'outcome', 'ready',
    'user_id', current_receipt.user_id
  );
end;
$$;

revoke all on function public.account_v2_terminal_cleanup(uuid, jsonb, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.account_v2_terminal_cleanup(uuid, jsonb, jsonb, boolean)
  to service_role;

create or replace function public.account_v2_list_deletion_provider_cleanup(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
  current_cleanup private.account_deletion_provider_cleanup%rowtype;
  entry_values jsonb;
  more_available boolean;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if current_receipt.expires_at <= clock_timestamp() then
    return jsonb_build_object('outcome', 'expired');
  end if;

  current_receipt := private.account_v2_reassert_terminal_cleanup(
    candidate_request_id,
    '[]'::jsonb,
    true
  );

  -- Reverify generation ownership under the recipient lock immediately before
  -- exposing provider work. Only a newer committed preference resolves this
  -- old job as superseded; an unconfirmed request/cooldown is not consent. An
  -- active provider writer lease keeps the job pending.
  for current_cleanup in
    select *
    from private.account_deletion_provider_cleanup
    where request_id = candidate_request_id
      and state = 'pending'
    order by recipient_hash
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(current_cleanup.recipient_hash, 7312026)
    );

    delete from private.account_daily_sun_provider_mutation_leases
    where recipient_hash = current_cleanup.recipient_hash
      and expires_at <= operation_time;

    update private.account_deletion_provider_cleanup
    set cleanup_claim_id = null,
        cleanup_claimed_at = null,
        cleanup_claim_expires_at = null,
        updated_at = greatest(operation_time, created_at)
    where request_id = candidate_request_id
      and recipient_hash = current_cleanup.recipient_hash
      and state = 'pending'
      and cleanup_claim_expires_at <= operation_time;

    select * into current_cleanup
    from private.account_deletion_provider_cleanup
    where request_id = candidate_request_id
      and recipient_hash = current_cleanup.recipient_hash;

    if current_cleanup.database_revoked_at is not null
      and current_cleanup.cleanup_claim_id is null
      and exists (
        select 1 from public.daily_sun_preferences
        where recipient_hash = current_cleanup.recipient_hash
      )
    then
      update private.account_deletion_provider_cleanup
      set state = 'superseded',
          completed_at = coalesce(completed_at, greatest(operation_time, created_at)),
          updated_at = greatest(operation_time, created_at)
      where request_id = candidate_request_id
        and recipient_hash = current_cleanup.recipient_hash
        and state = 'pending';
    end if;
  end loop;

  current_receipt := private.account_v2_refresh_deletion_receipt(
    candidate_request_id
  );

  with eligible as (
    select cleanup.request_id, cleanup.recipient_hash
    from private.account_deletion_provider_cleanup as cleanup
    where cleanup.request_id = candidate_request_id
      and cleanup.state = 'pending'
      and cleanup.database_revoked_at is not null
      and cleanup.payload_ciphertext is not null
      and cleanup.cleanup_claim_id is null
      and not exists (
        select 1
        from private.account_daily_sun_provider_mutation_leases as leases
        where leases.recipient_hash = cleanup.recipient_hash
          and leases.expires_at > operation_time
      )
    order by cleanup.updated_at, cleanup.recipient_hash
    for update skip locked
    limit 16
  ), claimed as (
    update private.account_deletion_provider_cleanup as cleanup
    set cleanup_claim_id = gen_random_uuid(),
        cleanup_claimed_at = operation_time,
        cleanup_claim_expires_at = operation_time + interval '30 seconds',
        updated_at = greatest(operation_time, cleanup.created_at)
    from eligible
    where cleanup.request_id = eligible.request_id
      and cleanup.recipient_hash = eligible.recipient_hash
    returning cleanup.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'recipient_hash', claimed.recipient_hash,
    'claim_id', claimed.cleanup_claim_id,
    'encrypted_payload', jsonb_build_object(
      'ciphertext', encode(claimed.payload_ciphertext, 'base64'),
      'nonce', encode(claimed.payload_nonce, 'base64'),
      'format', claimed.payload_encryption_format,
      'key_scope', claimed.payload_key_scope,
      'key_version', claimed.payload_key_version,
      'wrapped_key', encode(claimed.payload_wrapped_key, 'base64')
    ),
    'attempt_count', claimed.attempt_count
  ) order by claimed.updated_at, claimed.recipient_hash), '[]'::jsonb)
  into entry_values
  from claimed;

  select exists (
    select 1
    from private.account_deletion_provider_cleanup
    where request_id = candidate_request_id
      and state = 'pending'
      and payload_ciphertext is not null
      and recipient_hash not in (
        select value->>'recipient_hash'
        from jsonb_array_elements(entry_values)
      )
  ) into more_available;

  return jsonb_build_object(
    'outcome', 'ready',
    'entries', entry_values,
    'has_more', more_available
  );
end;
$$;

revoke all on function public.account_v2_list_deletion_provider_cleanup(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_list_deletion_provider_cleanup(uuid, jsonb)
  to service_role;

drop function if exists public.account_v2_record_deletion_provider_cleanup(
  uuid, jsonb, text, boolean
);

create or replace function public.account_v2_record_deletion_provider_cleanup(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb,
  candidate_recipient_hash text,
  candidate_cleanup_claim_id uuid,
  candidate_succeeded boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
  current_cleanup private.account_deletion_provider_cleanup%rowtype;
  next_state text;
  active_provider_lease boolean;
  newer_authority_exists boolean;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_request_id is null
    or candidate_recipient_hash is null
    or octet_length(candidate_recipient_hash) <> 64
    or candidate_recipient_hash !~ '^[0-9a-f]{64}$'
    or candidate_cleanup_claim_id is null
    or candidate_succeeded is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  -- Follow the shared Daily Sun lock order before locking the receipt. The
  -- public revoke helper reacquires this transaction-scoped lock safely.
  perform pg_advisory_xact_lock(
    hashtextextended(candidate_recipient_hash, 7312026)
  );

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if current_receipt.expires_at <= operation_time then
    return jsonb_build_object('outcome', 'expired');
  end if;

  select * into current_cleanup
  from private.account_deletion_provider_cleanup
  where request_id = candidate_request_id
    and recipient_hash = candidate_recipient_hash
  for update;

  if not found or current_cleanup.payload_ciphertext is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if current_cleanup.cleanup_claim_id is distinct from candidate_cleanup_claim_id
    or current_cleanup.cleanup_claim_expires_at is null
    or current_cleanup.cleanup_claim_expires_at <= operation_time
  then
    return jsonb_build_object('outcome', 'claim_mismatch');
  end if;

  delete from private.account_daily_sun_provider_mutation_leases
  where recipient_hash = candidate_recipient_hash
    and expires_at <= operation_time;

  select exists (
    select 1
    from private.account_daily_sun_provider_mutation_leases
    where recipient_hash = candidate_recipient_hash
      and expires_at > operation_time
  ) into active_provider_lease;

  select current_cleanup.database_revoked_at is not null and exists (
    select 1 from public.daily_sun_preferences
    where recipient_hash = candidate_recipient_hash
  ) into newer_authority_exists;

  next_state := case
    when current_cleanup.state in ('completed', 'superseded')
      then current_cleanup.state
    when active_provider_lease then 'pending'
    when newer_authority_exists and candidate_succeeded then 'superseded'
    when newer_authority_exists then 'pending'
    when current_cleanup.database_revoked_at is null then 'pending'
    when candidate_succeeded then 'completed'
    else 'pending'
  end;

  update private.account_deletion_provider_cleanup
  set state = next_state,
      attempt_count = least(attempt_count + 1, 1000000),
      last_attempt_at = operation_time,
      completed_at = case
        when next_state in ('completed', 'superseded')
          then coalesce(completed_at, operation_time)
        else null
      end,
      cleanup_claim_id = case
        when next_state in ('completed', 'superseded') then null
        else cleanup_claim_id
      end,
      cleanup_claimed_at = case
        when next_state in ('completed', 'superseded') then null
        else cleanup_claimed_at
      end,
      cleanup_claim_expires_at = case
        when next_state in ('completed', 'superseded') then null
        else cleanup_claim_expires_at
      end,
      updated_at = operation_time
  where request_id = candidate_request_id
    and recipient_hash = candidate_recipient_hash;

  current_receipt := private.account_v2_refresh_deletion_receipt(
    candidate_request_id
  );

  return jsonb_build_object(
    'outcome', 'recorded',
    'recipient_hash', candidate_recipient_hash,
    'state', next_state,
    'daily_sun_revoked', current_receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      current_receipt.daily_sun_reconciliation_required
  );
end;
$$;

revoke all on function public.account_v2_record_deletion_provider_cleanup(uuid, jsonb, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.account_v2_record_deletion_provider_cleanup(uuid, jsonb, text, uuid, boolean)
  to service_role;

create or replace function public.account_v2_deletion_status(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if current_receipt.expires_at <= clock_timestamp() then
    return jsonb_build_object('outcome', 'expired');
  end if;

  -- Status is not a passive read while the Auth/account row still exists: it
  -- reacquires the owner lock and repairs terminal erasure before responding.
  current_receipt := private.account_v2_reassert_terminal_cleanup(
    candidate_request_id,
    '[]'::jsonb,
    true
  );

  return jsonb_build_object(
    'outcome', 'ready',
    'request_id', current_receipt.request_id,
    'user_id', current_receipt.user_id,
    'state', case
      when current_receipt.completed_at is null then 'prepared'
      else 'completed'
    end,
    'prepared_at', current_receipt.prepared_at,
    'completed_at', current_receipt.completed_at,
    'daily_sun_revoked', current_receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      current_receipt.daily_sun_reconciliation_required,
    'expires_at', current_receipt.expires_at
  );
end;
$$;

revoke all on function public.account_v2_deletion_status(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_deletion_status(uuid, jsonb)
  to service_role;

-- The service role does not receive general access to Supabase-managed Auth
-- tables. This helper exposes only the existence bit for the user already
-- bound to a durable deletion receipt, which is all finish needs to prove the
-- out-of-transaction Auth admin deletion succeeded.
create or replace function private.account_v2_deletion_auth_user_exists(
  candidate_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.account_deletion_receipts as receipts
    join auth.users as users on users.id = receipts.user_id
    where receipts.request_id = candidate_request_id
  );
$$;

revoke all on function private.account_v2_deletion_auth_user_exists(uuid)
  from public, anon, authenticated;
grant execute on function private.account_v2_deletion_auth_user_exists(uuid)
  to service_role;

create or replace function public.account_v2_finish_deletion(
  candidate_request_id uuid,
  candidate_recovery_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_receipt private.account_deletion_receipts%rowtype;
  operation_time timestamptz := clock_timestamp();
begin
  if candidate_request_id is null
    or not private.account_v2_valid_request_fingerprints(
      candidate_recovery_fingerprints
    )
  then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  select * into current_receipt
  from private.account_deletion_receipts
  where request_id = candidate_request_id;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(candidate_recovery_fingerprints)
      as supplied(verifier)
    where supplied.verifier = current_receipt.recovery_verifier
  ) then
    return jsonb_build_object('outcome', 'recovery_mismatch');
  end if;

  if current_receipt.expires_at <= operation_time then
    return jsonb_build_object('outcome', 'expired');
  end if;

  current_receipt := private.account_v2_reassert_terminal_cleanup(
    candidate_request_id,
    '[]'::jsonb,
    true
  );

  -- Completion is a durable statement that the Auth admin deletion succeeded,
  -- so refuse to mark it while the Auth identity remains.
  if private.account_v2_deletion_auth_user_exists(candidate_request_id) then
    return jsonb_build_object('outcome', 'auth_not_deleted');
  end if;

  update private.account_deletion_receipts
  set completed_at = coalesce(completed_at, operation_time)
  where request_id = candidate_request_id
  returning * into current_receipt;

  current_receipt := private.account_v2_refresh_deletion_receipt(
    candidate_request_id
  );

  return jsonb_build_object(
    'outcome', 'completed',
    'request_id', current_receipt.request_id,
    'user_id', current_receipt.user_id,
    'prepared_at', current_receipt.prepared_at,
    'completed_at', current_receipt.completed_at,
    'daily_sun_revoked', current_receipt.daily_sun_revoked,
    'daily_sun_reconciliation_required',
      current_receipt.daily_sun_reconciliation_required,
    'expires_at', current_receipt.expires_at
  );
end;
$$;

revoke all on function public.account_v2_finish_deletion(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.account_v2_finish_deletion(uuid, jsonb)
  to service_role;
