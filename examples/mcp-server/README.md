# zodiacs-mcp-server

A local MCP server that lets an AI assistant you connect it to calculate natal
charts with the Zodiacs engine, and compare two calculation records to find out
why they disagree.

It speaks MCP over stdio. It opens no listener, binds no port, makes no outbound
request, and reads and writes no files. Three tools, one process, started by
whatever host you point at it.

**Unpublished release candidate.** There is no `npm install zodiacs-mcp-server`:
the package is not on npm under this or any other name, and an install command
for a name that does not exist would be worse than none. Install from the
versioned archive, as below.

## The privacy distinction, before anything else

The calculation is local. The conversation is not necessarily.

This server runs on your machine and calculates there. No birth detail reaches
zodiacs.org, and nothing is uploaded, saved or logged by it.

That is not the same as a local AI experience. Whatever assistant you connect
this to decides what reaches its model provider: your message, the arguments it
builds for these tools, and the results it reads back. If that assistant runs in
the cloud — and most do — assume the birth details in a request reach it, under
that provider's terms and not ours. A local MCP server does not make a cloud
assistant local.

Two smaller points in the same family:

- A comparison reports the **exact** difference between two charts. Anyone
  holding one of the two can reconstruct the other from it. That output is safer
  to pass on than a full record; it is not anonymous.
- A version, checksum or source URL inside a record you supply is a claim that
  record makes about itself. Nothing here authenticates it.

## Install and start

The download URL and the expected SHA-256 are published on
<https://zodiacs.org/developers/mcp/>. They are not repeated here: this README
travels inside the archive, so printing the archive's own digest in it would
change the digest.

If you are reading this you have already extracted, which is fine — check the
`.tgz` you downloaded against the published value either way, and re-download if
it does not match.

```sh
# 1. against the SHA-256 published on the page above
shasum -a 256 zodiacs-mcp-server-0.1.0-rc.1.tgz

# 2. extract
tar xzf zodiacs-mcp-server-0.1.0-rc.1.tgz && cd package

# 3. install
npm install

# 4. check the install works
npm run verify
```

`npm install` brings 14 packages. Three are the server's own, pinned exactly —
`@modelcontextprotocol/server`, `@modelcontextprotocol/core`, `zod` — and the
other eleven are development dependencies of the MCP *client*, which only
`npm run verify` uses. `npm ls --omit=dev` lists the three the server actually
loads. If you would rather not have the client's OAuth and SSE dependencies on
disk, `npm install --omit=dev` installs the three and `npm start` works; only
`npm run verify` needs the rest.

`npm run verify` launches `server.mjs` as a real child process, speaks MCP to it
with the official client SDK, calls all three tools with synthetic charts,
refuses two bad requests, and confirms the session still works afterwards. It
prints one line per check and exits 0 when they all pass. That is the
clean-environment verification: if it passes in a directory you just extracted,
the install is good.

`npm start` runs the server in the foreground, waiting for MCP messages on
stdin. A host normally starts it for you.

**Do not configure `npm start` as a host's command.** npm prints two banner
lines to stdout before the server begins, and a host reading stdout as the
protocol stream will fail to parse them and drop the session. Point the host at
`node /absolute/path/to/package/server.mjs`, as below.

## Connect it to a host

### Claude Code, which is the host this was tested against

```sh
claude mcp add zodiacs -- node /absolute/path/to/package/server.mjs
claude mcp list          # expect: zodiacs: node … - ✓ Connected
```

Use `--scope project` instead to write it into a `.mcp.json` your repository
shares, or `--scope user` for every project on the machine. The default is
private to you in the current project.

### Other hosts, from their own documentation

These file locations and shapes come from each host's documentation, not from a
run here. They are not tested claims:

- **Claude Desktop** — `claude_desktop_config.json`, under `"mcpServers"`.
  macOS and Windows only, so it could not be exercised on the Linux machine this
  was built on.
- **VS Code** — `.vscode/mcp.json`, under a top-level `"servers"` key.
- **Cursor** — `.cursor/mcp.json` or `~/.cursor/mcp.json`, under `"mcpServers"`.

The entry itself is the same everywhere:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/package/server.mjs"]
}
```

Use an absolute path. The server reads no environment variable and there is no
key, credential or secret anywhere in this package. What a host passes it is the
host's business — most pass their whole environment — but nothing here looks at
it.

## The three tools

### `get_capabilities`

Takes no arguments. Returns the engine and adapter versions and their release
status, the record schemas, every limit a request must respect, the list of what
this adapter deliberately does not do, and the privacy text above. Worth calling
first rather than guessing at supported options.

### `calculate_natal_chart`

| argument | type | notes |
| --- | --- | --- |
| `utc` | string, required | ISO-8601 with an explicit zone: `1990-06-15T13:30:00Z` or `1990-06-15T19:00:00+05:30`. A wall time with no zone is refused, not assumed to be UTC. Within 1800-01-01 to 2199-12-31. |
| `latitude` | number | −90 to 90. Supply both coordinates or neither. Exactly 90 or −90 needs `timeKnown: false`: the engine does not compute angles at the poles, which its own records state as `angleExclusions`. |
| `longitude` | number | −180 to 180. |
| `houseSystem` | `placidus` \| `whole` | Default `placidus`. |
| `timeKnown` | boolean | Default `true`. `false` makes `utc` a reference instant and suppresses angles and houses. It does not imply noon. |
| `reference` | `supplied-instant` \| `utc-noon` | Recorded in the calculation record, not in the summary. Omitting it is the usual case and infers nothing. `utc-noon` means no birth time was known and midday UTC stands in, so it needs `timeKnown: false` and `utc` at exactly `12:00:00Z`. The envelope's third value, `local-noon`, is not offered: it requires a captured local date, wall time, zone and offset, and this adapter resolves no timezones. |
| `output` | `summary` \| `record` | Default `summary`. |

`summary` returns the computed chart — twelve bodies, four angles, twelve cusps,
the aspect list — plus the four fields you need to read it: whether the time was
known, which house system was requested, which one the engine could actually
use, and why one is absent. It does not repeat your birth details back at you.

`output: "record"` returns the full `zodiacs.natal-envelope.draft-v1` record
instead, which does contain every input. That is the explicit choice: ask for it
when the record is what you need, which in practice means feeding two of them to
the comparison below.

### `compare_calculation_records`

Takes `left` and `right`: the **content** of two calculation records, as JSON
text. Not paths, not URLs, not identifiers — this adapter reads no files and
fetches nothing. At most 65536 bytes each.

Returns every value that differs, and then what accounts for it, labelled by the
evidence behind each claim:

- **reproduced** — recalculated here, changing one setting and nothing else, and
  the result matched.
- **reported** — stated by the records themselves, with nothing to compute.
- **hypothesis** — fits the evidence, not demonstrated. Several can fit one
  difference, and all of them are listed.
- **unresolved** — nothing in either record accounts for it.

Each angular row carries `delta` as **right minus left**, the shortest way round
the circle: from 191.24° to 180.00° is −11.24°, and from 359.19° to 1.18° is
+1.99°, not −358°. Longitudes are compared around the circle throughout.
Two numbers that print the same at the six decimals these records carry are
called a rounding difference rather than a different calculation, decided on what
they print rather than on a tolerance. A record naming an engine version other
than the one bundled here is not re-run on this engine and offered as the
original: the cause stays a hypothesis and the limit is stated.

## Three requests, and what comes back

**1. An ordinary chart.**

```json
{ "name": "calculate_natal_chart",
  "arguments": { "utc": "1990-06-15T13:30:00Z", "latitude": 51.5074, "longitude": -0.1278 } }
```

```json
{ "engine": { "name": "@zodiacs/engine", "version": "0.1.1-rc.6" },
  "timeKnown": true,
  "houses": { "requested": "placidus", "actual": "placidus", "absenceReason": null },
  "inputFlags": [], "resultFlags": [],
  "bodies": [ { "body": "Sun", "lon": 84.18908508711235, "lat": -0.000018285232575792906,
                "speed": 0.9551296849205073, "retrograde": false,
                "sign": "gemini", "degree": 24.189085087112346 }, "…11 more" ],
  "angles": { "asc": 191.23974755048215, "mc": 104.68870507391313,
              "dsc": 11.23974755048215, "ic": 284.68870507391307 },
  "cusps": [ 191.23974755048215, 216.40946301775787, "…10 more" ],
  "aspects": [ { "a": "Moon", "b": "Jupiter", "type": "trine",
                 "orb": 0.29105788801439303, "applying": false }, "…16 more" ] }
```

**2. The same chart at 78° north, asking for Placidus.**

```json
{ "name": "calculate_natal_chart",
  "arguments": { "utc": "1990-12-15T09:00:00Z", "latitude": 78.2232, "longitude": 15.6267,
                 "houseSystem": "placidus" } }
```

Placidus cannot be computed there, so `houses` comes back
`{ "requested": "placidus", "actual": "whole", "absenceReason": null }` and
`resultFlags` carries `"polar-fallback"`. The requested system and the one used
are separate fields, so a fallback is visible rather than silent.

**3. Two records that differ only in house system.**

```json
{ "name": "compare_calculation_records", "arguments": { "left": "{…}", "right": "{…}" } }
```

```json
{ "identical": false,
  "counts": { "differences": 15, "substantive": 15, "displayOnly": 0, "explanations": 1 },
  "differences": [
    { "id": "houses-requested", "area": "Houses", "label": "House system requested",
      "left": "placidus", "right": "whole", "delta": null, "kind": "metadata" },
    { "id": "houses-actual", "…": "same two values" },
    { "id": "houses-system", "…": "same two values" },
    { "id": "cusp-1", "area": "Houses", "label": "House 1 cusp",
      "left": "191.239748", "right": "180.000000", "delta": -11.239747550482207,
      "kind": "numeric" },
    "…cusp-2 through cusp-12" ],
  "explanations": [
    { "id": "house-system", "evidence": "reproduced",
      "statement": "The different house system accounts for the house cusps.",
      "covers": [ "cusp-1", "…cusp-12", "houses-requested", "houses-actual", "houses-system" ],
      "detail": "Recalculating the first chart's own inputs with whole houses, changing nothing else, reproduces the second chart's house cusps on engine 0.1.1-rc.6." } ],
  "limits": [
    "Only the house system is re-run here. A different moment or place is never promoted past a hypothesis, even when both records name the same engine.",
    "Both receipts name the same engine, so agreement between them would show consistency, not independent astronomical accuracy." ],
  "disclosure": "A comparison reports the exact difference between two charts. …not anonymous." }
```

Not one body and not one angle appears in those fifteen rows, because a house
system cannot move them — and the `house-system` cause claims none of them
either, for the same reason.

`limits` is not an error channel. It is where the comparison says what it could
not settle, and it is worth reading even when everything else looks resolved.

## Versions

| | |
| --- | --- |
| adapter | `0.1.0-rc.1`, unpublished candidate |
| engine | `@zodiacs/engine` `0.1.1-rc.6`, unpublished candidate, bundled into `server.mjs` |
| ephemeris | `astronomy-engine` 2.1.19, inside the engine |
| MCP SDK | `@modelcontextprotocol/server` 2.0.0, pinned exactly, installed from npm |
| validation | `zod` 4.6.5, pinned exactly |
| protocol | stdio. Negotiated on the wire in testing: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07 |
| node | built for and tested on Node 22 (v22.22.2). `package.json` requires `>=22` |
| record schema | `zodiacs.natal-envelope.draft-v1` — Zodiacs-owned draft vocabulary, not an industry interoperability standard |

`candidate.json` carries the same identities in machine-readable form, including
the engine artifact's own SHA-256 and the source paths every part was built from.

## Known limits

- **One chart at a time, no searches.** No transits, progressions, returns or
  eclipses; nothing that scans a date range.
- **No interpretation.** Positions and differences, no readings.
- **No timezone resolution.** Supply an instant with an explicit offset. This
  adapter does not turn a place name and a wall clock into a moment.
- **No file access and no fetching.** Records are passed as content. The adapter
  imports no filesystem, process or network module at all.
- **No cancellation and no timeout.** A calculation is synchronous, so a timer
  could not interrupt it mid-way. The work is bounded by refusing unbounded
  operations: one chart per call, no searches, no date ranges.
- **No authentication of anything.** Not of a record, not of an engine version,
  not of the claim that two records came from independent software. Two records
  from one engine agreeing shows consistency, not independent astronomical
  accuracy.
- **Only two house systems**, `placidus` and `whole`, because those are the two
  the engine computes.
- **No body-to-house mapping.** The summary returns the cusps and the body
  longitudes; which house a body falls in is left to the caller, and getting it
  right needs the same wraparound care as everything else here. Worth adding;
  not in this first integration.
- **No `outputSchema` on the tools.** Arguments are schema-bounded and a host
  reads those; results come back as `structuredContent` with their shapes
  documented here rather than declared, so a shape that drifted from the handler
  could not turn a correct result into a protocol error.
- **1800 to 2199.** The engine's own records state
  `broadDateRange: "not-certified"`; this is the range the rest of Zodiacs
  supports and the adapter adopts it rather than inventing a wider one.
- **Not published.** Neither this adapter nor the engine is on npm. Both are
  labelled `unpublished-candidate` in `get_capabilities`, and will keep saying
  so until that changes.

## Uninstall

The server writes nothing anywhere: no config of its own, no cache, no database,
no state. `npm install` does use npm's own cache under `~/.npm`, as any install
does, and that survives deleting this directory. Removal is two steps.

```sh
claude mcp remove zodiacs           # or delete the entry from your host's config file
rm -rf /path/to/package             # the extracted archive and its node_modules
```

For Claude Desktop, VS Code or Cursor, delete the `zodiacs` entry from the
config file you added it to and restart the host. There is nothing else to
clean up.

## How this was tested

Recorded in the site repository under
`docs/platform/evidence/mcp-adapter/`, kept as three separate records because
they establish three different things:

- **`protocol-drive.json`** — the official SDK client against the real server
  process: initialize, list, all three tools, eighteen malformed or refused
  requests each followed by a valid one, the diagnostic channel, a clean close,
  and a raw handshake at every protocol revision the SDK supports.
- **`host-drive.json`** — the Claude Code CLI launching the adapter and
  reporting it connected, inside a throwaway config directory, with the
  machine's real configuration proved byte-identical afterwards.
- **`host-interop.md`** — a model actually calling these tools through that
  host, with the exact command and the exact reply.
- **`benchmark.json`** — a fixed synthetic corpus of ten record pairs with the
  classification each should receive, written from the comparison's rules before
  the candidate ran against any of them. It is a regression corpus, not an
  accuracy rate: both sides of every pair come from the same engine.

Every chart in every test is synthetic — round coordinates for well-known cities
on dates chosen for what they exercise.

## Licence

MIT. `candidate.json` records what is bundled and where it came from.
