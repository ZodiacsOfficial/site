\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(ok boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then raise exception 'assertion failed: %', message; end if;
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 2 from public.push_subscriptions),
  'legacy subscriptions must be preserved'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.push_subscriptions
    where endpoint = 'https://push.example.invalid/legacy-default-language'
      and p256dh = 'AQID'
      and auth = 'BAUG'
      and lang = 'en'
      and created_at = '2026-07-01T01:02:03Z'::timestamptz
      and updated_at = created_at
      and subscription_id > 0
  ),
  'nullable legacy language must backfill without changing consent or keys'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.push_subscriptions
    where endpoint = 'https://push.example.invalid/legacy-french'
      and p256dh = 'BwgJ'
      and auth = 'CgsM'
      and lang = 'fr'
      and created_at = '2026-07-02T04:05:06Z'::timestamptz
      and updated_at = created_at
      and subscription_id > 0
  ),
  'non-null legacy language and timestamps must remain unchanged'
);

select pg_temp.assert_true(
  (select count(distinct subscription_id) = 2 from public.push_subscriptions),
  'every preserved subscription must receive a stable unique identity'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name in ('lang', 'updated_at', 'subscription_id')
      and is_nullable = 'YES'
  ),
  'upgraded delivery columns must be non-null'
);

select pg_temp.assert_true(
  (select column_default = '''en''::text'
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'push_subscriptions'
     and column_name = 'lang')
    and (select column_default = 'now()'
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'push_subscriptions'
           and column_name = 'updated_at')
    and (select is_identity = 'YES'
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'push_subscriptions'
           and column_name = 'subscription_id'),
  'upgraded columns must have the final defaults and identity contract'
);

select pg_temp.assert_true(
  not exists (
    select required.name
    from (values
      ('push_subscriptions_endpoint_valid'),
      ('push_subscriptions_p256dh_valid'),
      ('push_subscriptions_auth_valid'),
      ('push_subscriptions_lang_valid'),
      ('push_subscriptions_subscription_id_key')
    ) as required(name)
    where not exists (
      select 1
      from pg_catalog.pg_constraint actual
      where actual.conrelid = 'public.push_subscriptions'::regclass
        and actual.conname = required.name
        and actual.convalidated
    )
  ),
  'all final push subscription constraints must exist'
);

select pg_temp.assert_true(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.push_subscriptions'::regclass)
    and not exists (
      select 1
      from pg_catalog.pg_policy
      where polrelid = 'public.push_subscriptions'::regclass
    ),
  'upgraded subscriptions must remain server-only behind RLS'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.push_subscriptions', 'select,insert,update,delete')
    and not has_table_privilege('authenticated', 'public.push_subscriptions', 'select,insert,update,delete')
    and has_table_privilege('service_role', 'public.push_subscriptions', 'select,insert,update,delete')
    and not has_table_privilege('service_role', 'public.push_subscriptions', 'truncate,references,trigger'),
  'upgrade must replace legacy broad grants with exact service-only CRUD'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.push_subscriptions'::regclass
      and tgname = 'push_subscriptions_touch_updated_at'
      and not tgisinternal
      and tgfoid = 'public.touch_phase3_updated_at()'::regprocedure
  ),
  'upgraded subscriptions must receive the update clock trigger'
);

update public.push_subscriptions
set updated_at = '2000-01-01T00:00:00Z',
    p256dh = 'DQ4P'
where endpoint = 'https://push.example.invalid/legacy-default-language';

select pg_temp.assert_true(
  (select updated_at > '2026-07-01T01:02:03Z'::timestamptz
   from public.push_subscriptions
   where endpoint = 'https://push.example.invalid/legacy-default-language'),
  'updated_at trigger must advance after the upgrade'
);

set role service_role;

select pg_temp.assert_true(
  public.reserve_push_delivery(
    (select subscription_id
     from public.push_subscriptions
     where endpoint = 'https://push.example.invalid/legacy-default-language'),
    'legacy-upgrade-proof',
    (select updated_at
     from public.push_subscriptions
     where endpoint = 'https://push.example.invalid/legacy-default-language'),
    '99999999-9999-4999-8999-999999999999'
  )->>'outcome' = 'reserved',
  'delivery guard must reserve against an upgraded legacy subscription'
);

select pg_temp.assert_true(
  public.finalize_push_delivery(
    (select subscription_id
     from public.push_subscriptions
     where endpoint = 'https://push.example.invalid/legacy-default-language'),
    'legacy-upgrade-proof',
    '99999999-9999-4999-8999-999999999999',
    'sent',
    201
  )->>'outcome' = 'finalized',
  'delivery guard must finalize against an upgraded legacy subscription'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.push_subscriptions
    where endpoint = 'https://push.example.invalid/legacy-default-language'
  )
    and exists (
      select 1
      from public.push_delivery_claims
      where event_id = 'legacy-upgrade-proof'
        and status = 'sent'
        and provider_status = 201
    ),
  'successful delivery must retain consent and persist its receipt'
);

reset role;
