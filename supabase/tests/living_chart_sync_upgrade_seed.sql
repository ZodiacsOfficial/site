\set ON_ERROR_STOP on

-- Simulate executable overloads from pre-release iterations. Replaying the
-- final migration must remove these objects and their authenticated grants.
create or replace function public.living_chart_sync_snapshot(bigint)
returns jsonb
language sql
as $$ select '{"legacy":true}'::jsonb $$;

create or replace function public.set_living_chart_sync_consent(text, uuid, text)
returns jsonb
language sql
as $$ select '{"legacy":true}'::jsonb $$;

create or replace function public.set_living_chart_sync_consent(text, uuid, bigint)
returns jsonb
language sql
as $$ select '{"legacy":true}'::jsonb $$;

create or replace function living_chart_private.set_living_chart_sync_consent_impl(
  text, uuid, text
)
returns jsonb
language sql
as $$ select '{"legacy":true}'::jsonb $$;

create or replace function living_chart_private.set_living_chart_sync_consent_impl(
  text, uuid, bigint
)
returns jsonb
language sql
as $$ select '{"legacy":true}'::jsonb $$;

create or replace function living_chart_private.living_chart_record_mutation(
  uuid, uuid, text, text, jsonb
)
returns void
language plpgsql
as $$ begin null; end $$;

grant execute on function public.living_chart_sync_snapshot(bigint)
  to authenticated;
grant execute on function public.set_living_chart_sync_consent(text, uuid, text)
  to authenticated;
grant execute on function public.set_living_chart_sync_consent(text, uuid, bigint)
  to authenticated;
grant execute on function living_chart_private.set_living_chart_sync_consent_impl(
  text, uuid, text
) to authenticated;
grant execute on function living_chart_private.set_living_chart_sync_consent_impl(
  text, uuid, bigint
) to authenticated;
grant execute on function living_chart_private.living_chart_record_mutation(
  uuid, uuid, text, text, jsonb
) to authenticated;

-- Supabase projects may carry broad service-role default table privileges.
-- Replaying the final migration must scrub those grants before restoring the
-- intentionally narrow contract for both exposed and private tables.
grant all privileges on table public.living_chart_sync_consents to service_role;
grant all privileges on table public.living_chart_moments to service_role;
grant all privileges on table living_chart_private.living_chart_mutations to service_role;
grant all privileges on table living_chart_private.living_chart_runtime_settings to service_role;
