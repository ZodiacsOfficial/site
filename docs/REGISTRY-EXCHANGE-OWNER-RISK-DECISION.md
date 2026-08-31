# Zodiac Markets — owner risk decision

Status: ratified by the owner; flag-on authorized once every mandatory control
below is satisfied.

Approved: 2026-08-10T11:40:11Z

## Addendum — 2026-08-31: pilot continuation to 2026-09-30, as a bridge to Swap V2

Authorized: 2026-08-31 (owner-directed continuation)

This addendum records the dated review this decision requires before the
pilot may continue past 2026-09-09, and bounds the continuation:

- **Live-contract review, 2026-08-31.** The committed provider probe
  (`npm run exchange:probe`, four read-only taker-less requests across the
  three providers) passed in full: venue fee reported at 10 bps, equal to
  and not above the 0.10% ceiling; indexed price and liquidity answered;
  chart contract returned 168 rows; recent-trades contract returned 34
  rows; every request completed within the probe deadline. Jupiter's
  documentation still labels Ultra a legacy path; this continuation does
  not call that contract durable.
- **Pilot evidence.** The closed-schema mount and provider-state events
  and direct user feedback remain under the owner's daily review; no stop
  condition has been recorded, and the production flag remains on.
- **The continuation is a bridge, not a renewal.** The pilot continues on
  the ratified legacy Ultra path only while the separate Swap V2 migration
  decision (drafted alongside this addendum) is pending, and ends at the
  earliest of: the migration deploying, a probe or stop-condition failure,
  or **2026-09-30**. On or before 2026-09-30 the venue route returns
  flag-off unless a further dated owner decision is recorded.
- The probe is re-run before any further continuation decision. Every
  other control — daily UTC review, `noindex`, no-store, CSP,
  zero-compensation, custody and rollback — remains unchanged, and no new
  acquisition surface is created.

## Addendum — 2026-08-31: Astrofolio market-gateway discovery entry

Authorized: 2026-08-31 (owner-directed)

This addendum supersedes only the count and location of the same-origin,
flag-gated venue-route discovery entries. It does not widen the execution,
custody, compensation, indexing, provider, telemetry, pilot, or rollback
boundary:

- A second flag-gated venue-route discovery entry is authorized on
  `/astrofolio/`, as one action in the market gateway beside the leaderboard
  of the Twelve. Like the `/terminal/` gateway entry it appears only when
  `PUBLIC_REGISTRY_EXCHANGE_ENABLED=1`, links to
  `/terminal/markets/#<selected-sign>` carrying only a canonical sign slug in
  the URL hash, and contains no venue URL.
- `/astrofolio/` now carries the exchange flag marker, committed `0`, stamped
  by the same build stamper that sets the venue-route and `/terminal/`
  markers from the same flag. Committed HTML remains flag-off: the entry is
  absent and every marker is `0`.
- Mounting, rendering, or focusing the entry causes no provider or wallet
  request; selecting it only navigates.
- Leaderboard rows remain identity links back to the sign. No global
  navigation, footer, Cabinet, sign-record, or leaderboard-row venue-route
  entry is authorized.
- The venue route itself remains `noindex`, `no-store`, out of the sitemap,
  and service-worker network-only, so rollback cannot recover a stale
  flag-on entry.

This addendum does not restart or extend the 30-day pilot. The protected
venue route still returns flag-off on or before **2026-09-09** unless the
owner records the dated live-contract and pilot-evidence review already
required by this decision; flag-off removes this entry with the rest. Every
earlier control remains in force unless its only subject is the superseded
discovery-entry count or location.

## Addendum: 2026-08-13 current public product names

Authorized: 2026-08-13

This addendum changes public labels and their canonical routes only. It does not widen the acquisition,
execution, custody, indexing, provider, telemetry, pilot, or rollback boundary:

- `/astrofolio/` is **Astrofolio**, the indexed consumer collection of gold
  sculptures and official Zodiac tokens.
- `/terminal/`, its reviewed research, and the protected
  `/terminal/markets/` venue route are **Terminal**, the expert market desk.
- The former `/terminal/pro/` URL permanently redirects to `/terminal/` and
  is no longer indexed or served as a second expert surface.
- The protected route no longer presents **Zodiac Markets** as an active
  product name. Internal `exchange` identifiers, the feature flag, event
  names and every control in this record remain unchanged. Route references
  in earlier dated addenda are retained as historical decision evidence.
- “Zodiac Markets,” “Pro Terminal,” “consumer Terminal,” and “Zodiac
  Terminal” below are historical labels from the dated decisions that used
  them; they are preserved as decision evidence, not current navigation copy.

## Addendum — 2026-08-12: Pro Terminal discovery entry

Authorized: 2026-08-12

This addendum supersedes only the location of the single already-authorized
Zodiac Markets discovery entry and authorizes the accompanying Pro Terminal
reading surface:

- `/terminal/` remains the indexed consumer collection, now named Astrofolio,
  and carries no venue-route discovery entry or exchange flag marker in either
  flag state. `/terminal/pro/` is the indexed, data-forward Terminal surface;
  the view switch between Astrofolio and Terminal is not a venue-route entry.
- The one same-origin, flag-gated Zodiac Markets discovery entry moves from
  `/terminal/` to `/terminal/pro/`. It appears only when
  `PUBLIC_REGISTRY_EXCHANGE_ENABLED=1`, links to
  `/terminal/markets/#<selected-sign>`, and carries only a canonical sign slug
  in the URL hash. It contains no venue URL.
- The same build stamper sets the venue-route marker and the expert Terminal
  marker from the same flag. Committed HTML remains flag-off: the market
  terminal and expert gateway are absent and both markers are `0`.
- Mounting, focusing, or selecting the gateway causes no provider or wallet
  request. The expert reading surface may continue Terminal's existing
  browser-direct, read-only indexed market-data requests; it embeds no trade
  panel and adds no Jupiter request.
- No global navigation, footer, Cabinet, sign-record, Astrofolio, or
  leaderboard-row venue-route entry is authorized. The Terminal page and each
  form of its navigation URL is service-worker network-only so rollback
  cannot recover a stale flag-on gateway.
- The venue route itself remains `noindex`, `no-store`, out of the sitemap, and
  under its existing route-specific CSP. Its route, execution/custody boundary,
  internal `exchange` identifiers, analytics event names, provider controls,
  zero-compensation terms, risk copy, and rollback procedure stay unchanged.

This addendum does not restart or extend the 30-day pilot. The protected venue route
returns flag-off on or before **2026-09-09** unless the owner records the dated
live-contract and pilot-evidence review already required by this decision.
Every earlier control remains in force unless its only subject is the
superseded discovery-entry location.

## Addendum — 2026-08-11: Terminal route split

Authorized: 2026-08-11

This addendum supersedes only the public route and the location of the single
already-authorized discovery entry:

- Zodiac Markets moves from `/registry/exchange/` to
  `/terminal/markets/`. The previous path permanently redirects to the new
  path and never serves terminal code.
- The one flag-gated discovery entry moves with Zodiac Terminal from the old
  `/registry/` market landing to `/terminal/`. It continues to carry the
  selected sign only in the URL hash.
- The feature flag, internal `exchange` identifiers, analytics event names,
  provider boundaries, and Registry API/schema contracts stay unchanged.
- The new route inherits the exact noindex, no-store, CSP, service-worker,
  custody, compensation, independent-venue, pilot, and rollback controls.
- This split creates no additional acquisition surface. The read-only
  `/registry/` verification hub, sign records, canonical datasets, and SDK
  interfaces remain Registry surfaces.

Every earlier control in this record remains in force unless its only subject
is the superseded public route or discovery-entry location.

## Addendum — 2026-08-10: public name and one Registry entry

Authorized: 2026-08-10

This addendum supersedes only the original public name and discovery
boundary. It does not expand execution, custody, indexing, provider, or pilot
scope:

- The public name is **Zodiac Markets**. The interface must continue to say
  that Zodiacs.org operates no market and that every order belongs to the
  independent venue that builds, executes, and charges for it.
- The route, internal `exchange` identifiers, and feature-flag name stay unchanged.
- The owner authorizes exactly one same-origin discovery entry on `/registry/`,
  only when `PUBLIC_REGISTRY_EXCHANGE_ENABLED=1`. It may link to
  `/registry/exchange/` with the selected sign in the URL hash.
- No global navigation, footer, Cabinet, or sign-record entry is authorized.
  The Registry entry contains no venue URL and mounting or selecting it causes
  no provider or wallet request.
- The same build stamper must set the route and Registry landing markers from
  the same flag. Flag-off means that the route terminal and the Registry entry
  are both absent.
- All noindex, no-store, CSP, service-worker, custody, compensation,
  independent-venue, pilot, and rollback controls remain unchanged.

Scope: exactly one additional surface — Zodiac Markets at
`/registry/exchange/` — plus the shared trade-client safeguards needed to keep
that surface within the existing trust boundary; Solana only; spot only; the site's existing trade panel calling
Jupiter's public Ultra API, plus read-only market description (candlestick
charts, a recent-trades tape, indexed price/liquidity statistics) and a
quote-derived depth ladder; no referral account, platform fee, or
compensation of any kind; committed HTML always flag-off behind
`PUBLIC_REGISTRY_EXCHANGE_ENABLED`.

This record reuses the execution trust boundary ratified on 2026-08-02
(`docs/REGISTRY-TRADE-OWNER-RISK-DECISION.md`, scope amended 2026-08-04), but
expands the acquisition surface, provider dependencies, browser request
volume, and operational exposure. Those changes are expressly decided here.
The earlier decision reserved "acquisition surfaces outside the twelve
catalogue pages" for a later record; this is that record, for one named
surface.

Like the trade decision it extends, this is an owner risk decision, not a
legal opinion or a claim that every applicable jurisdiction has been
analysed. Ratification does not substitute for advice from qualified counsel.
Whether to obtain that advice remains an owner-only decision; the flag stays
off until the owner explicitly ratifies this record after considering it.

## What is being decided

Whether the Registry may keep one interface in which the twelve records,
their market history, and the venue's own quotes stand side by side. The trade
inside Zodiac Markets is the already-ratified trade:
the same panel, the same venue, the same controls, on one more page.

The transaction protocol is unchanged. The market-data surface, automated
quote traffic, shared fee guard, provider limits, monitoring duties, and
rollback requirements are new:

- **Candlestick charts and a recent-trades tape**, read in the visitor's
  browser from GeckoTerminal's public keyless API for the sign's canonical
  pool. Read-only GET requests carrying a public pool address and a
  timeframe — never a wallet address, never any visitor identifier beyond
  ordinary web-request metadata. The provider is named on the privacy pages
  in every locale and credited beside the chart.
- **Price, 24h change, and indexed liquidity** for the twelve, from the same
  Dex Screener endpoints the Registry already uses, labelled "indexed" as
  everywhere else.
- **A depth ladder.** The pools are AMMs; there is no order book, and the
  interface does not pretend to one. Each rung is an indicative, taker-less
  Jupiter quote for a fixed size ($25–$1,000), sampled sequentially from the
  same Ultra endpoint the panel uses. A trade is quoted again before wallet
  review; sell-side dollar sizes are estimates derived from the indexed mid,
  while their displayed prices come from Jupiter's atomic amounts. The
  caption beside it says exactly this and is pinned by test.

## The name

"Zodiac Markets" names the advanced market-data and trade interface without
claiming that Zodiacs.org operates an exchange or venue. The boundary the
trade decision rests on is stated in the interface itself: it "presents a
trade that an independent venue builds, executes, and charges for", and
"operates no market". Those sentences are
pinned by `scripts/exchange-risk.test.mjs` against the committed page and
survive stamping. The route, source directory, and flag retain the internal
word `exchange` for compatibility; those identifiers are not a public claim
about who operates the venue.

## Why this stays inside the ratified boundary

- The execution path is unchanged: quotes and transactions come from
  Jupiter's Ultra API; the visitor's wallet signs; Jupiter submits. The site
  still builds, signs, sends, and reverses nothing, holds no keys or funds,
  and receives no compensation. The exact venue fee is reported with every
  trade-panel quote and may not exceed 0.10%; a missing, malformed, or higher fee is
  refused before the quote can be used.
- The ladder adds no new privilege: it is the panel's own quote call at
  fixed sizes, taker-less by construction (`src/exchange/depth.mjs` never
  passes one; pinned by test).
- The market-data providers add no new kind of exposure: Dex Screener is
  already ratified practice on the sign pages and hub; GeckoTerminal is the
  same posture — keyless, read-only, browser-direct, no site secret, no
  third-party script. Chart data arrives as JSON and is drawn by the site's
  own canvas code; no widget, iframe, or external stylesheet is embedded.
  (Jupiter's Plugin widget remains rejected per the 2026-08-02 probe — its
  Google Fonts dependency still breaks the self-hosted-fonts rule.)
- Identity still has one answer: every mint is read live from
  `/registry/zodiacs.registry.json`; nothing is baked into the page or the
  bundle (pinned by test). No verified mint, no panel and no ladder.

## Time-limited venue dependency

Jupiter's official documentation checked on 2026-08-10 says that Ultra Swap
is no longer actively maintained and has been superseded by Swap V2. The
existing keyless `lite-api.jup.ag/ultra/v1` contract still answered live
no-taker and Aries quote probes that day, but this record does not call that
contract current or durable.

Ratification therefore authorizes, at most, a 30-day pilot on the existing
ratified Ultra path. Immediately before a flag-on build, the launch owner must
run the committed provider probe and keep the flag off if the no-taker order,
fee boundary, market-index, chart, or recent-trades contracts fail. Zodiac Markets returns flag-off
on or before 2026-09-09 unless the owner records a dated review of the live
contract and pilot evidence. Migrating to Swap V2, introducing an API key or
site proxy, changing the 10 bps fee ceiling, or otherwise changing transaction
responsibility requires a new owner decision before code or configuration.

## Controls that remain mandatory

The earlier execution, custody, and compensation controls carry over. The
explicit surface-specific terms below govern where they add to or differ from
that record:

1. Committed `public/registry/exchange/index.html` stays flag-off; only the
   Vercel production environment may set `PUBLIC_REGISTRY_EXCHANGE_ENABLED=1`
   by default. Before launch, the owner may authorize one deployment-protected,
   branch-specific preview carrying the flag for QA; it is never assigned a
   public domain, never becomes a preview default, and the branch override is
   removed after QA. The CI drift gate keeps regenerating the flag-off state;
   the stamping is byte-reversible (`scripts/exchange-entry.test.mjs`).
2. No referral account, platform fee, or compensation parameter is ever sent
   to any venue or data provider; `scripts/exchange-gecko.test.mjs` pins the
   absence of key/referral/fee parameters across the exchange sources and
   the built bundle, and the ladder rides the same guarded Ultra client the
   panel uses.
3. The site never constructs, signs, or broadcasts a transaction and calls
   no write RPC. The trading surfaces load no third-party code; the only
   third-party script on the page is the site's long-standing,
   self-configured Plausible analytics loader that every wing page carries.
   Its technical events use a closed schema containing only surface and technical
   outcome enums — never trade intent, a wallet address, amount, mint, quote,
   request ID, transaction, visitor-supplied URL/query/hash, referrer, or free
   text. Plausible's standard envelope receives the fixed canonical surface URL;
   the page transform clears the referrer. The self-hosted-fonts rule stands
   unbroken (`scripts/exchange-analytics.test.mjs`).
4. The pinned risk sentences render on the page itself — independent
   third-party, can lose all market value, could lose all money used to
   acquire a Zodiac, cannot be reversed, verify the official mint, network,
   amount, and destination — with the thin-liquidity warning and the venue's
   fee ceiling in the same block, in the committed flag-off bytes and after
   stamping alike (`scripts/exchange-risk.test.mjs`).
5. The Cabinet (`/registry/collection/`) never gains Zodiac Markets, the
   panel, or any link to `/registry/exchange/` (pinned by test). Exactly one
   discovery entry may appear on `/registry/`, under the same flag as the
   terminal; flag-off removes it. No global navigation, footer, sign-record,
   leaderboard-row, or additional Registry link is authorized. The hub keeps
   its `jup.ag/swap/` ban; the entry is same-origin and carries no venue URL.
6. A wallet address is sent to the venue only when the visitor chooses to
   trade — never to show a price, a chart, a tape row, or a ladder rung. The
   privacy pages' description of what leaves the browser stays accurate, and
   names GeckoTerminal in every locale alongside the existing providers.
7. The depth ladder's honesty caption — no order book; each rung is an
   indicative quote at the time requested and a trade is quoted again before
   wallet review — renders with the ladder and is pinned by test in source
   and bundle.
8. Zodiac Markets stays `noindex` and out of the sitemap under this record.
   Indexing it is a separate, later decision with its own SEO review.
9. Emergency rollback uses Vercel Instant Rollback to the immediately prior
   verified flag-off production deployment, without waiting for a build. The
   owner then removes the production flag and redeploys to make that state
   durable. The service worker treats this route as network-only, so it cannot
   stale-serve flag-on HTML after rollback (`scripts/build-service-worker.test.mjs`).
10. Rate discipline toward GeckoTerminal is best-effort across same-origin
    tabs: a 12/minute stored budget, jittered non-overlapping polling, a 12s
    request deadline, hidden-tab suspension, exponential cool-off, and any
    valid `Retry-After` up to 120s. A success that began before a sibling 429
    cannot erase the pause. The provider limit is IP-bound, so this does not
    claim a guarantee across browsers or visitors sharing a NAT.
11. The depth ladder makes no request on initial load or sign selection. A visitor
    explicitly loads ten taker-less quotes. One page-wide scheduler starts no
    more than one Jupiter request every 2.1 seconds, cancels superseded display
    work, and gives wallet-bound work priority over ladder samples. The button
    has a cooldown and partial answers remain labelled rather than retried in a
    burst. Sign switching is locked while wallet review is unresolved; after a
    visitor signs, host teardown cannot abort the venue answer and erase the
    distinction between a failed and an unconfirmed submission.
12. A route-specific Content Security Policy browser-enforces the allowed
    script and connection origins: self, Jupiter, Dex Screener, GeckoTerminal,
    and the pre-existing Plausible service. The route also carries noindex and
    `Cache-Control: no-store` headers in addition to its HTML meta control.
13. The initial release is a 30-day, `noindex`, zero-compensation pilot. The
    owner reviews privacy-safe aggregate mount and provider-state events plus
    direct user feedback during the first hour and daily thereafter. Contract
    or fee mismatch, a new key requirement, unexpected origin or address
    disclosure, rollback/cache failure, or sustained provider failure turns
    the flag off immediately. No indexing, discovery entry beyond the one
    flag-gated Registry hub entry, broader acquisition surface, or permanent
    dependency follows automatically.

## Phase boundary

This record, once ratified, clears exactly one gate: a time-limited flag-on
pilot after the implementation merges and every control above is satisfied.
It does not authorize Base-chain
trading, fees or compensation of any kind, any API key or site secret
(Jupiter's Trigger/limit-order API requires one and therefore stays out of
scope until a record of its own), embedding any third-party script, indexing
Zodiac Markets, any further acquisition surface, or the thesis §VII claim surface.
