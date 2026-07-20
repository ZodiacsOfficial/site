\set ON_ERROR_STOP on

-- Run after all committed migrations in a disposable PostgreSQL 17 database.
-- These assertions use service_role exactly as the Vercel and GitHub workers
-- do; browser roles must have neither table nor RPC access.

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
  (select relrowsecurity
   from pg_catalog.pg_class
   where oid = 'public.daily_chart_confirmation_send_claims'::regclass)
  and (select relrowsecurity
       from pg_catalog.pg_class
       where oid = 'public.push_delivery_claims'::regclass),
  'both delivery-guard ledgers must have RLS enabled'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.daily_chart_confirmation_send_claims', 'select')
    and not has_table_privilege('authenticated', 'public.daily_chart_confirmation_send_claims', 'select')
    and not has_table_privilege('anon', 'public.push_delivery_claims', 'select')
    and not has_table_privilege('authenticated', 'public.push_delivery_claims', 'select'),
  'browser roles must have no delivery-ledger access'
);

select pg_temp.assert_true(
  has_table_privilege(
    'service_role',
    'public.daily_chart_confirmation_send_claims',
    'select,insert,delete'
  )
    and not has_table_privilege(
      'service_role',
      'public.daily_chart_confirmation_send_claims',
      'update'
    )
    and has_table_privilege(
      'service_role',
      'public.push_delivery_claims',
      'select,insert,update,delete'
    ),
  'service role must receive only the table privileges required by the RPCs'
);

select pg_temp.assert_true(
  has_sequence_privilege(
    'service_role',
    'public.push_subscriptions_subscription_id_seq',
    'usage'
  )
    and not has_sequence_privilege(
      'anon',
      'public.push_subscriptions_subscription_id_seq',
      'usage'
    )
    and not has_sequence_privilege(
      'authenticated',
      'public.push_subscriptions_subscription_id_seq',
      'usage'
    ),
  'only the service role may allocate push subscription identities'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid in (
      'public.daily_chart_confirmation_send_claims'::regclass,
      'public.push_delivery_claims'::regclass
    )
  ),
  'delivery ledgers must expose no browser policy'
);

select pg_temp.assert_true(
  not (select prosecdef
       from pg_catalog.pg_proc
       where oid = 'public.prune_daily_chart_confirmation_send_claims(integer)'::regprocedure)
    and not (select prosecdef
             from pg_catalog.pg_proc
             where oid = 'public.claim_daily_chart_confirmation_send(uuid,uuid)'::regprocedure)
    and not (select prosecdef
             from pg_catalog.pg_proc
             where oid = 'public.prune_push_delivery_claims(integer)'::regprocedure)
    and not (select prosecdef
             from pg_catalog.pg_proc
             where oid = 'public.reserve_push_delivery(bigint,text,uuid)'::regprocedure)
    and not (select prosecdef
             from pg_catalog.pg_proc
             where oid = 'public.finalize_push_delivery(bigint,text,uuid,text,integer)'::regprocedure),
  'every delivery-guard RPC must remain SECURITY INVOKER'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from (values
      ('public.prune_daily_chart_confirmation_send_claims(integer)'),
      ('public.claim_daily_chart_confirmation_send(uuid,uuid)'),
      ('public.prune_push_delivery_claims(integer)'),
      ('public.reserve_push_delivery(bigint,text,uuid)'),
      ('public.finalize_push_delivery(bigint,text,uuid,text,integer)')
    ) as rpc(signature)
    where has_function_privilege('anon', rpc.signature, 'execute')
      or has_function_privilege('authenticated', rpc.signature, 'execute')
      or not has_function_privilege('service_role', rpc.signature, 'execute')
  ),
  'only service role may execute delivery-guard RPCs'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.daily_chart_confirmation_send_claims'::regclass
      and confrelid = 'auth.users'::regclass
      and contype = 'f'
      and confdeltype = 'c'
  )
    and not exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = 'public.daily_chart_confirmation_send_claims'::regclass
        and confrelid = 'public.daily_chart_preferences'::regclass
    ),
  'chart attempts must follow account deletion but never preference deletion'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_chart_confirmation_send_claims'
      and column_name in ('email', 'raw_email', 'recipient_hash', 'chart_id')
  )
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'push_delivery_claims'
        and column_name in ('endpoint', 'p256dh', 'auth')
    ),
  'guard ledgers must not duplicate recipients, chart data, endpoints, or push keys'
);

select pg_temp.assert_true(
  pg_catalog.pg_get_functiondef(
    'public.claim_daily_chart_confirmation_send(uuid,uuid)'::regprocedure
  ) ilike '%pg_advisory_xact_lock%'
    and pg_catalog.pg_get_functiondef(
      'public.reserve_push_delivery(bigint,text,uuid)'::regprocedure
    ) ilike '%for update%'
    and pg_catalog.pg_get_functiondef(
      'public.reserve_push_delivery(bigint,text,uuid)'::regprocedure
    ) ilike '%pg_advisory_xact_lock%',
  'empty chart ledgers and endpoint re-subscriptions must be serialized in database'
);

select pg_temp.assert_true(
  position(
    'perform pg_catalog.pg_advisory_xact_lock' in lower(pg_catalog.pg_get_functiondef(
      'public.claim_daily_chart_confirmation_send(uuid,uuid)'::regprocedure
    ))
  ) < position(
    'perform public.prune_daily_chart_confirmation_send_claims' in lower(pg_catalog.pg_get_functiondef(
      'public.claim_daily_chart_confirmation_send(uuid,uuid)'::regprocedure
    ))
  ),
  'a chart claimant must own its blocking account lock before opportunistic pruning'
);

-- Minimal Auth subjects for FK-backed chart claims. auth.users supplies the
-- remaining defaults in both the hosted and local Supabase schemas.
insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000004');

set role service_role;

-- First chart attempt claims. A lost RPC response may retry the same owner
-- without consuming a second slot; a different owner inside 60 seconds waits.
select pg_temp.assert_true(
  public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'claimed',
  'first chart confirmation provider attempt must claim'
);

select pg_temp.assert_true(
  public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'claimed'
  and (
    select count(*) = 1
    from public.daily_chart_confirmation_send_claims
    where user_id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'same chart claim token must be idempotent'
);

with result as (
  select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002'
  ) as value
)
select pg_temp.assert_true(
  value->>'outcome' = 'capped_60s'
    and (value->>'retry_after_seconds')::integer between 1 and 60,
  'chart cadence must return an exact positive Retry-After'
)
from result;

reset role;
update public.daily_chart_confirmation_send_claims
set claimed_at = clock_timestamp() - interval '61 seconds'
where user_id = 'a0000000-0000-4000-8000-000000000001';
set role service_role;

select pg_temp.assert_true(
  public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002'
  )->>'outcome' = 'claimed',
  'chart cadence must reopen after the exact rolling minute'
);

-- Six provider attempts in the exact rolling day exhaust the account ceiling.
reset role;
insert into public.daily_chart_confirmation_send_claims (
  user_id,
  claim_token,
  claimed_at
)
select
  'a0000000-0000-4000-8000-000000000002',
  ('a2000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  clock_timestamp() - series * interval '1 hour'
from generate_series(1, 6) as series;
set role service_role;

with result as (
  select public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000007'
  ) as value
)
select pg_temp.assert_true(
  value->>'outcome' = 'capped_24h'
    and (value->>'retry_after_seconds')::integer > 0
    and (value->>'retry_after_seconds')::integer <= 86400,
  'seventh chart attempt in an exact rolling day must be capped'
)
from result;

reset role;
update public.daily_chart_confirmation_send_claims
set claimed_at = clock_timestamp() - interval '24 hours 1 second'
where user_id = 'a0000000-0000-4000-8000-000000000002'
  and claim_token = 'a2000000-0000-4000-8000-000000000006';
set role service_role;

select pg_temp.assert_true(
  public.claim_daily_chart_confirmation_send(
    'a0000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000007'
  )->>'outcome' = 'claimed',
  'chart ceiling must reopen when the oldest attempt leaves the exact window'
);

-- Preference revocation cannot erase the independent account attempt history.
select public.revoke_daily_email_preference(
  repeat('c', 64),
  'chart',
  'a0000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.daily_chart_confirmation_send_claims
    where user_id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'chart preference cancellation or unsubscribe must not reset send limits'
);

-- Bounded cleanup removes only rows outside the exact rolling day.
reset role;
insert into public.daily_chart_confirmation_send_claims (
  user_id,
  claim_token,
  claimed_at
) values
  (
    'a0000000-0000-4000-8000-000000000003',
    'a3000000-0000-4000-8000-000000000001',
    clock_timestamp() - interval '25 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'a3000000-0000-4000-8000-000000000002',
    clock_timestamp() - interval '23 hours'
  );
set role service_role;
select public.prune_daily_chart_confirmation_send_claims(128);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.daily_chart_confirmation_send_claims
    where claim_token = 'a3000000-0000-4000-8000-000000000001'
  )
    and exists (
      select 1
      from public.daily_chart_confirmation_send_claims
      where claim_token = 'a3000000-0000-4000-8000-000000000002'
    ),
  'chart cleanup must retain every attempt still inside the cap window'
);

-- SQL NULLs fail before any claim is written.
do $$
begin
  begin
    perform public.claim_daily_chart_confirmation_send(null, gen_random_uuid());
    raise exception 'null chart user was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.claim_daily_chart_confirmation_send(
      'a0000000-0000-4000-8000-000000000004',
      null
    );
    raise exception 'null chart claim token was accepted';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

-- Service inserts prove the identity sequence grant used by the subscription
-- endpoint, while endpoints and encryption keys remain in one table only.
insert into public.push_subscriptions (endpoint, p256dh, auth, lang) values
  ('https://push.test/caps-a', 'public_caps_a', 'auth_caps_a', 'en'),
  ('https://push.test/caps-b', 'public_caps_b', 'auth_caps_b', 'en'),
  ('https://push.test/persist', 'public_persist', 'auth_persist', 'en'),
  ('https://push.test/refresh', 'public_refresh', 'auth_refresh', 'en'),
  ('https://push.test/expired', 'public_expired', 'auth_expired', 'en'),
  ('https://push.test/failed', 'public_failed', 'auth_failed', 'en');

select pg_temp.assert_true(
  (select count(distinct subscription_id) = 6
   from public.push_subscriptions
   where endpoint like 'https://push.test/%'),
  'every push subscription must receive a stable server-owned identity'
);

-- The same reservation owner is idempotent. Another owner for the same event
-- is duplicate, and a different event inside 24 hours is capped.
select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'full-moon-2026-07-29',
    'b1000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'reserved',
  'first push event must reserve'
);

select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'full-moon-2026-07-29',
    'b1000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'reserved'
    and (select count(*) = 1
         from public.push_delivery_claims
         where event_key = 'full-moon-2026-07-29'),
  'same push reservation owner must recover a lost RPC response'
);

select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'full-moon-2026-07-29',
    'b1000000-0000-4000-8000-000000000002'
  )->>'outcome' = 'duplicate',
  'same endpoint and event must never reserve twice'
);

with result as (
  select public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'mercury-stations-direct-2026-07-23',
    'b1000000-0000-4000-8000-000000000003'
  ) as value
)
select pg_temp.assert_true(
  value->>'outcome' = 'capped_24h'
    and (value->>'retry_after_seconds')::integer between 1 and 86400,
  'push must enforce the exact rolling 24-hour cap with Retry-After'
)
from result;

-- After 24 hours a second weekly event may reserve; a third remains blocked
-- until the oldest of the two leaves the exact rolling seven-day window.
reset role;
update public.push_delivery_claims
set claimed_at = clock_timestamp() - interval '25 hours'
where event_key = 'full-moon-2026-07-29';
set role service_role;

select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'mercury-stations-direct-2026-07-23',
    'b1000000-0000-4000-8000-000000000003'
  )->>'outcome' = 'reserved',
  'second push inside seven days may reserve after the daily window'
);

with result as (
  select public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-a'),
    'neptune-sextile-pluto-2026-07-24',
    'b1000000-0000-4000-8000-000000000004'
  ) as value
)
select pg_temp.assert_true(
  value->>'outcome' = 'capped_7d'
    and (value->>'retry_after_seconds')::integer > 86400,
  'third push inside seven days must wait for the weekly window, not one day'
)
from result;

select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-b'),
    'neptune-sextile-pluto-2026-07-24',
    'b2000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'reserved',
  'caps must be isolated per endpoint'
);

-- Endpoint fingerprint history survives an explicit unsubscribe and rejoin.
select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/persist'),
    'jupiter-sextile-uranus-2026-07-21',
    'b3000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'reserved',
  'persist fixture must reserve'
);
delete from public.push_subscriptions
where endpoint = 'https://push.test/persist';
insert into public.push_subscriptions (endpoint, p256dh, auth, lang) values
  ('https://push.test/persist', 'public_persist_new', 'auth_persist_new', 'en');

select pg_temp.assert_true(
  (
    select subscription_id
    from public.push_subscriptions
    where endpoint = 'https://push.test/persist'
  ) is distinct from (
    select subscription_id
    from public.push_delivery_claims
    where event_key = 'jupiter-sextile-uranus-2026-07-21'
  )
    and public.reserve_push_delivery(
      (select subscription_id from public.push_subscriptions
       where endpoint = 'https://push.test/persist'),
      'mercury-stations-direct-2026-07-23',
      'b3000000-0000-4000-8000-000000000002'
    )->>'outcome' = 'capped_24h',
  'delete and re-subscribe must not reset a per-endpoint cap'
);

-- Success/failure finalization is claim-token fenced and idempotent.
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-b'),
    'neptune-sextile-pluto-2026-07-24',
    'b2000000-0000-4000-8000-000000000001',
    'sent',
    201
  )->>'outcome' = 'finalized',
  'successful push must finalize the exact reservation'
);
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/caps-b'),
    'neptune-sextile-pluto-2026-07-24',
    'b2000000-0000-4000-8000-000000000001',
    'sent',
    201
  )->>'outcome' = 'finalized',
  'same terminal push finalization must be idempotent'
);

select public.reserve_push_delivery(
  (select subscription_id from public.push_subscriptions
   where endpoint = 'https://push.test/failed'),
  'uranus-trine-pluto-2026-07-18',
  'b4000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/failed'),
    'uranus-trine-pluto-2026-07-18',
    'b4000000-0000-4000-8000-000000000001',
    'failed',
    null
  )->>'outcome' = 'finalized',
  'provider failure finalization must succeed without a known status code'
);
select pg_temp.assert_true(
  (select status = 'failed'
   from public.push_delivery_claims
   where event_key = 'uranus-trine-pluto-2026-07-18'),
  'provider failures must remain counted after finalization'
);

-- A refreshed subscription wins a stale provider 410. An unchanged one is
-- pruned atomically, while its endpoint-hash claim remains for seven days.
select public.reserve_push_delivery(
  (select subscription_id from public.push_subscriptions
   where endpoint = 'https://push.test/refresh'),
  'uranus-sextile-neptune-2026-07-15',
  'b5000000-0000-4000-8000-000000000001'
);
select pg_sleep(0.01);
update public.push_subscriptions
set p256dh = 'public_refresh_new'
where endpoint = 'https://push.test/refresh';
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/refresh'),
    'uranus-sextile-neptune-2026-07-15',
    'b5000000-0000-4000-8000-000000000001',
    'expired',
    410
  )->>'outcome' = 'superseded'
    and exists (
      select 1
      from public.push_subscriptions
      where endpoint = 'https://push.test/refresh'
        and p256dh = 'public_refresh_new'
    ),
  'stale 404/410 worker must not delete refreshed browser keys'
);

select public.reserve_push_delivery(
  (select subscription_id from public.push_subscriptions
   where endpoint = 'https://push.test/expired'),
  'uranus-trine-pluto-2026-07-18',
  'b6000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id from public.push_subscriptions
     where endpoint = 'https://push.test/expired'),
    'uranus-trine-pluto-2026-07-18',
    'b6000000-0000-4000-8000-000000000001',
    'expired',
    410
  )->>'outcome' = 'expired',
  'exact 404/410 owner must finalize as expired'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.push_subscriptions
    where endpoint = 'https://push.test/expired'
  )
    and exists (
      select 1
      from public.push_delivery_claims
      where event_key = 'uranus-trine-pluto-2026-07-18'
        and claim_token = 'b6000000-0000-4000-8000-000000000001'
        and status = 'expired'
    ),
  'expired finalization must prune the subscription and retain cap history'
);
select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id
     from public.push_delivery_claims
     where claim_token = 'b6000000-0000-4000-8000-000000000001'),
    'uranus-trine-pluto-2026-07-18',
    'b6000000-0000-4000-8000-000000000001',
    'expired',
    410
  )->>'outcome' = 'expired',
  'expired finalization retry must recover a lost RPC response'
);

select pg_temp.assert_true(
  public.reserve_push_delivery(
    9223372036854775807,
    'full-moon-2026-07-29',
    'b7000000-0000-4000-8000-000000000001'
  )->>'outcome' = 'missing'
    and public.finalize_push_delivery(
      9223372036854775807,
      'full-moon-2026-07-29',
      'b7000000-0000-4000-8000-000000000001',
      'failed',
      null
    )->>'outcome' = 'missing',
  'missing subscriptions or claims must fail closed without creating state'
);

-- Invalid provider state can never corrupt the terminal-state constraint.
do $$
begin
  begin
    perform public.finalize_push_delivery(
      1,
      'full-moon-2026-07-29',
      gen_random_uuid(),
      'sent',
      500
    );
    raise exception 'failed provider status was accepted as sent';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.reserve_push_delivery(1, 'Invalid Event Key', gen_random_uuid());
    raise exception 'invalid event key was accepted';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

-- Cleanup drops only history beyond the rolling week; fresh cap state stays.
reset role;
update public.push_delivery_claims
set claimed_at = clock_timestamp() - interval '7 days 1 second'
where claim_token = 'b4000000-0000-4000-8000-000000000001';
set role service_role;
select public.prune_push_delivery_claims(512);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.push_delivery_claims
    where claim_token = 'b4000000-0000-4000-8000-000000000001'
  )
    and exists (
      select 1
      from public.push_delivery_claims
      where claim_token = 'b6000000-0000-4000-8000-000000000001'
    ),
  'push cleanup must retain every attempt inside the rolling cap window'
);

reset role;

-- Account deletion is the one chart-ledger erasure path.
delete from auth.users
where id = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(
  not exists (
    select 1
    from public.daily_chart_confirmation_send_claims
    where user_id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'Auth account deletion must cascade chart-attempt metadata'
);
