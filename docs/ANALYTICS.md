# Analytics

The analytics layer is a frozen allowlist shim in `src/layouts/Base.astro`.
It forwards events to Plausible only when `PUBLIC_PLAUSIBLE_SCRIPT_URL` (and
optionally `PUBLIC_PLAUSIBLE_ENDPOINT`, for a self-hosted or proxied
endpoint) are set at build time. With the env unset, `zodiacsAnalytics.track`
is a silent no-op — pages never break.

## Privacy invariant

Events carry enums, counters, and booleans only. No birth data, no free
text, no identifiers. The shim enforces this: an event not in the allowlist
is dropped, a prop key not allowlisted for that event is dropped, and any
string prop longer than 32 characters is dropped. Never add an event or
prop that could carry a birth date, time, place, coordinates, or anything a
visitor typed.

## Event vocabulary

| Event | Props | Fired when |
| --- | --- | --- |
| result_rendered | mode | A calculator renders a result |
| explorer_interaction | mode, source | The chart wheel is used (tap, keyboard) |
| tour_start / tour_complete / tour_step | variant / variant / step | Guided tour |
| lens_change | lens | The wheel switches time lens (natal, sky, progressed, return) |
| transit_search | span, bodies | A transit range search runs (span preset, body-set name) |
| srchart_view | via | A solar-return chart renders (via: page, lens) |
| composite_view | — | The composite tab renders on /compatibility/ |
| grid_select | — | An aspect-grid cell is tapped |
| chiron_toggle | on | The Chiron overlay chip is toggled |
| chart_save | source | A chart is saved on-device |
| chart_share | variant | A share link/card is created |
| search_open / search_go | — / kind | Site search |
| assistant_open / assistant_reply | — | Site assistant |
| push_prompt / push_subscribe | — | Daily notification opt-in |
| today_view | — | /today/ brief renders |
| calendar_subscribe | — | Transit calendar subscribed |
| wing_entry | source | A records-register link into /registry/ is followed |

## The funnel we read

result_rendered → explorer_interaction → lens_change → chart_save → return
visit. The save-lift question (does interacting with the wheel correlate
with saving?) is observational: compare save rate among sessions with
explorer/lens events against sessions without, same period.

## Owner runbook

1. Provision Plausible (cloud or self-hosted) for zodiacs.org.
2. In Vercel, set `PUBLIC_PLAUSIBLE_SCRIPT_URL` (and
   `PUBLIC_PLAUSIBLE_ENDPOINT` if self-hosted/proxied).
3. Redeploy. The shim activates; no code change needed.
