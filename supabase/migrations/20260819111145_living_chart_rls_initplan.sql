-- Put the authenticated JWT lookup in Supabase's canonical RLS initplan shape.
-- Keeping the JSON operator outside the scalar subquery preserves the policy
-- semantics while satisfying the auth_rls_initplan advisor.

alter policy living_chart_sync_consents_select_own
on public.living_chart_sync_consents
using (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
);

alter policy living_chart_moments_select_current_epoch
on public.living_chart_moments
using (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
  and exists (
    select 1
    from public.living_chart_sync_consents as consent
    where consent.user_id = living_chart_moments.user_id
      and consent.state = 'granted'
      and consent.consent_epoch = living_chart_moments.consent_epoch
  )
);
