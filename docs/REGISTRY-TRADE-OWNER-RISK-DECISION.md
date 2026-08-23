# Registry trade panel — owner risk decision

Status: ratified by the owner; flag-on authorized once every mandatory
control below is satisfied

Approved: 2026-08-02T17:28:02Z

Scope: the twelve `/registry/{sign}/` catalogue pages and the Registry
landing explorer at `/registry/`; Solana only; a trade panel that is the
site's own interface calling Jupiter's public Ultra API; no referral
account, platform fee, or compensation of any kind; committed HTML always
flag-off behind `PUBLIC_REGISTRY_TRADE_ENABLED`.

Scope amended 2026-08-04 by owner ratification of the landing
consolidation. The landing's wide-screen explorer became a single
rectangle carrying the panel beside the chosen sign's record, and the
same panel mounts in that sign's card on narrower viewports. The approval
timestamp above, the decision below, and every mandatory control are
unchanged and apply to the landing exactly as they apply to a catalogue
page. One consequence is called out where it belongs: on the landing the
panel opens only when the visitor asks for it — from a sign's pill or by
choosing the sculpture on show — at every screen size, so a price is
requested from Jupiter only then, which is why the privacy pages say
when that request happens rather than merely that it can. Nothing is
requested from any venue, and no panel code is fetched, before that
choice.

Scope amended 2026-08-12 by the owner-authorized Terminal audience split.
The identity-first `/astrofolio/` consumer view, named Astrofolio, no longer carries the trade
flag, trade panel, or acquisition action. This narrows the authorization back
to the twelve `/registry/{sign}/` catalogue pages. Their flag, risk language,
provider boundary, compensation controls, and rollback behavior remain
unchanged; this amendment does not authorize a replacement acquisition entry
on Astrofolio or the expert Terminal view.

## Addendum — 2026-08-16: catalogue trade panel retired

Authorized: 2026-08-16

The owner retires the embedded trade panel from all twelve
`/registry/{sign}/` catalogue profiles. Each profile is now read-only and may
contain exactly one external, mint-pinned link to Jupiter after a plain-language
explanation of Solana, a wallet, SOL, Jupiter, irreversibility, and complete-loss
risk. The profile must not mount a wallet host, load the Registry trade runtime,
request a Jupiter quote, construct a transaction, or ask for a signature.

`PUBLIC_REGISTRY_TRADE_ENABLED` no longer controls catalogue output. The
compatibility hook in predev/prebuild is a no-op so an older deployment setting
cannot restore the embedded trade panel. The full trade interface remains
confined to Zodiac Terminal markets. This addendum does not change the site's
no-custody, no-referral, no-platform-fee, and no-compensation commitments.

## Addendum — 2026-08-16: catalogue venue links removed

Authorized: 2026-08-16

The owner further narrows the catalogue posture. The twelve
`/registry/{sign}/` profiles contain no purchase route, external venue link,
wallet prompt, or transaction instructions. They remain read-only identity,
market-context, and address-verification pages. The old `#acquire` fragment is
kept only as an invisible compatibility alias beside the verified record so
older same-origin links do not break; it does not expose an acquisition action.

This addendum supersedes the preceding permission for one mint-pinned Jupiter
link. No venue link or embedded trade surface may be restored to a catalogue
profile through `PUBLIC_REGISTRY_TRADE_ENABLED` or any other deployment flag.
Any future ownership doorway must be separately approved and must preserve the
plain-language, separation, risk, and no-compensation commitments above.

## Addendum — 2026-08-13: beginner Consumer record handoff

Authorized: 2026-08-13

The owner further amends the scope for the beginner Consumer handoff. This is
a narrow exception to the final sentence above: `/terminal/`
may show exactly one selected-sign educational action that links only to the
already-authorized, same-origin record at
`/registry/<canonical-sign>/#acquire`. The action is a handoff to the record's
existing explanation and point-of-action warnings, not a venue or execution
surface. Consumer still carries no trade or exchange flag or meta, no embedded
trade interface, no direct venue URL, and no link to `/terminal/markets/`.
Mounting or focusing the action, or changing the selected sign, must not
connect a wallet or request anything from Jupiter, another execution provider,
or a wallet provider. The record's existing complete-loss, irreversibility,
mint-verification, independent-provider, fee, and liquidity controls continue
to apply at the point of action.

This 2026-08-13 amendment does not authorize an acquisition action on Pro,
alter the Zodiac Markets discovery or execution decision, or extend its pilot
deadline. It adds no authority for custody, transaction construction,
execution, referral fees, platform fees, or other compensation. Every other
part of the 2026-08-12 narrowing remains in force.

## Decision

The site owner has chosen not to obtain outside legal advice for this
release. This record is therefore an owner risk decision, not a legal
opinion and not a claim that every jurisdiction has been analysed.

The owner acknowledges that `/terms/` continues to state that the
operator's legal identity and a chosen governing jurisdiction have not been
confirmed in the site's published materials, and that this release does not
resolve either. The decision to proceed rests on the boundary described
below: the site presents a trade that an independent venue builds, executes,
and charges for, rather than operating a venue itself; it takes no custody,
builds, signs, sends and reverses nothing, and receives no compensation.
Applicable law still governs use of the site, and nothing here removes
mandatory consumer rights. The Applicable law section
of `/terms/` is to be updated, with its date, when those facts are
confirmed.

The owner authorizes setting `PUBLIC_REGISTRY_TRADE_ENABLED=1` in
production once every mandatory control below is satisfied — including the
merge of the panel implementation, which does not yet exist. This
authorization covers no other surface and no other chain.

## What is being decided

Whether zodiacs.org may offer a trade in place on the twelve sign catalogue
pages, so a visitor can acquire a Zodiac without leaving the page. Today
those pages deep-link out to Jupiter. The panel moves the choose → approve →
sign sequence onto the page while keeping the site out of the transaction:
the panel is the site's own interface, prices come from Jupiter's public
API, **Jupiter builds the transaction**, the visitor's wallet asks them to
approve and sign it, and **Jupiter submits it to the network**. The site
holds no keys or funds, never builds, signs, or sends a transaction, never
broadcasts to any RPC, and receives no compensation. Jupiter charges its own
0.10% fee.

Jupiter's own embeddable widget (Jupiter Plugin) was evaluated first and
**rejected on 2026-08-02**. Verified by direct probe: the plugin fetches its
stylesheet from `fonts.googleapis.com`, and when that request is blocked its
style routine throws and the widget renders nothing at all. Google Fonts is
therefore a hard runtime dependency that no page-level policy can remove,
which would have broken the site's standing rule of self-hosted fonts only —
today no visitor-facing page loads Google Fonts. The plugin also pulled in an
image proxy, Arweave, Irys, and a third-party CDN, and carried a visual
language foreign to the site. The site's own interface avoids all of it.

This contradicts four shipped public statements, which is why the texts were
rewritten ahead of launch (PR `fable/registry-trade-governance`): the Terms
"read-only flow" framing, the disclosure page's read-only row, the sign
pages' "does not sell or execute transactions" framing (narrowed in the
panel PR), and the operator attestation's silence on trading venues. The
disclosure page now carries a `Trade panel` row that ships with the pending
chip and states the panel's operating rules in advance; the panel PR flips
it to verified when the code is public.

## Why this is the conservative boundary

- The site is never a counterparty. Verified against the live API on
  2026-08-02: `GET /ultra/v1/order` returns the price and, once a wallet
  address is supplied, a transaction **built by Jupiter**; `POST
  /ultra/v1/execute` accepts exactly `{signedTransaction, requestId}` and
  Jupiter submits it. The site therefore needs no write RPC of its own and
  never broadcasts. No custody, no transaction construction, no signing key,
  no execution, no reversal, no fee to the site.
- The venue's fee is disclosed rather than hidden: Jupiter's order response
  reports `feeBps: 10`, a 0.10% fee, with no referral account configured.
  That fee is Jupiter's; the site's copy names it and the attestation states
  the site receives nothing.
- All twelve assets already trade on the same venue through the existing
  deep links; the panel changes where the interface renders, not who
  operates it, and the deep links remain beside the panel as the fallback.
- Liquidity evidence: `scripts/thesis-disclosure-reviewed.json` (2026-07-14
  capture, maintainer-reviewed) records a canonical Raydium CPMM pool for
  all twelve signs with LP ≥92% burned, including Cancer
  (`DaTEcH6da4i1evZU37F9ibQirYXhLKZpKDzDno346nSW`) and Sagittarius
  (`7mP6WeVYBNt3eao5szsMPmuHughHjNRx26TcrgJXZRky`); the published thesis
  page reports 12/12 pools live at the 2026-07-23 capture with $11.9k–17.8k
  depth.
- Routing verified 2026-08-02: Jupiter's public quote API returned live
  routes for 0.1 SOL into ARIES (100% via Raydium CP, ~0% price impact) and
  into CANCER (the sign with no indexed pair; 0.012% impact). Every sign is
  tradeable through the venue today.
- Integration surface: Jupiter's Ultra API on the keyless public base URL
  `https://lite-api.jup.ag`, reached from the visitor's browser. No API key,
  no site secret, and no third-party script is loaded into the page. Rate
  limits and any later key requirement are re-checked in the panel PR.
- Thin pools are a visitor-facing risk, not a site-side one. Because the
  panel is now the site's own interface, price impact and the amount to be
  received must be shown by us, from the venue's own quote, before anything
  is signed — alongside the pinned complete-loss, irreversibility, and
  verify-the-mint sentences and a thin-liquidity warning.

## Combined funnel

This decision covers the whole funnel, not the panel alone. The Registry
redesign (`fable/registry-token-explorer`, ratified 2026-08-02) makes the
landing a token-first explorer whose titles, descriptions, and FAQ target
buy-intent queries, with every primary action leading to a sign's record
page — one click from the landing to the page that will carry the trade
panel. MASTER-PLAN risk R1 (YMYL contagion from the wing) assumed swap
deep-links two clicks from consumer pages; with the redesign plus the panel,
an execution surface sits one click behind an SEO-targeted landing. The
containment defenses stay as designed — financial interaction and its detailed
risk language remain confined to `/registry/**`, while the Consumer may carry
only the selected-sign educational record handoff authorized on 2026-08-13 —
and the owner's approval of this decision explicitly accepts the sharpened R1
posture. The Consumer buying guide ends at the selected sign record and stays
true in both record-panel flag states.

## Fresh operator attestation (ratified 2026-08-02)

The 2026-07-23 attestation predated the panel and did not address venue,
referral, or marketplace compensation. The owner ratified this replacement
on 2026-08-02; it is published verbatim and dated on `/disclosure/` in
every locale by this release, superseding the 2026-07-23 text:

> "I personally control the zodiacs.org domain, repository, deployments, and
> the Registry content published there. I do not control astrofolio.xyz, its
> official channels, token deployment or administrative authorities,
> treasury, liquidity, or market activity. No person, account, or
> organization responsible for zodiacs.org also controls those Astrofolio
> surfaces. I hold positions in one or more Registry assets. No referral
> account, platform fee, or other compensation from Jupiter, any liquidity
> pool, or any marketplace is configured for zodiacs.org, and the site
> receives nothing from any trade reached through it."

The compensation sentence is written in the present tense so that it states
what is true on the day it is published — the linked venue routes that ship
today receive no compensation either — and remains true when the embedded
panel ships. It is an operator attestation: dated, published verbatim, and
never presented as independently verified.

## Controls that remain mandatory

1. Committed sign-page HTML stays flag-off; only the Vercel production
   environment sets `PUBLIC_REGISTRY_TRADE_ENABLED=1`, and the CI drift gate
   keeps regenerating the flag-off state.
2. No referral account, platform fee, or compensation parameter is ever sent
   to the venue; the panel PR's tests pin their absence, and pin that the
   quote the visitor sees is the venue's own unmodified figure.
3. The site never constructs, signs, or broadcasts a transaction, holds no
   signing key, and calls no write RPC. The panel only relays a transaction
   built by the venue to the visitor's wallet and the signed result back to
   the venue. No third-party script is loaded into the page, and the
   self-hosted-fonts rule stands unbroken.
4. The pinned risk sentences — independent third-party, can lose all market
   value, cannot be reversed, verify the official mint, network, amount, and
   destination — render beside the panel, not only in Terms or a footer,
   with a thin-liquidity warning and the venue's 0.10% fee in the same block.
5. The Cabinet (`/registry/collection/`, `src/pages/registry/collection/`)
   never gains the panel or any acquisition link; the `/registry/` hub keeps
   its `jup.ag/swap/` ban.
6. The ratified 2026-08-02 attestation above and the rewritten Terms,
   privacy, and disclosure pages are live in production before the flag is
   set. (Published by this release; verify on production after deploy.)
7. The disclosure `Trade panel` row moves from pending to verified only in
   the PR that publishes the panel code.
8. Rollback stays one step: unset the flag and redeploy; the pages return to
   the committed deep-link state with no code change.
9. The thesis §VII preregistered one-tap claim surface and `thesis-test.json`
   are untouched: the trade panel is not that surface, and the preregistered
   test's terms are not consumed by this launch.
10. The panel sends the visitor's address to the venue only when they choose
   to trade, never merely to show a price; the privacy pages' description of
   what leaves the browser stays accurate.

## Phase boundary

This document, once approved, clears exactly one gate: setting
`PUBLIC_REGISTRY_TRADE_ENABLED=1` in production after the panel PR merges
with every control above satisfied. It does not authorize Base-chain
trading, fees of any kind, direct or embedded acquisition surfaces outside the
twelve catalogue pages, embedding any third-party script, or the thesis §VII
claim surface. The sole exception is the 2026-08-13 Consumer educational
handoff to a selected sign's already-authorized record; it does not itself
quote, connect, or execute.

## Addendum — 2026-08-22: Astrofolio beginner guide and optional Jupiter tool

**Authorized: 2026-08-22.** The owner expressly approved a dedicated,
consumer-first guide at `/astrofolio/how-to-buy/` and asked that it include
the existing Jupiter API interface as an alternative offered purely for
convenience. This addendum supersedes the older Consumer handoff and
surface-confinement limits only to the extent stated here.

The Astrofolio selected-sign action may now lead to the dedicated guide. The
guide may explain wallets, recovery phrases, the Solana network, USDC, SOL
network fees, verified token addresses, quote review, price impact, fees,
irreversibility, and complete-loss risk. It must take its twelve Solana mints
from the canonical Registry and keep the complete selected address visible
before the executable interface.

The existing first-party `/assets/trade.js` interface may run on this one
guide route after an explicit visitor action. It must not load, request a
quote, discover a wallet, connect, or ask for approval merely because the
page opened or the selected sign changed. Once requested, Jupiter supplies
the quote and transaction, the visitor's wallet reviews and signs, and
Zodiacs.org still holds no keys or funds, constructs no transaction,
receives no referral or platform fee, and cannot reverse a transaction.

The authorization does not restore trading to the twelve Registry profiles,
the Astrofolio landing, or the Cabinet. Those surfaces remain read-only or
identity-first as already specified. It does not authorize a third-party
Jupiter Plugin, external font runtime, Base-chain execution, custody,
compensation, or a hidden default amount. The guide begins as a `noindex`,
`no-store` pilot with route-scoped network policy. A live provider probe and
browser verification are required immediately before production release.

## Addendum — 2026-08-24: Astrofolio bottom market gateway

**Authorized: 2026-08-24.** The owner directed that market discovery on the
Astrofolio landing be consolidated into one final, editorial gateway instead
of appearing inside every selected-sign placard. The gateway may contain
exactly one same-origin link to `/terminal/` for prices, liquidity, charts,
and research, and exactly one same-origin link to `/terminal/markets/` for
the existing Jupiter Ultra trading interface.

This authorization changes discovery only. No sign placard, Registry profile,
Cabinet, global navigation, or footer gains either action. Loading the
Astrofolio landing or reaching the gateway must not load `/assets/trade.js`,
request a Jupiter quote, discover or connect a wallet, or ask for a signature.
The landing remains identity-first, and the executable interface remains
confined to its already controlled routes.

The Zodiac Markets destination retains its independent-provider, no-custody,
no-compensation, `noindex`, `no-store`, network-policy, and wallet-review
controls. This addendum does not authorize an external Jupiter URL, a
third-party plugin, Base-chain execution, new fees, or any change to the
Registry and Cabinet prohibitions above.
