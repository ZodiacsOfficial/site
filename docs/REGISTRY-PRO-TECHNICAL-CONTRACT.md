# Registry Pro — Phase 1 technical contract

Status: implementation contract; the feature is dark. This document describes
the code boundary. It does not ratify either owner decision or authorize a
public deployment.

Registry Pro is a Solana-only professional quote laboratory at
`/registry/pro/`. Phase 1 may put market context and independently sourced
exact-input quotes in one interface. It is not an exchange, broker, order
management system, smart order router, or claim of institutional-grade
execution.

The public vocabulary is deliberately narrower than the engineering ambition:
"professional" describes information density and workflow. "Institutional",
"best execution", "guaranteed", "order book", and similar claims are outside
this contract.

## Authority and capability boundary

Phase 1 has one trading-related capability: `quote`.

```text
quote:   allowed
prepare: forbidden
sign:    forbidden
submit:  forbidden
```

The implementation expresses that boundary as
`QUOTE_ONLY_CAPABILITIES = { quote: true, prepare: false, sign: false,
submit: false }`. Every normalized provider answer also carries
`executable: false`; the public gateway preserves that value and strips any
provider execution handle.

Phase 1 must never:

- request, construct, serialize, simulate, sign, submit, broadcast, or retain a
  transaction;
- call a provider transaction-building endpoint or any Solana write RPC;
- accept or forward a taker, wallet, payer, receiver, referral account,
  referral fee, platform fee, or site-compensation parameter;
- present a provider quote as an order, executable price, liquidity guarantee,
  fiduciary comparison, or promise of best execution;
- reuse the Registry trade panel, its wallet state, or its execution protocol;
- introduce a live chat, identity, authentication, persistence, or moderation
  system.

Any capability beyond `quote` requires a new technical contract and a new,
explicitly ratified owner risk decision before code, configuration, or public
copy changes.

## Dark-by-default surfaces

The committed `/registry/pro/` HTML is always the quiet, flag-off form. Build
stamping may mount the Registry Pro bundle only when
`PUBLIC_REGISTRY_PRO_ENABLED=1` is present in the build environment. The
committed output never contains a flag-on terminal or its script tag.

The quote gateway has a second, server-only gate. It returns `404 disabled`
unless both conditions hold:

- `REGISTRY_PRO_QUOTES_ENABLED=1`; and
- `JUPITER_API_KEY` is configured as a server secret.

`JUPITER_API_KEY` is never a `PUBLIC_` variable, never appears in HTML or the
browser bundle, and never crosses the response boundary. The public page gate
and server quote gate are separate so either can fail closed. No current DRAFT
record authorizes setting either gate in a public environment.

The read-only Floor Chat shell has an independent build gate,
`PUBLIC_REGISTRY_PRO_CHAT_ENABLED`. It is ineffective unless the Registry Pro
master gate is also enabled. Its separate decision record governs even that
read-only preview.

## Data and request flow

The browser may read the committed Registry and approved public market-data
origins. A quote comparison is different: it is initiated by a visitor action
and sent to the same-origin `POST /api/registry-pro-quotes` gateway. The browser
does not call Jupiter or Raydium directly for these provider comparisons.

That same-origin hop is still new data processing: zodiacs.org/Vercel receives
the visitor-selected sign, side, exact amount, and Raydium guard, then forwards
derived mints and the exact amount to Jupiter and Raydium with ordinary request
metadata. The current implementation contract does not amend the site's public
Privacy or Terms copy. An owner-approved disclosure update is a separate,
mandatory launch dependency; this dark code must not be treated as disclosure.

The public request is bounded to 512 bytes and contains only a Registry sign,
`buy` or `sell`, an exact atomic input amount, and a Raydium slippage guard in
basis points.
The server derives both mints from the committed Registry; browser-supplied
mints are not authoritative. Only the twelve official Solana SPL Zodiac mints
paired with USDC are accepted. The Raydium guard is an integer from 10 through
100 bps, and atomic amounts are positive decimal digit strings no longer than
24 digits. Jupiter's Meta-Aggregator does not receive that selected guard; its
order endpoint sets and reports an independent RTSE threshold.

The gateway accepts requests only from the same zodiacs.org origin, protected
Vercel previews, or local development. It rejects requests with no usable
origin/referrer, uses `private, no-store`, and sets a JSON content type plus
`X-Content-Type-Options: nosniff`. The Vercel entry point applies the
`registry-pro-quotes-v1` firewall rate-limit rule. A missing production rule is
a deployment failure, not permission to run without a limiter.

Unknown browser fields never reach a provider. In particular, adding a wallet,
taker, receiver, referral, fee, or transaction-shaped field to the public body
does not add it to either upstream request.

## Exactness and market identity

Token quantities remain decimal strings at the network boundary and `BigInt`
for ordering. JavaScript floating-point numbers are not used to compare atomic
outputs. Decimal conversion rejects exponent notation, signs, excess
precision, and malformed leading zeros rather than guessing.

The committed Registry is the only source of Zodiac mint identity. A provider
must return the requested input mint, output mint, and exact input amount.
Substitution is a `schema_changed` failure. A malformed provider answer cannot
silently redefine a market.

Provider calls settle independently. One failure remains visible while a valid
answer from the other provider may render as a partial comparison. The label
`highest quoted output` means only the largest exact atomic output among fresh
answers for the same requested pair and input amount. Provider-specific
minimum-output protections differ: Raydium uses the selected fixed guard while
Jupiter reports its own RTSE value. The ranking does not compare
latency, settlement probability, price movement after observation, venue
risk, route quality, transaction cost, or execution.

## Jupiter adapter

The Jupiter adapter uses the server-side Swap V2 order endpoint in quote-only
mode. Its GET query contains exactly `inputMint`, `outputMint`, and `amount`;
it sends the secret only in the `x-api-key` request header.

The normalizer requires the requested pair and amount, the expected Ultra mode,
a reported RTSE threshold, and a current Swap V2 router identifier (`metis`,
`jupiterz`, `dflow`, or `okx`). The current numeric `priceImpact` value is
reported in percentage points; fee, slippage, and impact fields are type-strict
and bounded. The deprecated string `priceImpactPct` field is not trusted. An answer containing a
non-null transaction is rejected as `schema_changed`. Request IDs,
transactions, and other provider execution handles are not included in the
public gateway result.

The Jupiter adapter has a 12-second request deadline, handles `429` as an
explicit rate-limit state, and honors a valid `Retry-After` value up to 120
seconds. A missing or short server key makes Jupiter unavailable; there is no
browser-key fallback. Redirects are rejected so the secret header cannot be
forwarded to another origin.

The terminal persistently identifies this integration as
`Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode`, and each Jupiter
result uses `Swap V2 Meta-Aggregator · Ultra mode`. This is specific product
attribution, not a partnership or a claim that the page is jup.ag. Because the
current SDK & API License Agreement's Ultra/Metis examples predate Swap V2,
public enablement also requires written Jupiter confirmation that this wording
satisfies the current attribution terms.

## Raydium adapter

The Raydium adapter uses only the public exact-input compute endpoint. Its GET
query contains exactly `inputMint`, `outputMint`, `amount`, `slippageBps`, and
`txVersion=V0`. It does not call Raydium's transaction endpoint.

The normalizer requires a `BaseIn` answer for the requested pair, input amount,
and slippage. The minimum output may not exceed quoted output; the referrer
amount must be zero; price impact is bounded; and every route leg must contain
valid Solana addresses and form a continuous path to the requested output.
Raydium answers expire after 30 seconds in the local contract.

The Raydium adapter has a 10-second request deadline and the same bounded
`Retry-After` treatment. It carries no site API key, wallet, referral, or
transaction request.

## Error and response contract

Provider errors are closed enums: `invalid_intent`, `unsupported_pair`,
`no_route`, `rate_limited`, `schema_changed`, `network`, `unavailable`, and
`stale`. UI copy may explain one of these states but must not expose raw
provider bodies, stack traces, secrets, request IDs, or visitor input.

The comparison status is `complete`, `partial`, or `unavailable`. A ready
public answer contains provider identity, exact input/output amounts, any
provider minimum output, bounded slippage/fee/impact fields, a route description,
observation/expiry timestamps, and `executable: false`. It never contains a
wallet, transaction, signature, execution handle, API key, or free-form
provider message.

## Market display and risk copy

Charts, indexed statistics, and recent market prints are descriptive market
data. Canonical-pool history must remain labelled separately from executable
venue routing. An AMM-derived ladder or size comparison must never be called an
order book or displayed as resting orders. Missing, stale, partial, or
rate-limited data stays visibly missing, stale, partial, or rate-limited.
Changing the market, side, amount, or Raydium guard immediately invalidates an
existing comparison. A displayed answer is removed when its earliest provider
freshness boundary passes.

The interface keeps `noindex`, displays the complete-loss, thin-liquidity,
third-party-provider, non-executable-quote, irreversibility, and official-mint
warnings, and provides no button or copy implying that zodiacs.org will carry
out a trade. Links to the already-ratified Registry trade surface, if any are
ever proposed, are a separate acquisition-surface decision and are not
authorized here.

## Floor Chat boundary

Phase 1 may contain only a static, read-only Floor Chat shell. It has no
`fetch`, WebSocket, EventSource, Supabase client, wallet request, sign-in,
composer submission, storage write, or user-generated content. Static messages
are project-authored display fixtures and must be rendered as text, never
trusted HTML.

The existing profile Supabase client and the existing trade-wallet connection
must not be reused for chat identity. Live posting would create new identity,
privacy, retention, abuse, and moderation duties. Those duties belong to the
separate trollbox decision and a later live-chat technical contract.

## Change control

Every behavioral change lands with tests. Source changes regenerate and commit
the Registry Pro bundle. CI regenerates the flag-off page and bundles and fails
on drift. The stamper must round-trip from committed flag-off to temporary
flag-on and back with a byte-clean tree.

The route remains a Phase 1 protected Registry path. Its one-time scope
allowance must be pinned to the actual PR base and list exactly the protected
files in that PR. Rebase means re-pin; it does not mean broadening the
allowance.

Changes to execution capability, provider write endpoints, fees, compensation,
wallet data, public indexing, chat networking, auth, storage, moderation,
additional chains, additional assets, or a public institutional-grade claim
are outside this contract.
