-- Production-compatible legacy assistant_quota fixture.
-- Disposable PostgreSQL 17 test database only; run before repository migrations.
\set ON_ERROR_STOP on

create table public.assistant_quota (
  visitor_hash text not null,
  day date not null default (pg_catalog.now() at time zone 'utc')::date,
  count integer not null default 0,
  constraint assistant_quota_pkey primary key (visitor_hash, day),
  constraint assistant_quota_hash_shape
    check (visitor_hash ~ '^[0-9a-f]{64}$'),
  constraint assistant_quota_count_sane
    check (count between 0 and 10000)
);

insert into public.assistant_quota (visitor_hash, day, count)
values
  (repeat('a', 64), (pg_catalog.now() at time zone 'utc')::date, 7),
  (repeat('b', 64), (pg_catalog.now() at time zone 'utc')::date - 1, 9);

-- Column renames must preserve these exact constraint objects rather than
-- dropping and recreating them around the existing data.
create table public.guide_quota_legacy_constraint_audit (
  constraint_name name primary key,
  constraint_oid oid not null
);

insert into public.guide_quota_legacy_constraint_audit (
  constraint_name,
  constraint_oid
)
select constraint_record.conname, constraint_record.oid
from pg_catalog.pg_constraint as constraint_record
where constraint_record.conrelid = 'public.assistant_quota'::pg_catalog.regclass;

select 'Guide legacy quota fixture ready' as result;
