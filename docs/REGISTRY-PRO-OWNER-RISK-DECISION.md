# Registry Pro quote laboratory — owner risk decision

Status: DRAFT — pending owner ratification. The page and quote gateway stay
off in every public environment until the owner reads this record, replaces
this status with explicit ratification, and dates the approval in ISO 8601 UTC.
Merging flag-off code does not authorize a launch.

Approved: (pending)

Scope: one additional, `noindex` Registry surface at `/registry/pro/`;
Solana only; the twelve official Zodiac SPL tokens paired with USDC;
read-only market context and visitor-requested, exact-input quote comparisons
from Jupiter and Raydium; no prepare, sign, submit, transaction, wallet,
custody, site fee, fee-setting parameter, referral, compensation, or live chat
capability; committed HTML always flag-off behind
`PUBLIC_REGISTRY_PRO_ENABLED` and the server gateway separately off behind
`REGISTRY_PRO_QUOTES_ENABLED`.

This is an owner risk decision, not legal advice or a claim that every
applicable jurisdiction has been analysed. It is independent of the ratified
Registry trade-panel and Registry Trading Room decisions. Those decisions do
not authorize this route, its server-held provider credential, its provider
comparison, or any new public claim.

While this record reads DRAFT, there is no authority to set a public feature
flag, enable the quote gateway, place a Jupiter key in a live deployment for
this feature, or characterize the feature as launched.

## What is being decided

Whether zodiacs.org may run a limited professional quote laboratory that lets a
visitor examine the twelve Registry markets and ask two independent providers
what one exact input could return at that moment.

The laboratory stops before trading. Jupiter and Raydium return descriptive,
non-executable quote data. The site does not ask either provider to prepare a
transaction; it does not connect a wallet, request a signature, submit or
broadcast, or carry the quote into the existing trade panel. A quote may expire,
become unavailable, differ from a later executable route, or never be
obtainable in a transaction.

The interface may be called `Registry Pro` and described as a professional
workspace or quote laboratory. This decision does not authorize
`institutional-grade`, `best execution`, `exchange`, `broker`, `order book`,
`guaranteed`, or regulated-service claims. Information density is not an
institutional control environment.

## New risks accepted if ratified

- **Server credential and proxy.** Jupiter quote access moves behind a
  same-origin server function carrying a secret API key. That key must never
  reach a browser or log. The endpoint must not become an open relay.
- **New request-data flow.** zodiacs.org/Vercel receives a visitor-selected
  sign, side, exact amount, and Raydium guard, then sends derived mints and the
  exact amount to Jupiter and Raydium with ordinary request metadata. Existing
  public Privacy copy does not yet describe this server-mediated flow.
- **Provider comparison.** Showing two figures together can imply a best-route
  or execution promise. The interface therefore says `highest quoted output`,
  shows provider-specific qualifications, slippage semantics, and expiry, and
  expressly says the figures are non-executable. Raydium uses the visitor's
  selected fixed guard; Jupiter sets its own RTSE threshold.
- **Market and provider failure.** Thin pools, stale data, schema changes,
  provider limits, and partial outages are ordinary states. They remain visible
  rather than being filled, silently retried, or presented as current.
- **Financial harm.** A visitor could use descriptive information to make a
  later decision elsewhere. Complete loss, thin liquidity, route change,
  irreversibility, third-party-provider, and mint-verification warnings remain
  adjacent to the workflow even though this page cannot trade.
- **Operational load.** A public proxy can be abused and can consume a paid or
  limited provider allowance. Same-origin checks, a bounded request body,
  per-request deadlines, no-store responses, and a configured Vercel Firewall
  rate-limit rule are mandatory.
- **Product-positioning risk.** A dense terminal can look more capable than it
  is. Public language must describe actual capabilities, not the user's
  original aspiration for an institutional-grade platform.

## Why the technical boundary is conservative

- `src/pro/execution/contracts.mjs` exposes quote capability and explicitly
  denies prepare, sign, and submit capability.
- The server chooses the official token mint from the committed Registry and
  permits only an official Zodiac/USDC pair. The client does not name an
  arbitrary market or upstream URL.
- Quantities remain exact atomic strings and are ranked with `BigInt`; large
  token values are not compared using floating-point numbers.
- Jupiter receives only input mint, output mint, and exact input amount plus its
  server-side key. A non-null transaction in its response is rejected.
- Raydium receives only the exact-input compute request. Its transaction API is
  not called, and any nonzero referrer amount or discontinuous route is
  rejected.
- Provider failures settle independently. A partial answer remains labelled
  partial. `Highest quoted output` is not `best execution`.
- The public response removes transactions, request IDs, execution handles,
  secrets, raw errors, and visitor fields and keeps `executable: false`.
- The API is same-origin, POST-only, limited to 512 bytes, private/no-store,
  bounded by provider deadlines, and protected by a named firewall rule.

## Mandatory controls

Ratification authorizes only a bounded quote-only pilot after every control
below is satisfied. It does not make a control optional.

1. Committed `public/registry/pro/index.html` stays flag-off. CI rebuilds the
   bundle and page and fails on drift. Stamping on and back off is byte-clean.
2. `PUBLIC_REGISTRY_PRO_ENABLED=1` may be assigned only to an explicitly
   owner-authorized, deployment-protected QA preview or Production. It is never
   a Preview or Development default.
3. `REGISTRY_PRO_QUOTES_ENABLED=1` and `JUPITER_API_KEY` are server-only
   production/authorized-preview values. The key is never prefixed `PUBLIC_`,
   committed, returned, logged, placed in analytics, or exposed to the client.
   The pilot uses a dedicated Jupiter Free-tier key with no paid overage and no
   other workload. The launch receipt records its non-secret portal label or ID
   and tier. Sharing the key, enabling a paid tier or overage, or upgrading the
   account requires a new dated owner decision before configuration changes.
4. The Vercel Firewall SDK rule `registry-pro-quotes-v1` exists before the
   gateway is enabled. It uses a fixed 60-second window, a 12-request limit,
   and the source IP as its key in the authorized Preview and Production
   environments; exceeding it returns `429` without a persistent block. The
   launch receipt records the live rule ID and test result. Missing rate-limit
   configuration, origin mismatch, missing provider configuration, malformed
   input, or oversized input fails closed.
5. The implementation keeps `prepare: false`, `sign: false`, `submit: false`,
   calls no provider transaction endpoint and no write RPC, and never handles a
   transaction or signature. A regression in any of these terms blocks launch
   and turns an enabled surface off.
6. No wallet/taker/payer/receiver, referral, fee-setting or compensation
   parameter, arbitrary mint, arbitrary upstream URL, or free-form provider
   parameter crosses the gateway. Provider-reported fee fields may be displayed;
   there is no referral or platform compensation to zodiacs.org.
7. Jupiter and Raydium remain independently labelled. Their observations,
   expiry, provider-specific slippage, minimum-output/impact/fee fields, and
   partial or unavailable states remain honest. Changed inputs invalidate the
   old answer and expiry removes it. The UI never upgrades `highest quoted
   output` into a best execution claim.
8. Canonical-pool charts and market prints remain labelled as reference market
   data, separate from provider routing. AMM-derived size views are not called
   an order book and never imply resting orders.
9. The complete-loss, thin-liquidity, independent-provider,
   non-executable-quote, route-change, irreversibility, and official-mint risk
   copy is visible in committed dark HTML and in any enabled form.
10. The route remains `noindex`, outside the sitemap, outside consumer
    acquisition surfaces, and absent from the Cabinet. Its CSP and network
    audit admit only the documented first- and third-party read origins.
11. Analytics, if any, uses closed technical enums only. It receives no amount,
    side, sign, mint, provider output, wallet, key, route, request ID, raw
    error, transaction, signature, query/hash, referrer, or free text.
12. Floor Chat stays off unless its separate owner record is also ratified. In
    this phase it can only be a static read-only shell; live messages, posting,
    auth, wallet identity, persistence, reports, bans, or moderation are not
    authorized by this decision.
13. A verified flag-off deployment is retained as the rollback target. The
    launch owner can disable the server gate and the page gate independently
    and knows the Instant Rollback procedure before launch.
14. The pilot ends no later than 30 days after its first Production enable
    unless a new dated owner decision continues it. The launch receipt records
    that first-enable timestamp and exact stop date. The owner reviews provider failures, rate limiting, schema-change failures,
    unexpected network origins, and direct user reports during the first hour
    and daily during a time-limited pilot. A provider contract change, key leak,
    origin leak, transaction-shaped response, inaccurate capability claim,
    missing rate limit, or rollback failure turns both gates off immediately.
15. Before any public Production pilot or externally shared QA, the owner
    approves and publishes an accurate Privacy/Terms update for the
    server-mediated quote flow, including zodiacs.org/Vercel processing and
    onward Jupiter/Raydium requests. Required locales and protected-scope
    changes travel in their own reviewed packet; this allowance is not widened
    to smuggle them into this PR. Until that update is live, both public gates
    remain off outside tightly access-controlled engineering QA.
16. Before any Jupiter key is used, the owner obtains qualified legal review,
    accepts the current [Jupiter SDK & API License Agreement](https://developers.jup.ag/docs/legal/sdk-api-license-agreement)
    and incorporated Terms/Privacy obligations, records the applicable portal
    fee terms, and obtains written confirmation from Jupiter that the prominent
    `Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode` wording
    correctly identifies the current product despite the agreement's older
    Ultra/Metis examples. The full attribution remains prominent beside the
    quote form, and the specific `Swap V2 Meta-Aggregator · Ultra mode` product
    label remains on Jupiter results. Missing confirmation, changed terms, or
    missing attribution keeps the gateway off and requires a new owner review.
17. Before public Production or externally shared QA, qualified counsel records
    the legal operator and operating jurisdiction for this service, the
    jurisdictions and visitor classes it may serve under the current Jupiter,
    Raydium, Vercel, sanctions, and applicable financial-services terms, and
    any required geographic or eligibility control. An unresolved operator,
    jurisdiction, eligibility, or sanctions question keeps both gates off; the
    quote proxy must not be used to obscure a visitor's location from a
    provider or bypass a provider restriction.

## Phase boundary

If ratified, this record clears one governance gate only. It does not authorize
a public pilot until the separate Privacy/Terms dependency and every other
mandatory control pass. The resulting scope is a time-limited, `noindex`,
quote-only Registry Pro pilot. It does not
authorize execution, wallet connection, transaction preparation, signing,
submission, Solana RPC writes, site fees, referral compensation, arbitrary
tokens, additional chains, limit orders, automation, user accounts, live chat,
indexing, new acquisition links, or an institutional-grade claim.

Each excluded capability requires its own dated owner decision before code or
configuration. Feature success does not widen this boundary automatically.
