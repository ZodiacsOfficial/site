# Registry trade panel — owner risk decision

Status: ratified by the owner; flag-on authorized once every mandatory
control below is satisfied

Approved: 2026-08-02T17:28:02Z

Scope: the twelve `/registry/{sign}/` catalogue pages only; Solana only; the
Jupiter Plugin embedded in integrated mode; no referral account, platform
fee, or compensation of any kind; committed HTML always flag-off behind
`PUBLIC_REGISTRY_TRADE_ENABLED`.

## Decision

The site owner has chosen not to obtain outside legal advice for this
release. This record is therefore an owner risk decision, not a legal
opinion and not a claim that every jurisdiction has been analysed.

The owner acknowledges that `/terms/` continues to state that the
operator's legal identity and a chosen governing jurisdiction have not been
confirmed in the site's published materials, and that this release does not
resolve either. The decision to proceed rests on the boundary described
below: the site embeds an independent venue's own interface rather than
operating a venue, takes no custody, executes and reverses nothing, and
receives no compensation. Applicable law still governs use of the site, and
nothing here removes mandatory consumer rights. The Applicable law section
of `/terms/` is to be updated, with its date, when those facts are
confirmed.

The owner authorizes setting `PUBLIC_REGISTRY_TRADE_ENABLED=1` in
production once every mandatory control below is satisfied — including the
merge of the panel implementation, which does not yet exist. This
authorization covers no other surface and no other chain.

## What is being decided

Whether zodiacs.org may embed the trading interface of Jupiter, an
independent third-party venue, in the acquisition panel of the twelve sign
catalogue pages, so a visitor can trade a Zodiac token without leaving the
page. Today those pages deep-link out to the same venue. The embedded panel
moves the connect → sign → submit sequence onto the page while keeping the
site out of the transaction: the plugin is the venue's own interface, the
visitor's wallet signs, Jupiter routes and executes, and the site holds no
keys or funds and receives no compensation.

This contradicts four shipped public statements, which is why the texts were
rewritten ahead of launch (PR `fable/registry-trade-governance`): the Terms
"read-only flow" framing, the disclosure page's read-only row, the sign
pages' "does not sell or execute transactions" framing (narrowed in the
panel PR), and the operator attestation's silence on embedded venues. The
disclosure page now carries an `Embedded trading interface` row that ships
with the pending chip and states the panel's operating rules in advance; the
panel PR flips it to verified when the code is public.

## Why this is the conservative boundary

- The site is never a counterparty: the panel is the venue's interface,
  loaded from the venue only after a visitor's click; wallet connection,
  signing, and execution happen between the visitor, their wallet software,
  and the venue. No custody, no execution, no reversal, no fee.
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
- Integration surface: Jupiter Plugin per
  <https://developers.jup.ag/docs/tool-kits/plugin> (script tag or
  `@jup-ag/plugin`; integrated/widget/modal modes; runs on Ultra, which
  executes without a site-side RPC). The exact script URL, `formProps` key
  names, and free-tier posture after the 2026-04-06 Developer Platform
  relaunch are confirmed and recorded in the panel PR before any flag-on.
- Thin pools are a visitor-facing risk, not a site-side one: the venue UI
  shows price impact natively, and the site's own copy beside the panel
  carries the pinned complete-loss, irreversibility, and verify-the-mint
  sentences plus a thin-liquidity warning.

## Combined funnel

This decision covers the whole funnel, not the widget alone. The Registry
redesign (`fable/registry-token-explorer`, ratified 2026-08-02) makes the
landing a token-first explorer whose titles, descriptions, and FAQ target
buy-intent queries, with every primary action leading to a sign's record
page — one click from the landing to the page that will carry the embedded
venue. MASTER-PLAN risk R1 (YMYL contagion from the wing) assumed swap
deep-links two clicks from consumer pages; with the redesign plus the panel,
an execution surface sits one click behind an SEO-targeted landing. The
containment defenses stay as designed — market and crypto language confined
to `/registry/**`, consumer surfaces clean, graph separation — and the
owner's approval of this decision explicitly accepts the sharpened R1
posture. The redesign's FAQ answer "How do I buy a zodiac token?" is worded
flag-agnostically so it stays true in both flag states.

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
2. No referral account, platform fee, or compensation parameter is ever
   configured in the plugin init; the panel PR's tests pin their absence.
3. The pinned risk sentences — independent third-party, can lose all market
   value, cannot be reversed, verify the official mint, network, amount, and
   destination — render beside the panel, not only in Terms or a footer,
   with a thin-liquidity warning in the same block.
4. The Cabinet (`/registry/collection/`, `src/pages/registry/collection/`)
   never gains the panel or any acquisition link; the `/registry/` hub keeps
   its `jup.ag/swap/` ban.
5. The ratified 2026-08-02 attestation above and the rewritten Terms,
   privacy, and disclosure pages are live in production before the flag is
   set. (Published by this release; verify on production after deploy.)
6. The disclosure `Embedded trading interface` row moves from pending to
   verified only in the PR that publishes the panel code.
7. Rollback stays one step: unset the flag and redeploy; the pages return to
   the committed deep-link state with no code change.
8. The thesis §VII preregistered one-tap claim surface and `thesis-test.json`
   are untouched: the trade panel is not that surface, and the preregistered
   test's terms are not consumed by this launch.
9. The panel loads nothing from the venue until the visitor presses its
   button; the privacy pages' click-to-load description stays accurate.

## Phase boundary

This document, once approved, clears exactly one gate: setting
`PUBLIC_REGISTRY_TRADE_ENABLED=1` in production after the panel PR merges
with every control above satisfied. It does not authorize Base-chain
trading, a custom swap interface, fees of any kind, acquisition surfaces
outside the twelve catalogue pages, or the thesis §VII claim surface.
