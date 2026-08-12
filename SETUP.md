# Zodiacs.org setup and operations

Last updated: 2026-08-02

This is the provisioning source of truth for the six-phase household-name program. It consolidates the live repository's external services, environment variables, feature flags, and scheduled jobs. It contains names and procedures only—never secrets or secret values.

The default build must succeed with no credentials. Missing optional services hide or disable their dependent surface and leave the static site useful.

## Local baseline

Requirements:

- Node.js 22.x
- npm with the committed lockfile
- A Chromium binary only for browser, visual, OG, and Lighthouse verification

Start from a clean dependency install:

```sh
npm ci
npm run build
npm run check
npm test
```

The production-equivalent integrity gates are:

```sh
node scripts/check-dist.mjs
npm run schema:check
node scripts/report-bundles.mjs --fail
```

Do not put credentials in `.env` files that can be committed, Markdown, fixtures, screenshots, logs, generated HTML, or browser-visible variables. Public variables are configuration, not a place for secrets.

## Service inventory

| Service | State | Purpose | Provisioning rule |
| --- | --- | --- | --- |
| Vercel | Existing | Static hosting, previews, and `api/` serverless functions | Keep Production, Preview, and Development env scopes aligned. Deploy `main`. |
| GitHub Actions | Existing | CI, daily/monthly data generation, digest, push, and refresh jobs | Give only the permissions declared by each workflow. Store secrets as Actions secrets and non-secret switches as variables. |
| Supabase | Existing | Magic-link auth, RLS chart sync, digest preferences, daily-chart consent and delivery receipts, assistant quota, push subscriptions, and released Phase 4 compatibility invitations | Apply migrations, keep RLS on, and never expose the service-role key. |
| Resend | Selected standard | Double-opt-in capture, weekly/daily email, unsubscribe-compatible delivery | Authenticate `zodiacs.org` with SPF/DKIM and use a domain sender. |
| Google Workspace | Existing | Monitored public contact and correction mailboxes | `people@zodiacs.org` is an alternate address for the monitored `admin@zodiacs.org` account, not a separate inbox. Keep the alias active and monitor Spam as well as Inbox. |
| Buttondown or Loops | Supported alternatives | Standalone capture only | Configure exactly one provider. Do not combine providers in one deployment. |
| OpenAI | Ask Zodiacs provider | Buffered, grounded Ask Zodiacs responses through `gpt-5.6-luna` | Use a dedicated server-only project key, `store: false`, atomic application budgets, and provider-side spend limits. |
| Anthropic | Seven-day rollback only | Previous Ask Zodiacs deployment | Keep the previous deployment and key available during the observation window; do not configure automatic provider fallback. Remove both after a stable rollout. |
| Plausible-compatible analytics | Optional, approved | Cookieless allowlisted product events | No script is emitted when unconfigured. Never send birth data, email, chart positions, wallet addresses, free text, query strings, or fragments. |
| Web Push / VAPID | Scaffolded, off | Phase 3 opt-in notifications | Generate a VAPID pair, store subscriptions in Supabase, and enable client/server/schedule flags together only after verification. |
| Solana/Base RPC providers | Existing optional Registry integrations | Wallet-chart and Registry Collection reads | Out of scope for this six-phase program; preserve their flags and server-only endpoints. |
| Vercel Firewall | Existing Registry integration | Registry Collection rate limit | Keep the rule ID `registry-aura-holdings-v1` if Aura is enabled. |
| GeoNames | Existing build-time data source | Place-search shards | Attribution remains in the footer; no runtime credential is required by the committed build. |
| Wikidata/Wikipedia | Phase 5B pilot cached | Reviewed public-figure facts and source URLs | Use public APIs/exports with an identifying User-Agent and cache source snapshots; never scrape astrology sites. |
| Google Search Console, Bing Webmaster Tools, IndexNow | Existing operational surface | Discovery and crawl notification | Verify the domain and submit `/sitemap.xml`; the daily workflow already pings IndexNow after live verification. |

The People correction route uses `people@zodiacs.org`. The owner confirmed
that this alias delivers to the monitored `admin@zodiacs.org` Workspace
mailbox. The first authorized probe was found in Spam, the sender was marked
safe, and the final authorized test was confirmed received at
`2026-07-26T14:23:53Z`. Do not create a second inbox or change the public
address without updating the correction route and repeating the delivery
proof.

## Environment variables

### Public browser/build configuration

These values may appear in client bundles. They must never contain a secret.

| Variable | Required when | Meaning |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Account sync, digest/daily-email/push backend, assistant quota | Supabase project origin. |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Account sync | Modern browser publishable key; preferred. |
| `PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback only | Older browser key name. Do not set when the publishable key is available. |
| `PUBLIC_PLAUSIBLE_SCRIPT_URL` | Analytics enabled | Full cookieless analytics script URL. Unset means no provider script. |
| `PUBLIC_PLAUSIBLE_ENDPOINT` | Optional analytics override | First-party or self-hosted Plausible-compatible event endpoint. |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Optional analytics override | Analytics site/domain identifier. |
| `PUBLIC_WEB_PUSH_ENABLED` | Browser push prompt enabled | Must equal `1`; one half of the push kill switch. |
| `PUBLIC_VAPID_KEY` | Browser push enabled | Browser-visible VAPID public key. |
| `PUBLIC_COMPAT_INVITES_ENABLED` | Phase 4 invitation UI enabled | Must equal `1`; exposes the English invitation, arrival, profile-register, send-back, and return-link UI. This is public configuration, not a secret. |
| `PUBLIC_REGISTRY_COLLECTION_ENABLED` | Registry Collection enabled | Must equal `1`; out-of-program flag, preserved. |
| `PUBLIC_WALLET_CHART_ENABLED` | Wallet chart enabled | Must equal `1`; out-of-program flag, preserved. |

### Supabase and server authorization

| Variable | Scope | Meaning |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server + GitHub Actions secret | Server-only Supabase credential for digest, daily-email preferences/receipts, unsubscribe, push, and assistant quota. Never expose it to a browser. |
| `DIGEST_UNSUBSCRIBE_SECRET` | Vercel server + GitHub Actions secret | Signs one-click unsubscribe tokens. Use a long random value and rotate only with a deliberate invalidation plan. |
| `COMPAT_INVITES_ENABLED` | Vercel server flag | Must equal `1` to create, exchange, or read Phase 4 invitations. Status, revocation, hiding, completion replay, and cleanup remain available whenever the underlying server contract exists. Leave unset/off until the reviewed canary step. |
| `COMPAT_INVITES_PUBLIC_ENABLED` | Vercel server authorization | Must equal `1` to authorize creation for any valid signed-in Auth user. It never bypasses authentication or the owned synchronized saved-chart check. Missing or any other value retains canary-only authorization. |
| `COMPAT_INVITE_TEST_USER_IDS` | Vercel server configuration | Comma-separated list of exact Auth user UUIDs allowed to create invitations while public authorization is off. Missing or empty fails closed: nobody can create. Retain the approved canary owner after launch so disabling `COMPAT_INVITES_PUBLIC_ENABLED` restores the reviewed private boundary. Clearing this value never launches the feature. |
| `COMPAT_INVITE_BASE_URL` | Vercel server configuration, optional | HTTPS site origin used in the one-time creation URL; defaults to `https://zodiacs.org`. |
| `COMPAT_INVITE_SWEEP_SECRET` | Vercel + GitHub Actions secret | At least 32 characters. The same value authenticates the hourly cleanup workflow to the server endpoint. |
| `COMPAT_INVITE_RECIPIENT_HASH_SECRET` | Vercel server secret | At least 32 characters. HMACs the resolved account email for the one-shot completion-email delivery claim; raw email is never stored in the Phase 4 tables. |

### Standalone email capture

Choose exactly one `EMAIL_PROVIDER=resend|buttondown|loops`.

Resend, the program standard:

| Variable | Requirement | Meaning |
| --- | --- | --- |
| `EMAIL_PROVIDER` | Required | Set to `resend`. |
| `RESEND_API_KEY` | Required, server/CI secret | Sending-access Resend key used only to send confirmation and daily messages. |
| `RESEND_CONTACTS_API_KEY` | Required, server/CI secret | Separate full-access Resend key used only for contact and segment operations. It must differ from `RESEND_API_KEY`. |
| `RESEND_FROM_EMAIL` | Required | Verified sender used for confirmation mail. |
| `EMAIL_CONFIRM_SECRET` | Required, server secret | At least 32 characters; signs 48-hour confirmation tokens. |
| `EMAIL_CONFIRM_BASE_URL` | Optional | HTTPS site origin; defaults to `https://zodiacs.org`. |
| `RESEND_SEGMENT_ID` | Optional | Segment assigned only after explicit confirmation. |
| `RESEND_SIGN_PROPERTY` | Optional | Contact property for Sun sign; defaults to `sun_sign`. |

Supported alternatives:

| Variable | Provider | Meaning |
| --- | --- | --- |
| `BUTTONDOWN_API_KEY` | Buttondown | Server-only subscriber-write key. Native unactivated/double-opt-in state is required. |
| `LOOPS_FORM_ENDPOINT` | Loops | Exact `https://app.loops.so/api/newsletter-form/...` endpoint. |
| `LOOPS_DOUBLE_OPT_IN_CONFIRMED` | Loops | Must equal `1` only after double opt-in is enabled and its confirmation email is published. |
| `LOOPS_MAILING_LIST_ID` | Loops, optional | Public mailing-list ID. |
| `LOOPS_SIGN_PROPERTY` | Loops, optional | Sign contact property; defaults to `sunSign`. |

The capture component is omitted when its selected adapter is incomplete. Resend confirmation `GET` is read-only for mail-scanner safety; the human/agent-triggered form `POST` creates the contact.

### Digest and Phase 3 daily email

| Variable | Scope | Meaning |
| --- | --- | --- |
| `DIGEST_FROM_EMAIL` | GitHub variable, optional | Sender; defaults to `Zodiacs.org <hello@zodiacs.org>`. |
| `DIGEST_BASE_URL` | GitHub variable, optional | Site origin; defaults to `https://zodiacs.org`. |
| `DIGEST_ENABLED` | GitHub variable | Set to the string `true` only after manual dry-run, live unsubscribe, sender authentication, and test-list proof. |
| `DAILY_EMAIL_ENABLED` | Vercel server flag + GitHub variable | Must equal the literal string `1`. In Vercel it exposes daily enrollment; in GitHub it permits real delivery. Leave both off until their release gates pass. |
| `DAILY_EMAIL_COHORT` | Sender environment | Must be `test` or `all`. The committed workflow hardcodes `test` and exposes no cohort input; `all` remains dormant CLI support for a later approved release change. |
| `DAILY_EMAIL_ALL_APPROVED` | Reserved GitHub variable / sender environment | Independent general-audience interlock. The sender requires the literal string `1` for a real `all`-cohort send, but the committed workflow does not read this variable or offer an `all` path. |
| `DAILY_EMAIL_TEST_ALLOWLIST` | GitHub secret | Required for the `test` cohort. JSON array or comma/whitespace-separated list of normalized recipient addresses. |
| `DAILY_EMAIL_RECIPIENT_HASH_SECRET` | Vercel server + GitHub Actions secret | At least 32 characters. HMACs normalized addresses for cross-tier suppression, revocation, receipts, and idempotency without storing raw email. Use the same value in both runtimes. |
| `DAILY_EMAIL_UNSUBSCRIBE_SECRET` | Vercel server + GitHub Actions secret | At least 32 characters. Signs permanent first-party daily-unsubscribe links. Keep available while delivery is off; rotation invalidates links and requires an explicit migration plan. |
| `DAILY_EMAIL_FROM` | GitHub variable, optional | Verified daily sender; defaults to `Zodiacs.org <hello@zodiacs.org>`. This is distinct from `RESEND_FROM_EMAIL`, which sends confirmation mail. |
| `DAILY_EMAIL_BASE_URL` | GitHub variable, optional | HTTPS site origin used in daily links; defaults to `https://zodiacs.org`. |
| `DAILY_EMAIL_POSTAL_ADDRESS` | GitHub variable | Physical sender address printed in every HTML and plain-text daily email. Required for real delivery; never use a placeholder in a test-list or audience send. |
| `RESEND_DAILY_SEGMENT_ID` | Vercel server + GitHub Actions secret | One dedicated Resend segment for confirmed sun-sign daily contacts. It must differ from the legacy weekly `RESEND_SEGMENT_ID`. |

The Vercel daily-email endpoints require `EMAIL_PROVIDER=resend`, distinct `RESEND_API_KEY` and `RESEND_CONTACTS_API_KEY` capability keys, `RESEND_FROM_EMAIL`, `EMAIL_CONFIRM_SECRET`, `PUBLIC_SUPABASE_URL`, exactly one public Supabase browser key, `SUPABASE_SERVICE_ROLE_KEY`, and `RESEND_DAILY_SEGMENT_ID`; `EMAIL_CONFIRM_BASE_URL` is the optional origin override. GitHub delivery requires `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, both distinct Resend keys, `DAILY_EMAIL_ENABLED`, `DAILY_EMAIL_RECIPIENT_HASH_SECRET`, `DAILY_EMAIL_UNSUBSCRIBE_SECRET`, `DAILY_EMAIL_POSTAL_ADDRESS`, `RESEND_DAILY_SEGMENT_ID`, and the test allowlist. When the legacy weekly capture uses `RESEND_SEGMENT_ID`, provide that value to the daily-email runtime too so equality is rejected fail-closed. The workflow itself supplies `DAILY_EMAIL_COHORT=test`. Dormant direct-CLI `all` support additionally requires `DAILY_EMAIL_ALL_APPROVED=1`, but it is not a release path until an approved workflow change deliberately exposes it. The daily sender and base URL have the defaults above. Store secret values only in each platform's secret store.

`RESEND_DAILY_SEGMENT_ID` is provider routing metadata, not sign or consent authority. After double opt-in commits `daily_sun_preferences`, the endpoint idempotently adds the contact to this one segment. Sign changes update only the Supabase preference. The sender pages the segment, HMACs each normalized address, intersects it with confirmed `daily_sun_preferences`, and takes the sign only from that row. Unsubscribe revokes Supabase first and then removes this membership on a best-effort basis. Weekly-digest consent remains separate and must never be inferred, added, or removed by a daily-email action.

### Ask Zodiacs

| Variable | Scope | Meaning |
| --- | --- | --- |
| `ASSISTANT_ENABLED` | Vercel server flag | Must equal `1`; enables model calls. Unset/off returns a disabled response. |
| `OPENAI_API_KEY` | Vercel server secret | Dedicated Ask Zodiacs project key. It is never included in a browser bundle. |
| `ASSISTANT_SALT` | Vercel server secret | Secret input for pseudonymous visitor quota keys and the domain-separated OpenAI safety identifier. Rotate deliberately because it resets visitor quota continuity. |
| `PUBLIC_SUPABASE_URL` | Vercel server/public config | Supabase origin used by the atomic quota, cost reservation, and settlement RPCs. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server secret | Calls only the service-role budget RPCs from the assistant route; never include it in a client bundle. |
| `ASSISTANT_V1_COMPAT_UNTIL` | Vercel server config during rollout | Canonical millisecond UTC ISO instant (`YYYY-MM-DDTHH:mm:ss.sssZ`) set to exactly seven days after version 2 is enabled in production. Missing, malformed, or expired values reject legacy requests without affecting version 2. |
| `ASSISTANT_VISITOR_DAILY_LIMIT` | Vercel server config, optional | Positive integer visitor limit; defaults to `10` questions per UTC day. |
| `ASSISTANT_DAILY_BUDGET_MICROUSD` | Vercel server config, optional | Production daily allowance in millionths of a US dollar; defaults to `3000000` ($3). |
| `ASSISTANT_MONTHLY_BUDGET_MICROUSD` | Vercel server config, optional | Production monthly allowance in millionths of a US dollar; defaults to `100000000` ($100). |
| `ASSISTANT_RESERVATION_MICROUSD` | Vercel server config, optional | Hard ceiling for one request's conservative cost reservation; defaults to `300000` ($0.30). Leave at the reviewed default unless pricing or input bounds change. |

The endpoint also retains a five-request-per-minute per-instance burst guard. Supabase is the atomic authority for ten questions per visitor per UTC day and for the $3 daily and $100 monthly production allowances. Environment overrides may lower these launch caps but cannot raise them. The route reserves a conservative worst-case cost before OpenAI and settles it from returned usage; missing or malformed usage retains the full reservation. It fails closed when the quota store is unavailable or a reservation would exceed a limit. Alerts are emitted at 70%, 90%, and 100%; configure matching provider-dashboard limits only as a secondary backstop.

Run **Ask Zodiacs Live Evaluation** only after the exact evaluated commit has finished deploying. For production, select `main` and use exactly `https://zodiacs.org`. For the release candidate, select `codex/ask-zodiacs-guide` and copy its immutable Vercel deployment origin, which has the form `https://zodiacs-<deployment>-zodiacsofficial.vercel.app`. Do not use the mutable `zodiacs-org-git-…` branch alias, add a trailing slash, or append a path, query, or fragment. The workflow requires the deployment's `x-zodiacs-deployment-sha` to match the selected Git ref and binds the evidence to that origin; every new commit therefore requires its new immutable preview.

Run `grounded`, `guided`, and `redteam` sequentially against that same final origin, waiting for each full-dataset coverage job to pass before dispatching the next suite. All three successful coverage jobs are required release evidence.

Apply and verify the two existing assistant quota migrations, then
`20260802070819_assistant_memory_and_cost_budget.sql`,
`20260802090000_assistant_memory_storage_caps.sql`, and
`20260802101500_assistant_memory_idempotent_save.sql` before enabling the
route. Confirm that only `service_role` can execute
`assistant_budget_reserve_v1` and `assistant_budget_settle_v1`, that the
underlying quota and aggregate-cost tables are not readable from browser
roles, and that remembered-conversation tables are browser-read-only with
authenticated mutations limited to the reviewed RPCs. The route uses OpenAI
Responses with `gpt-5.6-luna`, `store: false`, low reasoning effort and
verbosity, a strict buffered result schema, a 900-token output cap, and no
automatic SDK retry.

### Phase 1 optional model-assisted prose

These names are reserved architecture contracts; current code does not read them. Deterministic templates remain the working fallback.

| Variable | Scope | Meaning |
| --- | --- | --- |
| `DAILY_PROSE_ENABLED` | GitHub Actions variable | Must equal `true` before the build may request model prose. Leave unset until structured evidence receipts and independent verification exist. |
| `DAILY_PROSE_API_KEY` | GitHub Actions secret | Dedicated, independently revocable build-time model key. Do not reuse the browser or assistant key. |
| `DAILY_PROSE_MODEL` | GitHub Actions variable, optional | Pinned model identifier recorded in each publication manifest. |

If the key, flag, provider, output schema, fact audit, or copy gate is unavailable, the job must publish the deterministic-template edition or hold the last verified dated edition according to the existing constitution. It must never publish unchecked model output.

### Web Push

| Variable | Scope | Meaning |
| --- | --- | --- |
| `PUBLIC_WEB_PUSH_ENABLED` | Vercel public env | Must equal `1`; exposes client subscription UI. |
| `PUSH_ENABLED` | Vercel server/build env | Must equal `1`; enables the endpoint and stamps the worker push handler on. |
| `PUBLIC_VAPID_KEY` | Vercel public env | Browser-visible VAPID public key. |
| `VAPID_PUBLIC_KEY` | GitHub variable/server config | Delivery-side public key. |
| `VAPID_PRIVATE_KEY` | GitHub secret | Delivery-side private key. |
| `VAPID_SUBJECT` | GitHub variable | Contact URI, normally a `mailto:` address. |
| `PUSH_TEST_SUBSCRIPTION_IDS` | GitHub variable | Optional comma-separated list of at most 50 exact subscription IDs. Required for a real pre-enable test send; omitted for the enabled production schedule. |

The scheduled GitHub workflow also checks a repository variable named `PUSH_ENABLED` for the literal string `true`. This is separate from Vercel's runtime requirement of `PUSH_ENABLED=1`. Document both values in the deployment change record whenever push is flipped.

The production schema must include the RLS-protected `push_subscriptions` and
`push_delivery_claims` tables through the committed Phase 3 migrations before
enabling push. Delivery claims are the database authority for the advertised
rolling caps; an in-memory or workflow-only counter is not sufficient.

### Phase 4 compatibility invitations

Phase 4 uses three independent controls:

- `PUBLIC_COMPAT_INVITES_ENABLED=1` includes the English reader UI.
- `COMPAT_INVITES_ENABLED=1` permits new creation and recipient open/session
  reads after the server contract is present.
- `COMPAT_INVITES_PUBLIC_ENABLED=1` authorizes creation for every valid
  signed-in Auth user; the create route still requires one synchronized chart
  owned by that user.

Canary mode keeps the public authorization off and uses the exact owner
allowlist. Both canary and public operation also require:

- `PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`;
- the applied and verified
  `20260724003109_phase4_compat_invites.sql` migration;
- `COMPAT_INVITE_TEST_USER_IDS` containing only the approved canary owner;
- the same ≥32-character `COMPAT_INVITE_SWEEP_SECRET` in Vercel and GitHub;
- `COMPAT_INVITE_RECIPIENT_HASH_SECRET` in Vercel;
- the existing verified `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for the
  optional invitation-specific completion email; and
- optional `COMPAT_INVITE_BASE_URL` only when the canonical origin must differ
  from `https://zodiacs.org`.

The invitation create body is limited to a synchronized chart UUID, explicit
consent, and a boolean notification choice. The server authenticates the
account, reads that owned chart, derives the exact twelve-body positions wire,
and stores no chart ID, birth input, email, or recipient data. A raw 32-byte
capability appears only in the one successful creation URL; the database keeps
its SHA-256 digest until the invitation completes, is revoked, or expires.

The private path `/c/{token}/` mints a non-secret 16-byte, 22-character
base64url session handle, stores the raw capability only in the
`zodiacs_compat_invite_{handle}` Secure, HttpOnly, SameSite=Lax cookie scoped
to `/api/compatibility`, and redirects to
`/compatibility/#invite={handle}`. Session and completion requests use the
validated handle to select the matching cookie, so two invitation tabs cannot
overwrite or cross-read one another. The `/c/` fallback and all token paths
remain noindex, absent from sitemap/hreflang/language selection,
private/no-store, and no-referrer.

This handle-scoped multi-tab hardening is released. Its focused unit/API
isolation suite passes 47/47, its feature-off browser suite passes 8/8, and
its fixture-enabled A→B browser suite passes 35/35, including two simultaneous
invitation tabs. The private canary, Fable review, public authorization, and
production verification are recorded in
`docs/PHASE4-SHARING-CANARY.md`.

Status, revocation, hiding, completion replay, delivery finalization, and
cleanup are deliberately not disabled by the create/open switch. The hourly
`.github/workflows/compat-invite-sweep.yml` job closes overdue invitations and
deletes their positions-free evidence after 30 days. Missing sweep
configuration exits without changing anything; it is not permission to enable
Phase 4.

The optional completion email is a separate, one-invitation promise. It does
not read or change Daily Email, weekly digest, or push consent. It reserves one
durable database claim before sending and uses provider idempotency; a failure
does not authorize an unbounded retry loop.

### Registry-only integrations to preserve

These are outside this program and should remain off unless separately authorized.

| Variable | Meaning |
| --- | --- |
| `SOLANA_RPC_URL` | HTTPS Solana RPC endpoint. |
| `BASE_RPC_URL` | HTTPS Base JSON-RPC endpoint. |
| `BASE_EXPLORER_API_KEY` | Optional Base explorer history key for wallet birth. |
| `BASE_EXPLORER_API_URL` | Optional HTTPS Base explorer API origin. |
| `WALLET_BIRTH_CACHE_TTL_SECONDS` | Server cache TTL, bounded to 300–604800 seconds. |
| `SOLANA_WALLET_MAX_PAGES` | Optional Solana history pagination cap. |
| `RPC_URL` | Optional RPC used by the weekly distribution builder. |

### Operator and CI-only controls

| Variable | Use |
| --- | --- |
| `ZODIACS_ALLOW_STALE_DAILY` | Emergency CI override only; accepted only with `CI=true`. Never make it a normal production setting. |
| `PREVIEW_URL` | Preview API smoke-test target. |
| `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Browser tooling overrides; not application configuration. |

## Feature-flag matrix

| Surface | Flag/configuration | Off-state contract |
| --- | --- | --- |
| Daily static facts/prose | No secret or flag | Always builds from deterministic committed data. |
| Model-assisted daily prose | `DAILY_PROSE_ENABLED=true` + dedicated secret; reserved | Deterministic-template edition or held verified edition. |
| Standalone email capture | Complete `EMAIL_PROVIDER` adapter | Capture component is absent; pages remain complete. |
| Weekly digest schedule | GitHub `DIGEST_ENABLED=true` | Workflow smoke test runs; no scheduled send. |
| Phase 3 daily enrollment | Vercel `DAILY_EMAIL_ENABLED=1` + complete Resend/Supabase configuration | Daily capture and chart preference enrollment are absent/disabled; existing daily unsubscribe remains usable. |
| Phase 3 daily delivery | GitHub `DAILY_EMAIL_ENABLED=1`; committed workflow is fixed to `DAILY_EMAIL_COHORT=test` and requires the allowlist | Fixture smoke still runs; no real daily email send. General-audience delivery is not exposed. |
| Browser push UI | `PUBLIC_WEB_PUSH_ENABLED=1` | No prompt or subscription UI. |
| Push endpoint/worker | `PUSH_ENABLED=1` | Endpoint disabled and worker has no push handler. |
| Scheduled push delivery | GitHub `PUSH_ENABLED=true` | Scheduled job stops before delivery. |
| Phase 4 invitation UI | `PUBLIC_COMPAT_INVITES_ENABLED=1` | No invitation panel, arrival handling, profile register, send-back block, or returned-reading band. Existing compatibility behavior remains. |
| Phase 4 create/open | `COMPAT_INVITES_ENABLED=1` + Supabase server contract | Creation, token exchange, and session reads fail closed. Existing status, revocation, hiding, completion replay, and cleanup remain available when the contract exists. |
| Phase 4 public creation | `COMPAT_INVITES_PUBLIC_ENABLED=1` | Creation remains limited to exact Auth UUIDs in the canary allowlist. Authentication and owned synchronized-chart checks apply in either mode. |
| Phase 4 canary creation | `COMPAT_INVITE_TEST_USER_IDS` | Only exact listed Auth user UUIDs may create. Missing or empty denies every creator; clearing it never creates public access. |
| Ask Zodiacs model call | `ASSISTANT_ENABLED=1` + key/quota config | Static/disabled experience; no model request. |
| Registry Collection | `PUBLIC_REGISTRY_COLLECTION_ENABLED=1` + RPCs + firewall rule | No entry point, sitemap entry, or Aura route exposure. |
| Wallet chart | `PUBLIC_WALLET_CHART_ENABLED=1` + a supported provider | Endpoint returns disabled; ordinary birth chart is unaffected. |

Phase 4 production uses the reader, server, and public-authorization flags
together. Authentication and owned synchronized-chart checks still apply.
The exact canary owner remains configured so disabling public authorization
restores the reviewed private boundary.

## Supabase provisioning

The live project is documented in `docs/SUPABASE.md`. The browser may receive only the public project URL and publishable key; RLS is the security boundary.

Required released migrations:

1. `supabase/migrations/20260706000000_profile_sync.sql`
2. `supabase/migrations/20260706130517_chart_deletions.sql`
3. `supabase/migrations/20260707125552_weekly_digest_opt_in.sql`
4. `supabase/migrations/20260720074516_phase3_habit_layer.sql`
5. `supabase/migrations/20260720145526_phase3_delivery_guards.sql`

Phase 4 adds one released migration that is live and verified:

6. `supabase/migrations/20260724003109_phase4_compat_invites.sql`

Before either Phase 3 daily-email flag or any push flag is enabled, apply and
verify both Phase 3 migrations. The habit-layer migration creates service-owned
`daily_chart_preferences`, `daily_sun_preferences`,
`daily_sun_confirmation_requests`, `daily_sun_confirmation_rate_limits`,
`daily_email_deliveries`, and `push_subscriptions` tables with RLS enabled and
no browser policies. Daily preferences point to one chart owned by the same
user, require an IANA timezone, and store only an opaque recipient HMAC. The
deletion guard atomically cancels a pending request or pauses confirmed consent
before a selected chart leaves the device. Sun authority stays separate from
expiring confirmation requests, so a pending sign change cannot replace the
active sign; both tables store only recipient HMACs and token digests, never
the raw address. A server-only 15-minute recipient-HMAC cooldown suppresses
repeated Sun-tier confirmation mail without replacing the valid pending token,
and signed Sun-tier unsubscribe removes that abuse-control row too.

The delivery-guards migration adds an account-owned chart-confirmation attempt
ledger, a global Sky Alerts editorial schedule, and an endpoint-fingerprinted
delivery ledger, again with RLS and no browser policies. Chart confirmation
attempts allow one provider attempt per 60 seconds and six per exact rolling 24
hours; the account-level limit survives preference cancellation, recipient
changes, and unsubscribe, and disappears only with the Auth account. The
global schedule atomically selects no more than one event per UTC date and two
selected dates in any seven-date window. When one slot remains, it holds a
lower-priority candidate if the committed six-date lookahead contains a
strictly higher-priority event; held and capped candidates write no row.
Endpoint claims still reserve before the provider call and count every attempt
against the fail-safe limit of one per exact rolling 24 hours and two per exact
rolling seven days. Expired 404/410 endpoints are removed only when the stored
subscription snapshot is still current. A worker must also present the exact
`updated_at` version it listed before it can reserve, so a refresh between the
list and reserve steps exits as stale without contacting Web Push. No guard
ledger stores a raw email, endpoint, chart, or push encryption key.

Daily DOI dispatch runs through Vercel `waitUntil`, giving every valid public
submission the same immediate response while the database and provider work
finishes inside the function lifecycle. Delivery receipts store the edition,
recipient HMAC, tier, state, and provider receipt—never the raw address.

Before enabling Ask Zodiacs, apply the committed quota migrations,
`20260802070819_assistant_memory_and_cost_budget.sql`,
`20260802090000_assistant_memory_storage_caps.sql`, and
`20260802101500_assistant_memory_idempotent_save.sql` in order. Verify their
service-role grants, browser-role denials, RLS, replay safety, retention, and
atomic reservation behavior before setting the model-call flag.

The Phase 4 migration was applied and verified through the reviewed production
path before launch. It creates the
server-owned `compatibility_invites`,
`compatibility_invite_delivery_claims`, and
`compatibility_invite_events` tables with RLS on, zero browser policies,
public/browser grants revoked, and fixed-search-path service-role-only RPCs.
The schema stores a normalized label, derived Sun sign, exact compact
twelve-body positions wire, notification choice, token/replay digests, and
bounded lifecycle timestamps. It stores no saved-chart ID, birth input, email,
raw recipient data, token URL, IP, or user agent. Completion, revocation, and
expiry atomically destroy token authority and positions; only positions-free
evidence remains for 30 days.

Security checklist:

- RLS enabled on every user-data table.
- Browser roles can access only their own rows.
- Anonymous forged reads/writes fail.
- Service-role use stays in Vercel/GitHub server contexts.
- Magic-link redirect allowlist includes production, Vercel previews, and local `/profile/` URLs.
- Invite and push tables have expiry/deletion paths and no broad public select.

## Resend provisioning

1. Add and authenticate `zodiacs.org` in Resend.
2. Publish the required SPF and DKIM DNS records and wait for verification.
3. Create two distinct capability keys: a domain-restricted sending-access key for `RESEND_API_KEY`, and a separate full-access key for `RESEND_CONTACTS_API_KEY`. Never place the full-access key in the sending variable.
4. Choose a verified sender such as `Zodiacs.org <hello@zodiacs.org>`.
5. Configure the Resend email-capture variables in Vercel Production, Preview, and Development as appropriate.
6. Create one dedicated daily Sun Resend segment and configure its ID as `RESEND_DAILY_SEGMENT_ID` identically in Vercel and GitHub Actions. It must not equal the legacy weekly `RESEND_SEGMENT_ID`.
7. Configure the weekly-digest and Phase 3 daily secrets/variables in GitHub Actions; configure the confirmation, preference, and unsubscribe secrets in Vercel.
8. Test scanner-safe confirmation, token expiry, replay no-op, RFC 8058 one-click unsubscribe, and an existing-unsubscribed contact.
9. Keep `DIGEST_ENABLED` and both instances of `DAILY_EMAIL_ENABLED` off until their independent evidence is recorded in `PLAN.md`.

Daily messages send both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` to the first-party `/api/email/unsubscribe` endpoint. `GET` is read-only and asks for confirmation; RFC 8058 `POST` performs the change. Each link revokes only its named tier while leaving weekly-digest consent unchanged. Stopping the personal-chart tier lets an already-confirmed Sun-sign daily resume automatically. Revocation must continue to work when enrollment and delivery flags are off, and the database transaction remains authoritative if provider segment cleanup is unavailable.

### Daily-email verification and release

1. Leave the Vercel and GitHub `DAILY_EMAIL_ENABLED` values unset/off. Apply both Phase 3 migrations only through the normal reviewed migration process, then verify their RLS, grants, ownership foreign key, timezone constraint, confirmation-attempt caps, and receipt uniqueness.
2. Run `npx vite-node --script scripts/send-daily-email.ts --fixture --dry-run --limit 2`. Fixture mode requires `--dry-run`, uses no production recipients, creates no receipts, and performs no provider sends.
3. Manually dispatch `.github/workflows/daily-email.yml` with `dry_run=true`. The workflow is fixed to the test cohort. A dry run may render eligible confirmed test recipients but must not reserve receipts or call Resend delivery. Use `--to`/the workflow `to` input only as an additional exact subscribed-address filter; it never bypasses consent or the cohort allowlist.
4. For real test-list proof only, set the GitHub variable `DAILY_EMAIL_ENABLED=1` and populate `DAILY_EMAIL_TEST_ALLOWLIST`. The workflow remains hardcoded to `DAILY_EMAIL_COHORT=test`. Leave the Vercel production enrollment flag off. Dispatch with `dry_run=false`; the workflow must verify the committed edition and its exact live production counterpart before delivery.
5. Record at least three consecutive successful test-list sends on distinct eligible daily editions and prove each live first-party unsubscribe removes only its named tier without changing weekly-digest consent. Also prove that stopping the chart tier lets an already-confirmed Sun-sign daily resume. A duplicate receipt/skip does not count as a send, and a failed, gapped, or unverifiable qualifying edition breaks the streak; do not compensate with a general send.
6. Even after that evidence, this committed workflow cannot send to `all`. A separate reviewed and explicitly approved release change must reintroduce the cohort choice, thread `DAILY_EMAIL_ALL_APPROVED` into the workflow, and preserve the sender's independent approval check. Until that change lands, keep the workflow test-only.
7. Roll back immediately by unsetting/turning off `DAILY_EMAIL_ENABLED` in both Vercel and GitHub and unsetting `DAILY_EMAIL_ALL_APPROVED`. Keep the unsubscribe secrets and endpoint deployed so existing links continue to revoke consent.

## Analytics provisioning

1. Create the `zodiacs.org` property in Plausible or a compatible self-hosted service.
2. Set `PUBLIC_PLAUSIBLE_SCRIPT_URL`; set endpoint/domain overrides only if needed.
3. Redeploy and verify only the allowlisted event names and enum/counter/boolean properties.
4. Confirm canonical paths replace full URLs and that query strings and fragments are absent.
5. Leave the variables unset if this privacy contract cannot be met.

## Push provisioning

1. Generate one VAPID keypair outside the repository.
2. Put the public key in the public/server variable stores and the private key only in GitHub/Vercel secrets.
3. Apply and verify both Phase 3 migrations, including subscription identity,
   the service-only global schedule and endpoint-claim RPCs, UTC-date and exact
   rolling boundaries, priority reservation, and persistence across
   delete/re-subscribe of the same endpoint. Run
   `npm run test:phase3:delivery-sql` against its disposable PostgreSQL 17
   container; never point that harness at a live database.
4. Build with both runtime flags enabled in a preview and confirm the service worker version changes.
5. Run `npm run test:phase3:push` against that flags-on fixture build. Test
   subscribe, unsubscribe, quiet-day no-op, event-day canonical
   click-through, duplicate suppression, both rolling frequency caps, failed
   provider attempts, refreshed-subscription protection, expired endpoint
   cleanup, denied permission, and iOS installed-PWA behavior.
6. Run the workflow manually with `dry_run=true`, then set
   `PUSH_TEST_SUBSCRIPTION_IDS` to a small controlled cohort and run one real
   test. With the GitHub `PUSH_ENABLED` schedule flag off, a real run fails
   closed unless this exact allowlist is present.
7. Enable the Vercel `1` flags and GitHub `true` schedule variable only after the preview and test-list checks pass.

## Phase 4 invitation verification and release

1. Keep `PUBLIC_COMPAT_INVITES_ENABLED` and `COMPAT_INVITES_ENABLED`
   unset/off. Run the no-secret build and full flag-off parity gates.
2. Run `npm run test:phase4:invites-sql` only against its disposable
   PostgreSQL 17 container. Apply
   `20260724003109_phase4_compat_invites.sql` to production only through the
   reviewed migration path, then verify all three tables, RLS, revoked browser
   grants, fixed function search paths, service-role-only execution, caps,
   races, authority destruction, and 30-day cleanup.
3. Set identical `COMPAT_INVITE_SWEEP_SECRET` values in Vercel and GitHub,
   set `COMPAT_INVITE_RECIPIENT_HASH_SECRET` only in Vercel, and verify one
   authenticated cleanup receipt while both reader/server flags remain off.
4. Set `COMPAT_INVITE_TEST_USER_IDS` to the one approved Auth UUID. Deploy
   a preview with both flags enabled and run the complete A→B→send-back
   browser matrix before changing production. That matrix must include two
   different invitation links opened in parallel tabs and prove that each
   handle reads and completes only its own invitation.
5. For the production canary, enable `COMPAT_INVITES_ENABLED=1` and
   `PUBLIC_COMPAT_INVITES_ENABLED=1` only while the canary allowlist remains.
   Use controlled accounts/browsers. Record creation, exchange, local-only B
   network evidence, completion, optional one-shot email provider and mailbox
   receipts, duplicate prevention, return link/card, revocation, expiry,
   cleanup, accessibility, reduced motion, and 1×/2× card review.
6. Obtain Fable's bounded live implementation review and explicit owner
   approval. Release the separately reviewed authorization change, then set
   `COMPAT_INVITES_PUBLIC_ENABLED=1` together with the two existing flags.
   Retain the exact canary allowlist as the safe rollback boundary. Both kill
   switches, owned-chart enforcement, and the cleanup job remain mandatory.
7. Roll back immediately by turning off the public UI flag, then the server
   create/open flag, then the public authorization. Leave status, revocation,
   completion replay, delivery finalization, and cleanup infrastructure
   available for existing rows.

The ladder completed on 2026-07-25. PR `#159` merged as
`b7075f3d1dc94282cee472decbd94a0270adb331`; post-merge Site Check run
`30148543319` passed, and production deployment
`dpl_7S22DcjeFHkgWx5pJHDUJkcj61eU` was aliased at
`2026-07-25T07:34:10.644Z`. Keep the three production flags aligned and retain
the canary allowlist and hourly cleanup path.

## Ask Zodiacs provisioning

1. Use a resumed paid Supabase project. Apply the two existing quota migrations, then apply `20260802070819_assistant_memory_and_cost_budget.sql`, `20260802090000_assistant_memory_storage_caps.sql`, and `20260802101500_assistant_memory_idempotent_save.sql` in order; run the SQL grant, RLS, ownership, idempotency, expiry, storage-cap, cleanup, and concurrency tests.
2. Create a dedicated OpenAI project key, enable API billing, and configure hard provider spend limits and alerts. Do not reuse a personal or browser-visible key.
3. Configure `OPENAI_API_KEY`, `ASSISTANT_SALT`, Supabase URL, service-role secret, and the reviewed cost-limit values in Vercel server scope.
4. Keep `ASSISTANT_ENABLED` off while building and validating the candidate. The static `/ask/` guide, localized starters, and navigation remain useful without a model call.
5. Verify one valid version-1 compatibility SSE request and the version-2 `status`, `answer.delta`, `guide.meta`, `error`, and `done` events. Test same-origin enforcement, complete-pair history trimming, cancellation, capability gates, moderation and crisis routes, structured-output failure, source/fact validation, and every stable public error code.
6. Run the grounded, chart-fact, unsupported-coverage, multi-turn, transit, safety, and tone evaluation sets against the exact preview SHA. Any invented source, critical chart-fact error, or critical safety failure blocks launch.
7. Immediately before enabling production, set `ASSISTANT_V1_COMPAT_UNTIL` to exactly seven days after the enablement instant. Enable production at ten questions per visitor per UTC day, $3 per UTC day, and $100 per UTC month. Observe provider error rate, p95 latency, cleanup, and budget alerts for seven days.
8. Keep the previous Anthropic deployment and key available only for manual rollback during that window. Do not automatically send a failed OpenAI request to another provider. After the stable observation window, remove `ASSISTANT_V1_COMPAT_UNTIL`, the legacy bridge, the Anthropic SDK, and the Anthropic key.

Session conversations live only in versioned `sessionStorage`. Signed-in users may explicitly opt into a fixed 90-day remembered thread. The opt-in-and-import RPC is atomic; only complete visible turns are stored. Remembered storage is capped in the database at 20 unexpired threads per user, 100 turns per thread, and 500 turns across the user's unexpired threads; direct browser writes are revoked and cap failures return stable `assistant_memory_limit:*` markers. Hourly cleanup removes expired threads and pseudonymous quota rows older than yesterday in bounded batches, while RLS hides expired conversation rows immediately. Turning memory off deletes all remembered conversations.

## Scheduled jobs

All schedules are UTC.

| Workflow | Schedule | Current behavior | Gate |
| --- | --- | --- | --- |
| `.github/workflows/daily-horoscopes.yml` | Daily 00:00 | Builds facts/publication, verifies, replays 30 days, commits changes, waits for live edition, pings IndexNow. GitHub may start the runner after the declared boundary. | Always on. Phase 1 covers all daily cuts and Monday weekly generation. |
| `.github/workflows/daily-email.yml` | Hourly at UTC minute 13 | Runs a credential-free fixture smoke; when explicitly enabled, verifies the exact live edition and selects eligible test-list recipients. | Off by default; real delivery requires GitHub `DAILY_EMAIL_ENABLED=1`. Workflow is hardcoded to `test`; no general-audience path exists. |
| `.github/workflows/compat-invite-sweep.yml` | Hourly at UTC minute 17 | Closes overdue Phase 4 invitations in bounded batches and prunes 30-day evidence; missing configuration exits cleanly. | Released, provisioned, and required while invitations can exist. |
| `.github/workflows/weekly-digest.yml` | Monday 06:00 | Fixture smoke always; real send only when `DIGEST_ENABLED=true`. | Off by default. |
| `.github/workflows/pulse-refresh.yml` | Monday 06:17 | Refreshes Wikipedia/Trends pulse data and commits changes. | Existing, best effort. |
| `.github/workflows/distribution-refresh.yml` | Monday 06:31 | Refreshes Registry ownership distribution and commits changes. | Existing Registry operation. |
| `.github/workflows/push-daily.yml` | Daily 07:00 | Verifies the committed events publication and dry-runs the July 18 event plus the July 22 quiet day; when enabled, applies the global priority/cap schedule, sends at most one source-backed event alert, and otherwise sends nothing. | Off by default; real delivery requires GitHub `PUSH_ENABLED=true`. |
| `.github/workflows/transits-monthly.yml` | Monthly on day 25 at 05:41 | Computes next month's facts, verifies deterministic regeneration, commits, and opens the twelve-sign editorial issue. | Always on; Phase 1 may automate prose but must preserve fact verification. |
| `.github/workflows/site-check.yml` | Push/PR/manual | Full build, type, fact, browser, schema, bundle, visual, Lighthouse, widget, drift, disposable PostgreSQL 17 concurrency, and flags-on push-browser gates. | Required before merge. |

Phase 3 daily-email schedule (implemented, production flags off):

- The workflow runs at minute 13 of every UTC hour. A confirmed chart recipient becomes eligible when the edition date matches their chosen IANA timezone and the local hour is 07:00 or later. An absent or invalid timezone fails safely to the UTC cohort; Sun-sign recipients use UTC and enter at 07:00 UTC.
- Later local hours remain eligible if a verified edition was held or the runner was delayed. The `(edition_date, recipient_hash)` receipt key and Resend idempotency key limit each address to one daily message for that edition. A crashed worker's `reserved` receipt can be reclaimed only after its fixed 30-minute lease through an atomic `updated_at` comparison. Reclaiming assigns a new owner token, and finalize/fail updates require that token, so the previous worker cannot mutate the new lease; the provider retry still uses the same deterministic idempotency key. A confirmed chart brief suppresses the matching Sun-sign brief.
- Every invocation runs the credential-free fixture smoke. Real delivery additionally requires GitHub `DAILY_EMAIL_ENABLED=1` and an exact verified live edition. The committed workflow hardcodes `DAILY_EMAIL_COHORT=test`, requires the allowlist, and provides no `all` input or scheduled path. Dormant CLI `all` support remains protected by the independent `DAILY_EMAIL_ALL_APPROVED=1` interlock for a future separately approved workflow release.

Do not add scheduled jobs for Phase 2 catalogs or Phase 5 people ingestion. Those are reviewed, versioned build inputs and should run through explicit generation PRs.

## Search provisioning

1. Verify the `zodiacs.org` domain property in Google Search Console and Bing Webmaster Tools.
2. Submit `https://zodiacs.org/sitemap.xml` to both.
3. Keep the existing IndexNow key file and key body consistent; never paste the key into this document.
4. After every route-family launch, inspect canonicals, rich results, sitemap discovery, and coverage before calling its phase complete.
5. For Phase 1, ensure 2027 pages are live and submitted before 2026-10-01.

## Flag-off and no-secret acceptance

Before any phase closes:

1. Run a full build with all optional variables absent.
2. Confirm no email capture, push prompt, Phase 4 invitation UI, model call,
   Registry Collection entry, or wallet-chart entry leaks into the flag-off output.
3. Confirm `/today/`, all horoscope/event/content pages, and the eventual `/ask/` fallback remain useful without JavaScript or credentials.
4. Scan the repository and built output for secret values and server-only variable names in client bundles.
5. Run the full release evidence listed in `PLAN.md`.

If a provider is missing or unhealthy, turn its flag off. Do not weaken a fact, privacy, consent, or verification gate to keep a dependent feature visible.
