\set ON_ERROR_STOP on

begin isolation level repeatable read read only;
set transaction snapshot :'backup_snapshot';
\ir db-auth-durable-state-guard.sql
commit;
