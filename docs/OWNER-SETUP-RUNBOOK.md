# Owner setup runbook

Status: reconciled against repository `main` and read-only production probes on
2026-08-27. This runbook is for the **Zodiacs.org website only**.

## 0. Authority and production-preservation rule

This document identifies work that only the owner can decide or perform. It is
not authorization for an agent or this remediation PR to:

- buy or upgrade a plan;
- publish a firewall rule, DNS record, deployment, or production setting;
- create, rotate, reveal, or change a secret or environment variable;
- apply a production migration or change live data;
- create or delete a Supabase project;
- enable, disable, expand, or roll back a live feature; or
- insert a legal identity, jurisdiction, address, governing law, or venue.

Each such action needs a separate, explicit owner instruction. Never paste a
secret, database connection string, backup passphrase, token, or private key
into chat, a command line, a log, a commit, a screenshot, or an artifact. Move
secret values directly between the relevant dashboard and password manager.

### Production state to preserve

Read-only checks on 2026-08-27 found the following pilots live. “Preserve” means
leave their current dashboard configuration unchanged; it does **not** mean set
their flags off.

| Surface | Observed production state | Source contract | This run |
| --- | --- | --- | --- |
| Terminal venue at `/terminal/markets/` | Live | Committed output is flag-off, but a Vercel production build defaults the venue on when `PUBLIC_REGISTRY_EXCHANGE_ENABLED` is absent. An explicit `0` is a rollback. | Preserve; do not add, remove, or change the variable. |
| Registry Collection / Cabinet of Twelve | Live | Committed Registry Collection/Aura output remains flag-off. Production uses the exact collection flag, with the legacy Aura name still accepted. | Preserve live production and committed flag-off bytes. |
| Compatibility invitations | Live | UI, server authorization, Supabase access, and canary/public authorization are separate controls. | Preserve; no launch or rollback. |
| Zodiac Games joining and standings | Live | The public build flag, Supabase configuration, and the server session secret are all required. | Preserve; no launch or rollback. |
| Daily email | Frozen test cohort only | Real delivery is hard-frozen to `DAILY_EMAIL_COHORT=test`. | Do not expand the cohort. |
| Web push | Not part of this remediation | Public UI, server delivery, VAPID material, Supabase access, and workflow scheduling are separate controls. | No changes. |

The old `PUBLIC_REGISTRY_TRADE_ENABLED` setting no longer controls Registry
profiles; their purchase panel is retired. Do not use it as a proxy for Terminal
state. Do not hand-edit generated Registry or Terminal output. Run the owning
generator and commit source plus generated output together whenever a later,
separately authorized change requires it.

## 1. Owner decisions

### 1a. Paid-plan decisions

The owner must decide whether to move the Vercel project from Hobby to a plan
that permits the site's use and supports the intended Firewall configuration.
Check the current terms and price in Vercel before deciding; this runbook does
not approve the purchase.

Supabase leaked-password protection may remain deferred while authentication is
magic-link-only. Before any website password sign-in is released, the owner must
decide whether to use a Supabase plan that supports the protection and then
enable it. The current security-advisor warning is accepted until then.

### 1b. Legal identity, jurisdiction, and address

The public Terms still say the operator identity and governing jurisdiction are
pending. Do not infer them from a domain registration, a filing, a payment
account, or a registered agent. The owner must provide and explicitly authorize
all of these facts:

1. the exact legal operator and data-controller identity;
2. the operator's jurisdiction/country of establishment;
3. a postal address valid for that operator's commercial email under the laws
   that apply;
4. the governing law for the Terms; and
5. the chosen venue or dispute forum.

A PO box or registered-agent address is **not automatically sufficient**. The
owner must confirm that the chosen address is genuinely usable for the operator
and applicable jurisdiction and can receive required mail. Obtain legal advice
if that is uncertain.

Legal identity must be deployed before any new public standalone email capture
is enabled. An account-digest canary separately requires the genuinely valid,
owner-approved postal address printed in the message footer.

After the owner supplies the exact facts, a separate authorized legal PR must:

- update the operator, controller/contact, applicable-law, and venue text;
- update the visible `updated` date on every legal page it changes;
- update `modifiedAt` in each changed English structured-data block in
  `src/pages/terms/index.astro` and `src/pages/privacy/index.astro`; and
- leave `DAILY_EMAIL_POSTAL_ADDRESS` unchanged until the owner separately
  authorizes the matching dashboard update.

The ES/FR/IT/PT privacy pages are Phase 1 protected. That legal PR must replace
the spent `.github/phase1-scope-allowance.json` with a fresh version pinned to
the exact PR base commit. Its sorted `protectedPaths` must equal exactly the
protected locale files changed, selected from:

- `src/pages/es/privacy/index.astro`
- `src/pages/fr/privacy/index.astro`
- `src/pages/it/privacy/index.astro`
- `src/pages/pt/privacy/index.astro`

Do **not** list `src/pages/terms/index.astro` or
`src/pages/privacy/index.astro`; the English legal files are not protected by
that guard, and an allowance that lists them is invalid. A prior allowance on
`main` is already spent and cannot be reused. This runbook records the required
mechanics; it is not authorization to make the legal edits.

## 2. Encrypted database backup and restore drill

The weekly workflow is `.github/workflows/db-backup.yml`. Until the owner adds
both required repository secrets, it remains a visible no-op:

- `SUPABASE_DB_URL`: the Session pooler value copied directly from the Supabase
  dashboard into the GitHub Actions secret form; and
- `BACKUP_PASSPHRASE`: a long random value generated and retained in the
  owner's password manager.

Do not show either value to an agent or place either value in a shell command.
The workflow converts the database URL into protected libpq inputs rather than
passing a password-bearing URL to PostgreSQL processes. Encryption uses GnuPG
loopback pinentry with the passphrase supplied through a protected file
descriptor, never a process argument.

### Owner setup and first run

These are owner-only actions and need explicit authorization before execution:

1. Confirm the restore workstation has PostgreSQL 17 client tools, GnuPG with
   loopback pinentry support, Node.js, and GNU `tar`. The restore wrapper uses
   `psql`, `gpg`, `node`, and `tar`; the workflow also uses `pg_dump` and
   `pg_restore`.
2. Add the two repository secrets through GitHub's Actions secret forms. Do not
   echo or validate their values in a workflow log.
3. Dispatch **Actions → Database Backup** once and require a green run.
4. Download the encrypted artifact without renaming or unpacking it. The
   repository wrapper validates the bundle metadata and member list and removes
   its protected decrypted workspace on exit. Do not write an ad hoc decrypt or
   restore command.

The bundle uses one exported repeatable-read snapshot for every application
schema currently present (`public` and, if released later, `private` and
`living_chart_private`), the complete migration-ledger schema, `auth.users`,
and `auth.identities`. It restores Auth identities before application data and
foreign-key validation. Generated pre-data/data/post-data sections retain the
project's RLS, policies, ownership, GRANT/REVOKE ACLs, default ACLs, and
SECURITY DEFINER function contract.

### Mandatory first-month restore drill

A successful decryption is not recovery acceptance. With separate owner
authorization, create a **fresh throwaway Supabase project**, restore only into
that project, and delete it only after evidence is saved. Never test a restore
over the live project. Do not run `supabase db push` or otherwise initialize
`supabase_migrations` first; the wrapper requires that ledger schema to be
absent and recreates the source ledger inside the restore transaction.

Run the repository procedure from a clean checkout, passing only the encrypted
artifact path (which contains no credential):

```sh
bash scripts/restore-db-backup.sh /absolute/path/to/zodiacs-db-....tar.gz.gpg
```

The wrapper prompts invisibly for the passphrase and fresh-project database URL,
places them in mode-0600 inputs, and never passes either through process
arguments. It refuses the known production project, runs a read-only
fresh-project preflight, and then requires the exact confirmation `RESTORE`
before any schema change. That confirmation is not a substitute for the
separate owner authorization required by this runbook.

The generated restore uses `psql -X`, `ON_ERROR_STOP=1`, and one transaction;
any generated section or acceptance failure rolls the target back. Its order is:

1. application and migration-ledger pre-data;
2. Auth users;
3. Auth identities;
4. application and migration-ledger data;
5. application and migration-ledger post-data, including constraints,
   policies, and ACLs; and
6. manifest and authorization acceptance before commit.

The drill passes only when all of the following are recorded:

- source and restored row counts match for every included table;
- restored Auth user and identity UUID digests match the source manifest;
- every application foreign key links to its restored parent, including Auth
  UUIDs, and no orphan remains;
- all application and migration-ledger constraints exist and are validated;
- every expected table has the correct RLS/forced-RLS state and policies;
- schema, table, sequence, routine, and application-schema default ACLs match,
  including no unintended `PUBLIC EXECUTE` on SECURITY DEFINER functions;
- `anon`, `authenticated`, and `service_role` behavior matches the application
  authorization contract, including denied operations;
- restored users must reauthenticate and can access only their own rows; and
- the fresh-project application smoke test passes before any recovery plan is
  considered usable.

Keep these interim tradeoffs explicit:

- **RPO:** a successful weekly cadence can lose up to seven days of changes;
  failed or skipped runs extend that window until the next successful backup;
- **retention:** GitHub keeps each artifact for 90 days;
- **public-repository exposure:** the encrypted artifact can be downloadable
  from a public repository, so the passphrase is the confidentiality boundary;
- **excluded Auth state:** sessions, refresh tokens, MFA, SSO, and Auth audit
  rows are deliberately excluded, so reauthentication is expected; and
- **restore target:** fresh-project-first only, never an untested live overwrite.

## 3. Vercel Firewall rate limits

This section is owner-only because it may require a plan purchase and publishing
production Firewall changes. Do not execute it from this remediation PR.

The API uses `@vercel/firewall` SDK rate-limit IDs. For each rule, the **If**
condition must be `@vercel/firewall` with the exact Rate limit ID below, set to
10 requests per 60 seconds using the default client-IP key. Leave the rule's
**Then** action at its SDK-rule default. A path-matched Deny rule is wrong: it
would return 403 instead of letting the endpoint return 429 with `Retry-After`.

| Rate limit ID | Endpoint |
| --- | --- |
| `zodiacs-email-subscribe` | `/api/email/subscribe` |
| `registry-aura-holdings-v1` | `/api/aura-holdings` |
| `zodiacs-wallet-birth` | `/api/wallet-birth` |
| `zodiacs-transit-calendar` | `/api/calendar/transits` |

After the owner explicitly authorizes and publishes the rules, verify the email
rule without a recipient or email body:

```sh
for attempt in $(seq 1 12); do
  curl --silent --show-error --max-time 10 \
    --output /dev/null \
    --dump-header - \
    --request POST \
    --header 'Origin: https://zodiacs.org' \
    --header 'Accept: application/json' \
    https://zodiacs.org/api/email/subscribe
done
```

The final responses must visibly include an `HTTP/... 429` status line and a
`Retry-After: 60` header. Without the `Origin` header the same-origin guard
returns 403, which does not test the Firewall rule.

## 4. Account weekly digest: supported, but keep the schedule off

The supported weekly digest is for signed-in account holders who enabled it in
`/profile/`. It queries account preferences in Supabase; it is not a sender for
the standalone public Resend Segment.

Keep the GitHub variable `DIGEST_ENABLED` unset or false until every acceptance
step below passes. The sender enforces an 80-recipient hard ceiling per run,
leaving headroom below Resend Free's 100-transactional-email daily limit.

### Owner-only prerequisites

Do not perform these without separate owner authorization:

1. Apply the narrowly scoped weekly-unsubscribe capability migration to the
   production Supabase project. No live send may run before it exists.
2. In GitHub Actions, provide only these digest secrets:
   `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. In GitHub Actions variables, verify `PUBLIC_SUPABASE_URL` and
   `DAILY_EMAIL_POSTAL_ADDRESS`; optionally set `DIGEST_FROM_EMAIL` and
   `DIGEST_BASE_URL`. The postal address must be the exact owner-approved value
   from §1b.
4. In Vercel, the unsubscribe function may use only the existing public
   `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy public
   anon-key fallback is supported). Do not put a service-role key or digest HMAC
   secret in Vercel.

`DIGEST_UNSUBSCRIBE_SECRET` is obsolete and must not be added. Secret values
must move through dashboard secret forms, never chat or command-line arguments.

### Safe enable order

1. Confirm `DIGEST_ENABLED` is unset/false.
2. Dispatch **Weekly Digest** with `dry_run=true` and `limit=1`. The fixture body
   may appear; any real-recipient selection must show only aggregate counts.
   Addresses, chart names, personalized bodies, and unsubscribe capabilities
   must remain absent from the public Actions log.
3. Confirm the intended owner-controlled account is the only opted-in canary.
   With explicit approval for one live email, dispatch `dry_run=false` and
   `limit=1`.
4. Check the received message's sender, content, postal footer, and unsubscribe
   link. A GET of that link must be read-only. Submit the page's explicit POST,
   then verify the profile preference became false and direct public table
   access remains denied.
5. Only after steps 1–4 pass may the owner explicitly authorize setting
   `DIGEST_ENABLED=true`. Verify the first scheduled Monday delivery and keep
   the hard ceiling at 80 while the account remains on Resend Free.

If any step fails, leave `DIGEST_ENABLED` unset/false and stop. Do not compensate
by adding a broader Vercel database key.

## 5. Standalone public email capture: keep off

The public capture promises a standalone weekly forecast, but this repository
does not contain a Segment-based weekly sender or complete provider-side
unsubscribe/suppression lifecycle. Provider credentials alone therefore must
not render the capture. Keep `STANDALONE_WEEKLY_EMAIL_ENABLED` unset/false.

Resend's current dashboard language is **Contacts → Segments**, not Audiences.
For Resend, a future capture release also requires a valid provider setup and
`RESEND_SEGMENT_ID`, but those values do not make the product complete and this
runbook does not authorize setting them.

A later, separately authorized release may enable capture only after all of the
following exist and pass with an owner-controlled address:

1. the legal identity from §1b is already deployed;
2. a real Segment-based sender, Resend Broadcast, or Resend Automation sends
   the promised weekly message with a working unsubscribe lifecycle;
3. submitting the capture sends a double-opt-in confirmation but does not add
   Segment membership;
4. confirmation GET remains scanner-safe and does not add membership;
5. the user explicitly submits the confirmation POST, after which — and only
   after which — Contacts → Segment membership appears;
6. a limit-one weekly canary is delivered;
7. unsubscribe removes or suppresses the contact as designed; and
8. a subsequent scheduled test proves the unsubscribed address is not sent to.

Until that lifecycle exists, revise neither the gate nor the public promise.

## 6. Explicitly outside this remediation

Do not add setup or launch steps for these systems here:

- daily email beyond the frozen test cohort;
- web push;
- compatibility-invite or Zodiac Games launch/rollback;
- Registry trade, exchange, collection/Aura, community, push, or daily-email
  feature-flag changes; or
- changes to production DNS, Resend, Supabase, Vercel, GitHub secrets, or live
  data without the separate owner authorization described above.

These are multi-prerequisite systems, not one-flag switches. A later release
must use its feature-specific canary and rollback contract.

## 7. Owner acceptance checklist

- [ ] The owner has made — or explicitly deferred — the Vercel paid-plan
      decision; no purchase was made by this remediation.
- [ ] The owner has supplied and authorized all five legal facts, or legal
      identity remains pending and public standalone capture remains off.
- [ ] A Database Backup run is green, the artifact decrypts locally, and a full
      fresh-project restore drill satisfies every acceptance check in §2.
- [ ] Published Firewall rules visibly return 429 and `Retry-After: 60` under
      the header-printing check in §3.
- [ ] The digest fixture/redacted dry-run, one-recipient live canary, and
      scanner-safe GET plus explicit unsubscribe POST all pass before
      `DIGEST_ENABLED` is set true.
- [ ] Standalone public capture remains hidden until its Segment sender,
      double-opt-in, and unsubscribe/suppression lifecycle pass end to end.
- [ ] Terminal, Registry Collection, compatibility invitations, Zodiac Games,
      the daily-email cohort, web push, and all Registry/community flags retain
      their pre-remediation production state.
- [ ] No secret, database URL, passphrase, private key, personalized email body,
      chart name, or unsubscribe capability appears in logs, chat, commits,
      screenshots, commands, or artifacts.
