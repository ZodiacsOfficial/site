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
into `get_capabilities` and into every tool description rather than only into
the README: the README is read by a person once, and the tool description is
read by the model on every call.

**Does not show.** One run, one host, one model, one prompt. It is not a measure
of how reliably a model uses these tools, and no such measure is claimed. The
synthetic benchmark beside this file covers the comparison's classifications;
nothing here covers model behaviour beyond this single successful case.

The chart is synthetic: round coordinates for central London on a date chosen
for having nothing special about it.
