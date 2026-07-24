\set ON_ERROR_STOP on

-- Independent PostgreSQL sessions prove the owner caps and terminal races;
-- all of this runs only in the disposable Phase 4 test database.
create extension if not exists dblink;

create or replace function pg_temp.assert_true(ok boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'assertion failed: %', message;
  end if;
end;
$$;

create or replace function pg_temp.positions_wire()
returns jsonb
language sql
immutable
as $$
  select '{
    "b":[15,45,75,105,135,165,195,225,255,285,315,345],
    "h":"w",
    "v":"3.2.1"
  }'::jsonb;
$$;

insert into auth.users (id) values
  ('43000000-0000-4000-8000-000000000001'),
  ('43000000-0000-4000-8000-000000000002'),
  ('43000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

set role service_role;

-- Preload eleven active invitations. Two concurrent twelfth attempts must
-- serialize on the owner advisory lock and admit exactly one.
do $$
declare
  sequence_number integer;
  digest text;
  result jsonb;
begin
  for sequence_number in 1..11 loop
    digest := encode(
      pg_catalog.sha256(
        pg_catalog.convert_to('concurrent-active-' || sequence_number, 'UTF8')
      ),
      'hex'
    );
    result := public.create_compatibility_invite(
      '43000000-0000-4000-8000-000000000001',
      'Concurrent ' || sequence_number,
      'aries',
      pg_temp.positions_wire(),
      false,
      false,
      digest
    );
    if result->>'outcome' <> 'created' then
      raise exception 'concurrency preload failed at %: %', sequence_number, result;
    end if;
  end loop;
end;
$$;

reset role;
select dblink_connect(
  'phase4_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'phase4_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('phase4_guard_a', 'set role service_role');
select dblink_exec('phase4_guard_b', 'set role service_role');
select dblink_exec('phase4_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('phase4_guard_b', 'set statement_timeout = ''5s''');

select dblink_exec('phase4_guard_a', 'begin');
select dblink_exec(
  'phase4_guard_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        '43000000-0000-4000-8000-000000000001',
        7312030
      )
    );
  end $block$;$$
);
select dblink_send_query(
  'phase4_guard_b',
  $$select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000001',
    'Concurrent B',
    'aries',
    '{"b":[15,45,75,105,135,165,195,225,255,285,315,345],"h":"w","v":"3.2.1"}'::jsonb,
    false,
    false,
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('phase4_guard_b') = 1,
  'the competing create must wait behind the exact owner-cap lock'
);

create temporary table phase4_concurrency_results (
  test text,
  outcome text
);

insert into phase4_concurrency_results
select 'active_cap', value->>'outcome'
from dblink(
  'phase4_guard_a',
  $$select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000001',
    'Concurrent A',
    'aries',
    '{"b":[15,45,75,105,135,165,195,225,255,285,315,345],"h":"w","v":"3.2.1"}'::jsonb,
    false,
    false,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )$$
) as result(value jsonb);
select dblink_exec('phase4_guard_a', 'commit');
insert into phase4_concurrency_results
select 'active_cap', value->>'outcome'
from dblink_get_result('phase4_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select array_agg(outcome order by outcome)
   from phase4_concurrency_results
   where test = 'active_cap') = array['active_limit', 'created']
    and (
      select count(*) = 12
      from public.compatibility_invites
      where owner_user_id = '43000000-0000-4000-8000-000000000001'
        and status = 'active'
    ),
  'concurrent owner creation must leave exactly twelve active authorities'
);

select dblink_disconnect('phase4_guard_a');
select dblink_disconnect('phase4_guard_b');
select dblink_connect(
  'phase4_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'phase4_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('phase4_guard_a', 'set role service_role');
select dblink_exec('phase4_guard_b', 'set role service_role');
select dblink_exec('phase4_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('phase4_guard_b', 'set statement_timeout = ''5s''');

-- Nineteen completed rows still count in the rolling day. Two concurrent
-- attempts for slot twenty must serialize and admit only one creation.
set role service_role;
do $$
declare
  sequence_number integer;
  digest text;
  created jsonb;
  completed jsonb;
begin
  for sequence_number in 1..19 loop
    digest := encode(
      pg_catalog.sha256(
        pg_catalog.convert_to('concurrent-rate-' || sequence_number, 'UTF8')
      ),
      'hex'
    );
    created := public.create_compatibility_invite(
      '43000000-0000-4000-8000-000000000003',
      'Rate race ' || sequence_number,
      'aries',
      pg_temp.positions_wire(),
      false,
      false,
      digest
    );
    completed := public.complete_compatibility_invite(digest);
    if created->>'outcome' <> 'created'
      or completed->>'outcome' <> 'completed'
    then
      raise exception 'rolling-cap preload failed at %: %, %',
        sequence_number, created, completed;
    end if;
  end loop;
end;
$$;
reset role;

select dblink_exec('phase4_guard_a', 'begin');
select dblink_exec(
  'phase4_guard_a',
  $$do $block$ begin
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        '43000000-0000-4000-8000-000000000003',
        7312030
      )
    );
  end $block$;$$
);
select dblink_send_query(
  'phase4_guard_b',
  $$select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000003',
    'Rate race B',
    'aries',
    '{"b":[15,45,75,105,135,165,195,225,255,285,315,345],"h":"w","v":"3.2.1"}'::jsonb,
    false,
    false,
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  )$$
);
select pg_temp.assert_true(
  dblink_is_busy('phase4_guard_b') = 1,
  'the competing twentieth creation must wait behind the owner window lock'
);
insert into phase4_concurrency_results
select 'rolling_cap', value->>'outcome'
from dblink(
  'phase4_guard_a',
  $$select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000003',
    'Rate race A',
    'aries',
    '{"b":[15,45,75,105,135,165,195,225,255,285,315,345],"h":"w","v":"3.2.1"}'::jsonb,
    false,
    false,
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  )$$
) as result(value jsonb);
select dblink_exec('phase4_guard_a', 'commit');
insert into phase4_concurrency_results
select 'rolling_cap', value->>'outcome'
from dblink_get_result('phase4_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select array_agg(outcome order by outcome)
   from phase4_concurrency_results
   where test = 'rolling_cap') = array['created', 'creation_rate_limit']
    and (
      select count(*) = 20
      from public.compatibility_invites
      where owner_user_id = '43000000-0000-4000-8000-000000000003'
        and created_at > clock_timestamp() - interval '24 hours'
    ),
  'concurrent rolling-day creation must stop exactly at twenty'
);

select dblink_disconnect('phase4_guard_a');
select dblink_disconnect('phase4_guard_b');
select dblink_connect(
  'phase4_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'phase4_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('phase4_guard_a', 'set role service_role');
select dblink_exec('phase4_guard_b', 'set role service_role');
select dblink_exec('phase4_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('phase4_guard_b', 'set statement_timeout = ''5s''');

-- Create an authority for a forced revoke-wins race.
set role service_role;
create temporary table phase4_race_invites (
  key text primary key,
  invite_id uuid not null,
  token_hash text not null
);
with created as (
  select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000002',
    'Revoke wins',
    'aries',
    pg_temp.positions_wire(),
    false,
    false,
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  ) as value
)
insert into phase4_race_invites
select 'revoke_wins', (value->>'invite_id')::uuid, repeat('c', 64)
from created
where value->>'outcome' = 'created';
reset role;

select dblink_exec('phase4_guard_a', 'begin');
insert into phase4_concurrency_results
select 'revoke_setup', value->>'outcome'
from dblink(
  'phase4_guard_a',
  $$select public.open_compatibility_invite(
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  )$$
) as result(value jsonb);
select pg_temp.assert_true(
  (select outcome = 'ready'
   from phase4_concurrency_results
   where test = 'revoke_setup'),
  'the race setup must hold the active invitation row'
);
select dblink_send_query(
  'phase4_guard_b',
  $$select public.complete_compatibility_invite(
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  )$$
);

select pg_temp.assert_true(
  dblink_is_busy('phase4_guard_b') = 1,
  'completion must wait behind a revocation already owning the row'
);

insert into phase4_concurrency_results
select 'revoke_wins', value->>'outcome'
from dblink(
  'phase4_guard_a',
  format(
    $$select public.revoke_compatibility_invite(
      '43000000-0000-4000-8000-000000000002',
      %L::uuid
    )$$,
    (select invite_id from phase4_race_invites where key = 'revoke_wins')
  )
) as result(value jsonb);
select dblink_exec('phase4_guard_a', 'commit');
insert into phase4_concurrency_results
select 'revoke_wins', value->>'outcome'
from dblink_get_result('phase4_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select array_agg(outcome order by outcome)
   from phase4_concurrency_results
   where test = 'revoke_wins') = array['revoked', 'unavailable']
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select invite_id
        from phase4_race_invites
        where key = 'revoke_wins'
      )
        and status = 'revoked'
        and positions is null
        and token_hash is null
        and completed_at is null
    ),
  'completion versus revocation must produce one terminal winner'
);

select dblink_disconnect('phase4_guard_a');
select dblink_disconnect('phase4_guard_b');
select dblink_connect(
  'phase4_guard_a',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_connect(
  'phase4_guard_b',
  format('dbname=%L user=%L', current_database(), current_user)
);
select dblink_exec('phase4_guard_a', 'set role service_role');
select dblink_exec('phase4_guard_b', 'set role service_role');
select dblink_exec('phase4_guard_a', 'set statement_timeout = ''5s''');
select dblink_exec('phase4_guard_b', 'set statement_timeout = ''5s''');

-- At-most-once provider claims also serialize. Session A reserves and holds
-- the row; session B can only observe the durable duplicate after commit.
set role service_role;
with created as (
  select public.create_compatibility_invite(
    '43000000-0000-4000-8000-000000000002',
    'Notify once',
    'aries',
    pg_temp.positions_wire(),
    false,
    true,
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
  ) as value
), completed as (
  select public.complete_compatibility_invite(repeat('d', 64)) as value
  from created
  where created.value->>'outcome' = 'created'
)
insert into phase4_race_invites
select
  'delivery',
  (created.value->>'invite_id')::uuid,
  repeat('d', 64)
from created, completed
where created.value->>'outcome' = 'created'
  and completed.value->>'outcome' = 'completed';
reset role;

select dblink_exec('phase4_guard_a', 'begin');
insert into phase4_concurrency_results
select 'delivery', value->>'outcome'
from dblink(
  'phase4_guard_a',
  format(
    $$select public.reserve_compatibility_invite_delivery(
      %L::uuid,
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      '44000000-0000-4000-8000-000000000001'
    )$$,
    (select invite_id from phase4_race_invites where key = 'delivery')
  )
) as result(value jsonb);

select dblink_send_query(
  'phase4_guard_b',
  format(
    $$select public.reserve_compatibility_invite_delivery(
      %L::uuid,
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      '44000000-0000-4000-8000-000000000002'
    )$$,
    (select invite_id from phase4_race_invites where key = 'delivery')
  )
);

select pg_temp.assert_true(
  dblink_is_busy('phase4_guard_b') = 1,
  'the competing email reservation must wait for the first claim'
);

select dblink_exec('phase4_guard_a', 'commit');
insert into phase4_concurrency_results
select 'delivery', value->>'outcome'
from dblink_get_result('phase4_guard_b') as result(value jsonb);

select pg_temp.assert_true(
  (select array_agg(outcome order by outcome)
   from phase4_concurrency_results
   where test = 'delivery') = array['duplicate', 'reserved']
    and (
      select count(*) = 1
      from public.compatibility_invite_delivery_claims
      where invite_id = (
        select invite_id
        from phase4_race_invites
        where key = 'delivery'
      )
    ),
  'concurrent notification workers must create one provider claim'
);

select dblink_disconnect('phase4_guard_a');
select dblink_disconnect('phase4_guard_b');
