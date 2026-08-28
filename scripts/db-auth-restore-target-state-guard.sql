\set ON_ERROR_STOP on

-- A restore target may contain Supabase-managed Auth migration/configuration
-- rows, but it must not contain any user, credential, session, challenge, or
-- flow state that this logical backup intentionally does not overwrite. Keep
-- this catalog-driven so a future Auth relation fails closed when it gains a
-- row, instead of silently falling outside a hand-maintained credential list.
do $auth_restore_target_state_guard$
declare
  excluded_relation record;
  relation_has_rows boolean;
begin
  for excluded_relation in
    select relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relkind in ('r', 'p')
      and relation.relname not in (
        'schema_migrations',
        'instances',
        'users',
        'identities'
      )
    order by relation.relname
  loop
    execute pg_catalog.format(
      'select exists(select 1 from auth.%I limit 1)',
      excluded_relation.relname
    ) into relation_has_rows;

    if relation_has_rows then
      raise exception
        'Fresh-project guard refused residual excluded Auth state in auth.%.',
        excluded_relation.relname;
    end if;
  end loop;
end;
$auth_restore_target_state_guard$;
