# The local MCP adapter: what was built, and what was actually established

`zodiacs-mcp-server@0.1.0-rc.1`. A local stdio MCP server that lets an
explicitly connected AI client use the Zodiacs engine and the site's own chart
comparison. Source in `src/mcp/`, bundled to `examples/mcp-server/server.mjs`,
distributed as `public/examples/zodiacs-mcp-server-0.1.0-rc.1.tgz`.

## Why it lives in this repository

Not because anything blocked it elsewhere. Write access to the SDK repository
was verified as available in this session. The adapter is here because the
comparison it exposes is `src/lib/compare/diff.ts` — unpublished TypeScript in
this repository — and the alternative was a second copy of the explanation rules
in a second repository, which is exactly the thing that drifts. The engine is
also not on the SDK repository's `main`; it exists only on the branch
`codex/platform-release-integration-sdk`.

So the adapter imports the real functions: `natalChart` and the envelope codec
from the pinned `@zodiacs/engine` candidate, `compareEnvelopes` and `replay`
from `src/lib/compare/`. No numerical formula, validator or explanation rule is
re-derived. A change to the browser tool's rules is a change to the adapter's,
by construction rather than by discipline.

It calls `natalChart` and `createNatalEnvelope` directly rather than
`computePortableChart`, which flattens every failure into an argument-free
`PortableChartError` with `code: 'calculation_failed'`. Going through it would
have turned "latitude must be within -90 to 90" into "calculation failed".

## What each record establishes

Kept separate because they are separate claims, and collapsing them is the
usual way this kind of work gets overstated.

| record | establishes | result |
| --- | --- | --- |
| `protocol-drive.json` | the official SDK client interoperates with the real server process | 70/70 checks |
| `host-drive.json` | a named end-user host launches it and reports it connected | 7/7 checks |
| `host-interop.md` | a model, in that host, called the tools and used the answers | one run, recorded verbatim |
| `benchmark.json` | the comparison classifies the cases its rules describe | 10/10 scenarios, 59/59 assertions |
| `benchmark-expectations.json` | those classifications, written before the candidate ran | 10 scenarios, 59 assertions |

Re-run them with `npm run test:mcp:protocol`, `npm run test:mcp:host` and
`npm run test:mcp:benchmark`. The first and last refuse to run against a stale
bundle, because the first two drafts of this work silently measured the
previous one.

## Versions, pinned and recorded

| | |
| --- | --- |
| adapter | `0.1.0-rc.1`, unpublished candidate, not on npm |
| engine | `@zodiacs/engine` `0.1.1-rc.6`, unpublished candidate, bundled |
| ephemeris | `astronomy-engine` 2.1.19, inside the engine |
| MCP SDK | `@modelcontextprotocol/server` **2.0.0**, external and pinned exactly |
| validation | `zod` **4.6.5**, external and pinned exactly |
| bundler | esbuild 0.28.1, `platform=node format=esm target=node22` |
| runtime | Node v22.22.2 |
| archive | sha256 published in `public/examples/mcp-server.json`, pinned to a commit |

**Why SDK v2 and not v1.** Both were installed and run on this Node. The
monolith `@modelcontextprotocol/sdk@1.30.0` and the split
`@modelcontextprotocol/{core,client,server}@2.0.0` both implement protocol
`2025-11-25`. v2 was chosen because it is what the current official tutorial
teaches, it declares `node>=20` against this environment's 22.x, it has no peer
dependencies to satisfy, and its runtime tree here is three packages. `zod` is a
plain dependency of it, not a peer.

`zod` was a deliberate second attempt. The first install pinned `zod@4.2.0`
exactly and put both packages in **production** dependencies, which downgraded
an already-hoisted transitive 4.5.4. Reverted: the two MCP packages are
devDependencies of the site (the adapter is not part of the site's production
tree) and `zod` is a range that resolved to 4.6.5, higher than what was there
before. Both CI audit gates were re-run after the change: the production tree
reports 0 vulnerabilities, and the full tree at `--audit-level=high` exits 0.

## The bounds, and why they are shaped this way

Every argument crosses `src/mcp/bounds.ts` before it reaches a calculation.

- **Instant.** ISO-8601 with an explicit zone, validated as a calendar date
  before it is parsed as a timestamp, within 1800-01-01 to 2199-12-31 — the
  epoch every date input on this site already carries, adopted rather than
  widened, because the engine's own receipts record
  `broadDateRange: "not-certified"`. A naked wall time is refused rather than
  read as UTC. `2001-02-29` is refused rather than rolled into March.
- **Coordinates.** A pair or neither. One alone is refused rather than defaulted:
  a chart at longitude zero is a different chart, and the engine's own
  `missing-location` path is the honest answer when a place is unknown.
- **Options.** Enumerated: two house systems, three references, two output
  modes. `z.strictObject`, so an argument the schema does not know is refused
  rather than ignored — and the JSON Schema a host reads says
  `additionalProperties: false`, so the model sees the same boundary the server
  enforces.
- **Records.** The engine's own envelope limits: 65536 bytes, depth 12, 4096
  nodes. The byte gate runs before `JSON.parse`, and it counts **bytes**: a cap
  in characters lets 40000 three-byte characters through, which is a case the
  tests cover on purpose.
- **Request.** The transport's read buffer is set to 1 MB rather than left at the
  SDK's 10 MB default. Two records at the byte limit, escaped into JSON strings
  at the worst case, still fit.
- **Result.** 256 KB, and an oversized result is refused with its size named
  rather than trimmed into something that reads complete.

Four things a model-supplied argument never becomes: a command, a path, a module
name, a URL. That is structural, not a check: the bundle imports no filesystem,
process, network, `vm` or `worker_threads` module, contains no `require(`, no
`createRequire`, no dynamic `import(`, no `eval`, no `new Function` and no
`fetch`. `scripts/mcp-artifact.test.mjs` asserts each of those against the built
artifact. The adapter takes record **content**, never a path.

**Stdout.** The stdio binding is normative: a server must write nothing to
stdout that is not a protocol message, and one stray `console.log` becomes a
JSON parse error that takes the session down. `process.stdout` appears exactly
once in the 159 KB bundle — handing it to the transport — and the test pins that
line. No `console.log`/`info`/`debug`/`dir`/`table` anywhere. The only `console`
calls in the bundle are two argument-free `console.trace()` in the vendored
ephemeris's own validators; `trace` is stderr-family in Node, carries no
arguments, and is followed immediately by a throw the handler catches. The
adapter's own diagnostic channel is one function, `note`, which writes fixed
strings, version numbers and error **class** names to stderr — never an
argument, a record or a birth detail. The protocol drive asserts that, by
looking for the test's own coordinates in what stderr produced.

**No timeout.** `natalChart` is synchronous, so a timer could not interrupt it
mid-way. Rather than ship a timeout that would not honour its own promise, there
is none, and `get_capabilities` says so in the `unsupported` list. The work is
bounded by refusing unbounded operations — no searches, no date ranges, one
chart per call.

## What the benchmark is, and is not

Ten constructed record pairs with the classification each should receive,
written from the comparison's rules and committed in
`benchmark-expectations.json` **before** the candidate was run against any of
them. Result: **10/10 scenarios, 59/59 assertions.**

It covers every case the brief names: identical records, a real house-system
difference, equivalent instants written with different offsets, unknown time,
circular wraparound, mixed versions, unrelated simultaneous differences, and
insufficient evidence — plus two regression cases an earlier review found (a
polar pair whose cusps never move, and a pair ten milliseconds apart where the
smallest real difference is smaller than the largest rounding one).

**This is a synthetic regression corpus, not an accuracy rate.** Both sides of
every pair are produced by the same engine from synthetic inputs. It measures
whether the comparison classifies the cases its own rules describe. It says
nothing about how often the tool is right about a disagreement between
independently authored astrology engines, and nothing at all about real users,
whose charts are not in it. No numerical feature was added to move the score.

## What the benchmark found

Writing the expectations first was not a formality. One scenario failed on the
first run, and the expectation was the correct one.

**`unknown-time` left `cusps-shape` unresolved.** Comparing a chart with a known
birth time against one without, the comparison reported "Some differences are
not accounted for by anything in either file" about the missing house-cusp
list — whose cause, an absent birth time, was printed two rows above it in the
same output, and is stated in a receipt field the comparison had already read.
The `time-known` explanation covered `angles-presence` and `houses-absence` but
not `cusps-shape`, which belongs with them. Fixed in
`src/lib/compare/diff.ts`; the browser tool at `/developers/compare/` gets the
same fix, which is the point of one shared module.

**And the test that should have caught it could not.** The coverage suite in
`src/lib/compare/diff.test.ts` asserted that every substantive row is "claimed
by somebody" — building the claimed set from *all* explanations, including the
unresolved bucket. But that bucket is constructed from whatever no other
explanation claimed, so it claims every leftover row by definition: no row could
ever fail that assertion. The loop was unfalsifiable, and passed while rows were
being reported as explained by nothing. It now excludes the unresolved bucket
and asserts the bucket is empty, and the two unknown-time pairs join the suite —
every pair in it had a known time on both sides, which is how the gap survived.

Both fixes were verified by mutation: reverting the one-line `diff.ts` change
fails the two new cases by name, with the cache cleared so the run could not be
measuring the old transform. The first mutation attempt did pass, from a stale
vitest transform cache, which is worth recording because a "verified to fail"
claim built on a cached run is worth nothing.

## Not done, and not claimed

- **Not published.** Neither the adapter nor the engine is on npm. Both report
  `unpublished-candidate` from `get_capabilities`, and will keep doing so until
  that changes. There is no `npm install` command anywhere in the package or on
  the site page for a name that does not exist.
- **One host.** Claude Code. Claude Desktop is macOS and Windows only and cannot
  run here; VS Code and Cursor are not installed. Their config shapes are quoted
  from their own documentation and labelled as untested.
- **One model run.** Recorded verbatim in `host-interop.md`. Not a measure of
  how reliably a model uses these tools.
- **No adoption.** Our own tests are ours. The site page invites builders through
  the existing route — issues on this repository — and nothing was sent anywhere.
- **No authentication of anything.** Not of a record, not of an engine version,
  not of the claim that two records came from independent software.
