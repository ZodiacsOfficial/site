# Usability findings: reproduction and dispositions (2026-09-14)

Source reproduced: the production build of main `74ae0f03` served by `astro
preview` on loopback, driven with playwright-core 1.61.1 in Chromium 141 with
fresh contexts, every non-loopback request blocked, synthetic inputs only
(2000-01-01; 1990-06-15 14:30 London; 1985-03-02 09:15 Paris; `?sun=leo`).
Drives and the JSON they recorded are in `drives/` and `f*-evidence.json`;
screenshots stayed in the session scratch space and are not committed. The
reproduction was performed by a bounded agent session; the fixes below were
verified again on the rebuilt candidate (`verification.json`).

| # | Finding | Disposition | Change |
| --- | --- | --- | --- |
| 1 | Moon lookup "Get the birth chart for this date" opened an empty form | Confirmed on `/moon-phase/` (MoonPhaseTool) and on `/moon-sign/` (calculator moon mode): `href="/birth-chart/"`, no date, time or place carried | The link now carries the exact looked-up inputs in the URL fragment only (never a query string, request or log): full details codec when a place is known (`#c=`), otherwise a new place-less `#date=…&time=…|unknown` codec. The birth-chart form consumes and clears the fragment, prefills date and time or unknown-time, and moves focus to the birthplace field. |
| 2 | Homepage FAQ promised the calculator "tells you if the Moon may have changed signs that day" | Confirmed: unknown-time results always show "The Moon’s possible signs across this birth date are unverified" and never report a change; the same claim sat in the birth-chart FAQ (en, es, pt, fr, it, ru), the Moon-sign FAQ and the Big Three FAQ | Copy now states the implemented guarantee: the Moon sign is marked unverified until a time is added because the Moon can change sign during a day. No whole-date certification was added. |
| 3 | Profile showed a Sun-sign preference while Today read a separate chart without naming it | Confirmed in part: Today names the chart ("For Gemini Sun · 1990-06-15") but never says why that chart was chosen, and a differing Sun-sign preference (Leo) was silently ignored; the Profile Sun-sign card kept its first-visit copy and "Get your free birth chart" call to action beside a saved chart. The word "demo" was not reproduced: nothing on main writes a demo chart. Additional observation: a second self-mode save silently demotes the previous self chart (existing `saveChart` semantics, unchanged here). | Today adds a source line under the heading (the chart marked as yours, or the most recently saved chart) and names a differing quick-read Sun sign explicitly. The Profile card becomes a secondary "quick-read Sun sign" notice once a chart exists. Selection semantics are unchanged. |
| 4 | Living Chart "Nothing saved yet." appeared above "1 chart saved." | Confirmed (desktop 1856 px vs 1998 px); export buttons are absent until a moment exists while the page note promised export "at any time" | Empty state now reads "No moments saved yet … Markdown and JSON export appear here once a moment is saved."; the library count reads "1 birth chart saved." / "N birth charts saved" in en, es, pt, fr, it (ru keeps its plural catalog string). |
| 5 | No Developers entry in navigation; SDK only under Registry | Confirmed: `/developers/` exists (HTTP 200) but was linked only from Methodology and Widgets; header, mobile menu and footer had no Developers entry; `/sdk/` is the separate ownership SDK | "Developers" (localized label from the components' own tables) added to the footer utilities row and the mobile menu site group on every page. The developer examples page now names the supported local-time recipe (`resolveBirth` from `@zodiacs/engine/geo` with an IANA zone) next to its UTC-instant convention. No npm publication is claimed. |
| 6 | Registry promotion sat after the Big Three and before the chart wheel | Confirmed as placement (desktop: bridge 1545 px, wheel 1643 px); copy is in the sanctioned records register | Design decision: the bridge now follows the chart's own readings and precedes the result actions, so a first-time result is the chart first. Destination, copy, analytics and the known-time gate are unchanged; the contract test pins the new placement. |
| 7 | Keyboard smoke | Focus order, error focus (`#birth-date`, alerts) and result focus (sr-only heading) work; after selecting a birthplace with Enter, focus fell to `<body>`; the house-system context popovers add four tab stops before submit (left as a design note) | The selected-place chip now receives focus (the same labelled field), so Tab continues to the house system and submit. |

Editorial review: the Virgo Moon interpretation now opens "In this tradition,
worry is how your care sounds from the inside." instead of a definitive
statement about anxiety. No other interpretation text was changed.

Not changed on purpose: Today's selection rule (`explicitSelfChart` when
Living Chart capture is on) and Profile's dashboard fallback to the newest chart
remain as they are; the self-chart demotion on a second self-mode save is an
existing product rule and is only named here.

Localized birth-chart FAQ pages for es, pt, fr and it are Phase 1 protected
paths; the change is deliberate and listed in the scope allowance that must
be pinned to the pull request base before CI runs (`.github/phase1-scope-allowance.json`).
