\set ON_ERROR_STOP on
\pset pager off

-- The restore wrapper changes into the extracted bundle directory before
-- invoking psql, so this fixed client-side path cannot be redirected by SQL.
create temporary table zodiacs_expected_manifest (
  line text primary key
);
\copy zodiacs_expected_manifest (line) from 'source-manifest.txt' with (format text)

\if :restore_preflight
\ir db-backup-manifest-init.sql
\ir db-auth-durable-state-guard.sql
\ir db-auth-restore-target-state-guard.sql
\ir db-auth-column-contract.sql

create temporary table zodiacs_current_global_default_acl (
  line text primary key
);

insert into zodiacs_current_global_default_acl (line)
select 'global-default-acl|' || pg_catalog.encode(
  pg_catalog.convert_to(pg_catalog.pg_get_userbyid(default_acl.defaclrole)::text, 'UTF8'),
  'hex'
) || '|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      pg_catalog.pg_get_userbyid(default_acl.defaclrole),
      '*',
      default_acl.defaclobjtype,
      case when default_acl.defaclacl is null then null else (
        select pg_catalog.jsonb_agg(acl::text order by acl::text)
        from pg_catalog.unnest(default_acl.defaclacl) as acl
      ) end
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_default_acl as default_acl
where default_acl.defaclnamespace = 0
  and pg_catalog.pg_get_userbyid(default_acl.defaclrole) in (
    select pg_catalog.convert_from(
      pg_catalog.decode(pg_catalog.split_part(expected.line, '|', 2), 'hex'),
      'UTF8'
    )
    from zodiacs_expected_manifest as expected
    where expected.line like 'application-owner|%'
  )
order by default_acl.defaclrole, default_acl.defaclobjtype;

do $preflight$
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
    raise exception 'Fresh-project guard refused a target containing Auth rows.';
  end if;

  if pg_catalog.to_regnamespace('supabase_migrations') is not null then
    raise exception 'Fresh-project guard requires an uninitialized migration ledger.';
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

  if user_object_count <> 0 then
    raise exception 'Fresh-project guard requires empty application schemas.';
  end if;

  if pg_catalog.to_regnamespace('private') is not null
     or pg_catalog.to_regnamespace('living_chart_private') is not null then
    raise exception 'Fresh-project guard requires optional application schemas to be absent.';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_roles as role
    where role.rolname in ('anon', 'authenticated', 'service_role')
  ) <> 3 then
    raise exception 'Restore target is missing standard Supabase API roles.';
  end if;

  if (select pg_catalog.count(*) from zodiacs_expected_manifest) = 0 then
    raise exception 'Backup acceptance manifest is empty.';
  end if;

  if not exists (
    select 1
    from zodiacs_expected_manifest as expected
    where expected.line like 'auth-column|%'
  ) then
    raise exception 'Backup is missing the managed Auth column contract.';
  end if;

  select pg_catalog.count(*)
  into missing_count
  from zodiacs_expected_manifest as expected
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
    from zodiacs_expected_manifest as expected
    where expected.line = actual.line
  );

  if missing_count <> 0 or unexpected_count <> 0 then
    raise exception
      'Fresh-project Auth column contract is incompatible with this backup: % source columns missing, % target columns unexpected.',
      missing_count,
      unexpected_count;
  end if;

  if exists (
    select 1
    from zodiacs_expected_manifest as expected
    where expected.line like 'application-owner|%'
      and not exists (
        select 1
        from pg_catalog.pg_roles as role
        where role.rolname = pg_catalog.convert_from(
          pg_catalog.decode(pg_catalog.split_part(expected.line, '|', 2), 'hex'),
          'UTF8'
        )
      )
  ) then
    raise exception 'Fresh-project target is missing an application object-owner role.';
  end if;

  select pg_catalog.count(*)
  into missing_count
  from zodiacs_expected_manifest as expected
  where expected.line like 'global-default-acl|%'
    and not exists (
      select 1
      from zodiacs_current_global_default_acl as actual
      where actual.line = expected.line
    );

  select pg_catalog.count(*)
  into unexpected_count
  from zodiacs_current_global_default_acl as actual
  where not exists (
    select 1
    from zodiacs_expected_manifest as expected
    where expected.line = actual.line
  );

  if missing_count <> 0 or unexpected_count <> 0 then
    raise exception
      'Fresh-project global default ACLs differ from the source application-owner contract: % source records missing, % target records unexpected.',
      missing_count,
      unexpected_count;
  end if;
end;
$preflight$;
\quit
\endif

-- Rebuild the same canonical manifest after all ordered restore sections have
-- run, but before psql commits the surrounding single transaction.
\ir db-backup-manifest-init.sql
\ir db-backup-manifest.sql

do $manifest_comparison$
declare
  missing_count integer;
  unexpected_count integer;
  category_record record;
begin
  select pg_catalog.count(*)
  into missing_count
  from zodiacs_expected_manifest as expected
  where not exists (
    select 1
    from zodiacs_backup_manifest as actual
    where actual.line = expected.line
  );

  select pg_catalog.count(*)
  into unexpected_count
  from zodiacs_backup_manifest as actual
  where not exists (
    select 1
    from zodiacs_expected_manifest as expected
    where expected.line = actual.line
  );

  if missing_count <> 0 or unexpected_count <> 0 then
    for category_record in
      select
        categories.category,
        (
          select pg_catalog.count(*)
          from zodiacs_expected_manifest as expected
          where pg_catalog.split_part(expected.line, '|', 1) = categories.category
            and not exists (
              select 1
              from zodiacs_backup_manifest as actual
              where actual.line = expected.line
            )
        ) as category_missing,
        (
          select pg_catalog.count(*)
          from zodiacs_backup_manifest as actual
          where pg_catalog.split_part(actual.line, '|', 1) = categories.category
            and not exists (
              select 1
              from zodiacs_expected_manifest as expected
              where expected.line = actual.line
            )
        ) as category_unexpected
      from (
        select pg_catalog.split_part(expected.line, '|', 1) as category
        from zodiacs_expected_manifest as expected
        union
        select pg_catalog.split_part(actual.line, '|', 1) as category
        from zodiacs_backup_manifest as actual
      ) as categories
      order by categories.category
    loop
      if category_record.category_missing <> 0
         or category_record.category_unexpected <> 0 then
        raise warning
          'Restore manifest category % differs: % expected records missing, % unexpected records found.',
          category_record.category,
          category_record.category_missing,
          category_record.category_unexpected;
      end if;
    end loop;

    raise exception
      'Restore manifest mismatch: % expected records missing, % unexpected records found.',
      missing_count,
      unexpected_count;
  end if;
end;
$manifest_comparison$;

do $constraint_acceptance$
declare
  foreign_key record;
  orphan_count bigint;
begin
  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = constraint_record.connamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
      and not constraint_record.convalidated
  ) then
    raise exception 'Restore left one or more application constraints unvalidated.';
  end if;

  if exists (
    select 1
    from auth.identities as identities
    left join auth.users as users on users.id = identities.user_id
    where users.id is null
  ) then
    raise exception 'Restore left Auth identities without matching Auth users.';
  end if;

  for foreign_key in
    select
      constraint_record.conname,
      constraint_record.conrelid::pg_catalog.regclass::text as child_table,
      constraint_record.confrelid::pg_catalog.regclass::text as parent_table,
      pg_catalog.string_agg(
        pg_catalog.format('child.%I = parent.%I', child_column.attname, parent_column.attname),
        ' and '
        order by key_columns.ordinality
      ) as join_clause,
      pg_catalog.string_agg(
        pg_catalog.format('child.%I is not null', child_column.attname),
        ' and '
        order by key_columns.ordinality
      ) as child_present_clause,
      (pg_catalog.array_agg(parent_column.attname order by key_columns.ordinality))[1]
        as first_parent_column
    from pg_catalog.pg_constraint as constraint_record
    join pg_catalog.pg_namespace as child_namespace
      on child_namespace.oid = constraint_record.connamespace
    -- PostgreSQL's parallel-array UNNEST parser form must be unqualified.
    cross join lateral unnest(
      constraint_record.conkey,
      constraint_record.confkey
    ) with ordinality as key_columns(child_attnum, parent_attnum, ordinality)
    join pg_catalog.pg_attribute as child_column
      on child_column.attrelid = constraint_record.conrelid
      and child_column.attnum = key_columns.child_attnum
    join pg_catalog.pg_attribute as parent_column
      on parent_column.attrelid = constraint_record.confrelid
      and parent_column.attnum = key_columns.parent_attnum
    where constraint_record.contype = 'f'
      and (
        child_namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
        or (
          child_namespace.nspname = 'auth'
          and constraint_record.conrelid in (
            'auth.users'::pg_catalog.regclass,
            'auth.identities'::pg_catalog.regclass
          )
        )
      )
    group by constraint_record.oid, constraint_record.conname,
      constraint_record.conrelid, constraint_record.confrelid
  loop
    execute pg_catalog.format(
      'select pg_catalog.count(*) from %s as child '
      || 'left join %s as parent on %s '
      || 'where %s and parent.%I is null',
      foreign_key.child_table,
      foreign_key.parent_table,
      foreign_key.join_clause,
      foreign_key.child_present_clause,
      foreign_key.first_parent_column
    ) into orphan_count;

    if orphan_count <> 0 then
      raise exception 'Restore left orphaned rows for foreign key %.',
        foreign_key.conname;
    end if;
  end loop;
end;
$constraint_acceptance$;

do $role_acceptance$
begin
  if pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.charts', 'SELECT') then
    raise exception 'Anonymous role can read account-sync tables after restore.';
  end if;

  if not pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     or not pg_catalog.has_table_privilege('authenticated', 'public.charts', 'SELECT') then
    raise exception 'Authenticated role lost account-sync read privileges.';
  end if;

  if not pg_catalog.has_table_privilege('service_role', 'public.profiles', 'SELECT')
     or not pg_catalog.has_table_privilege('service_role', 'public.charts', 'SELECT') then
    raise exception 'Service role lost required account-sync read privileges.';
  end if;

  if (select role.rolbypassrls from pg_catalog.pg_roles as role
      where role.rolname = 'anon')
     or (select role.rolbypassrls from pg_catalog.pg_roles as role
         where role.rolname = 'authenticated')
     or not (select role.rolbypassrls from pg_catalog.pg_roles as role
             where role.rolname = 'service_role') then
    raise exception 'Supabase API role RLS attributes differ from the expected contract.';
  end if;
end;
$role_acceptance$;

select exists(select 1 from public.profiles) as has_profile_fixture
\gset
\if :has_profile_fixture
select profiles.user_id::text as rls_test_user
from public.profiles as profiles
order by profiles.user_id
limit 1
\gset

select pg_catalog.count(*)::text as rls_expected_chart_count
from public.charts as charts
where charts.user_id::text = :'rls_test_user'
\gset
select pg_catalog.set_config(
  'zodiacs.restore.expected_chart_count',
  :'rls_expected_chart_count',
  true
);

set local role authenticated;
set local row_security = on;
select pg_catalog.set_config('request.jwt.claim.sub', :'rls_test_user', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.jsonb_build_object(
    'sub', :'rls_test_user',
    'role', 'authenticated'
  )::text,
  true
);

do $authenticated_rls_probe$
begin
  if (select pg_catalog.count(*) from public.profiles) <> 1 then
    raise exception 'Authenticated RLS probe did not isolate the selected account profile.';
  end if;

  if exists (
    select 1
    from public.charts as charts
    where charts.user_id::text <> pg_catalog.current_setting('request.jwt.claim.sub')
  ) then
    raise exception 'Authenticated RLS probe exposed another account chart.';
  end if;

  if (select pg_catalog.count(*) from public.charts)
     <> pg_catalog.current_setting('zodiacs.restore.expected_chart_count')::bigint then
    raise exception 'Authenticated RLS probe did not expose every chart owned by the selected account.';
  end if;
end;
$authenticated_rls_probe$;
reset role;
\endif
