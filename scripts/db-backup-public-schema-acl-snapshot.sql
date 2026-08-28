\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset pager off

begin isolation level repeatable read read only;
set transaction snapshot :'backup_snapshot';

-- pg_dump treats the initdb-created public schema specially and does not emit
-- its baseline ACL. Generate an explicit, safely quoted replay section from
-- the same exported snapshot so a restore cannot silently remove API access.
select statement
from (
  select 0 as statement_order,
    'revoke all privileges on schema public from public;' as statement
  union all
  select 1,
    pg_catalog.format(
      'revoke all privileges on schema public from %I;',
      pg_catalog.pg_get_userbyid(acl.grantee)
    )
  from pg_catalog.pg_namespace as namespace
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner)
    )
  ) as acl
  where namespace.nspname = 'public'
    and acl.grantee <> 0
    and acl.grantee <> namespace.nspowner
  group by acl.grantee
  union all
  select 2,
    pg_catalog.format(
      E'set role %I;\ngrant %s on schema public to %s%s;\nreset role;',
      pg_catalog.pg_get_userbyid(acl.grantor),
      case acl.privilege_type
        when 'CREATE' then 'CREATE'
        when 'USAGE' then 'USAGE'
      end,
      case
        when acl.grantee = 0 then 'PUBLIC'
        else pg_catalog.format('%I', pg_catalog.pg_get_userbyid(acl.grantee))
      end,
      case when acl.is_grantable then ' with grant option' else '' end
    )
  from pg_catalog.pg_namespace as namespace
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner)
    )
  ) as acl
  where namespace.nspname = 'public'
    and acl.privilege_type in ('CREATE', 'USAGE')
) as statements
order by statement_order, statement;

commit;
