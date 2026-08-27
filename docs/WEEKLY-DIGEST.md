# Account-linked weekly digest

The weekly digest is the saved-chart email for signed-in accounts. It is
separate from the dormant standalone sign-email capture described in
`docs/EMAIL-CAPTURE.md`. On Mondays at 06:00 UTC, GitHub Actions selects
profiles whose `public.profiles.digest_opt_in` value is true, resolves their
Auth email addresses, computes the coming week's transits against their saved
charts, and sends one text-first email through Resend.

The schedule is disabled unless the repository variable `DIGEST_ENABLED` is
exactly `true`. Keep it unset or false until the complete acceptance sequence
below passes. The sender and workflow both enforce an 80-recipient ceiling;
neither a dispatch input nor `DIGEST_MAX_SENDS` can raise it. This leaves
headroom under Resend Free's 100-transactional-email daily quota for account
confirmations and other traffic.

## User control and unsubscribe authority

- `/profile/` exposes an unchecked-by-default preference to signed-in users.
- The authoritative preference is `public.profiles.digest_opt_in`.
- Each live delivery receives a fresh random 256-bit unsubscribe capability.
  Only its SHA-256 digest, owner, expiry, and use state are stored in
  `public.weekly_digest_unsubscribe_tokens`; the raw capability appears only in
  that recipient's email link.
- Opening the in-body link performs a read-only `GET` and displays a
  confirmation button. The button's `POST`, and an RFC 8058
  `List-Unsubscribe-Post`, call the narrowly granted
  `public.weekly_digest_unsubscribe_v1` function. That function can only turn
  this preference off. A used capability is idempotent but cannot revoke a
  later opt-in.
- The email remains English-only because the account profile does not store a
  delivery locale.

The public Supabase key can execute the unsubscribe function but has no direct
access to the capability table or profiles. The Vercel function therefore does
not need a database-wide service-role key or an unsubscribe-signing secret.

## Required code and configuration

Supabase:

- Apply `supabase/migrations/20260707125552_weekly_digest_opt_in.sql` and
  `supabase/migrations/20260827090000_weekly_digest_unsubscribe_capability.sql`
  in order.
- Confirm RLS remains enabled on `public.profiles` and its owner policies still
  scope account access to `auth.uid()`.
- Confirm the capability table grants direct access only to `service_role` and
  the unsubscribe function grants only `EXECUTE` to `anon`, `authenticated`,
  and `service_role`.

Resend:

- Authenticate the sending domain with its required DNS records.
- Use a sending-access key and a verified sender on that domain.
- Confirm the account is still on a plan whose limits match the committed
  80-recipient ceiling before enabling the schedule.

GitHub repository settings used by `.github/workflows/weekly-digest.yml`:

- Secret: `RESEND_API_KEY`
- Secret: `SUPABASE_SERVICE_ROLE_KEY`
- Variable: `PUBLIC_SUPABASE_URL`
- Variable: `DAILY_EMAIL_POSTAL_ADDRESS` — the valid physical postal address
  printed in every live email
- Optional variable: `DIGEST_FROM_EMAIL`
- Optional variable: `DIGEST_BASE_URL`
- Release variable: `DIGEST_ENABLED` — leave unset or false through acceptance

The service-role key stays in GitHub Actions, where recipient selection and
capability-digest insertion require it. It is never copied to Vercel.

Vercel settings used only by `/api/unsubscribe`:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy public anon-key name remains a
  compatibility fallback)

These are the site's existing public browser credentials. Do not add
`SUPABASE_SERVICE_ROLE_KEY` or `DIGEST_UNSUBSCRIBE_SECRET` to Vercel for this
feature.

## Release acceptance

Do these in order, without pasting credentials, recipient data, or unsubscribe
links into commands, issues, screenshots, or chat:

1. Apply and test the capability migration. Keep `DIGEST_ENABLED` unset or
   false.
2. In **Actions → Weekly Digest**, dispatch with `dry_run=true` and `limit=1`.
   The smoke step prints the complete fixture email. Any database-backed
   recipient render prints counts only; its address, chart names, body, and
   unsubscribe capability are redacted.
3. Make the owner-controlled canary the only opted-in account. Dispatch with
   `dry_run=false` and `limit=1`.
4. Inspect the received canary for the correct sender, content, physical postal
   footer, and unsubscribe link. Opening the link must not change database
   state; submit the visible confirmation form to exercise the `POST`.
5. Verify the canary's `digest_opt_in` value became false, the capability is
   marked used, invalid capabilities fail closed, and direct anon/authenticated
   reads of the capability table remain denied.
6. Only after every check passes may the owner explicitly set
   `DIGEST_ENABLED=true`. A failed check leaves it unset or false.

## Local and CI checks

The only dry-run that prints an email body is the synthetic fixture:

```bash
npm run digest:weekly -- --dry-run --fixture --week-start 2026-07-13 --limit 1
```

A database-backed dry-run may be used to verify selection, but its output is
aggregate and non-personal even when real profiles are selected:

```bash
npm run digest:weekly -- --dry-run --limit 1
```

`Site Check` runs the fixture command on every PR. Live canaries belong in the
manual workflow after code review and migration verification, never in PR CI.
The complete `Site Check` suite must pass before this remediation can merge;
the targeted commands above are not a substitute.
