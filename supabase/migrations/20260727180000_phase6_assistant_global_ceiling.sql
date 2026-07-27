-- Phase 6 — service-wide daily ceiling for the assistant.
--
-- The per-visitor bump alone cannot bound provider spend: the endpoint's
-- origin check is a browser convenience rather than an authentication
-- boundary, and a caller holding an address range mints one fresh visitor
-- budget per bucket. This function returns the visitor's count for the day
-- AND the service's total for the day in a single atomic round trip, so the
-- endpoint can rest the service once the day's budget is spent.
--
-- The v1 function stays in place, unchanged and still service-role-only,
-- so a rollback needs no migration.

create or replace function public.assistant_quota_bump_v2(visitor_hash text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'utc')::date;
  new_count integer;
  day_total bigint;
begin
  if assistant_quota_bump_v2.visitor_hash is null
     or assistant_quota_bump_v2.visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'assistant_quota_bump_v2: malformed visitor hash';
  end if;

  delete from public.assistant_quota
  where quota_day < today - interval '1 day';

  insert into public.assistant_quota as q (visitor_hash, quota_day, request_count)
  values (assistant_quota_bump_v2.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = q.request_count + 1
  returning q.request_count into new_count;

  select coalesce(sum(request_count), 0)
  into day_total
  from public.assistant_quota
  where quota_day = today;

  return json_build_object('visitor', new_count, 'global', day_total);
end;
$$;

revoke all on function public.assistant_quota_bump_v2(text) from public;
revoke all on function public.assistant_quota_bump_v2(text) from anon;
revoke all on function public.assistant_quota_bump_v2(text) from authenticated;
grant execute on function public.assistant_quota_bump_v2(text) to service_role;
