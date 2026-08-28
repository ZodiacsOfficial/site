\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset pager off

begin isolation level repeatable read read only;
set transaction snapshot :'backup_snapshot';
select namespace.nspname
from pg_catalog.pg_namespace as namespace
where namespace.nspname in ('private', 'living_chart_private')
order by namespace.nspname;
commit;
