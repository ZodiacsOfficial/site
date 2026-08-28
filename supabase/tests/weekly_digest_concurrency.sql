\set ON_ERROR_STOP on

-- Disposable PostgreSQL-only race coverage. Each dblink connection is an
-- independent session, so these assertions exercise real row/advisory locks.
create extension if not exists dblink;
alter table auth.users add column if not exists email text;

create or replace function pg_temp.assert_weekly(ok boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'weekly concurrency assertion failed: %', message;
  end if;
end;
$$;

create or replace function pg_temp.weekly_raw_hash(candidate_token text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(candidate_token, 'UTF8')),
    'hex'
  );
$$;

create or replace function pg_temp.weekly_key(candidate_user uuid)
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select 'weekly-digest-v1/' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('weekly-digest-v1', 'UTF8')
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(
        pg_catalog.date_trunc(
          'week', pg_catalog.statement_timestamp() at time zone 'UTC'
        )::date::text,
        'UTF8'
      )
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(pg_catalog.lower(candidate_user::text), 'UTF8')
    ),
    'hex'
  );
$$;

create or replace function pg_temp.weekly_reserve_fixture(
  candidate_user uuid,
  candidate_lease uuid,
  candidate_hash text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.weekly_digest_issue_v1(
    pg_catalog.date_trunc(
      'week', pg_catalog.statement_timestamp() at time zone 'UTC'
    )::date,
    candidate_user,
    candidate_lease,
    candidate_hash,
    pg_catalog.statement_timestamp() + interval '30 days'
  ) then
    raise exception 'weekly concurrency reservation fixture failed for %', candidate_user;
  end if;
end;
$$;

create or replace function pg_temp.weekly_dispatch_fixture(
  candidate_user uuid,
  candidate_lease uuid,
  candidate_hash text,
  envelope_character text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  content jsonb;
begin
  perform pg_temp.weekly_reserve_fixture(
    candidate_user, candidate_lease, candidate_hash
  );
  content := public.weekly_digest_content_v1(candidate_user, 5);
  if not public.weekly_digest_authorized_v1(
    pg_catalog.date_trunc(
      'week', pg_catalog.statement_timestamp() at time zone 'UTC'
    )::date,
    candidate_user,
    candidate_lease,
    pg_temp.weekly_key(candidate_user),
    pg_catalog.repeat(envelope_character, 64),
    content ->> 'digest',
    'wd1.' || pg_catalog.repeat(envelope_character, 80),
    5
  ) then
    raise exception 'weekly concurrency dispatch fixture failed for %', candidate_user;
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('12000000-0000-4000-8000-000000000001', 'race-1@example.com'),
  ('12000000-0000-4000-8000-000000000002', 'race-2@example.com'),
  ('12000000-0000-4000-8000-000000000003', 'race-3@example.com'),
  ('12000000-0000-4000-8000-000000000004', 'race-4@example.com'),
  ('12000000-0000-4000-8000-000000000005', 'race-5@example.com'),
  ('12000000-0000-4000-8000-000000000006', 'race-6@example.com'),
  ('12000000-0000-4000-8000-000000000007', 'race-7@example.com'),
  ('12000000-0000-4000-8000-000000000008', 'race-8@example.com'),
  ('12000000-0000-4000-8000-000000000009', 'race-9@example.com'),
  ('12000000-0000-4000-8000-000000000010', 'race-10@example.com'),
  ('12000000-0000-4000-8000-000000000011', 'race-11@example.com'),
  ('12000000-0000-4000-8000-000000000012', 'race-12@example.com'),
  ('12000000-0000-4000-8000-000000000013', 'race-13@example.com'),
  ('12000000-0000-4000-8000-000000000014', 'race-14@example.com'),
  ('12000000-0000-4000-8000-000000000015', 'race-15@example.com'),
  ('12000000-0000-4000-8000-000000000016', 'race-16@example.com'),
  ('12000000-0000-4000-8000-000000000017', 'race-17@example.com'),
  ('12000000-0000-4000-8000-000000000018', 'race-18@example.com')
on conflict (id) do update set email = excluded.email;

insert into public.profiles (user_id, digest_opt_in)
select users.id, true
from auth.users as users
where users.id::text like '12000000-0000-4000-8000-%'
on conflict (user_id) do update set digest_opt_in = true;

insert into public.charts (id, user_id, payload, created_at, updated_at)
select
  ('12100000-0000-4000-8000-' || pg_catalog.lpad(account_number::text, 12, '0'))::uuid,
  ('12000000-0000-4000-8000-' || pg_catalog.lpad(account_number::text, 12, '0'))::uuid,
  pg_catalog.jsonb_build_object(
    'name', 'Race chart ' || account_number::text,
    'summary', pg_catalog.jsonb_build_object(
      'bodies', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('body', 'Sun', 'lon', 42.0)
      )
    )
  ),
  pg_catalog.statement_timestamp(),
  pg_catalog.statement_timestamp()
from pg_catalog.generate_series(1, 18) as accounts(account_number)
on conflict (id) do update set payload = excluded.payload, updated_at = excluded.updated_at;

delete from public.weekly_digest_unsubscribe_tokens
where user_id::text like '12000000-0000-4000-8000-%';
delete from public.weekly_digest_deliveries
where user_id::text like '12000000-0000-4000-8000-%';

select dblink_connect('weekly_race_a', format('dbname=%L user=%L', current_database(), current_user));
select dblink_connect('weekly_race_b', format('dbname=%L user=%L', current_database(), current_user));
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_exec('weekly_race_a', 'set statement_timeout = ''5s''');
select dblink_exec('weekly_race_b', 'set statement_timeout = ''5s''');

-- issue/issue: the profile lock and account/week primary key admit one lease.
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_issue_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      pg_catalog.repeat('1', 64),
      pg_catalog.statement_timestamp() + interval '30 days'
    ) then raise exception 'first issue failed'; end if;
  end $block$;$$
);
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000002',
    pg_catalog.repeat('2', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'competing issue did not wait on the account lock'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  not value,
  'competing issue obtained a second account/week lease'
)
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

-- issue then unsubscribe: unsubscribe waits, then cancels the committed
-- reservation and frees its slot. The click uses a still-valid prior-edition
-- capability, which is externally visible before the new issue transaction.
insert into public.weekly_digest_unsubscribe_tokens (
  token_hash, user_id, week_start, lease_token, expires_at
) values (
  pg_temp.weekly_raw_hash('IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII'),
  '12000000-0000-4000-8000-000000000002',
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date - 7,
  '22000000-0000-4000-8000-000000000013',
  pg_catalog.statement_timestamp() + interval '30 days'
);
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $sql$do $block$ begin
      if not public.weekly_digest_issue_v1(
        pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
        '12000000-0000-4000-8000-000000000002',
        '22000000-0000-4000-8000-000000000003',
        pg_catalog.repeat('3', 64),
        pg_catalog.statement_timestamp() + interval '30 days'
      ) then raise exception 'issue-before-unsubscribe failed'; end if;
    end $block$;$sql$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role anon');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_unsubscribe_v1(
    'IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'unsubscribe did not wait behind issuance'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(value, 'unsubscribe lost after issue committed')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  exists (
    select 1 from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000002'
      and status = 'cancelled' and slot is null
  ),
  'issue-first reservation was not cancelled'
);

-- Unsubscribe then issue: holding the profile lock first makes issuance observe
-- the revoked preference and fail closed.
update public.profiles set digest_opt_in = true
where user_id = '12000000-0000-4000-8000-000000000003';
insert into public.weekly_digest_unsubscribe_tokens (
  token_hash, user_id, week_start, lease_token, expires_at
) values (
  pg_temp.weekly_raw_hash('UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU'),
  '12000000-0000-4000-8000-000000000003',
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
  '22000000-0000-4000-8000-000000000004',
  pg_catalog.statement_timestamp() + interval '30 days'
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role anon');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_unsubscribe_v1(
      'UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU'
    ) then raise exception 'unsubscribe-first failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000005',
    pg_catalog.repeat('5', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'issuance did not wait behind unsubscribe'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'issue succeeded after unsubscribe')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

-- authorize then unsubscribe: authorization wins the lock and creates the
-- in-flight fence; unsubscribe subsequently records cancel_requested_at.
update public.profiles set digest_opt_in = true
where user_id = '12000000-0000-4000-8000-000000000004';
set role service_role;
select public.weekly_digest_issue_v1(
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
  '12000000-0000-4000-8000-000000000004',
  '22000000-0000-4000-8000-000000000006',
  pg_temp.weekly_raw_hash('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB'),
  pg_catalog.statement_timestamp() + interval '30 days'
);
reset role;
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  format(
    $sql$do $block$ declare content jsonb; begin
      content := public.weekly_digest_content_v1(
        '12000000-0000-4000-8000-000000000004', 5
      );
      if not public.weekly_digest_authorized_v1(
        pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
        '12000000-0000-4000-8000-000000000004',
        '22000000-0000-4000-8000-000000000006',
        %L,
        pg_catalog.repeat('a', 64),
        content ->> 'digest',
        'wd1.' || pg_catalog.repeat('C', 80),
        5
      ) then raise exception 'authorize-first failed'; end if;
    end $block$;$sql$,
    pg_temp.weekly_key('12000000-0000-4000-8000-000000000004')
  )
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role anon');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_unsubscribe_v1(
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'unsubscribe did not wait behind authorization'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(value, 'unsubscribe failed after authorization')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  exists (
    select 1 from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000004'
      and status = 'dispatching'
      and cancel_requested_at is not null
  ),
  'authorized dispatch lost its in-flight cancellation marker'
);

-- unsubscribe then authorize: authorization waits and then fails the final
-- consent check without crossing the provider fence.
update public.profiles set digest_opt_in = true
where user_id = '12000000-0000-4000-8000-000000000005';
set role service_role;
select public.weekly_digest_issue_v1(
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
  '12000000-0000-4000-8000-000000000005',
  '22000000-0000-4000-8000-000000000007',
  pg_temp.weekly_raw_hash('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ'),
  pg_catalog.statement_timestamp() + interval '30 days'
);
reset role;
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role anon');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_unsubscribe_v1(
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ'
    ) then raise exception 'unsubscribe-before-authorize failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  format(
    $sql$select public.weekly_digest_authorized_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000005',
      '22000000-0000-4000-8000-000000000007',
      %L,
      pg_catalog.repeat('b', 64),
      (public.weekly_digest_content_v1(
        '12000000-0000-4000-8000-000000000005', 5
      ) ->> 'digest'),
      'wd1.' || pg_catalog.repeat('D', 80),
      5
    )$sql$,
    pg_temp.weekly_key('12000000-0000-4000-8000-000000000005')
  )
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'authorization did not wait behind unsubscribe'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'authorization succeeded after unsubscribe')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

-- Stale lease reclaim invalidates the old lease without creating a second row.
update public.profiles set digest_opt_in = true
where user_id = '12000000-0000-4000-8000-000000000003';
set role service_role;
select pg_temp.assert_weekly(
  public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000009',
    pg_catalog.repeat('9', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  ),
  'stale-reclaim fixture was not reserved'
);
reset role;
update public.weekly_digest_deliveries
set reserved_at = pg_catalog.statement_timestamp() - interval '31 minutes',
    updated_at = pg_catalog.statement_timestamp() - interval '31 minutes'
where user_id = '12000000-0000-4000-8000-000000000003';
set role service_role;
select pg_temp.assert_weekly(
  public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000010',
    pg_catalog.repeat('8', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  ),
  'stale reservation was not reclaimed'
);
select pg_temp.assert_weekly(
  not public.weekly_digest_cancel_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000009'
  ),
  'superseded lease still controlled the delivery'
);
reset role;

-- stale reclaim/reclaim: once one contender refreshes the stale lease, the
-- waiter must observe the new reservation and must not supersede it again.
set role service_role;
select pg_temp.assert_weekly(
  public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000006',
    '22000000-0000-4000-8000-000000000020',
    pg_catalog.repeat('6', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  ),
  'concurrent stale-reclaim fixture was not reserved'
);
reset role;
update public.weekly_digest_deliveries
set reserved_at = pg_catalog.statement_timestamp() - interval '31 minutes',
    updated_at = pg_catalog.statement_timestamp() - interval '31 minutes'
where user_id = '12000000-0000-4000-8000-000000000006';
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_issue_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000006',
      '22000000-0000-4000-8000-000000000021',
      pg_catalog.repeat('a', 64),
      pg_catalog.statement_timestamp() + interval '30 days'
    ) then raise exception 'first stale reclaimer failed'; end if;
  end $block$;$$
);
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000006',
    '22000000-0000-4000-8000-000000000022',
    pg_catalog.repeat('b', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'second stale reclaimer did not wait on the account lock'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  not value,
  'second stale reclaimer superseded the refreshed lease'
)
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  exists (
    select 1
    from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000006'
      and status = 'reserved'
      and lease_token = '22000000-0000-4000-8000-000000000021'
  ),
  'winning stale-reclaim lease was not retained'
);
select pg_temp.assert_weekly(
  (
    select pg_catalog.count(*) = 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000006'
      and token_hash = pg_catalog.repeat('a', 64)
      and lease_token = '22000000-0000-4000-8000-000000000021'
  ),
  'stale reclaim did not leave exactly the winning capability'
);

-- cancel/unsubscribe: a click from a prior sent edition waits behind current
-- reservation cancellation, then still revokes the profile without deadlock.
insert into public.weekly_digest_unsubscribe_tokens (
  token_hash, user_id, week_start, lease_token, expires_at
) values (
  pg_temp.weekly_raw_hash(pg_catalog.repeat('C', 43)),
  '12000000-0000-4000-8000-000000000007',
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date - 7,
  '22000000-0000-4000-8000-000000000123',
  pg_catalog.statement_timestamp() + interval '30 days'
);
set role service_role;
select pg_temp.assert_weekly(
  public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000007',
    '22000000-0000-4000-8000-000000000023',
    pg_temp.weekly_raw_hash('current-cancel-reservation-7'),
    pg_catalog.statement_timestamp() + interval '30 days'
  ),
  'cancel/unsubscribe fixture was not reserved'
);
reset role;
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_cancel_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000007',
      '22000000-0000-4000-8000-000000000023'
    ) then raise exception 'cancel-before-unsubscribe failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role anon');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_unsubscribe_v1(pg_catalog.repeat('C', 43))$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'unsubscribe did not wait behind cancellation'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(value, 'visible capability lost to concurrent cancellation')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  exists (
    select 1
    from public.profiles
    where user_id = '12000000-0000-4000-8000-000000000007'
      and digest_opt_in = false
  ),
  'concurrent cancel/unsubscribe did not revoke the profile'
);
select pg_temp.assert_weekly(
  exists (
    select 1
    from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000007'
      and status = 'cancelled'
      and lease_token is null
  ),
  'concurrent cancel/unsubscribe did not retain cancellation'
);
select pg_temp.assert_weekly(
  not exists (
    select 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000007'
      and week_start = pg_catalog.date_trunc(
        'week', pg_catalog.statement_timestamp() at time zone 'UTC'
      )::date
  ) and exists (
    select 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000007'
      and lease_token = '22000000-0000-4000-8000-000000000123'
      and used_at is not null
  ),
  'cancel/unsubscribe capability association drifted'
);

-- prune/unsubscribe: pruning a stale reservation holds the delivery/token
-- locks while a prior-edition click waits, then the click revokes consent.
insert into public.weekly_digest_unsubscribe_tokens (
  token_hash, user_id, week_start, lease_token, expires_at
) values (
  pg_temp.weekly_raw_hash(pg_catalog.repeat('P', 43)),
  '12000000-0000-4000-8000-000000000008',
  pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date - 7,
  '22000000-0000-4000-8000-000000000124',
  pg_catalog.statement_timestamp() + interval '30 days'
);
set role service_role;
select pg_temp.assert_weekly(
  public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000008',
    '22000000-0000-4000-8000-000000000024',
    pg_temp.weekly_raw_hash('current-prune-reservation-8'),
    pg_catalog.statement_timestamp() + interval '30 days'
  ),
  'prune/unsubscribe fixture was not reserved'
);
reset role;
update public.weekly_digest_deliveries
set reserved_at = pg_catalog.statement_timestamp() - interval '31 minutes',
    updated_at = pg_catalog.statement_timestamp() - interval '31 minutes'
where user_id = '12000000-0000-4000-8000-000000000008';
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ declare changed integer; begin
    changed := public.weekly_digest_prune_v1();
    if changed < 2 then raise exception 'prune removed only % rows', changed; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role anon');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_unsubscribe_v1(pg_catalog.repeat('P', 43))$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'unsubscribe did not wait behind stale reservation pruning'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(value, 'visible capability lost to concurrent pruning')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  exists (
    select 1
    from public.profiles
    where user_id = '12000000-0000-4000-8000-000000000008'
      and digest_opt_in = false
  ),
  'concurrent prune/unsubscribe did not revoke the profile'
);
select pg_temp.assert_weekly(
  not exists (
    select 1
    from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000008'
  ),
  'pruned stale reservation survived concurrent unsubscribe'
);
select pg_temp.assert_weekly(
  not exists (
    select 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000008'
      and week_start = pg_catalog.date_trunc(
        'week', pg_catalog.statement_timestamp() at time zone 'UTC'
      )::date
  ) and exists (
    select 1
    from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000008'
      and lease_token = '22000000-0000-4000-8000-000000000124'
      and used_at is not null
  ),
  'prune/unsubscribe capability association drifted'
);

-- auth-delete then issue: the issuance waits for the cascading profile delete
-- and fails closed after the account deletion commits.
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000009'$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_issue_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000009',
    '22000000-0000-4000-8000-000000000025',
    pg_catalog.repeat('9', 64),
    pg_catalog.statement_timestamp() + interval '30 days'
  )$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'issuance did not wait behind auth deletion'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'issuance succeeded for a deleted account')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);
select pg_temp.assert_weekly(
  not exists (
    select 1 from auth.users
    where id = '12000000-0000-4000-8000-000000000009'
  )
  and not exists (
    select 1 from public.profiles
    where user_id = '12000000-0000-4000-8000-000000000009'
  )
  and not exists (
    select 1 from public.charts
    where user_id = '12000000-0000-4000-8000-000000000009'
  ),
  'auth deletion did not cascade before the blocked issue resumed'
);

-- issue then auth-delete: the cascading delete waits behind issuance, then
-- removes the committed delivery and capability through their auth FKs.
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_issue_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000010',
      '22000000-0000-4000-8000-000000000026',
      pg_catalog.repeat('0', 64),
      pg_catalog.statement_timestamp() + interval '30 days'
    ) then raise exception 'issue-before-auth-delete failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_send_query(
  'weekly_race_b',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000010'
    returning id$$
);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'auth deletion did not wait behind issuance'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  id = '12000000-0000-4000-8000-000000000010',
  'auth deletion did not resume after issuance committed'
)
from dblink_get_result('weekly_race_b') as result(id uuid);
select * from dblink_get_result('weekly_race_b') as result(id uuid);
select pg_temp.assert_weekly(
  not exists (
    select 1 from auth.users
    where id = '12000000-0000-4000-8000-000000000010'
  )
  and not exists (
    select 1 from public.profiles
    where user_id = '12000000-0000-4000-8000-000000000010'
  )
  and not exists (
    select 1 from public.charts
    where user_id = '12000000-0000-4000-8000-000000000010'
  )
  and not exists (
    select 1 from public.weekly_digest_deliveries
    where user_id = '12000000-0000-4000-8000-000000000010'
  )
  and not exists (
    select 1 from public.weekly_digest_unsubscribe_tokens
    where user_id = '12000000-0000-4000-8000-000000000010'
  ),
  'auth deletion did not cascade the issued weekly digest state'
);

-- cancel then auth-delete: cancellation holds the Auth parent through its
-- delivery/token transition, so cascading deletion waits without choosing a
-- competing child-table order.
select pg_temp.weekly_reserve_fixture(
  '12000000-0000-4000-8000-000000000011',
  '22000000-0000-4000-8000-000000000031',
  pg_temp.weekly_raw_hash('auth-delete-cancel-11')
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_cancel_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000011',
      '22000000-0000-4000-8000-000000000031'
    ) then raise exception 'cancel-before-auth-delete failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_send_query(
  'weekly_race_b',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000011'
    returning id$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'auth deletion did not wait behind cancellation'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  id = '12000000-0000-4000-8000-000000000011',
  'auth deletion did not resume after cancellation'
)
from dblink_get_result('weekly_race_b') as result(id uuid);
select * from dblink_get_result('weekly_race_b') as result(id uuid);

-- auth-delete then cancel: cancellation waits at the Auth parent and fails
-- closed after the account and both child rows have cascaded away.
select pg_temp.weekly_reserve_fixture(
  '12000000-0000-4000-8000-000000000012',
  '22000000-0000-4000-8000-000000000032',
  pg_temp.weekly_raw_hash('auth-delete-cancel-12')
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000012'$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_cancel_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000012',
    '22000000-0000-4000-8000-000000000032'
  )$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'cancellation did not wait behind auth deletion'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'cancellation succeeded for a deleted account')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

-- terminal rejection then auth-delete: finalization takes Auth before the
-- delivery/token cleanup, and the delete waits until both are consistent.
select pg_temp.weekly_dispatch_fixture(
  '12000000-0000-4000-8000-000000000013',
  '22000000-0000-4000-8000-000000000033',
  pg_temp.weekly_raw_hash('auth-delete-finish-13'),
  'c'
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_finish_v1(
      pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
      '12000000-0000-4000-8000-000000000013',
      '22000000-0000-4000-8000-000000000033',
      false, null, 422, 'invalid_recipient'
    ) then raise exception 'finish-before-auth-delete failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_send_query(
  'weekly_race_b',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000013'
    returning id$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'auth deletion did not wait behind terminal rejection'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  id = '12000000-0000-4000-8000-000000000013',
  'auth deletion did not resume after terminal rejection'
)
from dblink_get_result('weekly_race_b') as result(id uuid);
select * from dblink_get_result('weekly_race_b') as result(id uuid);

-- auth-delete then terminal rejection: finalization waits on Auth and returns
-- false after the delivery and unpublished capability disappear.
select pg_temp.weekly_dispatch_fixture(
  '12000000-0000-4000-8000-000000000014',
  '22000000-0000-4000-8000-000000000034',
  pg_temp.weekly_raw_hash('auth-delete-finish-14'),
  'd'
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000014'$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_finish_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000014',
    '22000000-0000-4000-8000-000000000034',
    false, null, 422, 'invalid_recipient'
  )$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'terminal rejection did not wait behind auth deletion'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'terminal rejection finalized a deleted account')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

-- stale two-child prune then auth-delete: prune locks affected Auth owners in
-- UUID order before its advisory, delivery, and capability locks.
select pg_temp.weekly_reserve_fixture(
  '12000000-0000-4000-8000-000000000015',
  '22000000-0000-4000-8000-000000000035',
  pg_temp.weekly_raw_hash('auth-delete-prune-15')
);
update public.weekly_digest_deliveries
set reserved_at = pg_catalog.statement_timestamp() - interval '31 minutes',
    updated_at = pg_catalog.statement_timestamp() - interval '31 minutes'
where user_id = '12000000-0000-4000-8000-000000000015';
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role service_role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ declare changed integer; begin
    changed := public.weekly_digest_prune_v1();
    if changed < 2 then raise exception 'stale prune changed only % rows', changed; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_send_query(
  'weekly_race_b',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000015'
    returning id$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'auth deletion did not wait behind stale two-child prune'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  id = '12000000-0000-4000-8000-000000000015',
  'auth deletion did not resume after stale two-child prune'
)
from dblink_get_result('weekly_race_b') as result(id uuid);
select * from dblink_get_result('weekly_race_b') as result(id uuid);

-- auth-delete then token-only prune: a terminal delivery's expired capability
-- is in prune's affected-owner union even though the delivery is not mutated.
select pg_temp.weekly_dispatch_fixture(
  '12000000-0000-4000-8000-000000000016',
  '22000000-0000-4000-8000-000000000036',
  pg_temp.weekly_raw_hash('auth-delete-prune-16'),
  'f'
);
select pg_temp.assert_weekly(
  public.weekly_digest_finish_v1(
    pg_catalog.date_trunc('week', pg_catalog.statement_timestamp() at time zone 'UTC')::date,
    '12000000-0000-4000-8000-000000000016',
    '22000000-0000-4000-8000-000000000036',
    true, 'provider-receipt-race-16', null, null
  ),
  'token-only prune fixture did not finalize'
);
update public.weekly_digest_unsubscribe_tokens
set created_at = pg_catalog.statement_timestamp() - interval '31 days',
    expires_at = pg_catalog.statement_timestamp() - interval '1 day'
where user_id = '12000000-0000-4000-8000-000000000016';
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000016'$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role service_role');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_prune_v1()$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'token-only prune did not wait behind auth deletion'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(value >= 0, 'token-only prune returned an invalid count')
from dblink_get_result('weekly_race_b') as result(value integer);
select * from dblink_get_result('weekly_race_b') as result(value integer);

-- unsubscribe then auth-delete: the user click holds Auth before profile and
-- both child tables, so the account cascade waits cleanly.
select pg_temp.weekly_reserve_fixture(
  '12000000-0000-4000-8000-000000000017',
  '22000000-0000-4000-8000-000000000037',
  pg_temp.weekly_raw_hash(pg_catalog.repeat('W', 43))
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'set role anon');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$do $block$ begin
    if not public.weekly_digest_unsubscribe_v1(pg_catalog.repeat('W', 43))
    then raise exception 'unsubscribe-before-auth-delete failed'; end if;
  end $block$;$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_send_query(
  'weekly_race_b',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000017'
    returning id$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'auth deletion did not wait behind unsubscribe'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(
  id = '12000000-0000-4000-8000-000000000017',
  'auth deletion did not resume after unsubscribe'
)
from dblink_get_result('weekly_race_b') as result(id uuid);
select * from dblink_get_result('weekly_race_b') as result(id uuid);

-- auth-delete then unsubscribe: the initial token read may see the old row,
-- but the Auth lock waits and then fails closed after the cascade commits.
select pg_temp.weekly_reserve_fixture(
  '12000000-0000-4000-8000-000000000018',
  '22000000-0000-4000-8000-000000000038',
  pg_temp.weekly_raw_hash(pg_catalog.repeat('X', 43))
);
select dblink_exec('weekly_race_a', 'reset role');
select dblink_exec('weekly_race_a', 'begin');
select dblink_exec(
  'weekly_race_a',
  $$delete from auth.users
    where id = '12000000-0000-4000-8000-000000000018'$$
);
select dblink_exec('weekly_race_b', 'reset role');
select dblink_exec('weekly_race_b', 'set role anon');
select dblink_send_query(
  'weekly_race_b',
  $$select public.weekly_digest_unsubscribe_v1(pg_catalog.repeat('X', 43))$$
);
select pg_catalog.pg_sleep(0.05);
select pg_temp.assert_weekly(
  dblink_is_busy('weekly_race_b') = 1,
  'unsubscribe did not wait behind auth deletion'
);
select dblink_exec('weekly_race_a', 'commit');
select pg_temp.assert_weekly(not value, 'unsubscribe succeeded for a deleted account')
from dblink_get_result('weekly_race_b') as result(value boolean);
select * from dblink_get_result('weekly_race_b') as result(value boolean);

select dblink_disconnect('weekly_race_a');
select dblink_disconnect('weekly_race_b');

delete from auth.users
where id::text like '12000000-0000-4000-8000-%';
