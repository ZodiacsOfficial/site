-- Phase 6 assistant-quota contract tests (disposable PostgreSQL 17 only).
\set ON_ERROR_STOP 1

do $$ begin
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role login;
  end if;
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

-- 1. RLS is on and no policy exists: the browser path has no read or write.
do $$
declare enabled boolean; policy_count integer;
begin
  select relrowsecurity into enabled from pg_class where oid = 'public.assistant_quota'::regclass;
  if not enabled then raise exception 'RLS disabled on assistant_quota'; end if;
  select count(*) into policy_count from pg_policies
    where schemaname = 'public' and tablename = 'assistant_quota';
  if policy_count <> 0 then raise exception 'unexpected policies: %', policy_count; end if;
end $$;

-- 2. anon holds no table privilege and cannot execute the bump.
do $$
begin
  if has_table_privilege('anon', 'public.assistant_quota', 'SELECT')
    or has_table_privilege('anon', 'public.assistant_quota', 'INSERT')
    or has_table_privilege('anon', 'public.assistant_quota', 'UPDATE')
    or has_table_privilege('anon', 'public.assistant_quota', 'DELETE') then
    raise exception 'anon holds a table privilege';
  end if;
  if has_function_privilege('anon', 'public.assistant_quota_bump(text)', 'EXECUTE') then
    raise exception 'anon can execute assistant_quota_bump';
  end if;
  if not has_function_privilege('service_role', 'public.assistant_quota_bump(text)', 'EXECUTE') then
    raise exception 'service_role cannot execute assistant_quota_bump';
  end if;
end $$;

-- 3. The bump counts atomically per day and rejects malformed hashes.
do $$
declare h text := repeat('a', 64); n integer;
begin
  select public.assistant_quota_bump(h) into n;
  if n <> 1 then raise exception 'first bump returned %', n; end if;
  select public.assistant_quota_bump(h) into n;
  if n <> 2 then raise exception 'second bump returned %', n; end if;
  begin
    perform public.assistant_quota_bump('not-a-hash');
    raise exception 'malformed hash accepted';
  exception when others then
    if sqlerrm = 'malformed hash accepted' then raise; end if;
  end;
end $$;

-- 4. Retention: rows older than yesterday disappear on the next bump.
do $$
declare stale integer;
begin
  insert into public.assistant_quota (visitor_hash, quota_day, request_count)
  values (repeat('b', 64), (now() at time zone 'utc')::date - 3, 9);
  perform public.assistant_quota_bump(repeat('c', 64));
  select count(*) into stale from public.assistant_quota
    where quota_day < (now() at time zone 'utc')::date - interval '1 day';
  if stale <> 0 then raise exception 'stale rows survived: %', stale; end if;
end $$;

-- 5. Definer function pins its search path.
do $$
declare cfg text[];
begin
  select proconfig into cfg from pg_proc
    where oid = 'public.assistant_quota_bump(text)'::regprocedure;
  if cfg is null or not (array_to_string(cfg, ';') like '%search_path=public, pg_temp%') then
    raise exception 'search_path not pinned: %', cfg;
  end if;
end $$;

select 'phase6 assistant quota contract OK' as result;
