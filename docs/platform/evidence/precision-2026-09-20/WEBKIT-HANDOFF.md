# WebKit and Safari: exact handoff for Codex on the owner's Mac

Written 2026-09-20. Nothing in this repository claims Safari or iPhone
coverage for the precision preview, because none was obtained.

## What was attempted here, and what came back

```
$ ls /opt/pw-browsers/
chromium  chromium-1194  chromium_headless_shell-1194  ffmpeg-1011  firefox-1532

$ node -e "require('playwright-core').webkit.launch()..."
LAUNCH FAILED: browserType.launch: Executable doesn't exist at
/opt/pw-browsers/webkit-2311/pw_run.sh
```

No WebKit build, no WebKitGTK, no Epiphany, no MiniBrowser. Downloading one
is out: this environment's browsers are provisioned, `playwright install`
is not to be run here, and a WebKit built for Linux is not Safari anyway.

Chromium 141.0.7390.37 and Firefox 151.0 both pass the scoped driver, with
the run recorded in `raw/preview-browser-run.json`. That is two engines of
three, and the third is the one whose absence matters most: Safari is the
only browser on iOS, and `crypto.subtle`, `Worker` with `{type:'module'}`,
`File.arrayBuffer` and the `<input type="file">` path are exactly where its
behaviour has historically differed.

## Three runs, in order. They answer different questions.

### 1 · Playwright WebKit — the engine, not the browser

```bash
git clone <this repo> && cd site
git checkout claude/eager-ramanujan-razak3
npm ci
npx playwright install webkit          # ~120 MB, one time
npm run build                          # writes dist/
node scripts/drive-precision-preview.mjs --browsers webkit --port 8799 \
     --out webkit-run.json
```

The driver resolves the executable through Playwright itself when no pinned
path exists, so no path needs editing. With a real pack, add
`--pack /path/to/pack.zeph`; without one it drives the synthetic-fixture
path, which is the path a visitor with no data actually gets, and that run
is still worth having.

It prints `webkit <version>: pass` or `FAIL` with a list. **Paste back the
whole `webkit-run.json`**, pass or fail. A pass with an empty
`steps.network.offOrigin` and an empty `steps.persistence` is the result
being asked for.

This tells us the **WebKit engine** runs the preview. It does **not** tell
us Safari does: Playwright's WebKit is a build of the engine, not Apple's
shipping browser, and it differs in its JIT, its process model, its storage
policy and its file picker.

### 2 · Real Safari on macOS — manual, ten minutes

Serve the same `dist/` and open
`http://127.0.0.1:8799/developers/precision-preview/` in Safari. Record
the Safari version (Safari ▸ About) and macOS version. With the Web
Inspector open on the Network and Storage tabs throughout:

| # | do this | it must |
| --- | --- | --- |
| 1 | load the page | show "Nothing loaded"; the compute buttons disabled |
| 2 | Network tab | show no request to any host but the one you are serving from, and nothing matching `assistant-ui`, `guide-avatar`, `sw.js`, `plausible`, `insight`, `beacon` |
| 3 | press "Build the synthetic fixture" | reach "synthetic fixture ready", list 4 bodies, and say authenticity is not established |
| 4 | press the places button | show 4 rows, labelled as synthetic, with the date box already inside the fixture's coverage (around 2000, **not** 2024) |
| 5 | run the search in each mode | empirical: `completeness established: false`, support `conditional`. Validated: `established: true`, support `proven` |
| 6 | press cancel during a search | say `cancelled` — not an error dialog, and not a silent stop |
| 7 | load a real `.zeph` pack through the file control | reach "pack loaded and verified" and switch the label from synthetic to apparent |
| 8 | press dispose | refuse every calculation again and disable the buttons |
| 9 | Storage tab | show **no** Local Storage, Session Storage, cookies, IndexedDB or Cache Storage for this origin |
| 10 | Console | be empty of errors |

Report each row pass/fail with the Safari and macOS versions. A failure at
row 3 most likely means `crypto.subtle.digest` or the module worker; a
failure at row 7 most likely means `File.arrayBuffer`.

### 3 · Real Safari on a real iPhone — the one that cannot be emulated

Serve `dist/` on the Mac so the phone can reach it
(`python3 -m http.server 8799 --directory dist`, then
`http://<the Mac's LAN address>:8799/developers/precision-preview/`), and
open it in Safari on the phone, connected to the Mac's Web Inspector
(Settings ▸ Apps ▸ Safari ▸ Advanced ▸ Web Inspector).

The same ten rows, plus three the phone decides:

| # | do this | it must |
| --- | --- | --- |
| 11 | at portrait width | not scroll sideways. The Linux run measures 390 px with no horizontal scroll; confirm it on glass |
| 12 | build the synthetic fixture | finish. iOS kills a tab that allocates too much, and the fixture builds a pack in memory |
| 13 | load a multi-megabyte pack from Files | either load, or refuse with a message — never hang and never crash the tab |

Record the iOS version and the device. A crash at row 12 or 13 is the most
valuable thing this whole handoff can find, and it is not reachable from
any desktop browser.

## What to send back

`webkit-run.json`, the two filled tables with versions, and any console
text. If a row fails, the failing step's screenshot and the console
output are worth more than a description.

## What may not be written down afterwards

That Safari or iOS passed, unless run 2 or run 3 actually happened on that
hardware. Run 1 passing is evidence about the WebKit engine and nothing
else, and the report will say so in those words.
