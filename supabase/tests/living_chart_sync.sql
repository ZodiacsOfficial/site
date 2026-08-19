\set ON_ERROR_STOP on

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

create or replace function pg_temp.living_payload(
  candidate_chart_id uuid,
  candidate_note text default 'A useful conversation.'
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schema', 'zodiacs.living-chart.cloud-moment.v1',
    'primaryChartId', candidate_chart_id,
    'occurredAt', '2026-08-18T09:00:00.000Z',
    'timePrecision', 'exact',
    'category', 'relationships',
    'note', candidate_note,
    'forecast', jsonb_build_object(
      'schema', 'zodiacs.living-chart.today-forecast.v1',
      'editionDate', '2026-08-18',
      'chartId', candidate_chart_id,
      'source', 'personalized',
      'generatorVersion', 'today-1.0.0',
      'capturedAt', '2026-08-18T08:00:00.000Z',
      'lines', jsonb_build_array(jsonb_build_object(
        'id', 'transit:mars-moon',
        'text', 'Make room before answering too quickly.',
        'receipt', 'Mars 14.2 degrees Cancer square natal Moon.'
      ))
    ),
    'reflectionQuestionId', 'reflection:notice'
  );
$$;

create or replace function pg_temp.large_living_payload(candidate_chart_id uuid)
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    pg_temp.living_payload(candidate_chart_id, repeat('n', 500)),
    '{forecast,lines}',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'large:1',
        'text', repeat(U&'\+01F642', 1200),
        'receipt', repeat(U&'\+01F642', 800)
      ),
      jsonb_build_object(
        'id', 'large:2',
        'text', repeat(U&'\+01F643', 1200),
        'receipt', repeat(U&'\+01F643', 800)
      ),
      jsonb_build_object(
        'id', 'large:3',
        'text', repeat(U&'\+01F604', 1200),
        'receipt', repeat(U&'\+01F604', 800)
      )
    )
  );
$$;

insert into auth.users (id) values
  ('71000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002'),
  ('71000000-0000-4000-8000-000000000003'),
  ('71000000-0000-4000-8000-000000000004'),
  ('71000000-0000-4000-8000-000000000005')
on conflict (id) do nothing;

select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.living_chart_sync_consents', 'SELECT')
    and not has_table_privilege('authenticated', 'public.living_chart_sync_consents', 'INSERT')
    and not has_table_privilege('authenticated', 'public.living_chart_sync_consents', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.living_chart_sync_consents', 'DELETE')
    and has_table_privilege('authenticated', 'public.living_chart_moments', 'SELECT')
    and not has_table_privilege('authenticated', 'public.living_chart_moments', 'INSERT')
    and not has_table_privilege('authenticated', 'public.living_chart_moments', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.living_chart_moments', 'DELETE'),
  'browser roles must select through RLS and mutate only through RPCs'
);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.living_chart_sync_consents', 'SELECT')
    and has_table_privilege('service_role', 'public.living_chart_sync_consents', 'INSERT')
    and has_table_privilege('service_role', 'public.living_chart_sync_consents', 'UPDATE')
    and has_table_privilege('service_role', 'public.living_chart_sync_consents', 'DELETE')
    and not has_table_privilege('service_role', 'public.living_chart_sync_consents', 'TRUNCATE')
    and not has_table_privilege('service_role', 'public.living_chart_sync_consents', 'REFERENCES')
    and not has_table_privilege('service_role', 'public.living_chart_sync_consents', 'TRIGGER')
    and not has_table_privilege('service_role', 'public.living_chart_sync_consents', 'MAINTAIN')
    and has_table_privilege('service_role', 'public.living_chart_moments', 'SELECT')
    and has_table_privilege('service_role', 'public.living_chart_moments', 'INSERT')
    and has_table_privilege('service_role', 'public.living_chart_moments', 'UPDATE')
    and has_table_privilege('service_role', 'public.living_chart_moments', 'DELETE')
    and not has_table_privilege('service_role', 'public.living_chart_moments', 'TRUNCATE')
    and not has_table_privilege('service_role', 'public.living_chart_moments', 'REFERENCES')
    and not has_table_privilege('service_role', 'public.living_chart_moments', 'TRIGGER')
    and not has_table_privilege('service_role', 'public.living_chart_moments', 'MAINTAIN')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'SELECT')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'INSERT')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'UPDATE')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'DELETE')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'TRUNCATE')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'REFERENCES')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'TRIGGER')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_mutations', 'MAINTAIN')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'SELECT')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'INSERT')
    and has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'UPDATE')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'DELETE')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'TRUNCATE')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'REFERENCES')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'TRIGGER')
    and not has_table_privilege('service_role', 'living_chart_private.living_chart_runtime_settings', 'MAINTAIN'),
  'service role table grants must match the least-privilege contract exactly'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.living_chart_sync_consents', 'SELECT')
    and not has_table_privilege('anon', 'public.living_chart_moments', 'SELECT')
    and not has_function_privilege(
      'anon',
      'public.set_living_chart_sync_consent(text,uuid,bigint,text)',
      'EXECUTE'
    )
    and has_function_privilege(
      'authenticated',
      'public.set_living_chart_sync_consent(text,uuid,bigint,text)',
      'EXECUTE'
    ),
  'anonymous role must have no Living Chart data or RPC authority'
);

select pg_temp.assert_true(
  not has_table_privilege(
    'authenticated',
    'living_chart_private.living_chart_runtime_settings',
    'SELECT'
  )
    and has_table_privilege(
      'service_role',
      'living_chart_private.living_chart_runtime_settings',
      'SELECT'
    )
    and to_regprocedure('public.living_chart_sync_snapshot(bigint)') is null
    and to_regprocedure('public.set_living_chart_sync_consent(text,uuid,text)') is null
    and to_regprocedure('public.set_living_chart_sync_consent(text,uuid,bigint)') is null
    and to_regprocedure(
      'living_chart_private.set_living_chart_sync_consent_impl(text,uuid,text)'
    ) is null
    and to_regprocedure(
      'living_chart_private.set_living_chart_sync_consent_impl(text,uuid,bigint)'
    ) is null
    and to_regprocedure(
      'living_chart_private.living_chart_record_mutation(uuid,uuid,text,text,jsonb)'
    ) is null,
  'runtime controls must be operator-only and legacy executable overloads must be removed'
);

select pg_temp.assert_true(
  not has_schema_privilege('authenticated', 'private', 'USAGE')
    and has_schema_privilege('authenticated', 'living_chart_private', 'USAGE')
    and not exists (
      select 1
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname in (
          'set_living_chart_sync_consent',
          'put_living_chart_moment',
          'delete_living_chart_moment',
          'living_chart_sync_snapshot'
        )
        and procedure.prosecdef
    ),
  'public browser RPCs must be invoker functions and must not expose the shared private schema'
);

-- A legacy non-anonymous JWT may omit is_anonymous. Ownership still comes from
-- auth.uid(), so the account remains supported while explicit anonymous JWTs
-- are rejected.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001"}',
  false
);

select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000001',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'outcome') = 'granted',
  'missing is_anonymous claim must remain compatible'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","is_anonymous":true}',
  false
);
do $$
begin
  perform public.living_chart_sync_snapshot(1);
  raise exception 'explicit anonymous session unexpectedly reached Living Chart sync';
exception
  when insufficient_privilege then null;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","is_anonymous":false}',
  false
);

do $$
declare
  saved jsonb;
  replay jsonb;
  snapshot jsonb;
begin
  saved := public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000001',
    0,
    1,
    '72000000-0000-4000-8000-000000000002',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  );
  replay := public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000001',
    0,
    1,
    '72000000-0000-4000-8000-000000000002',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  );
  perform pg_temp.assert_true(
    saved = replay and saved ->> 'outcome' = 'saved' and saved ->> 'revision' = '1',
    'identical put replay must return the original result'
  );

  perform pg_temp.assert_true(
    public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000001',
      0,
      1,
      '72000000-0000-4000-8000-000000000002',
      pg_temp.living_payload(
        '74000000-0000-4000-8000-000000000001',
        'Conflicting reuse.'
      )
    ) ->> 'outcome' = 'mutation_conflict',
    'mutation id reuse with a different SHA-256 preimage must conflict'
  );

  perform pg_temp.assert_true(
    public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000002',
      0,
      1,
      '72000000-0000-4000-8000-000000000003',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
        || '{"unexpected":true}'::jsonb
    ) ->> 'outcome' = 'invalid',
    'payloads with extra keys must fail closed'
  );

  snapshot := public.living_chart_sync_snapshot(1);
  perform pg_temp.assert_true(
    snapshot ->> 'outcome' = 'ready'
      and jsonb_array_length(snapshot -> 'moments') = 1
      and snapshot #>> '{moments,0,payload,note}' = 'A useful conversation.',
    'snapshot must return one current-epoch owner payload'
  );
end;
$$;

reset role;

-- Direct RPC payloads must not be able to persist strings which the strict
-- browser parser rejects. Cover Cc and the bidi/zero-width Cf cases in every
-- user-authored text position.
do $$
declare
  poison text;
  candidate jsonb;
begin
  foreach poison in array array[E'\033', U&'\202E', U&'\200B'] loop
    candidate := pg_temp.living_payload(
      '74000000-0000-4000-8000-000000000001',
      'before' || poison || 'after'
    );
    perform pg_temp.assert_true(
      not living_chart_private.living_chart_payload_valid(candidate),
      'note accepted a browser-rejected control/format character'
    );

    candidate := jsonb_set(
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001'),
      '{forecast,lines,0,text}',
      to_jsonb('before' || poison || 'after')
    );
    perform pg_temp.assert_true(
      not living_chart_private.living_chart_payload_valid(candidate),
      'forecast line accepted a browser-rejected control/format character'
    );

    candidate := jsonb_set(
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001'),
      '{forecast,lines,0,receipt}',
      to_jsonb('before' || poison || 'after')
    );
    perform pg_temp.assert_true(
      not living_chart_private.living_chart_payload_valid(candidate),
      'forecast receipt accepted a browser-rejected control/format character'
    );
  end loop;

  perform pg_temp.assert_true(
    living_chart_private.living_chart_payload_valid(
      pg_temp.living_payload(
        '74000000-0000-4000-8000-000000000001',
        E'One line.\n\tA second line.'
      )
    ),
    'canonical internal note newline/tab must remain valid'
  );

  candidate := jsonb_set(
    jsonb_set(
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001'),
      '{primaryChartId}',
      '"74000000-0000-4000-8000-00000000000A"'::jsonb
    ),
    '{forecast,chartId}',
    '"74000000-0000-4000-8000-00000000000A"'::jsonb
  );
  perform pg_temp.assert_true(
    not living_chart_private.living_chart_payload_valid(candidate),
    'uppercase UUID text rejected by the browser parser must not enter snapshots'
  );
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 2
   from living_chart_private.living_chart_mutations
   where user_id = '71000000-0000-4000-8000-000000000001'
     and length(request_hash) = 64),
  'invalid and conflicting calls must not create extra receipts and hashes must be SHA-256'
);

-- RLS ownership: another authenticated account can see neither consent nor data.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.living_chart_sync_consents)
    and (select count(*) = 0 from public.living_chart_moments),
  'RLS must hide every other account row'
);
reset role;

-- Withdrawal clears rows and earlier receipts, nulls the accepted policy, and
-- advances the epoch. Replaying the old put can no longer return saved.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","is_anonymous":false}',
  false
);

select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    null,
    '72000000-0000-4000-8000-000000000089',
    1,
    null
  ) ->> 'outcome') = 'invalid'
    and (public.set_living_chart_sync_consent(
      'grant',
      '72000000-0000-4000-8000-000000000090',
      1,
      null
    ) ->> 'outcome') = 'invalid'
    and (public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000090',
      9007199254740990,
      1,
      '72000000-0000-4000-8000-000000000091',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
    ) ->> 'outcome') = 'invalid'
    and (public.delete_living_chart_moment(
      '73000000-0000-4000-8000-000000000090',
      9007199254740990,
      1,
      '72000000-0000-4000-8000-000000000092'
    ) @> '{"outcome":"deleted","revision":9007199254740990}'::jsonb),
  'null consent inputs and terminal revisions must return structured results without overflow'
);

select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'withdraw',
    '72000000-0000-4000-8000-000000000090',
    9007199254740990,
    null
  ) @> '{"outcome":"consent_stale","state":"granted","current_consent_epoch":1}'::jsonb,
  'a mismatched maximum expected epoch must be fenced without arithmetic'
);

select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000093',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) @> '{"outcome":"consent_stale","state":"granted","current_consent_epoch":1}'::jsonb,
  'a stale consent intent must be fenced and receipted'
);

select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'withdraw',
    '72000000-0000-4000-8000-000000000004',
    1,
    null
  ) ->> 'consent_epoch') = '2',
  'withdrawal must advance the consent epoch'
);

select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000001',
    0,
    1,
    '72000000-0000-4000-8000-000000000002',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) ->> 'outcome') = 'consent_stale',
  'old put replay after withdrawal must not return its erased saved receipt'
);
select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000001',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) @> '{"outcome":"consent_stale","state":"withdrawn","current_consent_epoch":2}'::jsonb,
  'a delayed original grant must not re-enable sync after withdrawal'
);
select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000093',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) @> '{"outcome":"consent_stale","state":"withdrawn","current_consent_epoch":2}'::jsonb,
  'replaying a stored stale receipt must synthesize the current withdrawn state'
);
reset role;

select pg_temp.assert_true(
  not exists (
    select 1 from public.living_chart_moments
    where user_id = '71000000-0000-4000-8000-000000000001'
  )
    and exists (
      select 1
      from public.living_chart_sync_consents
      where user_id = '71000000-0000-4000-8000-000000000001'
        and state = 'withdrawn'
        and consent_epoch = 2
        and policy_version is null
    )
    and not exists (
      select 1
      from living_chart_private.living_chart_mutations
      where user_id = '71000000-0000-4000-8000-000000000001'
        and result ->> 'outcome' = 'saved'
    ),
  'withdrawal must leave no payload or stale success receipt'
);

-- Regrant advances the epoch again. Only the new epoch can write.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000005',
    2,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'consent_epoch') = '3',
  'regrant must create a new consent epoch'
);
select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'withdraw',
    '72000000-0000-4000-8000-000000000004',
    1,
    null
  ) @> '{"outcome":"consent_stale","state":"granted","current_consent_epoch":3}'::jsonb,
  'a delayed old withdrawal must not misreport or revoke the regranted epoch'
);
select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000093',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) @> '{"outcome":"consent_stale","state":"granted","current_consent_epoch":3}'::jsonb,
  'replaying a stored stale receipt must synthesize the current regranted state'
);
select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000003',
    0,
    1,
    '72000000-0000-4000-8000-000000000006',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) ->> 'outcome') = 'consent_stale',
  'a stale pre-withdrawal tab must not write after regrant'
);
select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000003',
    0,
    3,
    '72000000-0000-4000-8000-000000000007',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) ->> 'outcome') = 'saved',
  'current epoch must be writable'
);
select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000003',
    0,
    3,
    '72000000-0000-4000-8000-000000000008',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) ->> 'outcome') = 'conflict',
  'revision mismatch must return a deterministic conflict'
);
select pg_temp.assert_true(
  (public.delete_living_chart_moment(
    '73000000-0000-4000-8000-000000000003',
    1,
    3,
    '72000000-0000-4000-8000-000000000009'
  ) ->> 'outcome') = 'deleted',
  'delete must create a sync tombstone'
);
select pg_temp.assert_true(
  (public.living_chart_sync_snapshot(3) #> '{moments,0,payload}') = 'null'::jsonb
    and (public.living_chart_sync_snapshot(3) #>> '{moments,0,revision}') = '2',
  'snapshot must expose a payload-free tombstone'
);

-- A create response can be lost locally. A base-zero delete must therefore
-- delete an active revision-one row, clear only that moment's put receipt,
-- and fence a delayed replay of the original create.
select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000004',
    0,
    3,
    '72000000-0000-4000-8000-000000000010',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) ->> 'outcome') = 'saved'
    and (public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000006',
      0,
      3,
      '72000000-0000-4000-8000-000000000013',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
    ) ->> 'outcome') = 'saved',
  'lost-ack ordering setup must create two independent moments'
);
select pg_temp.assert_true(
  public.delete_living_chart_moment(
    '73000000-0000-4000-8000-000000000004',
    0,
    3,
    '72000000-0000-4000-8000-000000000012'
  ) @> '{"outcome":"deleted","revision":2}'::jsonb,
  'base-zero delete must cover an unacknowledged revision-one create'
);
select pg_temp.assert_true(
  public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000004',
    0,
    3,
    '72000000-0000-4000-8000-000000000010',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) @> '{"outcome":"conflict","current_revision":2,"deleted":true}'::jsonb,
  'delayed original create must observe deletion-wins after its receipt is cleared'
);
select pg_temp.assert_true(
  public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000006',
    0,
    3,
    '72000000-0000-4000-8000-000000000013',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) @> '{"outcome":"saved","revision":1}'::jsonb,
  'deleting one moment must preserve unrelated lost-ack put receipts'
);
do $$
declare
  first_delete jsonb;
  replay_delete jsonb;
begin
  first_delete := public.delete_living_chart_moment(
    '73000000-0000-4000-8000-000000000005',
    0,
    3,
    '72000000-0000-4000-8000-000000000011'
  );
  replay_delete := public.delete_living_chart_moment(
    '73000000-0000-4000-8000-000000000005',
    0,
    3,
    '72000000-0000-4000-8000-000000000011'
  );
  perform pg_temp.assert_true(
    first_delete = replay_delete
      and first_delete ->> 'outcome' = 'deleted'
      and first_delete ->> 'revision' = '1'
      and first_delete ->> 'updated_at' is not null
      and first_delete ->> 'deleted_at' is not null,
    'missing-row base-zero delete must create a replay-safe revision-one tombstone'
  );
  perform pg_temp.assert_true(
    public.delete_living_chart_moment(
      '73000000-0000-4000-8000-000000000005',
      0,
      3,
      '72000000-0000-4000-8000-000000000014'
    ) @> '{"outcome":"already_deleted","revision":1}'::jsonb,
    'a distinct retry against the tombstone must be idempotently already-deleted'
  );
end;
$$;
reset role;

select pg_temp.assert_true(
  exists (
    select 1 from public.living_chart_moments
    where user_id = '71000000-0000-4000-8000-000000000001'
      and moment_id = '73000000-0000-4000-8000-000000000005'
      and revision = 1
      and payload is null
      and deleted_at is not null
  ),
  'missing-row delete tombstone must consume one safely fenced distinct ID'
);

-- Age the real tombstone, then churn enough receipts to evict the original
-- create acknowledgement. A base-zero lost-ack replay must still collide with
-- the retained tombstone and can never resurrect its payload.
with stale_stamp as (
  select clock_timestamp() - interval '91 days' as deleted_at
)
update public.living_chart_moments
set created_at = stale_stamp.deleted_at - interval '1 day',
    updated_at = stale_stamp.deleted_at,
    deleted_at = stale_stamp.deleted_at
from stale_stamp
where user_id = '71000000-0000-4000-8000-000000000001'
  and moment_id = '73000000-0000-4000-8000-000000000003';

do $$
declare
  index_value integer;
begin
  for index_value in 1..520 loop
    perform living_chart_private.living_chart_record_mutation(
      '71000000-0000-4000-8000-000000000001',
      format(
        '79000000-0000-4000-8000-%s',
        lpad(index_value::text, 12, '0')
      )::uuid,
      'put',
      format(
        '7a000000-0000-4000-8000-%s',
        lpad(index_value::text, 12, '0')
      )::uuid,
      repeat('b', 64),
      jsonb_build_object('outcome', 'conflict')
    );
  end loop;
end;
$$;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  public.put_living_chart_moment(
    '73000000-0000-4000-8000-000000000003',
    0,
    3,
    '72000000-0000-4000-8000-000000000007',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000001')
  ) @> '{"outcome":"conflict","current_revision":2,"deleted":true}'::jsonb,
  'base-zero replay after receipt churn must receive deletion-wins from the old tombstone'
);
reset role;

select pg_temp.assert_true(
  exists (
    select 1 from public.living_chart_moments
    where user_id = '71000000-0000-4000-8000-000000000001'
      and moment_id = '73000000-0000-4000-8000-000000000003'
      and deleted_at is not null
      and payload is null
  ),
  'tombstones must survive age and receipt pruning for the entire consent epoch'
);

-- Exercise the otherwise-theoretical safe-integer terminal epoch. Withdrawal
-- must still erase/fence at the ceiling, while regrant returns a structured
-- limit instead of overflowing a table constraint.
insert into public.living_chart_sync_consents (
  user_id,
  state,
  consent_epoch,
  policy_version,
  granted_at,
  withdrawn_at,
  created_at,
  updated_at
) values (
  '71000000-0000-4000-8000-000000000005',
  'granted',
  9007199254740990,
  'living-chart-sync-2026-08-18.v1',
  clock_timestamp(),
  null,
  clock_timestamp(),
  clock_timestamp()
);

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000005',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000005","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  public.set_living_chart_sync_consent(
    'withdraw',
    '72000000-0000-4000-8000-000000000500',
    9007199254740990,
    null
  ) @> '{"outcome":"withdrawn","consent_epoch":9007199254740990}'::jsonb,
  'terminal-epoch withdrawal must remain available without overflow'
);
select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000501',
    9007199254740990,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'outcome') = 'consent_epoch_limit_reached',
  'terminal-epoch regrant must return a structured limit result'
);
reset role;

-- Bound the mutation ledger and the consent-epoch distinct-id inventory without
-- pruning tombstones.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","is_anonymous":false}',
  false
);
select public.set_living_chart_sync_consent(
  'grant',
  '72000000-0000-4000-8000-000000000100',
  0,
  'living-chart-sync-2026-08-18.v1'
);
reset role;

do $$
declare
  index_value integer;
  candidate_id uuid;
begin
  for index_value in 1..520 loop
    candidate_id := format(
      '75000000-0000-4000-8000-%s',
      lpad(index_value::text, 12, '0')
    )::uuid;
    perform living_chart_private.living_chart_record_mutation(
      '71000000-0000-4000-8000-000000000002',
      candidate_id,
      'put',
      format(
        '7b000000-0000-4000-8000-%s',
        lpad(index_value::text, 12, '0')
      )::uuid,
      repeat('a', 64),
      jsonb_build_object('outcome', 'conflict')
    );
  end loop;
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 512
   from living_chart_private.living_chart_mutations
   where user_id = '71000000-0000-4000-8000-000000000002'),
  'mutation receipts must be capped at 512 per account'
);

insert into public.living_chart_moments (
  user_id, moment_id, consent_epoch, revision, payload, created_at, updated_at, deleted_at
)
select
  '71000000-0000-4000-8000-000000000002',
  format('76000000-0000-4000-8000-%s', lpad(index_value::text, 12, '0'))::uuid,
  1,
  1,
  pg_temp.large_living_payload('74000000-0000-4000-8000-000000000002'),
  clock_timestamp(),
  clock_timestamp(),
  null
from generate_series(1, 51) as index_value;

select pg_temp.assert_true(
  living_chart_private.living_chart_payload_valid(
    pg_temp.large_living_payload('74000000-0000-4000-8000-000000000002')
  )
    and octet_length(
      pg_temp.large_living_payload('74000000-0000-4000-8000-000000000002')::text
    ) between 24000 and 32768,
  'near-maximum valid payload must stay below the 32 KiB row boundary'
);

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","is_anonymous":false}',
  false
);
do $$
declare
  first_page jsonb;
  second_page jsonb;
  cursor_id uuid;
begin
  first_page := public.living_chart_sync_snapshot(1, null);
  cursor_id := (first_page ->> 'next_after')::uuid;
  second_page := public.living_chart_sync_snapshot(1, cursor_id);
  perform pg_temp.assert_true(
    first_page ->> 'outcome' = 'ready'
      and jsonb_array_length(first_page -> 'moments') = 50
      and (first_page ->> 'has_more')::boolean
      and cursor_id = '76000000-0000-4000-8000-000000000050'::uuid
      and octet_length(first_page::text) < 1700000
      and second_page ->> 'outcome' = 'ready'
      and jsonb_array_length(second_page -> 'moments') = 1
      and not (second_page ->> 'has_more')::boolean
      and second_page -> 'next_after' = 'null'::jsonb
      and (second_page #>> '{moments,0,moment_id}')::uuid > cursor_id,
    '51 near-limit rows must paginate monotonically as 50 + 1 within response bounds'
  );
end;
$$;
reset role;

insert into public.living_chart_moments (
  user_id, moment_id, consent_epoch, revision, payload, created_at, updated_at, deleted_at
)
select
  '71000000-0000-4000-8000-000000000002',
  format('76000000-0000-4000-8000-%s', lpad(index_value::text, 12, '0'))::uuid,
  1,
  1,
  pg_temp.living_payload('74000000-0000-4000-8000-000000000002'),
  clock_timestamp(),
  clock_timestamp(),
  null
from generate_series(52, 250) as index_value;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.put_living_chart_moment(
    '78000000-0000-4000-8000-000000000001',
    0,
    1,
    '72000000-0000-4000-8000-000000000101',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000002')
  ) ->> 'outcome') = 'moment_limit_reached',
  'the 251st active moment must be rejected'
);
select pg_temp.assert_true(
  (select count(*) = 250 from public.living_chart_moments)
    and not exists (
      select 1
      from public.living_chart_moments
      where moment_id = '78000000-0000-4000-8000-000000000001'
    ),
  'active-cap rejection must not insert the candidate after an aggregate overwrites FOUND'
);
select pg_temp.assert_true(
  (public.delete_living_chart_moment(
    '76000000-0000-4000-8000-000000000250',
    1,
    1,
    '72000000-0000-4000-8000-000000000105'
  ) ->> 'outcome') = 'deleted'
    and (public.put_living_chart_moment(
      '78000000-0000-4000-8000-000000000001',
      0,
      1,
      '72000000-0000-4000-8000-000000000101',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000002')
    ) ->> 'outcome') = 'saved',
  'active-cap rejection must not poison the same mutation after a delete frees capacity'
);
reset role;

with deletion as (
  select clock_timestamp() as deleted_at
)
update public.living_chart_moments
set revision = 2,
    payload = null,
    updated_at = deletion.deleted_at,
    deleted_at = deletion.deleted_at
from deletion
where user_id = '71000000-0000-4000-8000-000000000002'
  and moment_id between
    '76000000-0000-4000-8000-000000000001'::uuid
    and '76000000-0000-4000-8000-000000000150'::uuid;

insert into public.living_chart_moments (
  user_id, moment_id, consent_epoch, revision, payload, created_at, updated_at, deleted_at
)
select
  '71000000-0000-4000-8000-000000000002',
  format('77000000-0000-4000-8000-%s', lpad(index_value::text, 12, '0'))::uuid,
  1,
  1,
  null,
  deletion_time,
  deletion_time,
  deletion_time
from generate_series(1, 749) as index_value
cross join lateral (
  select clock_timestamp() - make_interval(secs => index_value) as deletion_time
) as generated;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  public.put_living_chart_moment(
    '78000000-0000-4000-8000-000000000002',
    0,
    1,
    '72000000-0000-4000-8000-000000000102',
    pg_temp.living_payload('74000000-0000-4000-8000-000000000002')
  ) @> '{"outcome":"moment_limit_reached","limit":1000,"reason":"consent_epoch_storage_limit"}'::jsonb,
  'the 1,001st distinct ID must be rejected without pruning a tombstone'
);
select pg_temp.assert_true(
  (select count(*) = 1000 from public.living_chart_moments)
    and not exists (
      select 1
      from public.living_chart_moments
      where moment_id = '78000000-0000-4000-8000-000000000002'
    ),
  'lifetime-cap rejection must not insert the candidate after an aggregate overwrites FOUND'
);
select pg_temp.assert_true(
  public.put_living_chart_moment(
    '76000000-0000-4000-8000-000000000151',
    1,
    1,
    '72000000-0000-4000-8000-000000000103',
    pg_temp.living_payload(
      '74000000-0000-4000-8000-000000000002',
      'Existing rows remain writable at the distinct-ID ceiling.'
    )
  ) @> '{"outcome":"saved","revision":2}'::jsonb,
  'an existing moment update must remain available at the distinct-ID ceiling'
);
select pg_temp.assert_true(
  public.delete_living_chart_moment(
    '78000000-0000-4000-8000-000000000003',
    0,
    1,
    '72000000-0000-4000-8000-000000000104'
  ) @> '{"outcome":"already_deleted","revision":1}'::jsonb,
  'missing delete at the ceiling must be idempotent without consuming a new ID'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 100
   from public.living_chart_moments
   where user_id = '71000000-0000-4000-8000-000000000002'
     and deleted_at is null)
    and
  (select count(*) = 900
   from public.living_chart_moments
   where user_id = '71000000-0000-4000-8000-000000000002'
     and deleted_at is not null)
    and
  (select count(*) = 1000
   from public.living_chart_moments
   where user_id = '71000000-0000-4000-8000-000000000002'),
  'the active epoch must retain all tombstones within its 1,000-ID lifetime bound'
);

-- Operator rollback control: new grant/put attempts fail closed without a
-- durable receipt, while reads, delete, and withdrawal remain available.
update living_chart_private.living_chart_runtime_settings
set new_writes_enabled = false,
    updated_at = clock_timestamp()
where singleton;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000004',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000004","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000300',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'outcome') = 'temporarily_disabled'
    and (public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000300',
      0,
      1,
      '72000000-0000-4000-8000-000000000301',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000004')
    ) ->> 'outcome') = 'temporarily_disabled',
  'kill switch must fail closed for new grant and put attempts'
);
reset role;

select pg_temp.assert_true(
  not exists (
    select 1
    from living_chart_private.living_chart_mutations
    where user_id = '71000000-0000-4000-8000-000000000004'
  ),
  'temporarily-disabled attempts must not consume their mutation IDs'
);

update living_chart_private.living_chart_runtime_settings
set new_writes_enabled = true,
    updated_at = clock_timestamp()
where singleton;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000004',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000004","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000300',
    0,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'outcome') = 'granted'
    and (public.put_living_chart_moment(
      '73000000-0000-4000-8000-000000000300',
      0,
      1,
      '72000000-0000-4000-8000-000000000301',
      pg_temp.living_payload('74000000-0000-4000-8000-000000000004')
    ) ->> 'outcome') = 'saved',
  'the same queued mutation IDs must succeed after re-enable'
);
reset role;

update living_chart_private.living_chart_runtime_settings
set new_writes_enabled = false,
    updated_at = clock_timestamp()
where singleton;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000004',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000004","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.living_chart_sync_snapshot(1) ->> 'outcome') = 'ready'
    and (public.delete_living_chart_moment(
      '73000000-0000-4000-8000-000000000300',
      1,
      1,
      '72000000-0000-4000-8000-000000000302'
    ) ->> 'outcome') = 'deleted'
    and (public.set_living_chart_sync_consent(
      'withdraw',
      '72000000-0000-4000-8000-000000000303',
      1,
      null
    ) ->> 'outcome') = 'withdrawn'
    and (public.set_living_chart_sync_consent(
      'grant',
      '72000000-0000-4000-8000-000000000304',
      2,
      'living-chart-sync-2026-08-18.v1'
    ) ->> 'outcome') = 'temporarily_disabled',
  'kill switch must preserve snapshot, delete, and withdrawal while blocking regrant'
);
reset role;

update living_chart_private.living_chart_runtime_settings
set new_writes_enabled = true,
    updated_at = clock_timestamp()
where singleton;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000004',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000004","is_anonymous":false}',
  false
);
select pg_temp.assert_true(
  (public.set_living_chart_sync_consent(
    'grant',
    '72000000-0000-4000-8000-000000000304',
    2,
    'living-chart-sync-2026-08-18.v1'
  ) ->> 'consent_epoch') = '3',
  'disabled regrant mutation must remain retryable after recovery'
);
reset role;

select pg_temp.assert_true(
  not exists (
    select 1
    from living_chart_private.living_chart_mutations
    where user_id = '71000000-0000-4000-8000-000000000004'
      and result ->> 'outcome' = 'temporarily_disabled'
  ),
  'kill-switch results must never be persisted in the replay ledger'
);

-- Auth hard deletion is the terminal account-deletion integration. Every
-- Living Chart row and receipt cascades with the Supabase Auth user.
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000003',
  false
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000003","is_anonymous":false}',
  false
);
select public.set_living_chart_sync_consent(
  'grant',
  '72000000-0000-4000-8000-000000000200',
  0,
  'living-chart-sync-2026-08-18.v1'
);
select public.put_living_chart_moment(
  '73000000-0000-4000-8000-000000000200',
  0,
  1,
  '72000000-0000-4000-8000-000000000201',
  pg_temp.living_payload('74000000-0000-4000-8000-000000000003')
);
reset role;

delete from auth.users where id = '71000000-0000-4000-8000-000000000003';
select pg_temp.assert_true(
  not exists (
    select 1 from public.living_chart_sync_consents
    where user_id = '71000000-0000-4000-8000-000000000003'
  )
    and not exists (
      select 1 from public.living_chart_moments
      where user_id = '71000000-0000-4000-8000-000000000003'
    )
    and not exists (
      select 1 from living_chart_private.living_chart_mutations
      where user_id = '71000000-0000-4000-8000-000000000003'
    ),
  'auth deletion must cascade through consent, moments, and receipts'
);

delete from auth.users where id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005'
);

select 'Living Chart sync SQL privacy and lifecycle tests passed.' as result;
