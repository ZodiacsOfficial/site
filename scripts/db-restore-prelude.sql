\set ON_ERROR_STOP on

-- The wrapper's preflight proves that this is an empty fresh-project public
-- schema before this transactional reset is allowed to run.
drop schema public;

-- The generated application pre-data section recreates public with the exact
-- source owner, ACL, and comment. Creating a baseline schema here would race
-- that authoritative pg_dump output and make every valid restore fail.
