-- Phase 6 — Ask Zodiacs daily quota.
--
-- One privacy-preserving row per (salted visitor hash, UTC day). The
-- browser never touches this table: RLS is enabled with zero policies,
-- every public grant is revoked, and the only write path is the
-- definer function below, executable by the service role alone.
-- Rows self-expire: each bump deletes anything older than two days, so
-- the table never accumulates a visitor history.

create table if not exists public.assistant_quota (
  visitor_hash text not null,
  quota_day date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0,
  constraint assistant_quota_pkey primary key (visitor_hash, quota_day),
  constraint assistant_quota_hash_shape check (visitor_hash ~ '^[0-9a-f]{64}$'),
  constraint assistant_quota_count_sane check (request_count between 0 and 10000)
);

alter table public.assistant_quota enable row level security;

revoke all on table public.assistant_quota from public;
revoke all on table public.assistant_quota from anon;
revoke all on table public.assistant_quota from authenticated;

create or replace function public.assistant_quota_bump(visitor_hash text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'utc')::date;
  new_count integer;
begin
  if assistant_quota_bump.visitor_hash is null or assistant_quota_bump.visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'assistant_quota_bump: malformed visitor hash';
  end if;

  delete from public.assistant_quota
  where quota_day < today - interval '1 day';

  insert into public.assistant_quota as q (visitor_hash, quota_day, request_count)
  values (assistant_quota_bump.visitor_hash, today, 1)
  on conflict (visitor_hash, quota_day)
  do update set request_count = q.request_count + 1
  returning q.request_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.assistant_quota_bump(text) from public;
revoke all on function public.assistant_quota_bump(text) from anon;
revoke all on function public.assistant_quota_bump(text) from authenticated;
grant execute on function public.assistant_quota_bump(text) to service_role;
