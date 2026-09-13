# Combined C-012 + C-014 actual-page acceptance

**The bounded natural edit/refusal/recovery flow passes. One pre-existing legacy startup sync POST was attempted and blocked locally; the measured flow attempted zero additional mutations. No mutation reached an external backend.** This distinction is part of the accepted fixture policy, not a claim of zero POST attempts across the entire page lifetime.

## Exact source and build

An isolated Git archive of c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3 supplied 11,183 regular files. The twelve accepted C-014 files and six accepted C-012 Freeze 2 files were overlaid without overlap. There are 11,187 resulting source records; all other base file bytes match, and every resulting record still matches after build and the native runs. No product file was edited beyond copying those exact accepted files into this owned checkout; no root or author workspace was modified.

- C-014 identity: `328ea15bd192573894639dab699058cb83185e0c61e907dde7f275305cfe48c2`; patch `41d49812595e81a56ae1194a598bab65faa6c047806480cbb4438ed6be1bf13e`.
- C-012 Freeze 2 identity: `fc22bd7c2c6d3efa44022f49f42427545a35915afd49ee66fee6b4d7b6a09cbc`; patch `7202443237f2bebf826a9a0ef24da3fd8062b4cd2aff2b4edfed02f3a51fc5d8`.

The existing Phase 3 synthetic provider environment was reproduced with explicit inert fixture values. Only PATH/HOME/TMPDIR host mechanics were retained; no real service credential or feature environment was inherited. Existing installed dependencies were physically copied, with no network install or shared Astro/Vite output. Actual Astro and assistant bundle builds both exit 0. The build produces 4,217 pages and 7,137 regular artifact files. Full artifact-manifest SHA256 is `98d629b34ac7450071679bec13f305ef33e2dfa242f663bb7579bf1070156647`.

Only 76 browser artifacts are archived: the actual birth-chart HTML, requested JavaScript, and actual city index/shard. Their verified archive SHA256 is `08de6ec465f8dbc4a7241c6b6f23f2c5cbb0390dd80a34526a8309a66eb732c7`. The Python-created archive contains regular files with neutral owner/time metadata, no filesystem xattrs or AppleDouble files. The whole generated site and node_modules are excluded from delivery.

## Actual native flow

Chrome 152.0.7977.83 runs the real combined Astro /birth-chart/ page at 1280×900, with its actual ChartCalculator, BirthFields, PlaceSearch, engine, email enhancement and daily island. Stored profile/session and remote responses are the existing Phase 3 style of explicit synthetic fixtures. Account endpoints and first-party preferences are intercepted; real account validation, authorization, subscriber delivery and backend persistence are not exercised.

1. The initial known-time Mexico chart computes successfully and matches the seeded synthetic saved chart. Its result/actions, current global context and pending daily panel are visible. One preference GET has completed.
2. Native input operations choose unknown time, date 2011-12-30, and the real offline Apia option. The source index decodes Apia, Tuamasaga, Samoa, latitude −13.83, longitude −171.77, timezone Pacific/Apia. No city object is injected. Editing removes the old result/actions/current global context and hides the daily shell; preference GET count remains one.
3. Native submission displays and focuses exactly: “We couldn’t establish a calculation time within this local date. Check the date and place.” The entered date, unknown-time setting and Apia selection remain. No new computed event, result, action or daily panel appears; preference GET count is still one.
4. Changing only the date to 2011-12-31 and submitting recovers a current Capricorn result/actions/context. The new chart has no stored match, so chartId is null and the existing state derivation correctly produces the visible device-only daily surface even though the synthetic session is present. A legitimate recovery preference GET advances the count to two.

The original synthetic profile SHA256 is `bb626ca8106e42376f436c49505069882090eb6967f20ffa1db32920dd251a05`, unchanged at every checkpoint. Startup performs one byte-identical profile replacement; there are zero profile writes during the measured flow. The four checkpoints, request windows, emitted context events, exact city and screenshots are retained in native/result.json and native/{initial,refusal,recovered}.png.

## Mutation accounting and diagnostics

The unchanged legacy source in policy-source/src/lib/profile/sync.ts:41–43 schedules cloud sync when its Auth subscription reports the seeded session. That path reads the fixture remote state and calls the profile upsert at 179–185. The fixture rejects this POST with a locally supplied 418 before any external network request. The final driver waits for that existing startup operation to settle before defining the edit/refusal/recovery measurement window; it does not delay Auth verification or suppress the attempted operation.

| Window/result | Count |
| --- | ---: |
| Startup attempted POSTs | 1 |
| Startup POSTs blocked by the fixture | 1 |
| Additional mutation attempts during measured flow | 0 |
| Mutations issued to an external backend | 0 |
| Mutations completed by an external backend | 0 |
| Additional profile writes during measured flow | 0 |

There are zero unhandled page errors, request failures or unexpected endpoints. Exactly two console diagnostics are retained and specifically asserted: the controlled startup 418 and the source's fixed generic date-refusal error/stack. No generic error filter or global logging override is used. Every page, browser context, browser and foreground preview is closed.

## Retained failures and limits

The first complete browser run correctly reached refusal but used an incorrect recovery expectation, signed-in-unsynced. Existing derivePostChartDailyState and its test establish that an unsaved current chart is device-only. That run also recorded the startup POST and included an unnecessary manual profile-synced probe; chronology/source inspection corrected the initial tentative association with that event. The original driver, complete result, log and screenshots are immutable under initial-run/.

Root explicitly selected natural startup accounting instead of delaying auth to manufacture a global zero-attempt count. The final driver corrects the recovery assertion, removes the optional manual event, and separates startup from the measured natural flow. The production source/build are unchanged between runs. A separate first assembly error came from Python 3.9 lacking tarfile's extraction-filter argument, before any file was extracted; its log is retained. The corrected assembler validates each Git archive member's path/type within owned scratch.

This finite actual-page result does not claim complete civil-date intervals, astronomical accuracy across all dates, real Supabase authentication, backend safety beyond interception, production rendering equality, deployment, publication or external adoption. Broader source/test/release gates remain root's responsibility. No Astrofolio, production, outreach or spending action occurred.
