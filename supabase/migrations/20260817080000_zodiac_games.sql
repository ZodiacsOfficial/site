-- Zodiac Games -- free participation layer for The Race.
--
-- The Games are won by free participation only: joins and weekly check-ins
-- score points, and nothing else can. No purchase, balance, holder count,
-- market value, or token activity has any write path into these tables.
--
-- Identity is a digest of a random 256-bit browser token (never an email,
-- account id, or raw IP). A daily connection fingerprint is HMACed with a
-- database-private key before storage and used only for the join limit.
-- Every read and write goes through a
-- server endpoint using the service-role credential; the browser has no
-- direct path. Dedupe is structural: one participant row per hash, one
-- check-in row per participant, season, and ISO week, so a replay cannot
-- double-count. Replaying this migration is safe.

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.zodiac_games_secrets (
  secret_name text primary key,
  secret_value bytea not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint zodiac_games_secret_value_length
    check (pg_catalog.octet_length(secret_value) = 32)
);

revoke all on table private.zodiac_games_secrets
  from public, anon, authenticated, service_role;

insert into private.zodiac_games_secrets (secret_name, secret_value)
values ('join_bucket_v1', extensions.gen_random_bytes(32))
on conflict (secret_name) do nothing;

create table if not exists public.zodiac_games_participants (
  participant_hash text primary key,
  sign text not null,
  join_season_id text not null,
  joined_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint zodiac_games_participant_hash_format
    check (participant_hash ~ '^[0-9a-f]{64}$'),
  constraint zodiac_games_participant_sign_known
    check (sign in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )),
  constraint zodiac_games_participant_season_format
    check (join_season_id ~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$')
);

create table if not exists public.zodiac_games_checkins (
  participant_hash text not null
    references public.zodiac_games_participants (participant_hash)
    on delete cascade,
  iso_year integer not null,
  iso_week integer not null,
  season_id text not null,
  sign text not null,
  question_id text not null,
  answer_key text not null,
  points integer not null,
  checked_in_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (participant_hash, season_id, iso_year, iso_week),
  constraint zodiac_games_checkin_iso_year_range
    check (iso_year between 2020 and 2100),
  constraint zodiac_games_checkin_iso_week_range
    check (iso_week between 1 and 53),
  constraint zodiac_games_checkin_points_range
    check (points between 0 and 1000),
  constraint zodiac_games_checkin_question_format
    check (question_id ~ '^[a-z0-9-]{1,64}$'),
  constraint zodiac_games_checkin_answer_format
    check (answer_key ~ '^[a-z0-9-]{1,32}$'),
  constraint zodiac_games_checkin_sign_known
    check (sign in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )),
  constraint zodiac_games_checkin_season_format
    check (season_id ~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$')
);

create index if not exists zodiac_games_checkins_season_sign_idx
  on public.zodiac_games_checkins (season_id, sign);

create table if not exists public.zodiac_games_sign_totals (
  season_id text not null,
  sign text not null,
  points bigint not null default 0,
  joins integer not null default 0,
  checkins integer not null default 0,
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (season_id, sign),
  constraint zodiac_games_totals_points_range
    check (points >= 0),
  constraint zodiac_games_totals_sign_known
    check (sign in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )),
  constraint zodiac_games_totals_season_format
    check (season_id ~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$')
);

-- Non-authoritative join-rate ledger, keyed by a DB-protected daily
-- connection fingerprint.
-- Rows self-expire inside the join RPC; nothing here affects scoring.
create table if not exists public.zodiac_games_join_quota (
  bucket_hash text not null,
  quota_day date not null,
  join_count integer not null default 0,
  primary key (bucket_hash, quota_day),
  constraint zodiac_games_join_quota_hash_format
    check (bucket_hash ~ '^[0-9a-f]{64}$'),
  constraint zodiac_games_join_quota_count_range
    check (join_count between 0 and 100000)
);

alter table public.zodiac_games_participants enable row level security;
alter table public.zodiac_games_checkins enable row level security;
alter table public.zodiac_games_sign_totals enable row level security;
alter table public.zodiac_games_join_quota enable row level security;

-- All Games persistence is RPC-only, including for service_role. The
-- SECURITY DEFINER functions below are the sole write and read authority.
revoke all on table public.zodiac_games_participants
  from public, anon, authenticated, service_role;
revoke all on table public.zodiac_games_checkins
  from public, anon, authenticated, service_role;
revoke all on table public.zodiac_games_sign_totals
  from public, anon, authenticated, service_role;
revoke all on table public.zodiac_games_join_quota
  from public, anon, authenticated, service_role;

create or replace function public.zodiac_games_join_v1(
  participant_hash text,
  bucket_hash text,
  sign text,
  season_id text,
  bucket_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  join_points constant integer := 1;
  today date;
  bucket_count integer;
  protected_bucket_hash text;
  bucket_secret bytea;
  existing record;
begin
  if zodiac_games_join_v1.participant_hash is null
     or zodiac_games_join_v1.participant_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_join_v1: malformed participant hash';
  end if;

  if zodiac_games_join_v1.bucket_hash is null
     or zodiac_games_join_v1.bucket_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_join_v1: malformed bucket hash';
  end if;

  select s.secret_value
  into bucket_secret
  from private.zodiac_games_secrets as s
  where s.secret_name = 'join_bucket_v1';

  if bucket_secret is null then
    raise exception using
      errcode = '55000',
      message = 'zodiac_games_join_v1: join protection unavailable';
  end if;

  protected_bucket_hash := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(zodiac_games_join_v1.bucket_hash, 'UTF8'),
      bucket_secret,
      'sha256'
    ),
    'hex'
  );

  if zodiac_games_join_v1.sign is null
     or zodiac_games_join_v1.sign not in (
       'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
       'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
     ) then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_join_v1: unknown sign';
  end if;

  if zodiac_games_join_v1.season_id is null
     or zodiac_games_join_v1.season_id !~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_join_v1: malformed season id';
  end if;

  -- The server may lower this per-bucket ceiling, but cannot pass an
  -- unbounded value that silently disables join protection.
  if zodiac_games_join_v1.bucket_limit is null
     or zodiac_games_join_v1.bucket_limit < 1
     or zodiac_games_join_v1.bucket_limit > 10000 then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_join_v1: bucket limit out of range';
  end if;

  -- Serialize per participant first, then per rate-limit bucket. A 32-bit
  -- advisory-hash collision only serializes unrelated participants; the
  -- exact 256-bit primary key still decides join identity.
  perform pg_catalog.pg_advisory_xact_lock(
    151462745,
    pg_catalog.hashtext(zodiac_games_join_v1.participant_hash)
  );

  select p.sign, p.join_season_id, p.joined_at
  into existing
  from public.zodiac_games_participants as p
  where p.participant_hash = zodiac_games_join_v1.participant_hash;

  if found then
    return pg_catalog.jsonb_build_object(
      'status', 'already_joined',
      'sign', existing.sign,
      'season_id', existing.join_season_id,
      'joined_at', pg_catalog.to_char(
        existing.joined_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'
      )
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    151462746,
    pg_catalog.hashtext(protected_bucket_hash)
  );

  today := (pg_catalog.clock_timestamp() at time zone 'utc')::date;

  delete from public.zodiac_games_join_quota
  where quota_day < today - 1;

  select coalesce(q.join_count, 0)
  into bucket_count
  from (select 1) as seed
  left join public.zodiac_games_join_quota as q
    on q.bucket_hash = protected_bucket_hash
   and q.quota_day = today;

  if bucket_count >= zodiac_games_join_v1.bucket_limit then
    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited'
    );
  end if;

  insert into public.zodiac_games_join_quota as q (
    bucket_hash, quota_day, join_count
  )
  values (protected_bucket_hash, today, 1)
  on conflict (bucket_hash, quota_day)
  do update set join_count = q.join_count + 1;

  insert into public.zodiac_games_participants (
    participant_hash, sign, join_season_id
  ) values (
    zodiac_games_join_v1.participant_hash,
    zodiac_games_join_v1.sign,
    zodiac_games_join_v1.season_id
  );

  insert into public.zodiac_games_sign_totals as t (
    season_id, sign, points, joins, checkins
  )
  values (zodiac_games_join_v1.season_id, zodiac_games_join_v1.sign, join_points, 1, 0)
  on conflict (season_id, sign)
  do update set
    points = t.points + join_points,
    joins = t.joins + 1,
    updated_at = pg_catalog.clock_timestamp();

  return pg_catalog.jsonb_build_object(
    'status', 'joined',
    'sign', zodiac_games_join_v1.sign,
    'season_id', zodiac_games_join_v1.season_id,
    'points_awarded', join_points
  );
end;
$$;

drop function if exists public.zodiac_games_checkin_v1(text, text, integer, integer);

create or replace function public.zodiac_games_checkin_v1(
  participant_hash text,
  season_id text,
  iso_year integer,
  iso_week integer,
  question_id text,
  answer_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  checkin_points constant integer := 1;
  participant_sign text;
  existing_answer text;
  inserted boolean;
begin
  if zodiac_games_checkin_v1.participant_hash is null
     or zodiac_games_checkin_v1.participant_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: malformed participant hash';
  end if;

  if zodiac_games_checkin_v1.season_id is null
     or zodiac_games_checkin_v1.season_id !~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: malformed season id';
  end if;

  if zodiac_games_checkin_v1.iso_year is null
     or zodiac_games_checkin_v1.iso_year < 2020
     or zodiac_games_checkin_v1.iso_year > 2100 then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: iso year out of range';
  end if;

  if zodiac_games_checkin_v1.iso_week is null
     or zodiac_games_checkin_v1.iso_week < 1
     or zodiac_games_checkin_v1.iso_week > 53 then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: iso week out of range';
  end if;

  if zodiac_games_checkin_v1.question_id is null
     or zodiac_games_checkin_v1.question_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: malformed question id';
  end if;

  if zodiac_games_checkin_v1.answer_key is null
     or zodiac_games_checkin_v1.answer_key !~ '^[a-z0-9-]{1,32}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_checkin_v1: malformed answer key';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    151462745,
    pg_catalog.hashtext(zodiac_games_checkin_v1.participant_hash)
  );

  select p.sign
  into participant_sign
  from public.zodiac_games_participants as p
  where p.participant_hash = zodiac_games_checkin_v1.participant_hash;

  if not found then
    return pg_catalog.jsonb_build_object(
      'status', 'not_joined'
    );
  end if;

  insert into public.zodiac_games_checkins (
    participant_hash, iso_year, iso_week, season_id, sign,
    question_id, answer_key, points
  ) values (
    zodiac_games_checkin_v1.participant_hash,
    zodiac_games_checkin_v1.iso_year,
    zodiac_games_checkin_v1.iso_week,
    zodiac_games_checkin_v1.season_id,
    participant_sign,
    zodiac_games_checkin_v1.question_id,
    zodiac_games_checkin_v1.answer_key,
    checkin_points
  )
  on conflict (participant_hash, season_id, iso_year, iso_week) do nothing;

  inserted := found;

  if not inserted then
    select c.answer_key
    into existing_answer
    from public.zodiac_games_checkins as c
    where c.participant_hash = zodiac_games_checkin_v1.participant_hash
      and c.season_id = zodiac_games_checkin_v1.season_id
      and c.iso_year = zodiac_games_checkin_v1.iso_year
      and c.iso_week = zodiac_games_checkin_v1.iso_week;

    return pg_catalog.jsonb_build_object(
      'status', 'already_counted',
      'sign', participant_sign,
      'season_id', zodiac_games_checkin_v1.season_id,
      'iso_year', zodiac_games_checkin_v1.iso_year,
      'iso_week', zodiac_games_checkin_v1.iso_week,
      'answer_key', existing_answer
    );
  end if;

  insert into public.zodiac_games_sign_totals as t (
    season_id, sign, points, joins, checkins
  )
  values (
    zodiac_games_checkin_v1.season_id, participant_sign, checkin_points, 0, 1
  )
  on conflict (season_id, sign)
  do update set
    points = t.points + checkin_points,
    checkins = t.checkins + 1,
    updated_at = pg_catalog.clock_timestamp();

  return pg_catalog.jsonb_build_object(
    'status', 'checked_in',
    'sign', participant_sign,
    'season_id', zodiac_games_checkin_v1.season_id,
    'iso_year', zodiac_games_checkin_v1.iso_year,
    'iso_week', zodiac_games_checkin_v1.iso_week,
    'answer_key', zodiac_games_checkin_v1.answer_key,
    'points_awarded', checkin_points
  );
end;
$$;

drop function if exists public.zodiac_games_standings_v1(text);

create or replace function public.zodiac_games_standings_v1(
  season_id text,
  iso_year integer,
  iso_week integer,
  question_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  rows jsonb;
  responses jsonb;
begin
  if zodiac_games_standings_v1.season_id is null
     or zodiac_games_standings_v1.season_id !~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_standings_v1: malformed season id';
  end if;

  if zodiac_games_standings_v1.iso_year is null
     or zodiac_games_standings_v1.iso_year < 2020
     or zodiac_games_standings_v1.iso_year > 2100
     or zodiac_games_standings_v1.iso_week is null
     or zodiac_games_standings_v1.iso_week < 1
     or zodiac_games_standings_v1.iso_week > 53 then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_standings_v1: invalid ISO week';
  end if;

  if zodiac_games_standings_v1.question_id is null
     or zodiac_games_standings_v1.question_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_standings_v1: malformed question id';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'sign', ordered.sign,
        'points', ordered.points,
        'joins', ordered.joins,
        'checkins', ordered.checkins
      )
    ),
    '[]'::jsonb
  )
  into rows
  from (
    select t.sign, t.points, t.joins, t.checkins
    from public.zodiac_games_sign_totals as t
    where t.season_id = zodiac_games_standings_v1.season_id
    order by t.points desc, t.sign asc
  ) as ordered;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'sign', ordered.sign,
        'answer_key', ordered.answer_key,
        'count', ordered.response_count
      ) order by ordered.sign, ordered.answer_key
    ),
    '[]'::jsonb
  )
  into responses
  from (
    select c.sign, c.answer_key, pg_catalog.count(*) as response_count
    from public.zodiac_games_checkins as c
    where c.season_id = zodiac_games_standings_v1.season_id
      and c.iso_year = zodiac_games_standings_v1.iso_year
      and c.iso_week = zodiac_games_standings_v1.iso_week
      and c.question_id = zodiac_games_standings_v1.question_id
    group by c.sign, c.answer_key
  ) as ordered;

  return pg_catalog.jsonb_build_object(
    'season_id', zodiac_games_standings_v1.season_id,
    'standings', rows,
    'responses', responses
  );
end;
$$;

revoke all on function public.zodiac_games_join_v1(text, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_join_v1(text, text, text, text, integer)
  to service_role;

revoke all on function public.zodiac_games_checkin_v1(text, text, integer, integer, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_checkin_v1(text, text, integer, integer, text, text)
  to service_role;

revoke all on function public.zodiac_games_standings_v1(text, integer, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_standings_v1(text, integer, integer, text)
  to service_role;
