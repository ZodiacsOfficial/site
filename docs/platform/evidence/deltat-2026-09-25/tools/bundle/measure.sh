#!/bin/bash
# The engine chunk with and without the model, on a scratch copy of the site.
#   tools/bundle/measure.sh <site copy> <label: a slug> <engine dir with package.json and dist/>
# Replaces node_modules/@zodiacs/engine in the site copy (never the real tree), runs
# `npx astro build` and `node scripts/report-bundles.mjs`, and prints engine-closure.mjs's JSON.
# To build the engine variants: `git archive <commit> | tar -x -C <dir>`, then for the model
# copy deltat.ts to <dir>/src/deltat.ts and run tools/bundle/apply-e2-prototype.py in <dir>,
# then the package's build script (tsup).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SITE=$(cd "$1" && pwd); LABEL=$2; ENGINE=$(cd "$3" && pwd)
rm -rf "$SITE/node_modules/@zodiacs/engine"
mkdir -p "$SITE/node_modules/@zodiacs/engine"
cp "$ENGINE/package.json" "$SITE/node_modules/@zodiacs/engine/"
cp -r "$ENGINE/dist" "$SITE/node_modules/@zodiacs/engine/dist"
cd "$SITE"
rm -rf dist .astro
npx astro build > "build-$LABEL.log" 2>&1
node scripts/report-bundles.mjs > "report-$LABEL.txt" 2>&1 || true
node "$HERE/engine-closure.mjs" dist "$LABEL" "report-$LABEL.txt"
