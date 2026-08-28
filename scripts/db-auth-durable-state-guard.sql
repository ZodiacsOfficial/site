\set ON_ERROR_STOP on

-- This backup deliberately restores only auth.users and auth.identities. MFA
-- enrollment and SSO configuration are durable authentication state, not
-- disposable sessions, so silently omitting either would weaken a recovered
-- account. Refuse the partial Auth boundary whenever one of the currently
-- supported durable tables contains data.
do $auth_durable_state_guard$
declare
  durable_relation record;
  relation_has_rows boolean;
begin
  for durable_relation in
    select relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relkind in ('r', 'p')
      and relation.relname in (
        'mfa_factors',
        'webauthn_credentials',
        'sso_providers',
        'sso_domains',
        'saml_providers',
        'custom_oauth_providers',
        'oauth_clients',
        'oauth_consents'
      )
    order by relation.relname
  loop
    execute pg_catalog.format(
      'select exists(select 1 from auth.%I limit 1)',
      durable_relation.relname
    ) into relation_has_rows;

    if relation_has_rows then
      raise exception
        'Backup refused: durable Auth state exists in auth.%; extend the ordered Auth backup before continuing.',
        durable_relation.relname;
    end if;
  end loop;
end;
$auth_durable_state_guard$;
