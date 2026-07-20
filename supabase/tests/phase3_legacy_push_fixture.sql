\set ON_ERROR_STOP on

-- Exact pre-Phase-3 production shape, kept in a disposable database only.
create table public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  lang text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
grant all on table public.push_subscriptions to service_role;

insert into public.push_subscriptions (
  endpoint,
  p256dh,
  auth,
  lang,
  created_at
) values
  (
    'https://push.example.invalid/legacy-default-language',
    'AQID',
    'BAUG',
    null,
    '2026-07-01T01:02:03Z'
  ),
  (
    'https://push.example.invalid/legacy-french',
    'BwgJ',
    'CgsM',
    'fr',
    '2026-07-02T04:05:06Z'
  );
