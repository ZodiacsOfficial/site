# Registry Trading Room launch runbook

This runbook carries `/registry/exchange/` from merged-but-flag-off to a
time-limited production pilot. It does not ratify the owner decision, enable a
Vercel environment, approve a PR, or authorize a real trade by itself.

## Hard gates

1. `docs/REGISTRY-EXCHANGE-OWNER-RISK-DECISION.md` is explicitly ratified by
   the owner and dated in UTC. It is an owner risk decision, not legal advice.
2. The branch is rebased onto the current `origin/main`; the scope allowance
   `baseCommit` equals that head and lists exactly the protected paths reported
   by `npm run test:phase1:scope`.
3. The official Jupiter documentation still labels Ultra a legacy path. Run
   `npm run exchange:probe` immediately before QA and again before flag-on. Any
   contract, fee, rate-limit, or key requirement failure keeps the flag off.
4. A verified flag-off production deployment is retained as the Instant
   Rollback target.

## Clean verification order

Run with `PUBLIC_REGISTRY_EXCHANGE_ENABLED` unset:

```sh
npm ci
node scripts/build-trade.mjs
node scripts/build-exchange.mjs
npm run build
npm test
npm run check
node scripts/check-dist.mjs
npm run test:phase1:scope
npm run test:phase1:evidence
```

If a render-source hash changed, install the Playwright-managed Chromium and
recapture once against the rebased tree:

```sh
npx playwright-core install chromium
npm run test:phase1:acceptance
npm run test:phase1:evidence
```

At a clean tree, prove the stamper round trip:

```sh
PUBLIC_REGISTRY_EXCHANGE_ENABLED=1 node scripts/configure-registry-exchange.mjs
node scripts/configure-registry-exchange.mjs
git diff --exit-code
```

## Protected flag-on QA

The owner may authorize one branch-specific Preview variable with deployment
protection. Do not set a Preview default, assign a public domain, or use the
production alias. Remove the branch override after QA.

Verify:

- the enabled meta marker is `1`, the terminal mounts, and the twelve records
  remain below it;
- all twelve selections keep the panel responsive without automatically
  loading the depth ladder;
- sign selection locks during wallet review, and every ambiguous execute
  response says unconfirmed rather than inviting a duplicate attempt;
- the ten pinned/fallback chart states are honest, including explicit
  `not indexed` states;
- one explicit depth load returns buy and sell rows progressively without a
  burst; no ladder request contains `taker`;
- the risk block, canonical-pool labels, ladder caption, `noindex` meta and
  `X-Robots-Tag`, CSP, and `Cache-Control: no-store` are present;
- requests are limited to self, `lite-api.jup.ag`, `api.dexscreener.com`,
  `api.geckoterminal.com`, and `plausible.io`; a wallet address appears only
  after the visitor explicitly asks the panel to trade;
- the service worker has no CacheStorage entry for any Exchange navigation.

## Merge and production pilot

Open the PR as draft. Describe the flag-off guarantee, audit fixes, legacy
Ultra constraint, neutral name, CSP/cache controls, and rollback target. Do
not merge around a red required check. Merge only after owner PR approval.

Confirm the merge deploy is flag-off first. Then the owner may set
`PUBLIC_REGISTRY_EXCHANGE_ENABLED=1` for Production only and create a new
deployment. Repeat the protected-QA checks on the production URL. A real trade
is optional, owner-directed, and never part of automated verification.

The pilot remains `noindex`, zero-compensation, and bounded to 30 days. Review
only the closed-schema technical events (`exchange_room_mount` and
`exchange_market_state`) plus direct user feedback. They contain no trade
intent, wallet, amount, mint, quote, request ID, transaction, visitor-supplied
URL/query/hash, referrer, or free text. Plausible's standard envelope receives
only the fixed canonical room URL. On or before 2026-09-09, turn the flag off
unless the owner records a dated continuation decision.

Review once during the first production hour and once per UTC day thereafter.
For each review, record the deployment ID and candidate SHA, probe result,
room-mount count, provider-state counts by closed surface/outcome enum, direct
user reports, reviewer, and UTC timestamp. Counts need their room-mount
denominator; do not turn them into a quote-success rate because the telemetry
does not identify visitors or trades.

Turn the flag off immediately on any contract or fee mismatch, newly required
API key/proxy, unexpected request origin, wallet address before explicit trade
review, rollback failure, stale flag-on service-worker response, or sustained
provider failure that prevents the panel or two market-data surfaces from
recovering across two consecutive reviews. A continuation after any stop
requires a dated owner decision.

## Emergency rollback

1. Use Vercel Instant Rollback to the retained flag-off production deployment.
2. Confirm the production meta marker is `0`, the terminal/script are absent,
   and an offline request cannot recover a cached flag-on page.
3. Remove the Production environment variable and deploy the current `main` to
   make flag-off durable.
4. If Vercel paused automatic domain assignment during rollback, restore it
   only after the durable flag-off deployment is verified.

Do not wait for a rebuild before performing step 1.
