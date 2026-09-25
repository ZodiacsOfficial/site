#!/bin/bash
# Reproduces every number in ../README.md except the engine chunk's
# (tools/bundle/run.sh), in dependency order. Needs the raw sources
# (DELTAT_SOURCES, see ../sources.json), Node 22, Python 3.11 and, for gate 3
# only, pyswisseph 2.10.03 with sepl_18.se1 and semo_18.se1 in SWISS_EPHE.
# Run from the site root with the vendored engine installed. Scratch files go to
# $WORK (default: a temporary directory); nothing outside outputs/ and the four
# derived files (sources.json, sigma.json, table.json, iers-12.json) is written
# here.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE=$(cd ../../../.. && pwd)
WORK=${WORK:-$(mktemp -d)}
mkdir -p "$WORK"
: "${DELTAT_SOURCES:?set DELTAT_SOURCES to the directory holding the raw sources}"
export DELTAT_SOURCES
python3 tools/sources.py
python3 tools/derive_sigma.py
python3 tools/derive_table.py
python3 tools/parity.py
python3 tools/gate1.py
python3 tools/values.py
python3 tools/revision.py
python3 tools/bulletin_a.py
python3 tools/hindcast.py
python3 tools/monitor_replay.py
node --experimental-strip-types --no-warnings tools/what-changes.mjs > outputs/what-changes.json
node --experimental-strip-types --no-warnings tools/lunations-a4.mjs "$SITE" > outputs/lunations-a4.json
node --experimental-strip-types --no-warnings tools/moon/horizons-ut.mjs "$SITE" > outputs/moon-horizons.json
if [ -n "${SWISS_EPHE:-}" ]; then
  node --experimental-strip-types --no-warnings tools/moon/multiyear-dump.mjs > "$WORK/multi-model.jsonl"
  node --no-warnings tools/moon/multiyear-dump.mjs em > "$WORK/multi-em.jsonl"
  node --experimental-strip-types --no-warnings tools/moon/corpus-dump.mjs "$SITE" > "$WORK/corpus-model.jsonl"
  node --no-warnings tools/moon/corpus-dump.mjs "$SITE" em > "$WORK/corpus-em.jsonl"
  python3 tools/moon/moon_gate3.py "$SWISS_EPHE" "$WORK/multi-model.jsonl" "$WORK/multi-em.jsonl" "$WORK/corpus-model.jsonl" "$WORK/corpus-em.jsonl" > outputs/moon-gate3.json
  python3 tools/moon/swiss_deltat.py "$SWISS_EPHE" > outputs/swiss-deltat.json
fi
echo "done; the bundle measurement is separate: tools/bundle/run.sh"
