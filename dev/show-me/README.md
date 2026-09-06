# Show me: isolated interaction prototype

Owner direction: keep the advanced astrology capabilities and make them approachable through direct chart explanation. This first slice explores selecting a real computed aspect, seeing its two planets, reading existing authored interpretation, and revealing the underlying geometry.

This directory is a developer-only prototype. It adds no Astro route, production import, API call, analytics, account integration or storage. All data is synthetic. It is not a freeform AI assistant. The custom SVG is an explanatory diagram, not a replacement for the production chart renderer or its in-progress crowded-marker fixes.

## Run

With repository dependencies installed, from the repository root:

```sh
node dev/show-me/build.mjs
node_modules/.bin/esbuild dev/show-me/model.test.ts --bundle --platform=node --format=esm --outfile=build/show-me/model.test.mjs
node --test build/show-me/model.test.mjs
python3 -m http.server 4179 --directory build/show-me
```

Open `http://localhost:4179`. Add `?mobile` for a 390px-wide review layout (not a device emulator). The generated HTML embeds the site's existing self-hosted fonts and computed sample data and makes no network requests. Engine calculations occur at build time. Bundled fonts retain the licenses in `public/fonts/OFL-instrument-sans.txt` and `public/fonts/OFL-eb-garamond.txt`.

## Integration boundary

After the active chart work is stable, reuse `explainConnections` as presentation data and connect selection to the existing chart scene/inspector, rather than shipping this separate SVG. Review the interaction first. Live chart context, Guide tool calls, model evaluation, consented memory, accounts and retention measurement are future work. Unknown birth time must retain the existing source chart's uncertainty handling; the synthetic second example is explicitly a reference instant.

Before any production integration, rebase onto released main and run the repository's normal release gates on that integrated version. This unimported prototype is not production release evidence.
