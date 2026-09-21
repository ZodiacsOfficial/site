# The deployed-origin drive, and why its verdict says FAIL

`preview-deployed-run.json` is `scripts/drive-precision-preview.mjs` run against
**production** after #546 merged:

```
node scripts/drive-precision-preview.mjs --base https://zodiacs.org \
  --browsers chromium \
  --out docs/platform/evidence/precision-2026-09-20/raw/preview-deployed-run.json
```

Merge commit `35532f17`, Vercel deployment `dpl_HwMNX34hcNNrWshCzCdsmb7iK5Xg`
(built 12:31:02 UTC, ready 12:35:05, aliased to zodiacs.org), 2026-09-21.

**It records `verdict: FAIL`. That verdict is not about the deployed preview.**
The single recorded problem is one console line:

```
console: Failed to load resource: the server responded with a status of 502 (Bad Gateway)
```

All nineteen substantive steps ran and reported no problem. Read the steps, not
the verdict.

## Why the 502 is the harness's network and not the site

The run was driven from a sandboxed container whose egress goes through a
MITM proxy. The proxy's own telemetry
(`$HTTPS_PROXY/__agentproxy/status`) recorded **seven
`ws_closed_mid_exchange` relay failures for `zodiacs.org:443`** in the minutes
around the run — tunnels closing with code 1006 mid-exchange, typically after
517 bytes sent and 39 received. A browser renders a dropped tunnel as
502 Bad Gateway.

Corroborating, from the same container:

- `curl` returned `000` **connection errors** — not HTTP statuses — scattered
  at random across different resources on each of three sequential passes.
  `aries.webp` failed pass 1 only; `scorpio.webp` failed passes 2 and 3; the
  page itself failed pass 2 and succeeded in 1 and 3. A fault in the
  deployment would be deterministic per resource, not a different random
  subset each time.
- Every resource the page requests returned 200 when fetched individually.
- One retry of the whole drive failed *worse* — a hard `waitForFunction`
  timeout — consistent with the tunnel degrading under repeated load. It was
  not retried again; the cause was established, and hammering production
  through a failing proxy proves nothing.

**A clean verdict from a network without a MITM proxy has not been obtained.**
That is the honest gap: the behaviour below is verified, the green tick is not.

## What the run does establish, live on zodiacs.org

| step | observed |
| --- | --- |
| `beforeAnyData` | places and search both `no-pack`; compute disabled |
| `synthetic` | fixture ready, authenticity stated, 4 bodies, 11 info rows |
| `empiricalSearch` | finished, 1 event, completeness established **false**, support **conditional** |
| `geometricSearch` | finished, 1 event, completeness established **true**, support **proven** |
| `refusals` | `bad-instant`; `out-of-coverage` before and after; `unknown-request`; rate ceiling |
| `cancel` / `cancelWorker` | worker replaced, **0** replies from the stopped worker, 0 in flight |
| `recovered` | compute re-enabled |
| `dispose` | "every calculation will be refused"; compute disabled |
| `siteSearch` | two same-origin fetches; `offOrigin: []` |
| `persistence` | localStorage 0, sessionStorage 0, cookies empty, indexedDB empty, cacheStorage 0 |
| `warmedContext` | service worker **active and controlling**, 300 site-wide cache entries, **`cacheStorageHoldingThisRoute: []`** |

The last row is the CLAUDE.md invariant holding in production: the offline
worker is live and controlling the page, and still caches nothing for this
route.

## Coverage this run does not have

**Firefox was not driven against the deployed origin.** It fails with
`SEC_ERROR_UNKNOWN_ISSUER`, because the proxy's CA is in the system bundle that
Chromium uses but not in Firefox's own NSS store. Firefox 151 passed against
the built tree before the merge; that is in `preview-browser-run.json`, which
covers Chromium 141, Firefox 151 and a recorded WebKit non-run, and which this
file deliberately does **not** replace — hence the separate `--out`.

Running the driver without an explicit `--out` overwrites
`preview-browser-run.json`, and a partial `--browsers` run silently narrows
that record to whichever browsers were asked for. Pass `--out`.
