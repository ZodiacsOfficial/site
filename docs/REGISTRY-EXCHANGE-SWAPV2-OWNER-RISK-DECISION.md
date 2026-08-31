# Terminal venue route — Swap V2 migration (owner risk decision)

Status: ratified by the owner, 2026-08-31 (owner-directed in session, upon
review of the evidence below). The 2026-08-10 decision reserved this
migration for a record of its own; this is that record.

## What is being decided

Whether the ratified venue path behind `PUBLIC_REGISTRY_EXCHANGE_ENABLED`
moves from Jupiter's legacy Ultra contract
(`https://lite-api.jup.ag/ultra/v1/{order,execute}`) to Jupiter's current
Swap V2 Meta-Aggregator (`https://api.jup.ag/swap/v2/{order,execute}`),
keyless. Nothing else about the venue surface, its discovery entries, or its
controls is decided here.

## Evidence, reviewed 2026-08-31

- Jupiter's migration guide (`developers.jup.ag`, Ultra → Meta-Aggregator)
  states the request parameters and response format are identical and the
  migration is the base URL alone; `GET /order` and `POST /execute` keep
  their paths, and `/execute` keeps Jupiter's managed transaction landing.
- A live, keyless, taker-less `GET /swap/v2/order` probe for the Aries mint
  (USDC in, $25 notional) answered with a full route plan and the exact
  fields the site's guards already consume: `feeBps: 10` — equal to and not
  above the 0.10% ceiling — with `feeMint`, `requestId`, `taker: null`
  accepted, and `transaction: null` without a taker, matching the depth
  ladder's taker-less pattern.
- Keyless access is documented at 0.5 requests/second on `api.jup.ag` with
  no sign-up. The site's existing page-wide scheduler (one Jupiter request
  per 2.1 seconds ≈ 0.48 RPS) already fits inside that budget by design.
- The Meta-Aggregator may route across additional engines (Metis, JupiterZ,
  DFlow, OKX; the probe's answer reported `router: "okx"`). The venue
  boundary is unchanged — Jupiter builds, executes, and charges for the
  order — and the interface's existing sentence that orders "may route
  beyond" the reference pool already describes this.

## What changes

1. `src/trade/ultra.mjs`: the base URL and the two endpoint paths. The
   order/response contract, `assertOrderMatches`, the fee-ceiling refusal,
   and the execute flow are unchanged. This is the one shared, guarded
   Jupiter client, so the flag-gated trade panel ratified by the
   2026-08-02 trade decision (sign records, how-to-buy) moves with the
   venue route; both surfaces keep the identical execution boundary, and
   the 2026-08-02 record's `lite-api.jup.ag` host reference is superseded
   by this record for both.
2. `scripts/probe-registry-exchange.mjs`: probes the V2 base.
3. `vercel.json` route CSPs that allow the Jupiter client (`/terminal/markets/`
   and the trade-panel routes): `connect-src` swaps
   `https://lite-api.jup.ag` for `https://api.jup.ag`.
4. Pinned tests, drives, and operational docs naming the old host.

## What does not change

- Custody and execution: the visitor's wallet signs; Jupiter's `/execute`
  lands the transaction; the site still constructs, signs, broadcasts, and
  reverses nothing, calls no write RPC, and holds no keys or funds.
- Zero compensation: no `referralAccount`, `referralFee`, platform-fee, or
  key parameter is ever sent; the venue fee above 0.10% is still refused.
- No API key or site secret: the keyless tier is a mandatory condition of
  this migration. If Jupiter later requires a key on this path, the flag
  goes off and a new owner decision is required.
- `noindex`, `no-store`, the route CSP posture, service-worker network-only
  handling, the closed telemetry schema, the discovery-entry set, the
  depth-ladder honesty caption, and the Instant Rollback procedure.

## Effect on the pilot

Deploying this migration ends the 2026-08-31 continuation bridge: the
venue path is no longer the deprecated contract, so the pilot's
deprecated-path time limit dissolves. The daily UTC review continues
through 2026-09-30; the owner then sets the ongoing review cadence with a
dated note. Every stop condition in the 2026-08-10 record continues to
apply, with contract or fee mismatch on the V2 path reading exactly as it
did on Ultra.

## Ratification

The owner ratifies by dating this record and changing its Status line to
ratified. Implementation merges only after that; the committed HTML remains
flag-off throughout, and the CI drift gate is unaffected.
