\set ON_ERROR_STOP on

-- Run only after 20260720074516_phase3_habit_layer.sql in a disposable
-- PostgreSQL 17 database. These checks intentionally exercise RPCs as the
-- service role; no browser role may read or mutate the consent ledger.

create or replace function pg_temp.assert_true(ok boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then raise exception 'assertion failed: %', message; end if;
end;
$$;

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.daily_sun_preferences'::regclass),
  'active Sun authority must have RLS enabled'
);
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.daily_sun_confirmation_requests'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.daily_sun_confirmation_rate_limits'::regclass),
  'Sun confirmation requests and abuse ledger must have RLS enabled'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.daily_sun_preferences', 'select')
    and not has_table_privilege('authenticated', 'public.daily_sun_preferences', 'select')
    and not has_table_privilege('anon', 'public.daily_sun_confirmation_requests', 'select')
    and not has_table_privilege('authenticated', 'public.daily_sun_confirmation_requests', 'select')
    and not has_table_privilege('anon', 'public.daily_sun_confirmation_rate_limits', 'select')
    and not has_table_privilege('authenticated', 'public.daily_sun_confirmation_rate_limits', 'select'),
  'browser roles must have no Sun ledger access'
);
select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.daily_sun_preferences', 'select,insert,update,delete')
    and has_table_privilege('service_role', 'public.daily_sun_confirmation_requests', 'select,insert,update,delete')
    and has_table_privilege('service_role', 'public.daily_sun_confirmation_rate_limits', 'select,insert,update,delete'),
  'service role must own the server-side Sun workflow'
);
select pg_temp.assert_true(
  not exists (
    select 1 from pg_policy
    where polrelid in (
      'public.daily_sun_preferences'::regclass,
      'public.daily_sun_confirmation_requests'::regclass,
      'public.daily_sun_confirmation_rate_limits'::regclass
    )
  ),
  'Sun ledgers must expose no browser policy'
);
select pg_temp.assert_true(
  not (select prosecdef from pg_proc where oid = 'public.prune_daily_sun_confirmation_state(integer)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.stage_daily_sun_confirmation(text,text,text,timestamptz)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.inspect_daily_sun_confirmation(text,text,text)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.claim_daily_sun_confirmation(text,text,text,uuid)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.complete_daily_sun_confirmation(text,text,uuid)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.release_daily_sun_confirmation(text,text,uuid)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.cancel_daily_sun_confirmation(text,text,boolean)'::regprocedure)
    and not (select prosecdef from pg_proc where oid = 'public.revoke_daily_email_preference(text,text,uuid)'::regprocedure),
  'all Sun RPCs must remain SECURITY INVOKER'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from (values
      ('public.prune_daily_sun_confirmation_state(integer)'),
      ('public.stage_daily_sun_confirmation(text,text,text,timestamptz)'),
      ('public.inspect_daily_sun_confirmation(text,text,text)'),
      ('public.claim_daily_sun_confirmation(text,text,text,uuid)'),
      ('public.complete_daily_sun_confirmation(text,text,uuid)'),
      ('public.release_daily_sun_confirmation(text,text,uuid)'),
      ('public.cancel_daily_sun_confirmation(text,text,boolean)'),
      ('public.revoke_daily_email_preference(text,text,uuid)')
    ) as rpc(signature)
    where has_function_privilege('anon', rpc.signature, 'execute')
      or has_function_privilege('authenticated', rpc.signature, 'execute')
      or not has_function_privilege('service_role', rpc.signature, 'execute')
  ),
  'only service role may execute every Sun consent RPC'
);

set role service_role;

-- Initial request and cooldown: spam cannot send again or invalidate the
-- valid token. Once the durable window passes, a newer request replaces it.
select pg_temp.assert_true(
  public.stage_daily_sun_confirmation(
    repeat('a', 64), 'aries', repeat('1', 64), clock_timestamp() + interval '48 hours'
  )->>'outcome' = 'new_request',
  'first request must stage'
);
select pg_temp.assert_true(
  public.stage_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('2', 64), clock_timestamp() + interval '48 hours'
  )->>'outcome' = 'cooldown',
  'duplicate request inside the window must be suppressed'
);
select pg_temp.assert_true(
  public.inspect_daily_sun_confirmation(repeat('a', 64), 'aries', repeat('1', 64))->>'outcome' = 'valid'
    and public.inspect_daily_sun_confirmation(repeat('a', 64), 'libra', repeat('2', 64))->>'outcome' = 'invalid',
  'cooldown must preserve the already-delivered token'
);
update public.daily_sun_confirmation_rate_limits
set next_allowed_at = clock_timestamp() - interval '1 second'
where recipient_hash = repeat('a', 64);
select pg_temp.assert_true(
  public.stage_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('2', 64), clock_timestamp() + interval '48 hours'
  )->>'outcome' = 'replaced_request',
  'request after cooldown must replace its predecessor'
);
select pg_temp.assert_true(
  public.inspect_daily_sun_confirmation(repeat('a', 64), 'aries', repeat('1', 64))->>'outcome' = 'invalid'
    and public.inspect_daily_sun_confirmation(repeat('a', 64), 'libra', repeat('2', 64))->>'outcome' = 'valid',
  'only newest token may be inspected'
);

-- Exactly one live owner; same-owner retry is idempotent.
select pg_temp.assert_true(
  public.claim_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('2', 64), '11111111-1111-4111-8111-111111111111'
  )->>'outcome' = 'claimed',
  'first worker must claim'
);
select pg_temp.assert_true(
  public.claim_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('2', 64), '11111111-1111-4111-8111-111111111111'
  )->>'outcome' = 'claimed',
  'same owner must recover a lost claim response'
);
select pg_temp.assert_true(
  public.claim_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('2', 64), '22222222-2222-4222-8222-222222222222'
  )->>'outcome' = 'busy',
  'second live owner must be fenced out'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('a', 64), repeat('2', 64), '11111111-1111-4111-8111-111111111111'
  )->>'outcome' = 'completed',
  'claimed request must activate'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('a', 64), repeat('2', 64), '11111111-1111-4111-8111-111111111111'
  )->>'outcome' = 'completed',
  'completion retry must survive a lost HTTP response'
);
select pg_temp.assert_true(
  (select sign = 'libra' and confirmed_by_attempt_id = '11111111-1111-4111-8111-111111111111'
   from public.daily_sun_preferences where recipient_hash = repeat('a', 64)),
  'active authority must record exact sign and owner'
);

-- A pending switch cannot overwrite active authority. Same-sign public input
-- cannot cancel that switch; only the signed Keep-token RPC may do so.
update public.daily_sun_confirmation_rate_limits
set next_allowed_at = clock_timestamp() - interval '1 second'
where recipient_hash = repeat('a', 64);
select pg_temp.assert_true(
  public.stage_daily_sun_confirmation(
    repeat('a', 64), 'taurus', repeat('3', 64), clock_timestamp() + interval '48 hours'
  )->>'outcome' = 'sign_change_request',
  'different active sign must stage a switch'
);
select pg_temp.assert_true(
  (select sign = 'libra' from public.daily_sun_preferences where recipient_hash = repeat('a', 64)),
  'old sign must remain authoritative while switch is pending'
);
update public.daily_sun_confirmation_rate_limits
set next_allowed_at = clock_timestamp() - interval '1 second'
where recipient_hash = repeat('a', 64);
select pg_temp.assert_true(
  public.stage_daily_sun_confirmation(
    repeat('a', 64), 'libra', repeat('4', 64), clock_timestamp() + interval '48 hours'
  )->>'outcome' = 'already_on'
    and exists (
      select 1 from public.daily_sun_confirmation_requests
      where recipient_hash = repeat('a', 64) and confirmation_token_hash = repeat('3', 64)
    ),
  'same-sign public submit must not cancel a signed switch'
);
select pg_temp.assert_true(
  public.cancel_daily_sun_confirmation(repeat('a', 64), repeat('3', 64), true),
  'signed Keep must cancel only the matching switch'
);
select pg_temp.assert_true(
  (select sign = 'libra' from public.daily_sun_preferences where recipient_hash = repeat('a', 64))
    and not exists (
      select 1 from public.daily_sun_confirmation_requests where recipient_hash = repeat('a', 64)
    ),
  'Keep must preserve active authority and clear the switch'
);

-- A stale lease is reclaimable; its old owner cannot complete or release.
update public.daily_sun_confirmation_rate_limits
set next_allowed_at = clock_timestamp() - interval '1 second'
where recipient_hash = repeat('a', 64);
select public.stage_daily_sun_confirmation(
  repeat('a', 64), 'pisces', repeat('5', 64), clock_timestamp() + interval '48 hours'
);
select public.claim_daily_sun_confirmation(
  repeat('a', 64), 'pisces', repeat('5', 64), '33333333-3333-4333-8333-333333333333'
);
update public.daily_sun_confirmation_requests
set claimed_at = clock_timestamp() - interval '5 minutes 1 second'
where recipient_hash = repeat('a', 64);
select pg_temp.assert_true(
  public.claim_daily_sun_confirmation(
    repeat('a', 64), 'pisces', repeat('5', 64), '44444444-4444-4444-8444-444444444444'
  )->>'outcome' = 'claimed',
  'stale owner must be reclaimable'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('a', 64), repeat('5', 64), '33333333-3333-4333-8333-333333333333'
  )->>'outcome' = 'superseded'
    and public.release_daily_sun_confirmation(
      repeat('a', 64), repeat('5', 64), '33333333-3333-4333-8333-333333333333'
    )->>'outcome' = 'superseded',
  'reclaimed old owner must be fully fenced'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('a', 64), repeat('5', 64), '44444444-4444-4444-8444-444444444444'
  )->>'outcome' = 'completed',
  'new lease owner must complete'
);
select pg_temp.assert_true(
  (select sign = 'pisces' from public.daily_sun_preferences where recipient_hash = repeat('a', 64)),
  'new lease owner must activate the requested sign'
);

-- SQL NULL and malformed values can never satisfy token/lease ownership.
select public.stage_daily_sun_confirmation(
  repeat('c', 64), 'cancer', repeat('7', 64), clock_timestamp() + interval '48 hours'
);
select public.claim_daily_sun_confirmation(
  repeat('c', 64), 'cancer', repeat('7', 64), '66666666-6666-4666-8666-666666666666'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('c', 64), null, '66666666-6666-4666-8666-666666666666'
  )->>'outcome' = 'gone'
    and public.release_daily_sun_confirmation(
      repeat('c', 64), repeat('7', 64), null
    )->>'outcome' = 'gone'
    and public.release_daily_sun_confirmation(
      repeat('c', 64), null, '66666666-6666-4666-8666-666666666666'
    )->>'outcome' = 'gone'
    and not exists (
      select 1 from public.daily_sun_preferences where recipient_hash = repeat('c', 64)
    )
    and exists (
      select 1 from public.daily_sun_confirmation_requests
      where recipient_hash = repeat('c', 64)
        and confirmation_state = 'confirming'
        and attempt_id = '66666666-6666-4666-8666-666666666666'
    ),
  'null token or owner must not complete or release a claim'
);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('c', 64), repeat('7', 64), '66666666-6666-4666-8666-666666666666'
  )->>'outcome' = 'completed',
  'valid owner must still complete after rejected null attempts'
);

-- Unsubscribe deletes both tables under the same advisory lock. A claimed
-- worker cannot reactivate consent after revocation.
select public.stage_daily_sun_confirmation(
  repeat('b', 64), 'leo', repeat('6', 64), clock_timestamp() + interval '48 hours'
);
select public.claim_daily_sun_confirmation(
  repeat('b', 64), 'leo', repeat('6', 64), '55555555-5555-4555-8555-555555555555'
);
select public.revoke_daily_email_preference(repeat('b', 64), 'sun_sign', null);
select pg_temp.assert_true(
  public.complete_daily_sun_confirmation(
    repeat('b', 64), repeat('6', 64), '55555555-5555-4555-8555-555555555555'
  )->>'outcome' = 'gone'
    and not exists (select 1 from public.daily_sun_preferences where recipient_hash = repeat('b', 64))
    and not exists (select 1 from public.daily_sun_confirmation_requests where recipient_hash = repeat('b', 64)),
  'unsubscribe must win against stale completion'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.daily_sun_confirmation_rate_limits where recipient_hash = repeat('b', 64)
  ),
  'signed unsubscribe must remove the Sun abuse-ledger identifier'
);

-- Capped cleanup removes expired state but never steals a fresh confirmation
-- lease whose token crossed expiry while the provider worker was running.
insert into public.daily_sun_confirmation_requests (
  recipient_hash, requested_sign, confirmation_token_hash, request_kind,
  confirmation_state, attempt_id, claimed_at, expires_at, created_at
) values
  (
    repeat('e', 64), 'aries', repeat('9', 64), 'subscribe',
    'pending', null, null,
    clock_timestamp() - interval '1 hour',
    clock_timestamp() - interval '49 hours'
  ),
  (
    repeat('f', 64), 'taurus', repeat('a', 64), 'subscribe',
    'confirming', '88888888-8888-4888-8888-888888888888', clock_timestamp(),
    clock_timestamp() - interval '1 second',
    clock_timestamp() - interval '49 hours'
  );
insert into public.daily_sun_confirmation_rate_limits (
  recipient_hash, next_allowed_at
) values
  (repeat('e', 64), clock_timestamp() - interval '25 hours'),
  (repeat('f', 64), clock_timestamp() - interval '25 hours');
select public.prune_daily_sun_confirmation_state(64);
select pg_temp.assert_true(
  not exists (
    select 1 from public.daily_sun_confirmation_requests where recipient_hash = repeat('e', 64)
  )
    and exists (
      select 1 from public.daily_sun_confirmation_requests
      where recipient_hash = repeat('f', 64)
        and confirmation_state = 'confirming'
        and claimed_at > clock_timestamp() - interval '5 minutes'
    )
    and not exists (
      select 1 from public.daily_sun_confirmation_rate_limits
      where recipient_hash in (repeat('e', 64), repeat('f', 64))
    ),
  'cleanup must remove expired state and old cooldowns while preserving a live lease'
);
update public.daily_sun_confirmation_requests
set claimed_at = clock_timestamp() - interval '5 minutes 1 second'
where recipient_hash = repeat('f', 64);
select public.prune_daily_sun_confirmation_state(64);
select pg_temp.assert_true(
  not exists (
    select 1 from public.daily_sun_confirmation_requests where recipient_hash = repeat('f', 64)
  ),
  'cleanup must remove an expired request after its lease becomes stale'
);

-- Null and malformed RPC inputs fail before any state is written.
do $$
begin
  begin
    perform public.stage_daily_sun_confirmation(
      repeat('c', 64), null, repeat('7', 64), clock_timestamp() + interval '48 hours'
    );
    raise exception 'null sign was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.stage_daily_sun_confirmation(
      'bad', 'aries', repeat('7', 64), clock_timestamp() + interval '48 hours'
    );
    raise exception 'invalid hash was accepted';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

reset role;

select pg_temp.assert_true(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'daily_sun_preferences',
        'daily_sun_confirmation_requests',
        'daily_sun_confirmation_rate_limits'
      )
      and column_name in ('email', 'raw_email')
  ),
  'database authority must never contain a raw-email column'
);
