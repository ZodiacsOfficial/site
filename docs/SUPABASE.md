# Supabase Account Sync

This documents the live account-sync provisioning for Zodiacs.org saved charts.

## Live Project

- Supabase project: `Zodiacs.org`
- Project ref: `mftpcdpttteuwbolobye`
- API URL: `https://mftpcdpttteuwbolobye.supabase.co`
- Region: `ap-northeast-1` (Northeast Asia / Tokyo)
- Frontend key type: modern publishable key (`sb_publishable_...`)

Do not commit publishable keys, secret keys, service-role keys, SQL connection
strings, or mailbox transcripts to this file. The publishable key is safe for a
browser bundle only because all sync tables have RLS enabled and owner policies.

## Applied Migrations

The existing repo migrations were run against the live project on 2026-07-07:

- `supabase/migrations/20260706000000_profile_sync.sql`
- `supabase/migrations/20260706130517_chart_deletions.sql`

The SQL is idempotent and was run from the Supabase SQL Editor in the
admin browser session.

## Auth Configuration

Authentication is magic-link email only for this release. No OAuth providers are
required.

Current URL configuration observed in Supabase:

- Site URL: `https://zodiacs.org`
- Redirect URLs:
  - `https://zodiacs.org/profile/`
  - `https://*.vercel.app/profile/`
  - `http://localhost:4321/profile/`
  - `http://127.0.0.1:4321/profile/`

The frontend sends magic links with `emailRedirectTo` set to
`window.location.origin + '/profile/'`, so the production site, Vercel previews,
and local dev URLs must stay in the allow-list.

## Vercel Environment Variables

Project: `zodiacsofficial/zodiacs-org`

Production was verified to contain:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Production values were checked against the live Supabase project on 2026-07-07:

- `PUBLIC_SUPABASE_URL` matched `https://mftpcdpttteuwbolobye.supabase.co`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY` existed and had the `sb_publishable_` shape
- No `PUBLIC_SUPABASE_ANON_KEY` was required

Production was redeployed after verification:

- Deployment: `https://zodiacs-8o4gyyqo1-zodiacsofficial.vercel.app`
- Alias: `https://zodiacs.org`

Vercel also has Development values and a historical branch-scoped Preview value
for `claude/zodiacs-org-strategy-hevw5u`. The CLI rejected adding another
general Preview value because the variable already exists in Vercel's environment
store. If a future preview cannot sync, check Vercel's Environment Variables UI
and add unscoped Preview values for the two public Supabase envs.

## Verification Transcript

Schema/RLS verification in the live Supabase SQL Editor returned:

| check_name | table_exists | rls_enabled | policy_count |
| --- | ---: | --- | ---: |
| `profiles` | 1 | `true` | 4 |
| `charts` | 1 | `true` | 4 |
| `chart_deletions` | 1 | `true` | 4 |

The same migration was also applied and inspected through the Supabase connector
on a zero-cost unused project (`wlzzboekuffmagakvxaq`) before the already-open
admin browser project was discovered. That project is not wired to Vercel or
production.

Connector security advisor result on the schema:

```text
security lints: []
```

Connector performance advisor result on the fresh schema:

```text
INFO unused_index: public.charts.charts_user_updated_idx has not been used
INFO unused_index: public.chart_deletions.chart_deletions_user_deleted_idx has not been used
```

This is expected immediately after provisioning, before real sync traffic.

Anonymous REST probes against the live Production envs:

```text
GET /rest/v1/charts?select=id&limit=1
status: 401
body: {"code":"42501","message":"permission denied for table charts",...}
```

```text
POST /rest/v1/charts with forged user_id
status: 401
body: {"code":"42501","message":"permission denied for table charts",...}
```

The original QA target said anonymous select should return zero rows. The live
schema is stricter: `anon` has no table privileges, so unauthenticated reads and
forged inserts are denied before row filtering.

Source security scan:

```text
No service-role key, secret Supabase key, or backend secret was found in source.
Only public env names appear in client code:
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_PUBLISHABLE_KEY
PUBLIC_SUPABASE_ANON_KEY
```

Live page checks:

- `/profile/` renders the signed-out saved-charts UI with magic-link email copy.
- `/birth-chart/` does not load the profile manager island.
- Calculator copy was tightened so account-sync language stays on `/profile/`
  and methodology surfaces, not inside the calculator UI.

## Key Rotation

If the publishable key is rotated:

1. Create or rotate the publishable key in Supabase API Keys.
2. Update Vercel Production, Preview, and Development values for
   `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Redeploy Production.
4. Verify `/profile/` signed-out UI loads and anonymous REST probes still fail.

Do not add a service-role key to Vercel for the browser sync path.

## Production Account-Sync Acceptance

The real mailbox and two-device acceptance was completed on 2026-07-23 against
production SHA `ad91e7ebb2987067e9b7258224fa94bf7702cc45`, using only the
approved `admin@zodiacs.org` account:

- A clean signed-out browser saved a temporary chart locally before sign-in.
- The first magic link was requested at `2026-07-23T14:33:46.020Z`, arrived in
  the approved mailbox, completed the `/profile/` round trip, and uploaded the
  local chart.
- A second clean browser began with zero local charts. Its magic link was
  requested at `2026-07-23T14:36:55.246Z`; after sign-in, the uploaded chart
  restored from the account.
- Renaming the temporary chart in the first browser and syncing the second
  reproduced the new name there.
- Deleting it in the second browser and syncing the first removed it there.
  The temporary chart was removed from both local contexts and the account.
- After signing out, the first browser saved and removed a second temporary
  local-only chart successfully.
- Both browser contexts completed without page or console errors. No address
  other than the approved admin mailbox was used, and the existing canary chart
  was not changed.

## Since this was written (2026-07-14 addendum)

Two more Supabase surfaces were added after the provisioning above:

- **Assistant quota** (`api/assistant.ts`): the `assistant_quota` table and
  `assistant_quota_bump` definer function — the SQL and its security notes
  live in PR #77's description. Applied during the assistant's preview
  verification.
- **Push subscriptions** (`api/push/subscribe.ts`): the `push_subscriptions`
  table from the push setup packet. Preview-scoped until the push launch
  flip.

Keep this file's rule: no keys, no connection strings, ever.
