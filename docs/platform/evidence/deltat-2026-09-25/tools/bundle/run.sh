#!/bin/bash
# The whole bundle measurement: three builds of a scratch copy of the site, then
# outputs/engine-chunk.json. See measure.sh for how the engine directories are made.
#   tools/bundle/run.sh <site copy> <rc.7 engine dir> <b457204 engine dir> <b457204 + model engine dir>
# Leaves rc.7 installed in the site copy, as run-all.sh expects.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROWS=$(mktemp)
"$HERE/measure.sh" "$1" rc7 "$2" > "$ROWS"
"$HERE/measure.sh" "$1" rc8-phase1-b457204 "$3" >> "$ROWS"
"$HERE/measure.sh" "$1" rc8-phase1-b457204+deltat "$4" >> "$ROWS"
python3 "$HERE/summarize.py" "$ROWS"
SITE=$(cd "$1" && pwd); RC7=$(cd "$2" && pwd)
rm -rf "$SITE/node_modules/@zodiacs/engine"
mkdir -p "$SITE/node_modules/@zodiacs/engine"
cp "$RC7/package.json" "$SITE/node_modules/@zodiacs/engine/"
cp -r "$RC7/dist" "$SITE/node_modules/@zodiacs/engine/dist"
