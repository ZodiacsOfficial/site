\set ON_ERROR_STOP on

begin;

insert into auth.users (id)
values ('10000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, digest_opt_in)
values ('10000000-0000-4000-8000-000000000001', true);

insert into public.weekly_digest_unsubscribe_tokens (
  token_hash,
  user_id,
  expires_at
)
values (
  pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'UTF8'
    )),
    'hex'
  ),
  '10000000-0000-4000-8000-000000000001',
  now() + interval '30 days'
);

insert into public.weekly_digest_unsubscribe_tokens (
  token_hash,
  user_id,
  expires_at,
  created_at
)
values (
  pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'UTF8'
    )),
    'hex'
  ),
  '10000000-0000-4000-8000-000000000001',
  now() - interval '1 day',
  now() - interval '2 days'
);

do $$
begin
  if has_table_privilege('anon', 'public.weekly_digest_unsubscribe_tokens', 'select')
    or has_table_privilege('anon', 'public.weekly_digest_unsubscribe_tokens', 'insert')
    or has_table_privilege('anon', 'public.weekly_digest_unsubscribe_tokens', 'update')
    or has_table_privilege('anon', 'public.weekly_digest_unsubscribe_tokens', 'delete')
    or has_table_privilege('authenticated', 'public.weekly_digest_unsubscribe_tokens', 'select')
    or has_table_privilege('authenticated', 'public.weekly_digest_unsubscribe_tokens', 'insert')
    or has_table_privilege('authenticated', 'public.weekly_digest_unsubscribe_tokens', 'update')
    or has_table_privilege('authenticated', 'public.weekly_digest_unsubscribe_tokens', 'delete')
  then
    raise exception 'unsubscribe token rows must remain inaccessible to client roles';
  end if;
  if not has_table_privilege('service_role', 'public.weekly_digest_unsubscribe_tokens', 'select')
    or not has_table_privilege('service_role', 'public.weekly_digest_unsubscribe_tokens', 'insert')
    or not has_table_privilege('service_role', 'public.weekly_digest_unsubscribe_tokens', 'delete')
    or has_table_privilege(
    'service_role',
    'public.weekly_digest_unsubscribe_tokens',
    'update'
  ) then
    raise exception 'service-role token capability drifted';
  end if;
  if not has_function_privilege(
    'anon',
    'public.weekly_digest_unsubscribe_v1(text)',
    'execute'
  ) then
    raise exception 'anonymous unsubscribe RPC execution is required';
  end if;
end;
$$;

set local role anon;

do $$
begin
  if public.weekly_digest_unsubscribe_v1('invalid') then
    raise exception 'malformed capability was accepted';
  end if;
  if public.weekly_digest_unsubscribe_v1(
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
  ) then
    raise exception 'expired capability was accepted';
  end if;
  if not public.weekly_digest_unsubscribe_v1(
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ) then
    raise exception 'valid capability was rejected';
  end if;
  if not public.weekly_digest_unsubscribe_v1(
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ) then
    raise exception 'capability retry was not idempotent';
  end if;
end;
$$;

reset role;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
      and digest_opt_in
  ) then
    raise exception 'weekly digest preference was not revoked';
  end if;
  if not exists (
    select 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '10000000-0000-4000-8000-000000000001'
      and used_at is not null
  ) then
    raise exception 'used capability was not fenced';
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'weekly_digest_unsubscribe_v1'
      and procedure.prosecdef
      and 'search_path=""' = any(coalesce(procedure.proconfig, array[]::text[]))
      and pg_catalog.pg_get_userbyid(procedure.proowner) = 'postgres'
  ) then
    raise exception 'unsubscribe RPC definer contract drifted';
  end if;
end;
$$;

-- A used link may acknowledge a lost-response retry, but it must not turn a
-- preference off again after the account holder opts back in.
update public.profiles
set digest_opt_in = true
where user_id = '10000000-0000-4000-8000-000000000001';

set local role anon;

do $$
begin
  if public.weekly_digest_unsubscribe_v1(
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ) then
    raise exception 'used capability claimed to revoke a later opt-in';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
      and digest_opt_in
  ) then
    raise exception 'used capability revoked a later opt-in';
  end if;
end;
$$;

rollback;
