# Registry exchange room — owner risk decision

Status: DRAFT — pending owner ratification. The flag stays off, everywhere,
until the owner ratifies this record by replacing this status line and dating
the approval. Nothing in the merged implementation changes any live surface
while this line reads DRAFT.

Approved: (pending)

Scope: exactly one additional surface — the Exchange room at
`/registry/exchange/`, presented under the name "Zodiacs Mercantile
Exchange"; Solana only; spot only; the site's existing trade panel calling
Jupiter's public Ultra API, plus read-only market description (candlestick
charts, a recent-trades tape, indexed price/liquidity statistics) and a
quote-derived depth ladder; no referral account, platform fee, or
compensation of any kind; committed HTML always flag-off behind
`PUBLIC_REGISTRY_EXCHANGE_ENABLED`.

This record extends, and changes nothing in, the ratified trade decision of
2026-08-02 (`docs/REGISTRY-TRADE-OWNER-RISK-DECISION.md`, scope amended
2026-08-04). That decision's phase boundary reserved "acquisition surfaces
outside the twelve catalogue pages" for a later record; this is that record,
for one named surface.

## What is being decided

Whether the Registry may keep one room in which the twelve records, their
market history, and the venue's own quotes stand side by side — an
exchange-style terminal. The trade inside it is the already-ratified trade:
the same panel, the same venue, the same controls, on one more page.

What is new is description, not execution:

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
  room does not pretend to one. Each rung is Jupiter's own executable quote
  for a fixed size ($25–$1,000), fetched from the same Ultra endpoint the
  panel uses, without a taker. The caption beside it says exactly this and
  is pinned by test.

## The name

"Zodiacs Mercantile Exchange" is the room's museum-register name, and the
owner acknowledges the tension in it: the site does not operate an exchange.
The boundary the trade decision rests on is therefore stated in the room
itself, in its risk block, in these words: the page "presents a trade that an
independent venue builds, executes, and charges for", and "the Exchange
operates no market". Those sentences are pinned by
`scripts/exchange-risk.test.mjs` against the committed page and survive
stamping. If the owner concludes on reflection that the name itself
overreaches, renaming the room is a copy change with no code consequence;
this record does not treat the name as load-bearing.

## Why this stays inside the ratified boundary

- The execution path is unchanged: quotes and transactions come from
  Jupiter's Ultra API; the visitor's wallet signs; Jupiter submits. The site
  still builds, signs, sends, and reverses nothing, holds no keys or funds,
  and receives no compensation. The fee on every quote is the venue's own
  0.10%, reported, with a hard client-side ceiling refusing anything that
  looks like a misconfigured referral.
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

## Controls that remain mandatory

All ten controls of the 2026-08-02 record apply to this room verbatim, with
these room-specific restatements:

1. Committed `public/registry/exchange/index.html` stays flag-off; only the
   Vercel production environment sets `PUBLIC_REGISTRY_EXCHANGE_ENABLED=1`;
   the CI drift gate keeps regenerating the flag-off state; the stamping is
   byte-reversible (`scripts/exchange-entry.test.mjs`).
2. No referral account, platform fee, or compensation parameter is ever sent
   to any venue or data provider; `scripts/exchange-gecko.test.mjs` pins the
   absence of key/referral/fee parameters across the exchange sources and
   the built bundle, and the ladder rides the same guarded Ultra client the
   panel uses.
3. The site never constructs, signs, or broadcasts a transaction and calls
   no write RPC. The trading surfaces load no third-party code; the only
   third-party script on the page is the site's long-standing,
   self-configured Plausible analytics loader that every wing page carries,
   which receives no wallet address or trade data. The self-hosted-fonts
   rule stands unbroken.
4. The pinned risk sentences render on the page itself — independent
   third-party, can lose all market value, could lose all money used to
   acquire a Zodiac, cannot be reversed, verify the official mint, network,
   amount, and destination — with the thin-liquidity warning and the venue's
   0.10% fee in the same block, in the committed flag-off bytes and after
   stamping alike (`scripts/exchange-risk.test.mjs`).
5. The Cabinet (`/registry/collection/`) never gains the room, the panel, or
   any link to `/registry/exchange/` (pinned by test). The `/registry/` hub
   keeps its `jup.ag/swap/` ban; this page carries only the venue's homepage
   link, like the hub's venue directory.
6. A wallet address is sent to the venue only when the visitor chooses to
   trade — never to show a price, a chart, a tape row, or a ladder rung. The
   privacy pages' description of what leaves the browser stays accurate, and
   names GeckoTerminal in every locale alongside the existing providers.
7. The depth ladder's honesty caption — no order book; each rung is the
   venue's own executable quote — renders with the ladder and is pinned by
   test in source and bundle.
8. The room stays `noindex` and out of the sitemap under this record.
   Indexing it is a separate, later decision with its own SEO review.
9. Rollback stays one step: unset the flag and redeploy; the page returns to
   the committed reading-room state with no code change.
10. Rate discipline toward the free data provider: a shared client-side
    budget under GeckoTerminal's published ceiling; an exponential cool-off
    opened by any 429 and cleared on the next success, during which polling
    pauses behind a labeled waiting state; polling suspended for hidden
    tabs; and the ladder refreshed only on selection or explicit request
    with a cooldown.

## Phase boundary

This record, once ratified, clears exactly one gate: setting
`PUBLIC_REGISTRY_EXCHANGE_ENABLED=1` in production after the implementation
merges with every control above satisfied. It does not authorize Base-chain
trading, fees or compensation of any kind, any API key or site secret
(Jupiter's Trigger/limit-order API requires one and therefore stays out of
scope until a record of its own), embedding any third-party script, indexing
the room, any further acquisition surface, or the thesis §VII claim surface.
