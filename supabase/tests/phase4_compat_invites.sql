\set ON_ERROR_STOP on

-- Run after all migrations in a disposable PostgreSQL 17 database. The
-- fixture proves the no-browser boundary, strict positions wire, terminal
-- destruction, rolling caps, owner hiding, and at-most-once email claim.

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

create or replace function pg_temp.positions_wire(
  sun_longitude numeric default 15,
  with_angles boolean default true
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'b', jsonb_build_array(
      sun_longitude, 45, 75, 105, 135, 165,
      195, 225, 255, 285, 315, 345
    ),
    'h', 'w',
    'v', '3.2.1'
  ) || case
    when with_angles then jsonb_build_object('a', jsonb_build_array(100, 190))
    else '{}'::jsonb
  end;
$$;

select pg_temp.assert_true(
  (select relrowsecurity
   from pg_catalog.pg_class
   where oid = 'public.compatibility_invites'::regclass)
    and (select relrowsecurity
         from pg_catalog.pg_class
         where oid = 'public.compatibility_invite_delivery_claims'::regclass)
    and (select relrowsecurity
         from pg_catalog.pg_class
         where oid = 'public.compatibility_invite_events'::regclass),
  'every Phase 4 table must have RLS enabled'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid in (
      'public.compatibility_invites'::regclass,
      'public.compatibility_invite_delivery_claims'::regclass,
      'public.compatibility_invite_events'::regclass
    )
  ),
  'Phase 4 tables must expose zero browser policies'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.compatibility_invites', 'select,insert,update,delete')
    and not has_table_privilege('authenticated', 'public.compatibility_invites', 'select,insert,update,delete')
    and not has_table_privilege('service_role', 'public.compatibility_invites', 'select,insert,update,delete')
    and not has_table_privilege('anon', 'public.compatibility_invite_delivery_claims', 'select,insert,update,delete')
    and not has_table_privilege('authenticated', 'public.compatibility_invite_delivery_claims', 'select,insert,update,delete')
    and not has_table_privilege('service_role', 'public.compatibility_invite_delivery_claims', 'select,insert,update,delete')
    and not has_table_privilege('anon', 'public.compatibility_invite_events', 'select,insert,update,delete')
    and not has_table_privilege('authenticated', 'public.compatibility_invite_events', 'select,insert,update,delete')
    and not has_table_privilege('service_role', 'public.compatibility_invite_events', 'select,insert,update,delete'),
  'Phase 4 persistence must be RPC-only, including for service_role'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from (values
      ('public.prune_compatibility_invites(integer)'),
      ('public.create_compatibility_invite(uuid,text,text,jsonb,boolean,boolean,text)'),
      ('public.open_compatibility_invite(text)'),
      ('public.read_compatibility_invite(text)'),
      ('public.complete_compatibility_invite(text)'),
      ('public.revoke_compatibility_invite(uuid,uuid)'),
      ('public.list_compatibility_invites(uuid)'),
      ('public.hide_compatibility_invite(uuid,uuid)'),
      ('public.reserve_compatibility_invite_delivery(uuid,text,uuid)'),
      ('public.finalize_compatibility_invite_delivery(uuid,uuid,text,text,integer)')
    ) as rpc(signature)
    where has_function_privilege('anon', rpc.signature, 'execute')
      or has_function_privilege('authenticated', rpc.signature, 'execute')
      or not has_function_privilege('service_role', rpc.signature, 'execute')
      or not (
        select prosecdef
        from pg_catalog.pg_proc
        where oid = rpc.signature::regprocedure
      )
      or not (
        select coalesce(
          'search_path=pg_catalog, public' = any(proconfig),
          false
        )
        from pg_catalog.pg_proc
        where oid = rpc.signature::regprocedure
      )
  ),
  'only service_role may execute locked-search-path SECURITY DEFINER RPCs'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'compatibility_invites'
      and (
        column_name like '%birth%'
        or column_name like '%email%'
        or column_name like '%chart%'
        or column_name like '%recipient%'
        or column_name like '%place%'
        or column_name like '%latitude%'
        or column_name like '%longitude%'
        or column_name like '%timezone%'
      )
  ),
  'invitation authority must have no birth, email, chart, recipient, or location field'
);

insert into auth.users (id) values
  ('41000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000002'),
  ('41000000-0000-4000-8000-000000000003'),
  ('41000000-0000-4000-8000-000000000004')
on conflict (id) do nothing;

set role service_role;

select pg_temp.assert_true(
  public.is_valid_compatibility_invite_positions(
    pg_temp.positions_wire(15, true),
    true,
    'aries'
  ),
  'canonical timed v2 positions must validate'
);

select pg_temp.assert_true(
  public.is_valid_compatibility_invite_positions(
    pg_temp.positions_wire(45, false),
    false,
    'taurus'
  ),
  'canonical no-time v2 positions must validate'
);

select pg_temp.assert_true(
  not public.is_valid_compatibility_invite_positions(
    pg_temp.positions_wire(15, true) || '{"date":"1990-01-01"}'::jsonb,
    true,
    'aries'
  )
    and not public.is_valid_compatibility_invite_positions(
      jsonb_set(
        pg_temp.positions_wire(15, true),
        '{b}',
        '[15,45,75]'::jsonb
      ),
      true,
      'aries'
    )
    and not public.is_valid_compatibility_invite_positions(
      jsonb_set(
        pg_temp.positions_wire(15, true),
        '{b,0}',
        '360'::jsonb
      ),
      true,
      'aries'
    )
    and not public.is_valid_compatibility_invite_positions(
      jsonb_set(
        pg_temp.positions_wire(15, true),
        '{b,0}',
        '15.0001'::jsonb
      ),
      true,
      'aries'
    )
    and not public.is_valid_compatibility_invite_positions(
      pg_temp.positions_wire(15, false),
      true,
      'aries'
    )
    and not public.is_valid_compatibility_invite_positions(
      pg_temp.positions_wire(15, true),
      true,
      'taurus'
    ),
  'unknown keys, wrong body count, noncanonical longitude, angle mismatch, and false sign must fail'
);

select pg_temp.assert_true(
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    '  Frida  ',
    'aries',
    pg_temp.positions_wire(15, true),
    true,
    true,
    repeat('a', 64)
  )->>'outcome' = 'invalid'
    and public.create_compatibility_invite(
      '41000000-0000-4000-8000-000000000001',
      repeat('F', 25),
      'aries',
      pg_temp.positions_wire(15, true),
      true,
      true,
      repeat('a', 64)
    )->>'outcome' = 'invalid'
    and public.create_compatibility_invite(
      '41000000-0000-4000-8000-000000000001',
      'Frida',
      'aries',
      pg_temp.positions_wire(15, true),
      true,
      true,
      'raw-secret-is-not-a-hash'
    )->>'outcome' = 'invalid',
  'labels and token digests must be strict'
);

reset role;

create temporary table phase4_results (
  key text primary key,
  value jsonb not null
);

insert into phase4_results values (
  'created',
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    'Frida',
    'aries',
    pg_temp.positions_wire(15, true),
    true,
    true,
    repeat('a', 64)
  )
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'created'
   from phase4_results where key = 'created')
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and expires_at = created_at + interval '14 days'
        and token_hash = repeat('a', 64)
        and completion_replay_hash is null
        and positions = pg_temp.positions_wire(15, true)
        and status = 'active'
        and opened_at is null
        and authority_destroyed_at is null
    )
    and exists (
      select 1
      from public.compatibility_invite_events
      where invite_id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and event = 'created'
    ),
  'creation must write one exact 14-day authority and non-sensitive event'
);

select pg_temp.assert_true(
  public.open_compatibility_invite(repeat('a', 64))->>'outcome' = 'ready'
    and public.open_compatibility_invite(repeat('a', 64))->>'outcome' = 'ready',
  'open must be idempotent'
);

insert into phase4_results values (
  'read_ready',
  public.read_compatibility_invite(repeat('a', 64))
);

select pg_temp.assert_true(
  (
    select value->'positions'
    from phase4_results
    where key = 'read_ready'
  ) = pg_temp.positions_wire(15, true),
  'read must return the strict positions payload'
);

select pg_temp.assert_true(
  (select not (value ? 'owner_user_id')
     and not (value ? 'invite_id')
     and not (value ? 'token_hash')
     and not (value ? 'notify_on_complete')
   from phase4_results
   where key = 'read_ready'),
  'recipient reads must not expose owner, invite, token, or notification state'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.compatibility_invite_events
    where invite_id = (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    )
      and event = 'opened'
  ),
  'open must record one idempotent event'
);

insert into phase4_results values (
  'completed',
  public.complete_compatibility_invite(repeat('a', 64))
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'completed'
     and value ? 'completed_at'
   from phase4_results where key = 'completed')
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and status = 'completed'
        and token_hash is null
        and positions is null
        and completion_replay_hash is not null
        and completed_at = authority_destroyed_at
        and delete_after = authority_destroyed_at + interval '30 days'
    )
    and public.read_compatibility_invite(repeat('a', 64))->>'outcome' = 'unavailable'
    and public.open_compatibility_invite(repeat('a', 64))->>'outcome' = 'unavailable',
  'first completion must destroy all reading authority in the terminal statement'
);

insert into phase4_results values (
  'completion_replay',
  public.complete_compatibility_invite(repeat('a', 64))
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'duplicate'
     and value->>'invite_id' = (
       select value->>'invite_id'
       from phase4_results
       where key = 'created'
     )
     and value->>'completed_at' = (
       select value->>'completed_at'
       from phase4_results
       where key = 'completed'
     )
   from phase4_results where key = 'completion_replay')
    and (
      select count(*) = 1
      from public.compatibility_invite_events
      where invite_id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and event = 'completed'
    ),
  'lost completion responses must replay idempotently without restoring authority'
);

insert into phase4_results values (
  'delivery_reserved',
  public.reserve_compatibility_invite_delivery(
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    ),
    repeat('b', 64),
    '42000000-0000-4000-8000-000000000001'
  )
);

insert into phase4_results values (
  'delivery_duplicate',
  public.reserve_compatibility_invite_delivery(
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    ),
    repeat('b', 64),
    '42000000-0000-4000-8000-000000000002'
  )
);

insert into phase4_results values (
  'delivery_finalized',
  public.finalize_compatibility_invite_delivery(
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    ),
    '42000000-0000-4000-8000-000000000001',
    'sent',
    'resend_phase4_receipt_1',
    200
  )
);

insert into phase4_results values (
  'delivery_finalize_replay',
  public.finalize_compatibility_invite_delivery(
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    ),
    '42000000-0000-4000-8000-000000000001',
    'sent',
    'resend_phase4_receipt_1',
    200
  )
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'reserved'
   from phase4_results where key = 'delivery_reserved')
    and (select value->>'outcome' = 'duplicate'
         from phase4_results where key = 'delivery_duplicate')
    and (select value->>'outcome' = 'finalized'
         from phase4_results where key = 'delivery_finalized')
    and (select value->>'outcome' = 'duplicate'
         from phase4_results where key = 'delivery_finalize_replay')
    and (
      select count(*) = 1
      from public.compatibility_invite_delivery_claims
      where invite_id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and state = 'sent'
    ),
  'completion email must reserve and finalize at most once'
);

insert into phase4_results values (
  'status_before_hide',
  public.list_compatibility_invites(
    '41000000-0000-4000-8000-000000000001'
  )
);

select pg_temp.assert_true(
  (select jsonb_array_length(value->'invites') = 1
     and not (value->'invites'->0 ? 'owner_user_id')
     and not (value->'invites'->0 ? 'token_hash')
     and not (value->'invites'->0 ? 'positions')
     and not (value->'invites'->0 ? 'completion_replay_hash')
   from phase4_results
   where key = 'status_before_hide'),
  'owner status must omit authority, payload, and internal owner identity'
);

insert into phase4_results values (
  'hidden',
  public.hide_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    )
  )
);

insert into phase4_results values (
  'hidden_replay',
  public.hide_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'created'
    )
  )
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'hidden'
   from phase4_results where key = 'hidden')
    and (select value->>'outcome' = 'hidden'
         from phase4_results where key = 'hidden_replay')
    and jsonb_array_length(
      public.list_compatibility_invites(
        '41000000-0000-4000-8000-000000000001'
      )->'invites'
    ) = 0
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'created'
      )
        and owner_hidden_at is not null
        and delete_after > clock_timestamp()
    ),
  'owner hiding must be idempotent, omit the row from status, and retain evidence'
);

-- Active rows cannot be hidden, and cross-owner operations disclose nothing.
insert into phase4_results values (
  'revokable',
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    'Diego',
    'taurus',
    pg_temp.positions_wire(45, false),
    false,
    false,
    repeat('c', 64)
  )
);

insert into phase4_results values (
  'hide_active',
  public.hide_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'revokable'
    )
  )
);

insert into phase4_results values (
  'revoke_cross_owner',
  public.revoke_compatibility_invite(
    '41000000-0000-4000-8000-000000000004',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'revokable'
    )
  )
);

insert into phase4_results values (
  'revoked',
  public.revoke_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'revokable'
    )
  )
);

insert into phase4_results values (
  'revoked_replay',
  public.revoke_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    (
      select (value->>'invite_id')::uuid
      from phase4_results
      where key = 'revokable'
    )
  )
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'active'
   from phase4_results where key = 'hide_active')
    and (select value->>'outcome' = 'not_found'
         from phase4_results where key = 'revoke_cross_owner')
    and (select value->>'outcome' = 'revoked'
         from phase4_results where key = 'revoked')
    and (select value->>'outcome' = 'revoked'
         from phase4_results where key = 'revoked_replay')
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'revokable'
      )
        and positions is null
        and token_hash is null
        and authority_destroyed_at = revoked_at
    ),
  'active hiding must fail; owner revocation must be scoped, terminal, and idempotent'
);

-- Touched overdue authority closes inline without relying on the scheduler.
insert into phase4_results values (
  'expiring',
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000001',
    'Old sky',
    'aries',
    pg_temp.positions_wire(15, false),
    false,
    false,
    repeat('d', 64)
  )
);

update public.compatibility_invites
set created_at = statement_timestamp() - interval '15 days',
    expires_at = statement_timestamp() - interval '1 day'
where id = (
  select (value->>'invite_id')::uuid
  from phase4_results
  where key = 'expiring'
);

insert into phase4_results values (
  'expired_read',
  public.read_compatibility_invite(repeat('d', 64))
);

select pg_temp.assert_true(
  (select value->>'outcome' = 'unavailable'
   from phase4_results where key = 'expired_read')
    and exists (
      select 1
      from public.compatibility_invites
      where id = (
        select (value->>'invite_id')::uuid
        from phase4_results
        where key = 'expiring'
      )
        and status = 'expired'
        and positions is null
        and token_hash is null
        and delete_after = authority_destroyed_at + interval '30 days'
    ),
  'inline expiry must destroy authority before returning'
);

-- Twelve simultaneous authorities are allowed; the thirteenth is not.
do $$
declare
  sequence_number integer;
  result jsonb;
begin
  for sequence_number in 1..12 loop
    result := public.create_compatibility_invite(
      '41000000-0000-4000-8000-000000000002',
      'Active ' || sequence_number,
      'aries',
      pg_temp.positions_wire(15, false),
      false,
      false,
      lpad(to_hex(sequence_number), 64, '0')
    );
    if result->>'outcome' <> 'created' then
      raise exception 'active-cap fixture failed at %: %', sequence_number, result;
    end if;
  end loop;
end;
$$;

select pg_temp.assert_true(
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000002',
    'Active 13',
    'aries',
    pg_temp.positions_wire(15, false),
    false,
    false,
    repeat('e', 64)
  )->>'outcome' = 'active_limit'
    and (
      select count(*) = 12
      from public.compatibility_invites
      where owner_user_id = '41000000-0000-4000-8000-000000000002'
        and status = 'active'
    ),
  'the per-owner active limit must stop exactly at twelve'
);

-- Terminal rows retain the creation timestamp, so closing cannot reset the
-- exact rolling 24-hour creation ceiling.
do $$
declare
  sequence_number integer;
  digest text;
  created jsonb;
  completed jsonb;
begin
  for sequence_number in 1..20 loop
    digest := encode(
      pg_catalog.sha256(
        pg_catalog.convert_to('rate-' || sequence_number, 'UTF8')
      ),
      'hex'
    );
    created := public.create_compatibility_invite(
      '41000000-0000-4000-8000-000000000003',
      'Rate ' || sequence_number,
      'aries',
      pg_temp.positions_wire(15, false),
      false,
      false,
      digest
    );
    if created->>'outcome' <> 'created' then
      raise exception 'rate fixture create failed at %: %', sequence_number, created;
    end if;
    completed := public.complete_compatibility_invite(digest);
    if completed->>'outcome' <> 'completed' then
      raise exception 'rate fixture complete failed at %: %', sequence_number, completed;
    end if;
  end loop;
end;
$$;

select pg_temp.assert_true(
  public.create_compatibility_invite(
    '41000000-0000-4000-8000-000000000003',
    'Rate 21',
    'aries',
    pg_temp.positions_wire(15, false),
    false,
    false,
    repeat('f', 64)
  )->>'outcome' = 'creation_rate_limit'
    and (
      select count(*) = 20
      from public.compatibility_invites
      where owner_user_id = '41000000-0000-4000-8000-000000000003'
        and created_at > clock_timestamp() - interval '24 hours'
    ),
  'the exact rolling day must admit twenty creations and reject the twenty-first'
);

-- The bounded prune closes overdue rows and later removes only skeletons
-- whose full 30-day evidence period has elapsed.
update public.compatibility_invites
set owner_hidden_at = authority_destroyed_at,
    authority_destroyed_at = statement_timestamp() - interval '31 days',
    completed_at = statement_timestamp() - interval '31 days',
    delete_after = statement_timestamp() - interval '1 day'
where owner_user_id = '41000000-0000-4000-8000-000000000003'
  and status = 'completed';

insert into phase4_results values (
  'pruned',
  public.prune_compatibility_invites(64)
);

select pg_temp.assert_true(
  (select (value->>'pruned')::integer = 20
   from phase4_results where key = 'pruned')
    and not exists (
      select 1
      from public.compatibility_invites
      where owner_user_id = '41000000-0000-4000-8000-000000000003'
    ),
  'prune must remove terminal skeletons only after the evidence window'
);

reset role;
