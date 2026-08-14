# Analytics

The analytics layer is a frozen, cookieless allowlist shim in
`src/layouts/Base.astro`. It forwards events to a Plausible-compatible script
only when `PUBLIC_PLAUSIBLE_SCRIPT_URL` is set. `PUBLIC_PLAUSIBLE_ENDPOINT`
optionally selects a first-party/self-hosted endpoint, and
`PUBLIC_PLAUSIBLE_DOMAIN` optionally supplies the site identifier. With the
script URL unset, the script is absent and `zodiacsAnalytics.track` is a
silent no-op.

## Privacy invariant

Events carry fixed enums, counters, and booleans only. No birth data, free
text, identifiers, query strings, URL fragments, chart positions, email
values, or wallet addresses are forwarded. The shim replaces the browser URL
with its canonical path, always sets the outbound referrer to `null`, drops
events and property keys outside the allowlist, and drops string values longer
than 32 characters.

Never add an event or property that could carry a birth date, time, place,
coordinates, pasted address, or anything a visitor typed. The integration
uses no cookies, pixels, persistent/browser fingerprinting, or session
recording.

## Plausible daily-deduplication decision

Accepted on 2026-08-01, with a deliberately narrow boundary: Plausible may
briefly process the request IP address and User-Agent to derive a salted
site/device/day identifier for same-day aggregate deduplication. Plausible
states that it does not store the raw IP address or full User-Agent, rotates
and deletes the salt every 24 hours, and cannot link the identifier across
days or sites. Zodiacs.org and Growth OS must never receive that identifier or
use analytics to construct visitor journeys.

This is a disclosed exception for ephemeral aggregate counting, not a claim
that analytics involves no IP processing. It remains acceptable only while:

- outbound `payload.r` is `null` and the canonical URL has no query or fragment;
- properties remain allowlisted, coarse, and free of identity or chart data;
- no persistent, cross-day, cross-site, or operator-visible visitor ID exists;
- the public privacy explanation describes the transient IP/User-Agent processing; and
- a provider-method change triggers a new privacy review before deployment.

Provider sources: [Plausible data policy](https://plausible.io/data-policy) and
[Events API reference](https://plausible.io/docs/events-api).

## Directive event taxonomy

| Event | Props | Fired when |
| --- | --- | --- |
| `chart_computed` | `mode` | A browser-computed astrology chart renders |
| `chart_saved` | `source` | A chart or comparison is saved locally |
| `compat_computed` | `source` | A compatibility comparison renders |
| `email_subscribed` | `placement` | An anonymous week-ahead opt-in request is accepted |
| `share_card_downloaded` | `variant` | A locally rendered PNG is downloaded or shared |
| `widget_embed_copied` | `widget`, `mode` | Embed code is copied from the widget generator |
| `registry_visit` | — | The Registry catalogue loads |
| `verifier_used` | `chain`, `outcome` | Paste-address verification completes |
| `terminal_view_switch` | `surface`, `direction` | A visitor follows the visible Terminal view switch or the saved-preference banner |
| `sdk_click` | `source`, `destination` | A Registry or astrology surface opens SDK documentation |
| `wallet_chart_computed` | `chain`, `holds_registry_asset` | A feature-flagged wallet chart renders |

`verifier_used` never includes the pasted address, and `email_subscribed`
never includes the email or selected sign.

`terminal_view_switch` accepts only `header` or `preference_banner` for
`surface`, and only `consumer_to_pro` or `pro_to_consumer` for `direction`.
It never records the selected sign, destination URL, stored preference, or
banner-dismissal state.

## Existing product vocabulary

The established five-locale product events remain allowlisted for continuity.
New directive code uses the taxonomy above.

| Event | Props | Fired when |
| --- | --- | --- |
| `result_rendered` | `mode` | A calculator renders a result |
| `explorer_interaction` | `mode`, `source` | The chart wheel is used by pointer or keyboard |
| `tour_start`, `tour_complete`, `tour_step` | `variant`, `variant`, `step` | Guided reading activity |
| `lens_change` | `lens` | The wheel changes time lens |
| `transit_search` | `span`, `bodies` | A transit range search runs |
| `srchart_view` | `via` | A solar-return chart renders |
| `composite_view` | — | The composite tab renders on compatibility |
| `grid_select` | — | An aspect-grid cell is selected |
| `chiron_toggle` | `on` | The Chiron overlay is toggled |
| `detail_toggle` | `to` | Birth-chart detail changes between plain/full |
| `chart_name_set` | `via` | A chart name is committed |
| `comm_read_view` | — | A communication reading renders |
| `chart_save` | `source` | Legacy local chart-save event |
| `chart_share` | `variant` | A share link/card is created |
| `search_open`, `search_go` | —, `kind` | Site search |
| `assistant_open`, `assistant_reply` | — | Site assistant |
| `push_prompt`, `push_subscribe` | — | Flag-gated notification scaffold |
| `today_view` | — | The today brief renders |
| `calendar_subscribe` | — | A transit calendar is subscribed |
| `wing_entry` | `source` | An astrology-to-Registry link is followed |

## Registry lot events

Registry-lot pages also emit `wing_record_view` and
`wing_acquisition_click`, each with the fixed sign slug only. They never
include wallet addresses or query strings. The Registry verifier and landing
page use the directive taxonomy above.

## Operator runbook

1. Provision Plausible cloud or a compatible self-hosted endpoint.
2. Set `PUBLIC_PLAUSIBLE_SCRIPT_URL`; optionally set
   `PUBLIC_PLAUSIBLE_ENDPOINT` and `PUBLIC_PLAUSIBLE_DOMAIN`.
3. Redeploy and verify the eleven directive events without adding properties.
