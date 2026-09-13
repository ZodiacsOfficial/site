# B04 publisher widget acceptance — bounded independent review

## Result and smallest next change

No concrete source defect reproduced. The justified next change is to preserve the acceptance evidence in the platform ledger and narrow the outstanding B04 status accordingly. There is no reason from these checks to mutate the immutable rc.2 archive or change the widget's design/sandbox.

This is independent model-assisted acceptance with actual browser automation, not external user review, a human accessibility study, release approval, publication, deployment, or a guarantee about future hosted bytes.

## Identity and prior evidence

The tested archive is starter **0.1.0-rc.2**, SHA-256 `d409a395966e78b3ddc0604d75d4a836477987d99814ff786f55aee9e464e420`, embedding engine **0.1.1-rc.1** unchanged. All **20** files match current `examples/platform` source (`identity.json`). Extraction and build occurred in this scratch folder, reusing installed dependencies from the earlier verified rc.2 consumer. No fresh/cold installation timing is claimed.

Before testing, the site `CLAUDE.md`, B04 mandate, platform plan/evidence, and the agent-browser/browser-verification skills were read. No root AGENTS.md exists in this site checkout. Existing B02 evidence already covered 185 ordinary desktop/mobile calculator and widget checks, including contrast, initial consent, basic keyboard access, and a synthetic blocked frame. This pass adds the previously missing native zoom, reduced-motion, real offline, and host/privacy boundary checks.

The scratch local server binds only an ephemeral `127.0.0.1` port. Agent-browser verified actual initial navigation, a meaningful accessibility snapshot, a screenshot, and no page errors. Additional probes attached Playwright/CDP to that same isolated browser, **Chrome 152.0.7977.83**, using synthetic data and no authenticated profile.

## Observed acceptance

- **74/74 matrix assertions passed** (`browser.json`): 1280px at native browser zoom 100%, 200% and 400%; dark/light cases at 400%; 390px light control; reduced-motion off/on; real cross-origin frame load and request inventory.
- Native zoom is verified via the isolated Chrome settings API and independent DOM measurements: 1280 physical pixels becomes 640 CSS pixels at 200%, and 320 CSS pixels at 400%, with DPR 2/4. This is not CSS zoom or a device-scale-only claim. Original browser zoom is restored in `finally`.
- Neither parent nor child has horizontal overflow in those cases. At 400%, the iframe width is approximately 281 CSS pixels and its 345px document scrolls within its 300px height. Tab enters the required attribution, its text is visible inside both the iframe and outer viewport, Page Down scrolls to the remaining retrograde content, and Tab exits to the permanent fallback. Three focused zoom followups passed (`native-zoom-captures.json`).
- Reduced-motion matches in both documents and each has zero active animations. Conflicting parent typography, colors and similarly named custom properties change the parent but do not change the iframe's computed styles. This verifies document style isolation; publishers still control and can damage the iframe element's own sizing.
- No external request occurs before Load widget. After activation, the browser sees only the hosted embed GET and same-origin sign icons, with no request body. The parent and iframe have no observed local/session/IndexedDB/CacheStorage/service-worker state; the separate cookie check also found none, including HttpOnly cookies.
- Real offline networking before first frame load produces `net::ERR_INTERNET_DISCONNECTED`. The fallback remains keyboard reachable, while status says only that a widget was requested and tells the reader to check its date/use the fallback. This does not imply that a link can load while offline. A previously loaded static card retains its dated content and attribution after connectivity drops; no freshness claim is inferred.
- A synthetic parent URL query/fragment never enters hosted request URLs or referrers. The iframe receives only the referring origin; document access across the origin boundary fails with `SecurityError`. All four extra privacy conditions passed (`privacy-boundary.json`).

The live dark hosted document returned HTTP 200, 5,559 bytes, SHA-256 `809285f1b6bb071465a6d2f5c56dc896e41aa495ad9e5a863cba3fa5b0bc8169`, and displayed **2026-09-07**, the UTC date at observation. Its exact public response is preserved as `live-hosted-document.html`. This deployment is independent of the starter and has not been changed by this task.

## Accepted captures and reproduction limits

Use `nativeZoom2-dark-attribution-viewport.png`, `nativeZoom4-dark-attribution-viewport.png`, and `nativeZoom4-light-pagedown-viewport.png` for high-zoom visual evidence. Each is a raw actual 1280×900 viewport capture with no CDP clip. The earlier `w1280-nativeZoom2/4-*.png` Playwright full-page captures were clipped by the capture method at native zoom; they are test-driver artifacts, not product failures, and are not accepted high-zoom evidence. Ordinary mobile captures and `offline-before-first-frame.png` remain valid.

The browser driver, native zoom capture followup and privacy script are in this folder. Their hard-coded loopback/CDP endpoints identify this owned run; a rerun must first start a fresh scratch server and isolated browser and update those endpoints. No source file or git state was modified. Server/browser cleanup is recorded separately.

The scope is this finite Chromium corpus. It does not certify other browser engines, screen-reader behavior, arbitrary host styling, every future dated publication, or all B04 site/widget surfaces. The separately frozen engine artifacts, account contract work and release gates are unaffected.
