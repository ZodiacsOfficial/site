# Wallet natal chart

`/registry/wallet-chart/` is a read-only, paste-address feature. It has no
wallet adapter, connect prompt, signing method, transaction builder, custody,
or write RPC call. The page is emitted only when the public feature flag and at
least one server-side history provider are configured.

## Environment

- `PUBLIC_WALLET_CHART_ENABLED=1` enables the route and API. Default: off.
- `SOLANA_RPC_URL` is a server-only Solana JSON-RPC endpoint. A Helius-class
  archival endpoint is recommended for older addresses.
- `SOLANA_WALLET_MAX_PAGES` caps 1,000-signature history pages (default 200,
  maximum 1,000). Hitting the cap returns an explicit unavailable state rather
  than treating a partial timestamp as the wallet birth.
- `BASE_EXPLORER_API_KEY` enables the Base account-history provider through the
  Etherscan v2 API (`chainid=8453`).
- `BASE_EXPLORER_API_URL` optionally replaces the default
  `https://api.etherscan.io/v2/api` endpoint.
- `BASE_RPC_URL` enables official ERC-20 balance reads and is also the history
  fallback when the explorer is unavailable. It should be an archive-capable
  Base RPC.
- `WALLET_BIRTH_CACHE_TTL_SECONDS` controls the warm-function address cache
  (default 86,400 seconds; bounded to 5 minutes–7 days).

All provider URLs and keys remain in the serverless function. The browser sees
only configured chain names. Requests use a same-origin POST, and addresses are
excluded from analytics.

## History semantics and RPC cost

Solana has no direct “first transaction” method. The provider walks
`getSignaturesForAddress` from newest to oldest using `before`; a wallet with
200,000 signatures costs roughly 200 RPC pages. The configured boundary is a
hard stop, never an approximation.

The Base explorer's ascending `txlist` response is the preferred history
source. Standard EVM JSON-RPC does not index all incoming transfers by address.
The fallback binary-searches historical `eth_getTransactionCount` to locate the
first outgoing transaction, then verifies that transaction in its block. The UI
labels that result “earliest outgoing activity” and never presents it as proof
that no earlier incoming transfer exists. An archive node is required.

## Privacy and cache

The server receives the pasted public address only. It returns a public UTC
timestamp and, when a best-effort balance read succeeds, sign slugs for official
Registry assets with non-zero balances. It never receives the optional owner's
birth date, time, place, chart positions, or synastry. Those remain in the
browser and are not persisted.

The in-memory cache is keyed by normalized chain and address, expires by TTL,
and is capped at 1,000 entries per warm function. Responses are `private,
no-store`; no shared browser/CDN cache is used for pasted addresses.

