# Account-linked weekly digest

The weekly digest is the saved-chart email for signed-in accounts. It is
separate from the dormant standalone sign-email capture described in
`docs/EMAIL-CAPTURE.md`. On Mondays at 06:00 UTC, GitHub Actions selects
opted-in accounts through a service-only candidate function, reads one bounded
content projection at a time, computes the coming week's transits, and sends
one text-first email through Resend. The projection contains only the current
Auth email plus at most five chart names and body longitudes. Birth dates,
places, complete chart payloads, and Auth metadata do not cross the database
boundary.

The schedule is disabled unless the repository variable `DIGEST_ENABLED` is
exactly `true`. Keep it unset or false until the complete acceptance sequence
below passes. The sender caps one process at 80 attempts, while the database
ledger structurally limits each Monday edition to 80 non-cancelled slots across
every retry and concurrent workflow run. Neither a dispatch input nor
`DIGEST_MAX_SENDS` can raise either ceiling. Confirm the current provider quota
still leaves headroom for account confirmations and other traffic before
enabling the schedule.

New live fences may be created only on Monday before 19:00 UTC, when the full
Monday/Tuesday recovery cadence remains ahead. A manual run outside that window
must select `recovery_only`; it can replay an existing safe fence but cannot add
a recipient.

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
  later opt-in; that idempotent retry window is bounded to 24 hours and the
  capability must still be unexpired.
- `public.weekly_digest_deliveries` assigns one of 80 constrained slots and
  records `reserved → dispatching → sent|failed|reconciliation`. A known-unsent
  cancellation can release a reserved slot. Once a provider request starts,
  the slot and account/week tombstone are retained even if the response is
  lost, so a later run cannot create a new personalized payload for that
  edition.
- The email remains English-only because the account profile does not store a
  delivery locale.

The public Supabase key can execute the unsubscribe function but has no direct
access to the capability table or profiles. The Vercel function therefore does
not need a database-wide service-role key or an unsubscribe-signing secret.

## Exact replay and reconciliation

Immediately before a live provider request, the sender builds one canonical
Resend envelope: fixed endpoint and method, the exact JSON body, and the stable
account/week idempotency key. It hashes that envelope, then seals it with
AES-256-GCM using a domain-separated key derived from the dedicated
`EMAIL_CONFIRM_SECRET` stored in the protected weekly environment. Authenticated context binds the ciphertext to the week,
account, and idempotency key. The API key is never included. The authorization
function atomically rechecks opt-in and the minimal content digest before it
stores the sealed envelope and moves the row to `dispatching`.

Every live run checks abandoned dispatches before selecting new candidates.
The primary Monday 06:00 UTC schedule has bounded continuation runs at 06:15,
07:00, 10:00, and 18:00; each resumes an interrupted batch only after exact
recovery succeeds. Recovery-only runs at 05:00/05:15, 06:00/06:15,
07:00/07:15, 10:00/10:15, and 17:00/17:15 Tuesday revisit every possible Monday
fence before expiry without creating a fresh provider fence. All schedules
remain behind the same `DIGEST_ENABLED` gate:

- A dispatch is not recoverable until its original 30-second request has had a
  two-minute safety margin.
- Within the provider's 24-hour idempotency window, recovery rechecks the
  current opt-in and content digest, opens the saved envelope, verifies its
  context, digest, and stable key, then replays the exact same bytes and key.
  It never rerenders or substitutes a current email address. Claims stop five
  minutes before expiry. One absolute deadline derived from the original
  dispatch fence bounds every provider attempt and rate-limit sleep, so a retry
  cannot cross the provider's idempotency-key expiry. The sender ends that
  deadline one minute early as a local-clock and network safety margin. All
  recovery envelopes in a run share the oldest claim's serialized pacing queue
  and conservative deadline; a later claim cannot reset the rate limiter.
- A database-detected unsubscribe, destination/content change, or cancellation
  request moves the row directly to `reconciliation`. An envelope decryption,
  context, or envelope-digest failure aborts without a provider request; its
  fenced row ages into `reconciliation` at 24 hours. Neither case is
  automatically resent. Entering reconciliation erases the encrypted request
  body while retaining the non-content envelope digest, idempotency key, and
  delivery tombstone needed for the provider-side investigation.
- Rate-limit exhaustion, concurrent-idempotency responses, provider 5xx,
  authentication/configuration failures, transport ambiguity, and unknown
  responses abort the run without consuming more candidate slots. Only an
  explicitly recipient-specific bounded provider code may become `failed`.

For a `reconciliation` row, use the protected database console and Resend
dashboard to compare the stored idempotency key, dispatch time, and provider
record. If Resend proves acceptance, finalize the existing lease with the
provider receipt through `weekly_digest_finish_v1`. If it proves one of the
allowed recipient-specific rejections, finalize that exact status and code.
If neither outcome can be proven, retain the reconciliation tombstone. After
24 hours, never resend: the provider's deduplication record may have expired.
Do not copy recipient data, sealed envelopes, receipts, capabilities, or
secrets into logs, commands, issues, screenshots, or chat.

Rotating `EMAIL_CONFIRM_SECRET` makes any outstanding sealed envelope
unreadable. Before rotation, resolve or deliberately quarantine every
`dispatching` row. Never preserve the old secret in a ticket or runbook.

## Required code and configuration

Supabase:

- Apply `supabase/migrations/20260707125552_weekly_digest_opt_in.sql` and
  `supabase/migrations/20260827090000_weekly_digest_unsubscribe_capability.sql`
  in order.
- Confirm RLS remains enabled on `public.profiles` and its owner policies still
  scope account access to `auth.uid()`.
- Confirm neither capability nor delivery table grants direct access to any API
  role. The unsubscribe function grants only `EXECUTE` to `anon`; issuance,
  bounded candidate/content projection, authorization, recovery, cancellation,
  cleanup, and finalization functions grant only `EXECUTE` to `service_role`.

Resend:

- Authenticate the sending domain with its required DNS records.
- Use a sending-access key and a verified sender on that domain.
- Confirm the account is still on a plan whose limits match the committed
  80-recipient ceiling before enabling the schedule.

GitHub settings used by `.github/workflows/weekly-digest.yml`:

- Create the `weekly-digest-production` environment and restrict deployment
  branches to the repository's default branch. Do this before any manual or
  scheduled live run: manual Actions can select another ref, and the workflow
  definition at that ref is not a trustworthy secret boundary by itself.
- Store the three secrets below only in that protected environment, not as
  repository- or organization-level Actions secrets. If another workflow needs
  the same underlying credential, give it its own protected environment rather
  than leaving a broadly branch-readable copy.

- Environment secret: `RESEND_API_KEY`
- Environment secret: `SUPABASE_SERVICE_ROLE_KEY`
- Environment secret: `EMAIL_CONFIRM_SECRET` — a dedicated independently
  generated random value of at least 32 bytes; live digest runs derive a
  domain-separated envelope key from it
- Variable: `PUBLIC_SUPABASE_URL`
- Variable: `DAILY_EMAIL_POSTAL_ADDRESS` — the valid physical postal address
  printed in every live email
- Optional variable: `DIGEST_FROM_EMAIL`
- Optional variable: `DIGEST_BASE_URL`
- Release variable: `DIGEST_ENABLED` — leave unset or false through acceptance

The service-role key and digest use of `EMAIL_CONFIRM_SECRET` stay in GitHub
Actions, where the narrow delivery RPCs and sealed replay require them. Manual
dry runs receive no confirmation secret, and the synthetic fixture step never
receives either live recipient data or that secret. The service-role key has no
direct access to the two capability tables and is never copied to Vercel.

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

1. Apply the capability migration and run `npm run test:phase3:delivery-sql`.
   This includes real multi-session issuance, authorization, unsubscribe, and
   recovery races. Keep `DIGEST_ENABLED` unset or false.
2. In **Actions → Weekly Digest**, dispatch with `dry_run=true` and `limit=1`.
   The smoke step prints the complete fixture email. Any database-backed
   recipient render prints counts only; its address, chart names, body, and
   unsubscribe capability are redacted.
3. Confirm the protected environment has its dedicated `EMAIL_CONFIRM_SECRET`,
   make the owner-controlled canary the only opted-in account, and dispatch with
   `dry_run=false` and `limit=1`.
4. Inspect the received canary for the correct sender, content, physical postal
   footer, and unsubscribe link. Opening the link must not change database
   state; submit the visible confirmation form to exercise the `POST`.
5. Verify the canary's `digest_opt_in` value became false, the capability is
   marked used, its delivery receipt remains `sent`, its sealed envelope was
   cleared after finalization, invalid capabilities fail closed, and direct
   API-role reads of both internal digest tables remain denied. Confirm there are no
   unexplained `dispatching` or `reconciliation` rows before continuing.
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

The static workflow/sender boundary and the PostgreSQL state machine have
focused checks:

```bash
npx vitest run scripts/weekly-digest-contract.test.mjs src/lib/weekly-digest/delivery.test.ts
npm run test:phase3:delivery-sql
```

The SQL command requires a running Docker daemon and executes
`weekly_digest_unsubscribe.sql` followed by the real multi-session
`weekly_digest_concurrency.sql` race suite.

`Site Check` runs the fixture command on every PR. Live canaries belong in the
manual workflow after code review and migration verification, never in PR CI.
The complete `Site Check` suite must pass before this remediation can merge;
the targeted commands above are not a substitute.
