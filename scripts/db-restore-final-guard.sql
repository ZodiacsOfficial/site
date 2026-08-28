\set ON_ERROR_STOP on

-- The interactive preflight runs in a separate session. Repeat its destructive
-- safety boundary inside the atomic restore transaction, then hold exclusive
-- locks on every Auth relation whose rows must be absent until commit so a
-- newly active target cannot race credential/session creation between
-- validation and restore.
set local lock_timeout = '10s';
lock table auth.users, auth.identities in access exclusive mode;

do $lock_excluded_auth$
declare
  excluded_relation record;
begin
  for excluded_relation in
    select relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relkind in ('r', 'p')
      and relation.relname not in (
        'schema_migrations',
        'instances',
        'users',
        'identities'
      )
    order by relation.relname
  loop
    execute pg_catalog.format(
      'lock table auth.%I in access exclusive mode',
      excluded_relation.relname
    );
  end loop;
end;
$lock_excluded_auth$;

\ir db-auth-durable-state-guard.sql
\ir db-auth-restore-target-state-guard.sql

create temporary table zodiacs_final_expected_manifest (
  line text primary key
);
\copy zodiacs_final_expected_manifest (line) from 'source-manifest.txt' with (format text)

create temporary table zodiacs_auth_column_contract (
  line text primary key
);
\ir db-auth-column-contract.sql

do $final_restore_guard$
declare
  user_object_count integer;
  missing_count integer;
  unexpected_count integer;
begin
  if pg_catalog.current_setting('server_version_num')::integer / 10000 <> 17 then
    raise exception 'Restore target must run PostgreSQL 17.';
  end if;

  if pg_catalog.to_regclass('auth.users') is null
     or pg_catalog.to_regclass('auth.identities') is null
     or pg_catalog.to_regnamespace('public') is null then
    raise exception 'Restore target is not a compatible fresh Supabase project.';
  end if;

  if (select pg_catalog.count(*) from auth.users) <> 0
     or (select pg_catalog.count(*) from auth.identities) <> 0 then
    raise exception 'Final fresh-project guard refused a target containing Auth rows.';
  end if;

  if pg_catalog.to_regnamespace('supabase_migrations') is not null then
    raise exception 'Final fresh-project guard requires an uninitialized migration ledger.';
  end if;

  select pg_catalog.count(*)
  into user_object_count
  from (
    select relation.oid
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private')
      and relation.relkind in ('r', 'p', 'S', 'v', 'm', 'f')
    union all
    select procedure.oid
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private')
    union all
    select type_record.oid
    from pg_catalog.pg_type as type_record
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = type_record.typnamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private')
      and type_record.typrelid = 0
  ) as user_objects;

  if user_object_count <> 0
     or pg_catalog.to_regnamespace('private') is not null
     or pg_catalog.to_regnamespace('living_chart_private') is not null then
    raise exception 'Final fresh-project guard requires empty application schemas.';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_roles as role
    where role.rolname in ('anon', 'authenticated', 'service_role')
  ) <> 3 then
    raise exception 'Restore target is missing standard Supabase API roles.';
  end if;

  select pg_catalog.count(*)
  into missing_count
  from zodiacs_final_expected_manifest as expected
  where expected.line like 'auth-column|%'
    and not exists (
      select 1
      from zodiacs_auth_column_contract as actual
      where actual.line = expected.line
    );

  select pg_catalog.count(*)
  into unexpected_count
  from zodiacs_auth_column_contract as actual
  where not exists (
    select 1
    from zodiacs_final_expected_manifest as expected
    where expected.line = actual.line
  );

  if missing_count <> 0 or unexpected_count <> 0 then
    raise exception
      'Final fresh-project Auth column contract is incompatible: % source columns missing, % target columns unexpected.',
      missing_count,
      unexpected_count;
  end if;
end;
$final_restore_guard$;

drop table zodiacs_auth_column_contract;
drop table zodiacs_final_expected_manifest;
