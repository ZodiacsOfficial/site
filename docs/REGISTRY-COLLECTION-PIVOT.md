# Registry Collection — pivot record (supersedes the Aura plans)

**Date:** 2026-07-16 · **Direction:** owner
**Status:** the "Registry Aura" feature is retired before implementation. No aura code was
ever written; the two aura planning documents (`REGISTRY-AURA-PLAN.md`, `REGISTRY-AURA-PLAN-V2.md`)
remain as bannered history. The Registry segment ships instead as **The Collection** at
`/registry/collection/`.

## What the feature is now

- **The Collection** (`/registry/collection/`): a public, indexable Registry-wing page that
  explains and demonstrates the **Cabinet of Twelve** — a 12-seat display case showing which
  of the twelve official records an address keeps — and its **tier system**, plus a
  paste-address checker (read-only, address-only).
- **The birth-chart and current-sky layers are dropped entirely.** The page touches no birth
  data; the aura's chart↔wallet privacy-join concerns no longer apply to this feature.

## Tier system (owner-directed: amount-based)

Tiers measure the **total token amount** held across the Twelve at one address (ui amounts,
6 decimals). The **cabinet** separately shows *which* signs are present (each sign counts once).

| Tier | Threshold |
|---|---|
| Bronze | any holding > 0 |
| Silver | 100,000+ total |
| Gold | 1,000,000+ total |
| Master of the Cabinet | Gold **and** all twelve signs present |

Master is the capstone — depth and the complete cabinet — and is deliberately rare.
Scarcity copy is non-statistical ("Few ever finish."): `distribution.json` is per-sign only,
so a cross-sign full-cabinet holder count cannot be derived and must not be invented.

## Guardrails

- **Overridden by owner direction (recorded here):** the former "each sign counts once and
  balances never matter *for status*" rule — tiers are now amount-based, and collection/
  completion mechanics are intended, not avoided. This content stays confined to the
  Registry wing, per CLAUDE.md's register boundary.
- **Kept (never revoked):** read-only / no custody / no signing / no wallet connection;
  address-relative grammar ("this address stands at…" — an unsigned lookup never proves who
  controls an address); amounts are on-chain balance reads, never price/value/return claims;
  collecting confers standing **in the registry**, never astrological power (no
  "improves your chart/compatibility" claims anywhere).

## What of the aura docs still applies

- The **endpoint architecture** (same-origin gate, body cap, TTL cache, best-effort holdings
  semantics, error contract) and the **CI-gate analysis** (wing-language grep exemptions,
  runtime-imports registration, bundle isolation, legacy-drift, sitemap/check-dist coupling)
  in those documents remain accurate reference material and inform the Collection
  implementation.
- Everything about aura visual grammar, chart/sky data contracts, reading templates, and the
  aura share card is void.

## Promo video

A standalone Remotion project at `promo/cabinet-promo/` (not part of the site build) renders
a 15-second trailer-style promo of the cabinet and tier ascent, ending on the Master bloom.
Audio is CC0/self-made only, with its license documented alongside the asset.
