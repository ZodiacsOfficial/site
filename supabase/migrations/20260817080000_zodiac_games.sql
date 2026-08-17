-- Zodiac Games -- free participation layer for The Race.
--
-- The Games are won by free participation only: joins and weekly check-ins
-- score points, and nothing else can. No purchase, balance, holder count,
-- market value, or token activity has any write path into these tables.
--
-- Identity is an opaque 64-hex server HMAC of a signed browser session
-- (never an email, wallet, IP, or account id), plus a coarse IP-bucket HMAC
-- used only for the join rate limit. Every read and write goes through a
-- server endpoint using the service-role credential; the browser has no
-- direct path. Dedupe is structural: one participant row per hash, one
-- check-in row per participant per ISO week, so a replayed request cannot
-- double-count. Replaying this migration is safe.

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
  points integer not null,
  checked_in_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (participant_hash, iso_year, iso_week),
  constraint zodiac_games_checkin_iso_year_range
    check (iso_year between 2020 and 2100),
  constraint zodiac_games_checkin_iso_week_range
    check (iso_week between 1 and 53),
  constraint zodiac_games_checkin_points_range
    check (points between 0 and 1000),
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

-- Non-authoritative join rate-limit ledger, keyed by a coarse IP-bucket HMAC.
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
  join_points constant integer := 100;
  today date;
  bucket_count integer;
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
    pg_catalog.hashtext(zodiac_games_join_v1.bucket_hash)
  );

  today := (pg_catalog.clock_timestamp() at time zone 'utc')::date;

  delete from public.zodiac_games_join_quota
  where quota_day < today - 1;

  select coalesce(q.join_count, 0)
  into bucket_count
  from (select 1) as seed
  left join public.zodiac_games_join_quota as q
    on q.bucket_hash = zodiac_games_join_v1.bucket_hash
   and q.quota_day = today;

  if bucket_count >= zodiac_games_join_v1.bucket_limit then
    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited'
    );
  end if;

  insert into public.zodiac_games_join_quota as q (
    bucket_hash, quota_day, join_count
  )
  values (zodiac_games_join_v1.bucket_hash, today, 1)
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

create or replace function public.zodiac_games_checkin_v1(
  participant_hash text,
  season_id text,
  iso_year integer,
  iso_week integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  checkin_points constant integer := 25;
  participant_sign text;
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
    participant_hash, iso_year, iso_week, season_id, sign, points
  ) values (
    zodiac_games_checkin_v1.participant_hash,
    zodiac_games_checkin_v1.iso_year,
    zodiac_games_checkin_v1.iso_week,
    zodiac_games_checkin_v1.season_id,
    participant_sign,
    checkin_points
  )
  on conflict (participant_hash, iso_year, iso_week) do nothing;

  inserted := found;

  if not inserted then
    return pg_catalog.jsonb_build_object(
      'status', 'already_counted',
      'sign', participant_sign,
      'iso_year', zodiac_games_checkin_v1.iso_year,
      'iso_week', zodiac_games_checkin_v1.iso_week
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
    'iso_year', zodiac_games_checkin_v1.iso_year,
    'iso_week', zodiac_games_checkin_v1.iso_week,
    'points_awarded', checkin_points
  );
end;
$$;

create or replace function public.zodiac_games_standings_v1(
  season_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  rows jsonb;
begin
  if zodiac_games_standings_v1.season_id is null
     or zodiac_games_standings_v1.season_id !~ '^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$' then
    raise exception using
      errcode = '22023',
      message = 'zodiac_games_standings_v1: malformed season id';
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

  return pg_catalog.jsonb_build_object(
    'season_id', zodiac_games_standings_v1.season_id,
    'standings', rows
  );
end;
$$;

revoke all on function public.zodiac_games_join_v1(text, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_join_v1(text, text, text, text, integer)
  to service_role;

revoke all on function public.zodiac_games_checkin_v1(text, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_checkin_v1(text, text, integer, integer)
  to service_role;

revoke all on function public.zodiac_games_standings_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.zodiac_games_standings_v1(text)
  to service_role;
