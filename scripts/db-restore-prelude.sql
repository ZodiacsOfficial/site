\set ON_ERROR_STOP on

-- The wrapper's preflight proves that this is an empty fresh-project public
-- schema before this transactional reset is allowed to run.
drop schema public;

-- PostgreSQL treats public as an initdb-created schema, so pg_dump deliberately
-- does not emit CREATE SCHEMA for it. Recreate the PostgreSQL 15+ baseline that
-- pg_dump expects; generated owner/ACL/comment deltas then replay the source
-- project's exact contract.
create schema public authorization pg_database_owner;
grant usage on schema public to public;
comment on schema public is 'standard public schema';
