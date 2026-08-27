create table if not exists public.weekly_digest_unsubscribe_tokens (
  token_hash text primary key
    check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index if not exists weekly_digest_unsubscribe_tokens_user_idx
  on public.weekly_digest_unsubscribe_tokens (user_id);

create index if not exists weekly_digest_unsubscribe_tokens_expiry_idx
  on public.weekly_digest_unsubscribe_tokens (expires_at)
  where used_at is null;

alter table public.weekly_digest_unsubscribe_tokens enable row level security;

revoke all on table public.weekly_digest_unsubscribe_tokens
  from public, anon, authenticated, service_role;
grant select, insert, delete on table public.weekly_digest_unsubscribe_tokens
  to service_role;

create or replace function public.weekly_digest_unsubscribe_v1(candidate_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_owner uuid;
  token_used_at timestamptz;
  profile_digest_opt_in boolean;
  candidate_hash text;
begin
  if candidate_token is null
    or candidate_token !~ '^[A-Za-z0-9_-]{43}$'
  then
    return false;
  end if;

  candidate_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(candidate_token, 'UTF8')),
    'hex'
  );

  -- Resolve the bearer first without a lock, then serialize all capabilities
  -- for one account on its profile row. Locking a per-token row first would
  -- deadlock when two different links for the same account arrive together.
  select tokens.user_id
  into token_owner
  from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.token_hash = candidate_hash
    and (tokens.used_at is not null or tokens.expires_at > pg_catalog.statement_timestamp());

  if not found then
    return false;
  end if;

  select profiles.digest_opt_in
  into profile_digest_opt_in
  from public.profiles as profiles
  where profiles.user_id = token_owner
  for update;

  if not found then
    return false;
  end if;

  -- Revalidate under the account lock in case expiry pruning or a concurrent
  -- unsubscribe changed this capability after the first lookup.
  select tokens.used_at
  into token_used_at
  from public.weekly_digest_unsubscribe_tokens as tokens
  where tokens.token_hash = candidate_hash
    and tokens.user_id = token_owner
    and (tokens.used_at is not null or tokens.expires_at > pg_catalog.statement_timestamp())
  for update;

  if not found then
    return false;
  end if;

  -- A retry after a lost HTTP response is successful while the preference is
  -- still off. It cannot revoke a later opt-in: only the first use mutates.
  if token_used_at is not null then
    return not profile_digest_opt_in;
  end if;

  update public.profiles
  set digest_opt_in = false,
      updated_at = pg_catalog.statement_timestamp()
  where user_id = token_owner;

  update public.weekly_digest_unsubscribe_tokens
  set used_at = pg_catalog.statement_timestamp()
  where user_id = token_owner
    and used_at is null;

  return true;
end;
$$;

alter function public.weekly_digest_unsubscribe_v1(text) owner to postgres;
revoke all on function public.weekly_digest_unsubscribe_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.weekly_digest_unsubscribe_v1(text)
  to anon, authenticated, service_role;
