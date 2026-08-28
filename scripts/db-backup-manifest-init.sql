\set ON_ERROR_STOP on

-- PostgreSQL permits writes to temporary tables in a read-only transaction,
-- but the tables themselves must exist before that transaction begins. The
-- snapshot manifest therefore initializes its scratch space first, then
-- imports the exported read-only snapshot.
create temporary table zodiacs_backup_manifest (
  line text primary key
);

create temporary table zodiacs_application_owners (
  owner_oid oid primary key
);

create temporary table zodiacs_auth_column_contract (
  line text primary key
);
