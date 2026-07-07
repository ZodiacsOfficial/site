# Weekly digest

The weekly digest is the first re-engagement email for synced accounts. It
runs from GitHub Actions on Mondays at 06:00 UTC, reads opted-in profiles with
the Supabase service role, computes the coming week's transits against saved
charts, and sends one plain text-first email through Resend.

## User control

- The `/profile/` page shows an unchecked-by-default preference for signed-in
  users: one weekly email for saved charts.
- The preference is stored on `public.profiles.digest_opt_in`.
- Every email includes a signed one-click unsubscribe URL at
  `/api/unsubscribe`. The RFC 8058 one-click header (`List-Unsubscribe-Post`)
  POSTs to it and unsubscribes immediately; opening the in-body link in a
  browser (a GET) shows a confirm-button page that POSTs, so mail scanners
  that prefetch links cannot unsubscribe anyone by accident.
- The email body is English-only for now. The profile carries no locale, so a
  reader who opted in from the Spanish `/profile/` still receives the English
  digest — consistent with the site's current Spanish-copy deferral.

## Required setup

Supabase:

- Apply `supabase/migrations/20260707125552_weekly_digest_opt_in.sql`.
- Confirm `public.profiles` still has RLS enabled and the existing owner
  policies still scope rows to `auth.uid()`.
- Keep the service-role key out of source and browser code.

Resend:

- Domain-authenticate `zodiacs.org` in Resend with the required SPF/DKIM DNS
  records.
- Use a sending address on that domain, for example
  `Zodiacs.org <hello@zodiacs.org>`.

GitHub repository settings:

- Secret: `RESEND_API_KEY`
- Secret: `SUPABASE_SERVICE_ROLE_KEY`
- Secret: `DIGEST_UNSUBSCRIBE_SECRET`
- Variable: `PUBLIC_SUPABASE_URL`
- Variable: `DIGEST_ENABLED` — the scheduled Monday send is skipped unless this
  is `true`. Leave it unset until a manual dry-run and a live unsubscribe-link
  check pass; manual `workflow_dispatch` runs ignore it and honor their own
  `dry_run` input.
- Optional variable: `DIGEST_FROM_EMAIL`
- Optional variable: `DIGEST_BASE_URL`

Vercel project settings:

- Secret env: `SUPABASE_SERVICE_ROLE_KEY`
- Secret env: `DIGEST_UNSUBSCRIBE_SECRET`

The Vercel secrets are only used by `/api/unsubscribe`. They are never exposed
to the browser.

## Local and CI checks

Dry-run with a fixture:

```bash
npm run digest:weekly -- --dry-run --fixture --week-start 2026-07-13 --limit 1
```

Dry-run against real opted-in profiles:

```bash
npm run digest:weekly -- --dry-run --limit 25
```

Send a small real run:

```bash
npm run digest:weekly -- --limit 10
```

The normal site check workflow runs the fixture dry-run so the renderer, engine
imports, and unsubscribe signing path stay covered without secrets.

## Current owner decision

The code path is ready for review, but production sending should remain off
until the Resend domain is authenticated and the GitHub/Vercel secrets above
are added by the owner.
