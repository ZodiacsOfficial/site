\set ON_ERROR_STOP on

-- Auth rows have internal trigger dependencies in a Supabase-managed schema.
-- Bypass those triggers only while restoring users and identities; the
-- acceptance phase checks their foreign-key linkage before commit.
set local session_replication_role = replica;
