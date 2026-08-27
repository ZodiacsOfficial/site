\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset pager off

begin isolation level repeatable read read only;
set transaction snapshot :'backup_snapshot';
\ir db-backup-manifest.sql
select line
from zodiacs_backup_manifest
order by line;
commit;
