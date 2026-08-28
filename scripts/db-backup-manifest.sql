\set ON_ERROR_STOP on

-- Build a canonical, content-free acceptance manifest in a temporary table.
-- Row-count lines name their relation for an auditable restore drill. All
-- content and authorization details are represented only by SHA-256 digests,
-- so the manifest never prints user data.
set local timezone = 'UTC';
set local datestyle = 'ISO, YMD';
set local intervalstyle = 'postgres';
set local bytea_output = 'hex';
set local extra_float_digits = 3;
set local search_path = pg_catalog;

insert into zodiacs_application_owners (owner_oid)
select namespace.nspowner
from pg_catalog.pg_namespace as namespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
union
select relation.relowner
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
union
select procedure.proowner
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
union
select type_record.typowner
from pg_catalog.pg_type as type_record
join pg_catalog.pg_namespace as namespace
  on namespace.oid = type_record.typnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations');

insert into zodiacs_backup_manifest (line)
select 'application-owner|' || pg_catalog.encode(
  pg_catalog.convert_to(pg_catalog.pg_get_userbyid(owner_oid)::text, 'UTF8'),
  'hex'
)
from zodiacs_application_owners
order by owner_oid;

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
    where relation.relkind in ('r', 'p', 'm')
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

-- A row count cannot detect swapped owners, changed consent, or damaged
-- ciphertext. Hash every complete application row, sort those row hashes, and
-- fold them into a constant-memory relation digest. jsonb gives deterministic
-- key ordering without ever printing source data into the manifest.
do $application_content_manifest$
declare
  relation_record record;
  row_hash_record record;
  relation_digest bytea;
begin
  for relation_record in
    select namespace.nspname, relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private')
      and relation.relkind in ('r', 'p', 'm')
    order by namespace.nspname, relation.relname
  loop
    relation_digest := pg_catalog.sha256(pg_catalog.convert_to(
      'zodiacs-application-content-v1',
      'UTF8'
    ));

    for row_hash_record in execute pg_catalog.format(
      'select pg_catalog.sha256(pg_catalog.convert_to('
      || 'pg_catalog.to_jsonb(source_row)::text, ''UTF8'')) as row_hash '
      || 'from %I.%I as source_row order by 1',
      relation_record.nspname,
      relation_record.relname
    )
    loop
      relation_digest := pg_catalog.sha256(
        relation_digest OPERATOR(pg_catalog.||) row_hash_record.row_hash
      );
    end loop;

    insert into zodiacs_backup_manifest (line)
    values (
      'application-content|' || relation_record.nspname || '.'
      || relation_record.relname || '|'
      || pg_catalog.encode(relation_digest, 'hex')
    );
  end loop;
end;
$application_content_manifest$;

-- Sequences are not MVCC objects. The exporter appends these sampled values as
-- final setval calls to application-data.sql, so the restored state and this
-- manifest record refer to the same sample rather than pg_dump's earlier one.
do $sequence_state_manifest$
declare
  sequence_record record;
  sequence_last_value text;
  sequence_is_called boolean;
begin
  for sequence_record in
    select namespace.nspname, relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
      and relation.relkind = 'S'
    order by namespace.nspname, relation.relname
  loop
    execute pg_catalog.format(
      'select last_value::text, is_called from %I.%I',
      sequence_record.nspname,
      sequence_record.relname
    ) into sequence_last_value, sequence_is_called;

    insert into zodiacs_backup_manifest (line)
    values (
      'sequence-state|' || sequence_record.nspname || '.'
      || sequence_record.relname || '|' || sequence_last_value || '|'
      || case when sequence_is_called then 't' else 'f' end
    );
  end loop;
end;
$sequence_state_manifest$;

insert into zodiacs_backup_manifest (line)
select 'sequence-definition|' || namespace.nspname || '.' || relation.relname
  || '|' || pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(
      pg_catalog.jsonb_build_array(
        pg_catalog.format_type(sequence_record.seqtypid, null),
        sequence_record.seqstart,
        sequence_record.seqincrement,
        sequence_record.seqmax,
        sequence_record.seqmin,
        sequence_record.seqcache,
        sequence_record.seqcycle
      )::text,
      'UTF8'
    )),
    'hex'
  )
from pg_catalog.pg_sequence as sequence_record
join pg_catalog.pg_class as relation
  on relation.oid = sequence_record.seqrelid
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
order by namespace.nspname, relation.relname;

\ir db-auth-column-contract.sql
insert into zodiacs_backup_manifest (line)
select line
from zodiacs_auth_column_contract;

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
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_array(
            case
              when acl.grantee = 0 then 'PUBLIC'
              else pg_catalog.pg_get_userbyid(acl.grantee)
            end,
            pg_catalog.pg_get_userbyid(acl.grantor),
            acl.privilege_type,
            acl.is_grantable
          )
          order by acl.grantee, acl.grantor, acl.privilege_type, acl.is_grantable
        )
        from pg_catalog.aclexplode(
          coalesce(
            namespace.nspacl,
            pg_catalog.acldefault('n', namespace.nspowner)
          )
        ) as acl
      )
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
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_array(
            case
              when acl.grantee = 0 then 'PUBLIC'
              else pg_catalog.pg_get_userbyid(acl.grantee)
            end,
            pg_catalog.pg_get_userbyid(acl.grantor),
            acl.privilege_type,
            acl.is_grantable
          )
          order by acl.grantee, acl.grantor, acl.privilege_type, acl.is_grantable
        )
        from pg_catalog.aclexplode(
          coalesce(
            relation.relacl,
            pg_catalog.acldefault(
              case
                when relation.relkind = 'S' then 's'::pg_catalog."char"
                else 'r'::pg_catalog."char"
              end,
              relation.relowner
            )
          )
        ) as acl
      )
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
  and not trigger_record.tgisinternal
order by relation.relname, trigger_record.tgname;

-- Constraint-backed internal trigger names contain newly allocated OIDs and
-- cannot survive a logical restore byte-for-byte. Hash every stable semantic
-- field instead, including enabled state, so FK enforcement is still covered.
insert into zodiacs_backup_manifest (line)
select 'internal-trigger|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      child_namespace.nspname,
      child_relation.relname,
      referenced_namespace.nspname,
      referenced_relation.relname,
      constraint_namespace.nspname,
      constraint_record.conname,
      procedure_namespace.nspname,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid),
      trigger_record.tgtype,
      trigger_record.tgenabled,
      trigger_record.tgdeferrable,
      trigger_record.tginitdeferred,
      pg_catalog.encode(trigger_record.tgargs, 'hex'),
      pg_catalog.pg_get_expr(trigger_record.tgqual, trigger_record.tgrelid, true)
    )::text,
    'UTF8'
  )),
  'hex'
)
from pg_catalog.pg_trigger as trigger_record
join pg_catalog.pg_class as child_relation
  on child_relation.oid = trigger_record.tgrelid
join pg_catalog.pg_namespace as child_namespace
  on child_namespace.oid = child_relation.relnamespace
join pg_catalog.pg_proc as procedure
  on procedure.oid = trigger_record.tgfoid
join pg_catalog.pg_namespace as procedure_namespace
  on procedure_namespace.oid = procedure.pronamespace
left join pg_catalog.pg_class as referenced_relation
  on referenced_relation.oid = trigger_record.tgconstrrelid
left join pg_catalog.pg_namespace as referenced_namespace
  on referenced_namespace.oid = referenced_relation.relnamespace
left join pg_catalog.pg_constraint as constraint_record
  on constraint_record.oid = trigger_record.tgconstraint
left join pg_catalog.pg_namespace as constraint_namespace
  on constraint_namespace.oid = constraint_record.connamespace
where child_namespace.nspname in ('public', 'private', 'living_chart_private', 'supabase_migrations')
  and trigger_record.tgisinternal
order by child_namespace.nspname, child_relation.relname,
  constraint_namespace.nspname, constraint_record.conname,
  procedure_namespace.nspname, procedure.proname,
  trigger_record.tgtype;

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
select case
  when default_acl.defaclnamespace = 0
  then 'global-default-acl|' || pg_catalog.encode(
    pg_catalog.convert_to(pg_catalog.pg_get_userbyid(default_acl.defaclrole)::text, 'UTF8'),
    'hex'
  ) || '|'
  else 'default-acl|'
end || pg_catalog.encode(
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
  or (
    default_acl.defaclnamespace = 0
    and default_acl.defaclrole in (
      select owner_oid
      from zodiacs_application_owners
    )
  )
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
