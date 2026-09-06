# Personal chart continuity

Owner authorization: 6 September 2026, continue the advanced capabilities, improve everyday usability, and manage the parallel sessions through completion. This change belongs to the independent personal-experience workstream. Existing Wave 14–23 candidates remain with their release workstream; do not overwrite their chart renderer, calculator, reading-path or learning changes.

## Problems and changes

- The homepage's returning-visitor island renders no server-side children before the profile loads. Astro's `client:visible` directive observes only child elements, so the empty island has no visibility target. The built English homepage reproduced an empty `astro-island` with `client="visible"`. All six homepage uses now hydrate on idle. Their hero, typography and layout sources are unchanged.
- When the personal Today feature is enabled, the English homepage now uses the same single explicit `relationship: self` choice as Today. A newer friend chart cannot replace the personal identity. Missing or ambiguous ownership links to Today's existing chooser without naming a friend as the visitor.
- Profile's chart browser defaults to the explicit owner when available and retains intentional selection of other saved charts. Its existing fallback for an unclassified chart library remains a browsable chart, not a new ownership classification. Feature-off behavior retains the latest-chart path.
- A saved summary does not contain all-day Moon evidence for an unknown birth time. The homepage no longer presents its reference Moon or a stale rising angle as settled.

No chart, relationship label, account consent, storage record or Guide context is written by the new resolver. The resolver lives in the existing lightweight profile reader and adds no engine or network dependency. The existing profile-access guard still controls all profile reads.

## Validation

- 32 focused tests passed: explicit owner selection, missing/ambiguous identity, homepage destination and unknown-time display, existing Profile scan recovery, and Today lazy loading/recovery.
- Browser regression added to the existing explorer evidence drive: 390/1440 homepage → Today → Profile identity; explicit friend selection; missing-owner chooser; overflow and browser errors. Captures are review artifacts, not preset expected screenshots.
- Exact-base scope allowance covers only the four protected translated homepage directives (ES/FR/IT/PT). Russian and English directives change in the same way. No locale copy is modified.
- The first local full build started before the idle-hydration correction and is not final-source acceptance. Final source build/check and CI browser evidence must pass before release. No browser success is claimed by this document yet.

## Release coordination

The prototype remains separately published at `codex/show-me-prototype`; it is not included in this product patch. PR 380 has a separate owner for the mobile Race/Guide overlap fix. Integrate finally released main before merging this branch, preserve the crowded-marker correction from PR 392, refresh this allowance to that exact base, and retain only evidence that matches the integrated source.

Do not repeat an optional complete browser sweep solely because reviewed screenshots/receipt metadata are committed. Reuse verified evidence only if its product-source fingerprint still matches; any source change requires the relevant fresh checks. Required repository release gates remain in force.

## Push-enabled bundle correction

Initial CI found Today slightly above its unchanged 21.5KB limit with push enabled. The new standalone resolver chunk was the added overhead. Colocating the same pure selector in the already-loaded profile reader removes that extra request. The targeted push-enabled Astro build and all bundle/engine-isolation gates now pass; all 32 focused tests still pass. The initial failed run remains recorded as evidence, not retried unchanged.
