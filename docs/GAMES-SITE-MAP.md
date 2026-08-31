# Zodiac Games — site map & integration audit (Packet P0.1)

**Read-only audit · 2026-08-16 · brief: `ZODIAC-GAMES.md` (repo root)**

Scope: everything the Zodiac Games (The Race, weekly loop, season close,
Trophy Hall, annual standings, Astrofolio bridge) will touch. No code was
changed in this packet. The brief names the deliverable
`claude/zodiacs-site-map.md`; per owner instruction it lives here as
`docs/GAMES-SITE-MAP.md`.

---

## 1. Routing

### How routes work

Three layers stack at request time: **Vercel redirects → Vercel rewrites →
static files (Astro `dist/` merged with `public/`) → Vercel Functions
(`api/`)**.

- `astro.config.mjs` has **no `output:` key and no adapter** — the whole
  `src/pages/` tree is prerendered static HTML (`build.format: 'directory'`,
  so every route is `dist/<path>/index.html`). There is **no SSR**: you
  cannot add a `prerender = false` page. All server-side work lives in the
  root-level `api/` directory, which Vercel picks up as Node serverless
  functions independent of Astro.
- `public/` ships ~103 static HTML files verbatim (the registry wing,
  `/terminal/`, `/astrofolio/`, `/thesis/`, `/archive/`, `/sdk/`).
- `vercel.json` carries the redirect/rewrite/header tables. The one every
  new page must respect: a **global trailing-slash 301** (`/:path` without a
  slash or extension → `/:path/`, excluding `/api/*`, `/v1/*`,
  `/.well-known/*`). Canonicalize new routes with trailing slashes
  (`/race/`, `/games/history/`) or every visit eats a 301.
- Per-route market-execution CSP overrides exist only for
  `/terminal/markets/(.*)` and `/astrofolio/how-to-buy/(.*)` (allowing
  `connect-src` to the approved Jupiter and public market-data providers); a
  separate `/registry/collection/(.*)` override allows plausible.io only. The
  global CSP has no `connect-src` restriction, so a page that only calls same-origin `/api/*`
  needs no `vercel.json` change.
- Function-count pressure is real (Vercel Hobby): rewrites collapse many
  URLs onto few functions (`/api/account/:action` → `/api/account?action=`,
  `/api/compatibility/:action` → `/api/compatibility?action=`). **A new
  Games endpoint should be a new single function with `action=` branches or
  a branch on an existing one — not one file per verb.**

### How the 12 sign pages are generated

- One route file: `src/pages/[sign]/index.astro`. Its `getStaticPaths`
  (lines 15–22) maps the `guides` content collection
  (`src/content/guides/{sign}.mdx`, zod schema in `src/content.config.ts:32-49`)
  and **hard-fails the build** unless the collection is exactly the 12 signs.
- Structured sign facts live in `src/lib/signs.ts:32-47` — `SIGNS` (slug,
  name, glyph, dates as `[month,day]` start/end, element, modality, ruler,
  house, `hue`, essence) and `SIGN_SLUGS`. This is the table the Race
  standings should key off.
- Other sign-shaped routes reuse the trivial pattern
  (`SIGNS.map(sign => ({params:{sign: sign.slug}}))`):
  `src/pages/horoscopes/[sign]/{index,tomorrow,weekly,monthly,love,career,2027}`,
  `src/pages/rising-sign/[sign].astro`, locale mirrors
  `src/pages/{es,fr,it,pt,ru}/[sign]/index.astro`.

### How locales work

- Hand-rolled, not Astro i18n. Policy in `src/lib/i18n/core.ts`
  (`LOCALES` / `RELEASED_LOCALES = en,es,pt,fr,it` / catalog-only `ru`) and
  `src/lib/i18n/index.ts` (`CORE_LOCALIZED_PATHS`, `localizePath()`,
  `alternatePaths()`). Locale trees are literal directories
  `src/pages/{es,pt,fr,it,ru}/`.
- **EN-only is the zero-friction default**: don't create locale files, keep
  the new path out of `CORE_LOCALIZED_PATHS`, and `localizePath()` silently
  returns the English canonical for every locale — no hreflang emitted, no
  change to the pinned hreflang counts in `scripts/i18n-hreflang-policy.mjs`
  (which `check-dist` asserts). `/today/`, `/events/`, `/almanac/`,
  `/people/` all work this way. Per brief §10, EN-only Games pages must log
  a locale follow-up in the status log instead of silently cutting locales
  — done (see `ZODIAC-GAMES.md` §11).

### Where /race and /games/history go

- **Both namespaces are free.** No `/race` or `/games` route, redirect,
  rewrite, or `public/` directory exists (only hits: `Promise.race` in
  `src/lib/account-api/server.ts:976`, test prose).
- `/race/` → `src/pages/race/index.astro` (EN-only, `Base` layout,
  `path="/race/"`).
- `/games/history/` → `src/pages/games/history/index.astro`; add
  `src/pages/games/index.astro` as the hub later (every family has an index).
- New indexable pages must be added to `EVERGREEN_LASTMOD` in
  `src/pages/sitemap.xml.ts` (lastmod is hand-maintained; `check-dist`
  asserts sitemap coverage of every indexable page) — or marked `noindex`
  while in development.

### How dynamic data reaches static pages (house patterns)

1. **Build-time JSON + scheduled rebuild** — `src/pages/today/index.astro`
   imports `src/data/daily.json` committed by the
   `daily-horoscopes.yml` cron; `prebuild` freshness gates fail the build on
   stale data. Right for slow-moving Games data (weekly stamp, Trophy Hall).
2. **Client-side Preact island fetching `/api/*`** — the live pattern. Best
   reference: `src/islands/RegistryAura.tsx:600-650` (AbortController,
   `credentials:'omit'`, error-code allowlist before analytics) mounted from
   the flag-gated page `src/pages/registry/collection/index.astro`
   (build-time env gate → `Astro.redirect('/404.html')` when off; server
   resolves config into props; `<noscript>` fallback). Right for live
   standings + join/check-in on `/race/`.
3. Islands hydrate via `client:load` (interactive surfaces) /
   `client:visible` / `client:idle`; directives live on the page, not the
   island.

---

## 2. Backend (Supabase)

### Schema today (supabase/migrations/, 11 files)

| Migration | What it adds |
|---|---|
| `20260706000000_profile_sync` | `profiles`, `charts` — the only browser-reachable tables (RLS own-row policies, `authenticated` role; `anon` revoked) |
| `20260706130517_chart_deletions` | tombstones for v1 sync |
| `20260707125552_weekly_digest_opt_in` | `profiles.digest_opt_in`, first `service_role` grants |
| `20260720074516_phase3_habit_layer` | server-owned email layer: `daily_chart_preferences`, `daily_sun_preferences` (keyed **only** by 64-hex recipient HMAC — anonymous consent), `daily_sun_confirmation_requests`, `daily_sun_confirmation_rate_limits`, `daily_email_deliveries` (PK `(edition_date, recipient_hash)` — per-day dedupe), `push_subscriptions` |
| `20260720145526_phase3_delivery_guards` | delivery claims with `UNIQUE(endpoint_hash, utc_date)` on a **stored generated UTC-date column**, advisory-lock claim RPCs, 7-day rolling caps |
| `20260724003109_phase4_compat_invites` | `compatibility_invites` state machine, `compatibility_invite_events` (PK `(invite_id, event)` — dedupe-by-PK lifecycle events), delivery claims |
| `20260727050000/180000_phase6_assistant_quota` | `assistant_quota` PK `(visitor_hash, quota_day)` upsert-accumulator + global-ceiling RPC |
| `20260811153303_account_sync_v2_foundation` | `private` schema, 13 tables, ~40 RPCs — encrypted account sync v2 |
| `20260813102035_guide_atomic_quota_reservation` | **the rate-limit gold standard**: `guide_quota_operation_receipts` (replay suppression by operation hash) + `guide_quota_reserve_v1` (SECURITY DEFINER, `search_path=''`, ordered `pg_advisory_xact_lock`s, statuses `reserved/operation_replay/visitor_limit/global_limit`) |
| `20260814062255_guide_quota_legacy_shape_repair` | replay-safe in-place repair pattern |

House rules that a participation table must follow:

- Server-owned tables live in `public` with **RLS enabled and zero
  policies**, all grants revoked from `public/anon/authenticated` (newest
  convention revokes even `service_role` table access), reachable only via
  `SECURITY DEFINER` RPCs granted to `service_role`.
- Repeated events are **deduped by primary key**, never logged-then-cleaned:
  per-day = PK `(edition_date, recipient_hash)`; per-UTC-day =
  `UNIQUE(endpoint_hash, utc_date)` with a stored generated date column;
  totals = upsert-accumulator `on conflict … do update set count = count+1`.
- Never compute totals with an unlocked `SUM` at read time — the
  guide-quota migration header documents that exact race.
- Migrations are raw SQL pasted into the reviewed Supabase SQL Editor, so
  every migration must be **replay-safe** (`if not exists`,
  `create or replace`, guarded `do $$` blocks); shipped migrations are
  immutable.

### Where the participation table fits

Follow the phase3/phase6 anonymous-hash model (a Games join must not
require an account). Suggested shape (final design is R1.2's job):

- `zodiac_games_participants` — PK `(season_id, participant_hash)`,
  `sign` CHECK over the 12 literals (copy `phase3_habit_layer` :162-166),
  `participant_hash ~ '^[0-9a-f]{64}$'`, `joined_at`.
- `zodiac_games_checkins` — PK `(season_id, participant_hash, week)` (or a
  stored generated week column + unique constraint, the
  `push_delivery_claims` idiom) — a check-in physically cannot double-count.
- `zodiac_games_sign_totals` — PK `(season_id, sign)`, points updated
  inside the same RPC transaction via upsert-accumulator. Season results
  frozen at close become the immutable Trophy Hall rows.
- One `zodiac_games_join_v1` / `zodiac_games_checkin_v1` RPC modeled
  line-for-line on `guide_quota_reserve_v1` (operation-receipt replay
  suppression, ordered advisory locks, JSON status returns, caller-supplied
  global ceiling validated `between 1 and 10000`) — this is the anti-abuse
  layer §6.2 of the brief requires.
- Identity: no anonymous device-ID scheme exists yet. The nearest precedents
  are the Guide's signed `__Host-` session cookie + HMAC visitor hash with
  IP-bucket quota identity (`src/lib/guide-server/security.ts`) and the
  email `recipient_hash`. R1.2 should mint a Games cookie the same way
  (domain-separated HMACs, raw IDs never reach the DB).

### Cleanest write path browser → api/ → Supabase

The established pattern, used by every server-owned feature:

1. Preact island POSTs same-origin to `/api/<fn>?action=…` with
   `credentials:'omit'` (unless account-bound).
2. The function checks origin/referer (`isAllowedSiteRequest`-style helper),
   caps the body (aura caps at 256 bytes), then calls PostgREST **with raw
   `fetch`** — `POST ${PUBLIC_SUPABASE_URL}/rest/v1/rpc/<fn>` with
   service-role headers (`src/lib/account-api/server.ts:98-108`,
   `api/push/subscribe.ts:121-128`, `src/lib/guide-server/quota.ts:90-120`).
   **`@supabase/supabase-js` is never used in API routes** — only in the
   browser (anon key, `src/lib/supabase/client.ts`) and in cron scripts
   (service key).
3. Edge rate limiting exists once: `@vercel/firewall`
   `checkRateLimit('registry-aura-holdings-v1')` in `api/aura-holdings.ts`
   (needs a matching WAF rule; limiter failure → 503 fail-closed).
   Everything else rate-limits durably in Postgres.

### Auth/anon patterns

- **Accounts**: Supabase Auth JWT via `strictBearerToken` +
  server-side verification (`src/lib/account-api/handler.ts`); not needed
  for the Race MVP.
- **Anonymous**: HMAC-hashed identities only — Guide session cookie
  (`v1.<sessionId>.<HMAC>`, `HttpOnly; Secure; SameSite=Strict`) with
  separate principal/quota hashes; email `recipient_hash`; push keyed by
  endpoint URL. The Race should join this family, not invent bearer tokens.
- SQL is tested by Bash runners that replay all migrations (twice, to prove
  replay-safety) in a disposable `postgres:17` Docker container plus
  contract/concurrency tests (`scripts/test-phase3-delivery-sql.sh` et al,
  wired as separate CI jobs). A Games migration gets its own
  `scripts/test-games-sql.sh` + `supabase/tests/zodiac_games*.sql` + CI job.

---

## 3. API inventory (api/)

All zero-config Vercel **Node** functions (no Edge). `_`-prefixed dirs are
bundled imports, not endpoints.

| Route | Purpose / auth | Games relevance |
|---|---|---|
| `/api/account?action=…` (`api/account.ts` → `src/lib/account-api/`) | account sync v2, Supabase JWT | not needed for MVP |
| `/api/assistant`, `/api/guide` | streaming Claude chat; origin check + Postgres quotas | quota RPC pattern to copy |
| `/api/aura-holdings` | wallet → holdings; `@vercel/firewall` rate limit | the firewall + body-cap + timeout discipline to copy |
| `/api/wallet-birth` | wallet first-tx chart | — |
| `/api/compatibility?action=…` | invite lifecycle + `registry-news`; cron sweep via bearer secret | the `action=` fan-out shape for a new `api/games.ts` |
| `/api/calendar/transits` | signed-token .ics feed | — |
| `/api/email/subscribe` (+ `/confirm`, `/unsubscribe` rewrites) | daily lists, **double opt-in**, honeypot, Resend | the opt-in machinery the standings email should reuse |
| `/api/email/chart-preference`, `/api/email/admin-bootstrap` | per-chart brief prefs | — |
| `/api/unsubscribe` | weekly digest opt-out, random bearer stored only as a SHA-256 digest and consumed by a least-privilege RPC | template for a standings unsubscribe |
| `/api/push/subscribe` | anonymous web-push upsert (`PUSH_ENABLED` gate) | later; push list has no user identity |

### What the weekly standings email can reuse

- **Provider**: Resend (`EMAIL_PROVIDER` selects resend/buttondown/loops;
  only Resend has first-party confirm). Env split enforced:
  `RESEND_API_KEY` (send) must differ from `RESEND_CONTACTS_API_KEY`.
- **Template system**: `src/lib/email/template.ts`
  (`EmailDocument`/`renderEmailHtml`/`renderEmailText`, per-sign `SIGN_HUE`
  accents) — build the standings email with this, not new HTML.
- **Send mechanics to copy from `scripts/send-weekly-digest.ts`**:
  `List-Unsubscribe` + one-click POST headers, serialized bounded 429 retries,
  stable provider idempotency keys, durable weekly delivery slots, and
  aggregate-only logging. Copy the database receipt state machine as a unit;
  a process-local recipient cap alone is not a delivery guarantee.
- **Scheduling**: GitHub Actions, not Vercel cron.
  `.github/workflows/weekly-digest.yml` (Mon 06:00 UTC,
  `vars.DIGEST_ENABLED` gate, fixture dry-run smoke step) is the template →
  new `weekly-standings.yml` + `scripts/send-weekly-standings.ts` with its
  own `vars` gate. Existing cron minutes: daily-email :13 hourly,
  compat-sweep :17, receipt-cleanup :37, pulse Mon 06:17, distribution
  Mon 06:31 — pick an unused slot.
- **Consent decision for R2.2**: the weekly digest is an account-bound
  profile toggle with **no** double opt-in. The standalone public capture uses
  opaque 48h AES-GCM claims; daily-Sun capture uses a separate AES-GCM claim;
  chart-bound daily confirmation signs identifiers and a recipient hash without
  embedding an address. All keep GET read-only and require an explicit POST for
  scanner safety, while daily unsubscribe authority remains HMAC-bound. A public
  standings list should use the standalone DOI machinery
  (`src/lib/email/opt-in-token.ts`, `api/email/_confirm.ts`) and a dedicated
  daily-style unsubscribe token (binds recipient hash + list kind). The
  account weekly uses a different 256-bit capability with a bounded expiry and
  database-owned consumption state; it does not expose a user ID.

---

## 4. Existing surfaces (registry / terminal / shelf / exchange / trade)

One React bundle (`public/assets/app.js` ← `src/app.jsx`, built by
`scripts/build-app.mjs`) hydrates three static wing surfaces:

| Surface | Route | Register |
|---|---|---|
| Astrofolio (consumer collection) | `/astrofolio/` (`public/astrofolio/index.html`) | consumer collect |
| Terminal (expert desk) | `/terminal/` (`public/terminal/index.html`) | market desk |
| Terminal Markets (venue) | `/terminal/markets/` | trading venue, flag-gated |
| Registry (authority hub) | `/registry/` + `/registry/{sign}/` (generated) | records only |

- **`src/registry/`** = two pure data modules, not pages:
  `outlook.mjs` (symbolic outlook, market data can never change the sky
  score; directional forecasts disabled until 180 days of history — there
  are currently 8) and `selected-token-chart.mjs` (isolated 24h chart lane).
  `src/pages/registry/` = two flag-gated Astro pages: `collection/`
  (the Cabinet) and `wallet-chart/`.
- **`src/terminal/`** = one CSS file (`split-styles.css`), inlined into the
  wing HTML by `build-app.mjs`. `/terminal/research/` is Astro, reading
  committed `src/data/registry-research/publication.json`.
- **`src/shelf/`** = the Three.js gallery bundled to
  `public/assets/gallery.js`. Bakes identity + DexScreener *pair* ids;
  fetches mints live from `/registry/zodiacs.registry.json`
  (`cache:'no-store'`) — "no verified mint, no buy button." Note:
  CLAUDE.md says the band mounts on `/registry/`; it actually mounts from
  `src/app.jsx:2755` on Terminal (and `/thesis/`).
- **`src/exchange/`** → `public/assets/exchange.js`: the market terminal
  (DexScreener stats, GeckoTerminal candles with a 12-req/min client
  budget). **`src/trade/`** → `public/assets/trade.js`: a Jupiter Ultra
  swap client (site never signs or submits; 10bps fee ceiling rejects
  misconfigured referrals). A swap can execute from `/terminal/markets/`
  and, after explicit visitor intent, the owner-approved beginner tool at
  `/astrofolio/how-to-buy/`; Terminal Markets remains doubly gated by `PUBLIC_REGISTRY_EXCHANGE_ENABLED`
  (committed **off**; stamped by `scripts/configure-registry-exchange.mjs`)
  and route-scoped CSP (only `/terminal/markets/` and
  `/astrofolio/how-to-buy/` may reach `api.jup.ag`).
  `configure-registry-trade.mjs` is a retired 5-line
  no-op; `src/trade/entry.mjs` is orphaned stamping machinery.
- **The Cabinet** = `/registry/collection/`
  (`src/islands/aura/AuraCollectionCabinet.tsx` + `RegistryAura.tsx`),
  flag `PUBLIC_REGISTRY_COLLECTION_ENABLED` (committed off). Reads balances
  via `api/aura-holdings.ts` → raw chain RPC; converts amounts to finish
  tiers server-side (pastel/bronze 10k/silver 100k/gold 1M/crown 10M),
  never exposes raw amounts, touches no price API (CSP-enforced). Neutral
  showcase — matches brief §10.

### Token/price data & cadence

- **Live browser fetches** (no key, no cron): DexScreener batch-of-12
  (`src/exchange/stats.mjs:11`, `src/app.jsx:1257`, 120s refresh),
  GeckoTerminal OHLCV/trades (`src/exchange/gecko.mjs`), Jupiter Ultra
  quotes (venue only), per-sign quote on wing catalogue pages (120s).
- **Daily snapshots** (`registry-market-snapshot.yml`, 06:53 UTC, hard-gated
  on the Daily Sky commit): `public/assets/data/registry-market-history.v1.json`,
  `public/assets/registry-outlook.json`, research feed.
- **Weekly snapshots** (Mondays): `public/assets/pulse.json` (Wikipedia
  attention, not prices) and `public/assets/distribution.json` (ownership
  spread via Solana RPC).

### The "season" concept already exists

`scripts/astrofolio-season.mjs` — `seasonsFromRegistry()` parses the 12
`metadata.dateRange` strings from `public/registry/zodiacs.registry.json`;
`resolveAstrofolioSeasonUtc()` resolves any UTC instant to its zodiac
season, deterministically, no clock/locale dependency.
`scripts/stamp-astrofolio-season.mjs` (first in `postbuild`) stamps the
in-season identity into `dist/astrofolio/index.html` from pregenerated
per-sign packages (`public/assets/astrofolio/v2/{sign}/`, hash-verified by
`verify-astrofolio-identity.mjs` in `prebuild`). **The Race's season clock
should import this resolver, not reimplement it** — one definition of
"Virgo Season" sitewide. Note the resolver is date-range-based (no year);
the Games needs a season *instance* id (e.g. `virgo-2026`) layered on top.

---

## 5. Analytics

**Installed: Plausible, cookieless — P0.2 is mostly done already.**

- Loader in `src/layouts/Base.astro:63-326`, env-gated
  (`PUBLIC_PLAUSIBLE_SCRIPT_URL` / `_ENDPOINT` / `_DOMAIN`), skipped on
  `noindex`/private surfaces. Wing pages get the same via
  `scripts/configure-legacy-analytics.mjs` (predev/prebuild, stamps
  `public/astrofolio/index.html` + `public/terminal/index.html` between
  `zodiacs-analytics` markers).
- **Events are allowlisted**: `src/lib/analytics-config.mjs` defines
  `ANALYTICS_EVENT_PROPS` (event → allowed prop names) and
  `ANALYTICS_EVENT_VALUES` (closed value sets). The RegistryAura island
  maps errors through a copy allowlist before emitting so raw strings can't
  pollute the event space. Referrer privacy is tested
  (`scripts/analytics-referrer-privacy.test.mjs`).
- What P0.2 actually needs: add the §8 event set (`race_view`, `team_join`,
  `weekly_checkin`, `share_card`, `trophy_view`, `season_result_view`,
  `trophy_hall_view`, `race_to_astrofolio`, `ramp_click`) with their props
  to `ANALYTICS_EVENT_PROPS` (+ closed values for `sign`/`season`/`source`
  in `ANALYTICS_EVENT_VALUES`), then fire them from the Race island via the
  existing `window.plausible` queue. No new vendor, no script work.
  Privacy rules of §8 (counts not identities, no wallets/emails in props)
  match the existing posture.

---

## 6. Astrofolio canonicalization (completed 2026-08-23)

Astrofolio is the consumer collection at the official canonical route
`/astrofolio/`. The former Astrofolio domain is now a redirect alias to that
route; it is not a separate operator, product, or destination. Consumer links,
legal disclosures, localized strings, SDK copy, assistant context, generated
Registry assets, and thesis materials were updated to reflect this relationship.

The identity pipeline and generated asset trees retain the Astrofolio product
name. Internal aliases such as `/collect`, `/registry/gallery/`, and
`/registry/shelf/` also resolve to `/astrofolio/`. Tests preserve one explicit
reference to the former domain only to verify that it is not emitted as a live
consumer link; `LISTINGS.md` records it solely as a redirect alias.

R2.5 used a one-time protected-scope allowance for the Registry SPA, generated
bundle, locale strings, and related source files. The scope receipt is pinned in
`.github/phase1-scope-allowance.json`.

---
## 7. Risks — what makes adding a dynamic page painful

1. **No SSR.** Static-only Astro, no adapter. Live standings must be a
   client island + `api/` function; anything rendered into HTML is only as
   fresh as the last deploy. Plan copy accordingly (the no-JS fallback on
   `/race/` shows season + explainer, not live numbers).
2. **Phase 1 protected-scope guard** (`scripts/phase1-scope-guard.mjs`,
   first step of CI). Freezes: `public/registry/` + `src/pages/registry/`,
   `src/app.jsx` + `public/assets/app.js`, registry builders and assets
   (including `public/assets/astrofolio/`), SDK, `src/pages/[sign]/index.astro`,
   `src/content/guides|signs|placements/`, `scripts/{build-sign-pages,sign-data}.mjs`,
   Learn pages, es/pt/fr/it page trees and string catalogs. Escape hatch: a
   one-time allowance file `.github/phase1-scope-allowance.json` pinned to
   the exact base commit and the exact protected path set. **Affected
   packets: R2.1** (sign-page ramps touch `[sign]/index.astro`) **and R2.5**
   (sweep touches `app.jsx`, locale strings, `sign-data.mjs`). `/race/`
   itself touches nothing protected.
3. **Heavy prebuild/postbuild chain** (`package.json:13,15`): editorial
   freshness gates (build fails if `src/data/daily.json` isn't the build
   date — local builds need fresh data or the documented replay), astrofolio
   identity verify, OG verify, registry hub/establishment sync,
   `check-dist` (every link resolves; sitemap covers every indexable page;
   hreflang block counts pinned), `schema:check`, `report-bundles --fail`
   (per-route JS budgets from `budgets.json` + astronomy-engine isolation).
   A new page with a new island must stay inside `chunk-max: 60` KB and
   will need its own `budgets.json` entry if it should be tracked.
4. **CI wall** (`.github/workflows/site-check.yml`): wing-language grep
   gate — `Solana|DexScreener|Jupiter swap|ERC-20|SPL record|memecoin|market cap`
   are **banned in `src/pages`, `src/components`, `src/islands`,
   `src/content`, `src/layouts`** (registry/aura paths exempt). The Race
   market module and Meet-[Sign] bridge copy must avoid those exact tokens
   on consumer surfaces (the approved R1.1 copy already does). Also: voice
   gates, authorship gate, visual regression, Lighthouse budgets
   (`tests/visual/lighthouse.mjs` — a `/race/` entry would be added to its
   route list deliberately, not by default), legacy-wing drift job.
5. **SQL discipline**: participation tables need replay-safe SQL Editor
   migrations + a Docker Postgres test runner + a CI job, matching
   phase3/4/6. Budget real effort for `zodiac_games*.sql` contract +
   concurrency tests.
6. **Vercel function count**: one new `api/games.ts` with `action=` branches
   (join, checkin, standings) + rewrites, not three files.
7. **Service worker**: HTML is network-first and `/registry/**.json` is
   never cached (good — no stale standings), but if standings are served
   from a new JSON route, don't let it match any cache-first pattern in
   `public/sw.js` / `scripts/build-service-worker.mjs`.
8. **Season identity**: reuse `scripts/astrofolio-season.mjs`; add a
   year-qualified season-instance id for the Games. Season boundaries are
   UTC date-range based (registry `dateRange`), not solar-ingress-exact —
   fine, but pick one definition and state it on `/race/`.

---

## 8. Recommended plan for /race

### Architecture (one sentence)

Static `/race/` page + one Preact island + one `api/games.ts` function with
`action=` branches + three server-owned Supabase tables behind
`SECURITY DEFINER` RPCs, standings read from a tiny GET branch, all events
through the existing Plausible allowlist.

### Files to create

| File | Purpose |
|---|---|
| `src/pages/race/index.astro` | EN-only page; season header, no-JS fallback (season + countdown + explainer from build-time season resolve), mounts the island `client:load` |
| `src/islands/RaceStandings.tsx` (name TBD) | standings board, join module, weekly check-in, share hook; fetch pattern copied from `RegistryAura.tsx` |
| `src/lib/games/season.ts` | thin wrapper over `scripts/astrofolio-season.mjs` logic adding season-instance ids (`virgo-2026`) and week stamps |
| `api/games.ts` | `action=standings` (GET, CDN `s-maxage` ~60s), `action=join`, `action=checkin` (POST, origin check, body cap, cookie mint/verify, PostgREST RPC calls) |
| `supabase/migrations/<ts>_zodiac_games.sql` | participants / checkins / sign_totals + join/checkin RPCs (guide-quota idioms) |
| `supabase/tests/zodiac_games.sql` (+ `_concurrency.sql`), `scripts/test-games-sql.sh` | contract + concurrency tests, Docker runner |
| `.github/workflows/` — none yet | weekly recap/email is R2.2 |

### Files to touch

| File | Change |
|---|---|
| `src/pages/sitemap.xml.ts` | add `/race/` to `EVERGREEN_LASTMOD` (or ship first PR `noindex` and defer) |
| `src/lib/analytics-config.mjs` | add `race_view`, `team_join`, `weekly_checkin`, `trophy_view`, `race_to_astrofolio`, `ramp_click` (+ closed values) |
| `vercel.json` | rewrites `/api/games/:action` → `/api/games?action=:action`; no CSP change needed (same-origin API only) |
| `.github/workflows/site-check.yml` | add the `games-sql` job |
| `budgets.json` | add `/race/` entry once the page exists |
| `ZODIAC-GAMES.md` | status log |

Nothing protected by the phase1 scope guard is touched.

### Smallest viable first PR (R1.2, cut to the bone)

1. **SQL first, alone is fine**: the migration + tests + CI job. It's the
   riskiest piece and reviewable in isolation.
2. **Then the page**: `/race/` with season header, countdown, standings
   from `action=standings`, join flow with the R1.1 copy verbatim, weekly
   check-in, the one-sentence scoring rule, and the FAQ. `noindex` until
   copy/data settle, which also defers the sitemap/lighthouse touches.
   Defer to later packets: share cards (R1.3), trophy visual beyond a
   simple countdown state, market module (needs the §6.8 risk line and
   wing-language care — not required for launch), email opt-in (R2.2),
   Meet-[Sign] bridge pages (R2.5 can start as a link to `/astrofolio/`
   with sign preselected via the existing `#astrofolio-{sign}` anchors).
3. Scoring weights: start `join = 100`, `weekly check-in = 25`, shares
   measured but worth 0 until anti-abuse is proven (brief §6.2 lets
   implementation decide; a zero-weight share is the only launch-safe
   value). One sentence stays true: "People score the points: joins, weekly
   check-ins, and shares. Nothing else counts."

### Packet order impact (for the status log)

- P0.2 shrinks to "extend the event allowlist + verify events fire."
- R2.1 and R2.5 each need a phase1 scope allowance prepared with the owner.
- R2.2 should reuse daily-list DOI + Resend + `weekly-standings.yml`.
- Trophy Hall (R2.3) fits the build-time pattern: frozen season results
  committed as JSON (like `src/data/events-publication.json`) rendered
  statically at `/games/history/` — immutable by construction.
