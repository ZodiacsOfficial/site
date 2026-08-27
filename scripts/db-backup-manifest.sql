\set ON_ERROR_STOP on

-- Build a canonical, content-free acceptance manifest in a temporary table.
-- Row-count lines name their relation for an auditable restore drill. All
-- content and authorization details are represented only by SHA-256 digests,
-- so the manifest never prints user data.
set local timezone = 'UTC';
drop table if exists pg_temp.zodiacs_backup_manifest;
create temporary table zodiacs_backup_manifest (
  line text primary key
);

do $manifest$
declare
  relation_record record;
  relation_count bigint;
begin
  for relation_record in
    select namespace.nspname, relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where relation.relkind in ('r', 'p')
      and (
        namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
        or (
          namespace.nspname = 'auth'
          and relation.relname in ('users', 'identities')
        )
      )
    order by namespace.nspname, relation.relname
  loop
    execute pg_catalog.format(
      'select pg_catalog.count(*) from %I.%I',
      relation_record.nspname,
      relation_record.relname
    ) into relation_count;

    insert into zodiacs_backup_manifest (line)
    values (
      'row-count|' || relation_record.nspname || '.' || relation_record.relname
      || '|' || relation_count::text
    );
  end loop;
end;
$manifest$;

insert into zodiacs_backup_manifest (line)
select 'auth-users-content|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    coalesce(pg_catalog.string_agg(
      pg_catalog.to_jsonb(users)::text,
      E'\n'
      order by users.id
    ), ''),
    'UTF8'
  )),
  'hex'
)
from auth.users as users;

insert into zodiacs_backup_manifest (line)
select 'auth-identities-content|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    coalesce(pg_catalog.string_agg(
      pg_catalog.to_jsonb(identities)::text,
      E'\n'
      order by identities.user_id, identities.id::text
    ), ''),
    'UTF8'
  )),
  'hex'
)
from auth.identities as identities;

insert into zodiacs_backup_manifest (line)
select 'migration-history-content|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    coalesce(pg_catalog.string_agg(
      pg_catalog.to_jsonb(migrations)::text,
      E'\n'
      order by pg_catalog.to_jsonb(migrations)::text
    ), ''),
    'UTF8'
  )),
  'hex'
)
from supabase_migrations.schema_migrations as migrations;

insert into zodiacs_backup_manifest (line)
select 'schema-security|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      pg_catalog.pg_get_userbyid(namespace.nspowner),
      case when namespace.nspacl is null then null else (
        select pg_catalog.jsonb_agg(acl::text order by acl::text)
        from pg_catalog.unnest(namespace.nspacl) as acl
      ) end
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_namespace as namespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations');

insert into zodiacs_backup_manifest (line)
select 'relation-security|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      relation.relname,
      relation.relkind,
      pg_catalog.pg_get_userbyid(relation.relowner),
      relation.relrowsecurity,
      relation.relforcerowsecurity,
      relation.relreplident,
      relation.relispopulated,
      pg_catalog.to_jsonb(relation.reloptions),
      case when relation.relacl is null then null else (
        select pg_catalog.jsonb_agg(acl::text order by acl::text)
        from pg_catalog.unnest(relation.relacl) as acl
      ) end
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
  and relation.relkind in ('r', 'p', 'S', 'v', 'm', 'i', 'I')
order by relation.relname;

insert into zodiacs_backup_manifest (line)
select 'column|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      relation.relname,
      attribute.attname,
      attribute.attnum,
      pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
      attribute.attnotnull,
      attribute.attidentity,
      attribute.attgenerated,
      pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid, true),
      pg_catalog.to_jsonb(attribute.attoptions),
      case when attribute.attacl is null then null else (
        select pg_catalog.jsonb_agg(acl::text order by acl::text)
        from pg_catalog.unnest(attribute.attacl) as acl
      ) end
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_attribute as attribute
join pg_catalog.pg_class as relation
  on relation.oid = attribute.attrelid
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
left join pg_catalog.pg_attrdef as default_value
  on default_value.adrelid = attribute.attrelid
  and default_value.adnum = attribute.attnum
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
  and relation.relkind in ('r', 'p', 'v', 'm')
  and attribute.attnum > 0
  and not attribute.attisdropped
order by relation.relname, attribute.attnum;

insert into zodiacs_backup_manifest (line)
select 'index|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      index_relation.oid::pg_catalog.regclass::text,
      index_record.indisunique,
      index_record.indisprimary,
      index_record.indisexclusion,
      index_record.indimmediate,
      index_record.indisreplident,
      index_record.indisvalid,
      pg_catalog.pg_get_indexdef(index_relation.oid)
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_index as index_record
join pg_catalog.pg_class as index_relation
  on index_relation.oid = index_record.indexrelid
join pg_catalog.pg_namespace as namespace
  on namespace.oid = index_relation.relnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by index_relation.relname;

insert into zodiacs_backup_manifest (line)
select 'trigger|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      trigger_record.tgrelid::pg_catalog.regclass::text,
      trigger_record.tgname,
      trigger_record.tgenabled,
      trigger_record.tgisinternal,
      trigger_record.tgdeferrable,
      trigger_record.tginitdeferred,
      pg_catalog.pg_get_triggerdef(trigger_record.oid, true)
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_trigger as trigger_record
join pg_catalog.pg_class as relation
  on relation.oid = trigger_record.tgrelid
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by relation.relname, trigger_record.tgname;

insert into zodiacs_backup_manifest (line)
select 'constraint|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      constraint_record.conrelid::pg_catalog.regclass::text,
      constraint_record.conname,
      constraint_record.contype,
      constraint_record.convalidated,
      pg_catalog.pg_get_constraintdef(constraint_record.oid, true)
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_constraint as constraint_record
join pg_catalog.pg_namespace as namespace
  on namespace.oid = constraint_record.connamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by constraint_record.conrelid::pg_catalog.regclass::text,
  constraint_record.conname;

insert into zodiacs_backup_manifest (line)
select 'policy|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      policy.schemaname,
      policy.tablename,
      policy.policyname,
      policy.permissive,
      policy.roles,
      policy.cmd,
      coalesce(policy.qual, ''),
      coalesce(policy.with_check, '')
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_policies as policy
where policy.schemaname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by policy.tablename, policy.policyname;

insert into zodiacs_backup_manifest (line)
select 'routine-security|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid),
      procedure.prokind,
      procedure.prosecdef,
      pg_catalog.pg_get_userbyid(procedure.proowner),
      coalesce(pg_catalog.to_jsonb(procedure.proconfig), '[]'::jsonb),
      case
        when procedure.prokind in ('f', 'p')
        then pg_catalog.pg_get_functiondef(procedure.oid)
        else null
      end,
      case when procedure.proacl is null then null else (
        select pg_catalog.jsonb_agg(acl::text order by acl::text)
        from pg_catalog.unnest(procedure.proacl) as acl
      ) end
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by procedure.proname,
  pg_catalog.pg_get_function_identity_arguments(procedure.oid);

insert into zodiacs_backup_manifest (line)
select 'default-acl|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      pg_catalog.pg_get_userbyid(default_acl.defaclrole),
      coalesce(namespace.nspname, '*'),
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
left join pg_catalog.pg_namespace as namespace
  on namespace.oid = default_acl.defaclnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by default_acl.defaclrole, default_acl.defaclnamespace,
  default_acl.defaclobjtype;

insert into zodiacs_backup_manifest (line)
select 'role-contract|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.to_jsonb(role_record)::text,
    'UTF8'
  )),
  'hex'
)
from (
  select role.rolname, role.rolsuper, role.rolinherit, role.rolcreaterole,
    role.rolcreatedb, role.rolcanlogin, role.rolreplication,
    role.rolbypassrls, role.rolconfig
  from pg_catalog.pg_roles as role
  where role.rolname in ('anon', 'authenticated', 'service_role')
  order by role.rolname
) as role_record;

insert into zodiacs_backup_manifest (line)
select 'effective-table-privileges|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      grantee.rolname,
      namespace.nspname,
      relation.relname,
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'SELECT'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'INSERT'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'UPDATE'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'DELETE'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'TRUNCATE'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'REFERENCES'),
      pg_catalog.has_table_privilege(grantee.rolname, relation.oid, 'TRIGGER')
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_roles as grantee
cross join pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where grantee.rolname in ('anon', 'authenticated', 'service_role')
  and namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
  and relation.relkind in ('r', 'p', 'v', 'm')
order by grantee.rolname, relation.relname;

insert into zodiacs_backup_manifest (line)
select 'effective-routine-privileges|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      grantee.rolname,
      namespace.nspname,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid),
      pg_catalog.has_function_privilege(grantee.rolname, procedure.oid, 'EXECUTE')
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_roles as grantee
cross join pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where grantee.rolname in ('anon', 'authenticated', 'service_role')
  and namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by grantee.rolname, procedure.proname,
  pg_catalog.pg_get_function_identity_arguments(procedure.oid);

insert into zodiacs_backup_manifest (line)
select 'effective-sequence-privileges|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      grantee.rolname,
      namespace.nspname,
      relation.relname,
      pg_catalog.has_sequence_privilege(grantee.rolname, relation.oid, 'USAGE'),
      pg_catalog.has_sequence_privilege(grantee.rolname, relation.oid, 'SELECT'),
      pg_catalog.has_sequence_privilege(grantee.rolname, relation.oid, 'UPDATE')
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_roles as grantee
cross join pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where grantee.rolname in ('anon', 'authenticated', 'service_role')
  and namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
  and relation.relkind = 'S'
order by grantee.rolname, relation.relname;
