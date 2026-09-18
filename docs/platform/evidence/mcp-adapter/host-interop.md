# A model calling these tools, through a named host

Three different things get confused with each other, so they are recorded
separately here and in the JSON beside this file:

| record | what it establishes |
| --- | --- |
| `protocol-drive.json` | the official MCP **client library** interoperates with the server process |
| `host-drive.json` | a named end-user **host** launches the server and reports it connected |
| this file | a **model**, running in that host, actually called the tools and used the answers |

A client library agreeing with a server is not a host agreeing with it, and a
host connecting is not a model successfully using the tools. Nothing below is
reconstructed or simulated: it is one real run, with the command and the reply
as they were.

## The host

Claude Code CLI **2.1.274**, on Linux. This is the host that can actually be
installed and exercised in this environment.

**Claude Desktop was not tested.** It ships for macOS and Windows only, so it
cannot run in this Linux container. Its config file shape is quoted in the
package README from Anthropic's documentation and is not a tested claim. The
same goes for VS Code and Cursor, neither of which is installed here.

## Isolation

Every host invocation ran with `CLAUDE_CONFIG_DIR` pointed at a throwaway
directory and `cwd` at a throwaway project directory. The machine's own
`~/.claude.json` was read once, to fingerprint it, and compared afterwards:
byte-identical. `grep -c zodiacs ~/.claude.json` returned 0 throughout. The
user's existing setup was never written to.

`tests/mcp-host-drive.mjs` re-runs the mechanical half of this — add, list,
get, remove, and the isolation assertion — and writes `host-drive.json`. It
passed 7/7. What it does not do is drive a model, because that needs
credentials and costs a request; that part is the run below.

## Registering it

```
$ export CLAUDE_CONFIG_DIR=<throwaway>/claude-config
$ cd <throwaway>/project
$ claude mcp add zodiacs --scope local -- node <extracted>/install/server.mjs
Added stdio MCP server zodiacs with command: node <extracted>/install/server.mjs to local config
File modified: <throwaway>/claude-config/.claude.json [project: <throwaway>/project]

$ claude mcp list
Checking MCP server health…

zodiacs: node <extracted>/install/server.mjs - ✓ Connected

$ claude mcp get zodiacs
zodiacs:
  Scope: Local config (private to you in this project)
  Status: ✓ Connected
  Type: stdio
  Command: node
  Args: <extracted>/install/server.mjs
  Environment:
```

`Environment:` is empty because the server is given none. The `<extracted>`
path is a clean extraction of the packed archive
`zodiacs-mcp-server-0.1.0-rc.1.tgz`, installed with `npm install` and verified
with `npm run verify` (15/15) before the host was pointed at it — so this is the
distributed artifact, not the working tree.

## The model-driven run

```
$ claude -p 'Use the zodiacs MCP server. First call get_capabilities. Then
  calculate the natal chart for the synthetic instant 1990-06-15T13:30:00Z at
  latitude 51.5074, longitude -0.1278 with placidus houses. Report only: the
  engine version, the Sun s longitude to four decimals, the requested and actual
  house system, and one sentence on whether this calculation was local. Do not
  calculate anything yourself.' \
  --allowedTools "mcp__zodiacs__get_capabilities,mcp__zodiacs__calculate_natal_chart" \
  --output-format json
```

Result, verbatim:

> - Engine version: @zodiacs/engine 0.1.1-rc.6
> - Sun's longitude: 84.1891°
> - House system: requested placidus, actual placidus
> - This calculation was performed entirely on the local machine (no network
>   connection was opened), though whether the birth details reached a remote
>   model provider depends on where the connected assistant itself runs.

Run metadata: `subtype: success`, `is_error: false`, `num_turns: 4`,
`permission_denials: []`, `stop_reason: end_turn`, 9.9 s wall clock, served by
`claude-sonnet-5`.

## What this run does and does not show

**Shows.** The host launched the server, the model discovered the tools from
`tools/list`, called two of them, and read structured results back. The Sun
longitude it reported, 84.1891°, matches the value computed here independently
of the adapter: 84.18908508711235. The requested and actual house systems came
back as distinct fields and the model reported both.

The last bullet is worth noting on its own. Nobody asked the model to qualify
its answer that way — the qualification is in the tool descriptions, and the
model relayed it. That is the whole reason the privacy distinction is written
into `get_capabilities` and into the tool descriptions rather than only into the
README: the README is read by a person once, and the tool description is read by
the model on every call.

**Corrected 2026-09-18.** This paragraph said "every tool description", and an
audit found that untrue: the routing sentence was on `get_capabilities` and
`calculate_natal_chart` and not on `compare_calculation_records` — the one call
of the three that takes two whole records as arguments, which is the wrong way
round. It is on all three now, and `tests/mcp-protocol-drive.mjs` reads the
descriptions off the wire and requires it on each. The assertion that should
have caught this was an OR over two different sentences, so a tool carrying
either one passed; that is why it did not.

**Does not show.** One run, one host, one model, one prompt. It is not a measure
of how reliably a model uses these tools, and no such measure is claimed. The
synthetic benchmark beside this file covers the comparison's classifications;
nothing here covers model behaviour beyond this single successful case.

The chart is synthetic: round coordinates for central London on a date chosen
for having nothing special about it.

## The complete workflow, rc.3

The run above was two tool calls. An audit pointed out that a host *connecting*
is not a host running the workflow, and that `tests/mcp-host-drive.mjs` — which
adds, lists, gets and removes — establishes the connection and nothing past it.
This is the whole workflow, through the same host, against a clean extraction of
the published `zodiacs-mcp-server-0.1.0-rc.3.tgz` (sha256 `78bbb897…`, matching
`public/examples/mcp-server.json`; `npm install` then `npm run verify`, 17/17,
before the host was pointed at it).

Same isolation as above: a throwaway `CLAUDE_CONFIG_DIR`, a throwaway project
directory, and the machine's own `~/.claude.json` fingerprinted before and after
— `a4f7a4ae…` both times, and `grep -c zodiacs` returns 0 both times.

The prompt asked for five steps in order: capabilities, two synthetic records,
the comparison, one deliberately invalid request and a recovery. It also asked
the model to say whether the comparison's answer contained the birth instant and
coordinates it had supplied, because that claim is easier to check from inside
the host than from the wire.

Reply, verbatim:

> All five steps complete. Results:
>
> 1. **Capabilities**: Engine `@zodiacs/engine` v0.1.1-rc.6, adapter v0.1.0-rc.3,
>    both status `unpublished-candidate` (i.e., not a released version).
>
> 2. **Placidus record**: Calculated successfully — ASC 191.24°, houses cusps
>    returned as placidus, full record generated for 1990-06-15T13:30:00Z,
>    51.5074/-0.1278.
>
> 3. **Whole-house record**: Calculated successfully for the same instant/place —
>    houses returned as evenly-spaced whole-sign cusps (180, 210, 240…).
>
> 4. **Comparison**: Not identical — **15 fields differ** (3 house-system metadata
>    fields + 12 house cusps; all body positions/aspects/angles were identical).
>    The tool's proposed cause carries evidence label **"reproduced"** (it
>    recalculated both charts locally and confirmed that swapping only the house
>    system turns one into the other). Both records contained the birth instant
>    (1990-06-15T13:30:00.000Z) and coordinates (51.5074, -0.1278) — confirmed via
>    the receipt fields, though the comparison's summary output withheld the actual
>    cusp values (only deltas/labels), consistent with its stated privacy
>    behavior.
>
> 5. **Invalid request**: `2001-02-29T00:00:00Z` was refused verbatim with: **"utc
>    names a day that does not exist in that month."** (2001 is not a leap year, so
>    Feb 29 doesn't exist.) Step 2 was then repeated and it succeeded identically —
>    the tool remained functional after the refusal.
>
> **Locality**: Per the tool's own disclosure, the calculation itself runs locally
> on this machine with no network connection for the astrological data — but the
> conversation carrying these birth details to me (a cloud-hosted assistant) is not
> local, so the calculation was local while its inputs/outputs still passed through
> a non-local channel.

Run metadata: `subtype: success`, `is_error: false`, `num_turns: 8`,
`permission_denials: []`, 47.3 s wall clock, served by `claude-sonnet-5`.

Three things in that reply are worth separating from the fact that it worked.

**The model relayed the contract's actual wording, unprompted.** Nothing in the
prompt described what `reproduced` means; the model read it off the tool's own
answer and restated it correctly, including that the recalculation went in both
directions.

**It drew the distinction the withholding is for, and drew it correctly.** It
says the two *records* carry the instant and the coordinates — true, it asked for
`output: "record"` and got records — while the *comparison's* answer withheld the
values. That is exactly the claim this adapter makes, and the model did not
round it up into "nothing was echoed back".

**It qualified the locality claim without being asked to.** The last paragraph is
the distinction `PRIVACY.assistant` exists to make, arrived at from the tool
descriptions alone.

One run through one host, with one model, on one machine. It is not a
reliability rate, and nothing here should be read as one.
