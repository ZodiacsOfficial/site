# Zodiacs.org setup and operations

Last updated: 2026-07-20

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
| Supabase | Existing | Magic-link auth, RLS chart sync, digest preferences, daily-chart consent and delivery receipts, assistant quota, push subscriptions; later compatibility invites | Apply migrations, keep RLS on, and never expose the service-role key. |
| Resend | Selected standard | Double-opt-in capture, weekly/daily email, unsubscribe-compatible delivery | Authenticate `zodiacs.org` with SPF/DKIM and use a domain sender. |
| Buttondown or Loops | Supported alternatives | Standalone capture only | Configure exactly one provider. Do not combine providers in one deployment. |
| Anthropic | Existing optional integration | Ask Zodiacs; optional future Phase 1 prose build | Use server/CI-only keys. Keep daily-prose and assistant budgets independently revocable. |
| Plausible-compatible analytics | Optional, approved | Cookieless allowlisted product events | No script is emitted when unconfigured. Never send birth data, email, chart positions, wallet addresses, free text, query strings, or fragments. |
| Web Push / VAPID | Scaffolded, off | Phase 3 opt-in notifications | Generate a VAPID pair, store subscriptions in Supabase, and enable client/server/schedule flags together only after verification. |
| Solana/Base RPC providers | Existing optional Registry integrations | Wallet-chart and Registry Aura reads | Out of scope for this six-phase program; preserve their flags and server-only endpoints. |
| Vercel Firewall | Existing Registry integration | Registry Aura rate limit | Keep the rule ID `registry-aura-holdings-v1` if Aura is enabled. |
| GeoNames | Existing build-time data source | Place-search shards | Attribution remains in the footer; no runtime credential is required by the committed build. |
| Wikidata/Wikipedia | Phase 5, not provisioned | Reviewed public-figure facts and source URLs | Use public APIs/exports with an identifying User-Agent and cache source snapshots; never scrape astrology sites. |
| Google Search Console, Bing Webmaster Tools, IndexNow | Existing operational surface | Discovery and crawl notification | Verify the domain and submit `/sitemap.xml`; the daily workflow already pings IndexNow after live verification. |

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
| `PUBLIC_REGISTRY_AURA_ENABLED` | Registry Aura enabled | Must equal `1`; out-of-program flag, preserved. |
| `PUBLIC_WALLET_CHART_ENABLED` | Wallet chart enabled | Must equal `1`; out-of-program flag, preserved. |

### Supabase and server authorization

| Variable | Scope | Meaning |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server + GitHub Actions secret | Server-only Supabase credential for digest, daily-email preferences/receipts, unsubscribe, push, and assistant quota. Never expose it to a browser. |
| `DIGEST_UNSUBSCRIBE_SECRET` | Vercel server + GitHub Actions secret | Signs one-click unsubscribe tokens. Use a long random value and rotate only with a deliberate invalidation plan. |

### Standalone email capture

Choose exactly one `EMAIL_PROVIDER=resend|buttondown|loops`.

Resend, the program standard:

| Variable | Requirement | Meaning |
| --- | --- | --- |
| `EMAIL_PROVIDER` | Required | Set to `resend`. |
| `RESEND_API_KEY` | Required, server/CI secret | Resend API key. |
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
| `RESEND_DAILY_SIGN_SEGMENTS_JSON` | Vercel server + GitHub Actions secret | Exact twelve-sign Resend segment map shown below. Every canonical sign must have a distinct segment ID. |

The Vercel daily-email endpoints require `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_CONFIRM_SECRET`, `PUBLIC_SUPABASE_URL`, exactly one public Supabase browser key, and `SUPABASE_SERVICE_ROLE_KEY`; `EMAIL_CONFIRM_BASE_URL` is the optional origin override. GitHub delivery requires `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DAILY_EMAIL_ENABLED`, `DAILY_EMAIL_RECIPIENT_HASH_SECRET`, `DAILY_EMAIL_UNSUBSCRIBE_SECRET`, `DAILY_EMAIL_POSTAL_ADDRESS`, `RESEND_DAILY_SIGN_SEGMENTS_JSON`, and the test allowlist. The workflow itself supplies `DAILY_EMAIL_COHORT=test`. Dormant direct-CLI `all` support additionally requires `DAILY_EMAIL_ALL_APPROVED=1`, but it is not a release path until an approved workflow change deliberately exposes it. The daily sender and base URL have the defaults above. Store secret values only in each platform's secret store.

`RESEND_DAILY_SIGN_SEGMENTS_JSON` must be one JSON object with exactly these keys and twelve real, distinct Resend segment IDs:

```json
{"aries":"segment_aries","taurus":"segment_taurus","gemini":"segment_gemini","cancer":"segment_cancer","leo":"segment_leo","virgo":"segment_virgo","libra":"segment_libra","scorpio":"segment_scorpio","sagittarius":"segment_sagittarius","capricorn":"segment_capricorn","aquarius":"segment_aquarius","pisces":"segment_pisces"}
```

The values above are placeholders, not deployable IDs. Sun-sign daily enrollment moves a confirmed contact into exactly one of these daily segments. Weekly-digest consent remains separate and must never be inferred, added, or removed by a daily-email action.

### Ask Zodiacs

| Variable | Scope | Meaning |
| --- | --- | --- |
| `ASSISTANT_ENABLED` | Vercel server flag | Must equal `1`; enables model calls. Unset/off returns a disabled response. |
| `ANTHROPIC_API_KEY` | Vercel server secret | Server-only model API key. |
| `ASSISTANT_SALT` | Vercel server secret | Salt used to hash a visitor address for quota enforcement. Rotate deliberately because it resets hash continuity. |
| `PUBLIC_SUPABASE_URL` | Vercel server/public config | Supabase origin used by the quota RPC. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server secret | Calls `assistant_quota_bump`; never included in the client bundle. |

The current endpoint enforces five requests per minute per function instance and thirty per day through Supabase. The production schema must include `assistant_quota` and the `assistant_quota_bump` definer function as a committed migration before the flag is enabled.

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

The scheduled GitHub workflow also checks a repository variable named `PUSH_ENABLED` for the literal string `true`. This is separate from Vercel's runtime requirement of `PUSH_ENABLED=1`. Document both values in the deployment change record whenever push is flipped.

The production schema must include an RLS-protected `push_subscriptions` table through a committed migration before enabling push.

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
| Ask Zodiacs model call | `ASSISTANT_ENABLED=1` + key/quota config | Static/disabled experience; no model request. |
| Registry Aura | `PUBLIC_REGISTRY_AURA_ENABLED=1` + RPCs + firewall rule | No entry point, sitemap entry, or Aura route exposure. |
| Wallet chart | `PUBLIC_WALLET_CHART_ENABLED=1` + a supported provider | Endpoint returns disabled; ordinary birth chart is unaffected. |

Future Phase 4 invite server code must introduce one paired flag contract, `PUBLIC_COMPAT_INVITES_ENABLED=1` for the entry UI and `COMPAT_INVITES_ENABLED=1` for server writes. Those names are reserved but not read by current code.

## Supabase provisioning

The live project is documented in `docs/SUPABASE.md`. The browser may receive only the public project URL and publishable key; RLS is the security boundary.

Required current migrations:

1. `supabase/migrations/20260706000000_profile_sync.sql`
2. `supabase/migrations/20260706130517_chart_deletions.sql`
3. `supabase/migrations/20260707125552_weekly_digest_opt_in.sql`
4. `supabase/migrations/20260720074516_phase3_habit_layer.sql`

Before either Phase 3 daily-email flag is enabled, apply and verify the Phase 3 migration. It creates service-owned `daily_chart_preferences`, `daily_sun_preferences`, `daily_email_deliveries`, and `push_subscriptions` tables with RLS enabled and no browser policies. Daily preferences point to one chart owned by the same user, require an IANA timezone, and store only an opaque recipient HMAC. The deletion guard atomically cancels a pending request or pauses confirmed consent before a selected chart leaves the device. Sun preferences store the recipient HMAC plus double-opt-in state, never the raw address. Delivery receipts store the edition, recipient HMAC, tier, state, and provider receipt—never the raw address.

Before enabling server features, add and apply committed idempotent migrations for any live-only schema not yet represented in this directory:

- Assistant quota table and `assistant_quota_bump` function.
- Phase 4 compatibility invites, including owner scope, token lookup policy, revocation, and expiry cleanup.

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
3. Create a least-privilege server key for this project.
4. Choose a verified sender such as `Zodiacs.org <hello@zodiacs.org>`.
5. Configure the Resend email-capture variables in Vercel Production, Preview, and Development as appropriate.
6. Create twelve distinct daily Resend segments and configure `RESEND_DAILY_SIGN_SEGMENTS_JSON` identically in Vercel and GitHub Actions.
7. Configure the weekly-digest and Phase 3 daily secrets/variables in GitHub Actions; configure the confirmation, preference, and unsubscribe secrets in Vercel.
8. Test scanner-safe confirmation, token expiry, replay no-op, RFC 8058 one-click unsubscribe, and an existing-unsubscribed contact.
9. Keep `DIGEST_ENABLED` and both instances of `DAILY_EMAIL_ENABLED` off until their independent evidence is recorded in `PLAN.md`.

Daily messages send both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` to the first-party `/api/email/unsubscribe` endpoint. `GET` is read-only and asks for confirmation; RFC 8058 `POST` performs the change. Each link revokes only its named tier while leaving weekly-digest consent unchanged. Stopping the personal-chart tier lets an already-confirmed Sun-sign daily resume automatically. Revocation must continue to work when enrollment and delivery flags are off, and the database transaction remains authoritative if provider segment cleanup is unavailable.

### Daily-email verification and release

1. Leave the Vercel and GitHub `DAILY_EMAIL_ENABLED` values unset/off. Apply the Phase 3 migration only through the normal reviewed migration process, then verify its RLS, grants, ownership foreign key, timezone constraint, and receipt uniqueness.
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
3. Apply and verify the push-subscription migration.
4. Build with both runtime flags enabled in a preview and confirm the service worker version changes.
5. Test subscribe, unsubscribe, expired endpoint cleanup, frequency cap, click-through, denied permission, and iOS installed-PWA behavior.
6. Run the workflow manually with `dry_run=true`, then against a small test list.
7. Enable the Vercel `1` flags and GitHub `true` schedule variable only after the preview and test-list checks pass.

## Ask Zodiacs provisioning

1. Create a dedicated Anthropic key and set a hard provider budget/alert.
2. Apply the committed assistant-quota migration and test its atomic daily increment.
3. Configure `ANTHROPIC_API_KEY`, `ASSISTANT_SALT`, Supabase URL, and service-role secret in Vercel server scope.
4. Keep `ASSISTANT_ENABLED` off while running the red-team and source-link sample.
5. Verify same-origin enforcement, per-minute and per-day limits, cancellation, disabled fallback, no conversation persistence, and chart-summary disclosure.
6. Enable the flag only after Phase 6's DoD evidence is logged.

## Scheduled jobs

All schedules are UTC.

| Workflow | Schedule | Current behavior | Gate |
| --- | --- | --- | --- |
| `.github/workflows/daily-horoscopes.yml` | Daily 00:00 | Builds facts/publication, verifies, replays 30 days, commits changes, waits for live edition, pings IndexNow. GitHub may start the runner after the declared boundary. | Always on. Phase 1 covers all daily cuts and Monday weekly generation. |
| `.github/workflows/daily-email.yml` | Hourly at UTC minute 13 | Runs a credential-free fixture smoke; when explicitly enabled, verifies the exact live edition and selects eligible test-list recipients. | Off by default; real delivery requires GitHub `DAILY_EMAIL_ENABLED=1`. Workflow is hardcoded to `test`; no general-audience path exists. |
| `.github/workflows/weekly-digest.yml` | Monday 06:00 | Fixture smoke always; real send only when `DIGEST_ENABLED=true`. | Off by default. |
| `.github/workflows/pulse-refresh.yml` | Monday 06:17 | Refreshes Wikipedia/Trends pulse data and commits changes. | Existing, best effort. |
| `.github/workflows/distribution-refresh.yml` | Monday 06:31 | Refreshes Registry ownership distribution and commits changes. | Existing Registry operation. |
| `.github/workflows/push-daily.yml` | Daily 07:00 | Fixture smoke and edition verification; real send only when GitHub `PUSH_ENABLED=true`. | Off by default. |
| `.github/workflows/transits-monthly.yml` | Monthly on day 25 at 05:41 | Computes next month's facts, verifies deterministic regeneration, commits, and opens the twelve-sign editorial issue. | Always on; Phase 1 may automate prose but must preserve fact verification. |
| `.github/workflows/site-check.yml` | Push/PR/manual | Full build, type, fact, browser, schema, bundle, visual, Lighthouse, widget, and drift gates. | Required before merge. |

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
2. Confirm no email capture, push prompt, model call, Registry Aura entry, or wallet-chart entry leaks into the flag-off output.
3. Confirm `/today/`, all horoscope/event/content pages, and the eventual `/ask/` fallback remain useful without JavaScript or credentials.
4. Scan the repository and built output for secret values and server-only variable names in client bundles.
5. Run the full release evidence listed in `PLAN.md`.

If a provider is missing or unhealthy, turn its flag off. Do not weaken a fact, privacy, consent, or verification gate to keep a dependent feature visible.
