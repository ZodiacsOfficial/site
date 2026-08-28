\set ON_ERROR_STOP on

-- A data-only COPY is safe only when the fresh project's managed Auth tables
-- have the same physical input contract as the source. Keep these records
-- content-free and compare them before the restore resets the public schema.
insert into zodiacs_auth_column_contract (line)
select 'auth-column|' || relation.relname || '|' || pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array(
      relation.relname,
      attribute.attname,
      attribute.attnum,
      pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
      attribute.attnotnull,
      attribute.attidentity,
      attribute.attgenerated,
      pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid, true),
      collation_record.collname
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
left join pg_catalog.pg_collation as collation_record
  on collation_record.oid = attribute.attcollation
  and attribute.attcollation <> 0
where namespace.nspname = 'auth'
  and relation.relname in ('users', 'identities')
  and relation.relkind in ('r', 'p')
  and attribute.attnum > 0
  and not attribute.attisdropped
order by relation.relname, attribute.attnum;
