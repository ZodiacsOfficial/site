#!/bin/bash
# Reruns every measurement behind this directory's verdicts (README.md), from
# the site root with engine rc.8 installed. Needs:
#   DELTAT_SOURCES  the raw ΔT sources (../deltat-2026-09-25/sources.json),
#   SWISS_EPHE      a directory holding sepl_18.se1 and semo_18.se1,
#   RC7_ENGINE      a directory where vendor/zodiacs-engine-0.1.1-rc.7.tgz is
#                   installed (npm install <tarball>), for the rc.7 dumps and
#                   the legacy receipt.
# Python needs pyswisseph 2.10.03. Writes results/ and a scratch directory
# only; the holdout is not drawn again, results/holdout-1.4.json is its draw.
set -euo pipefail
cd "$(dirname "$0")/../../../../.."
HERE=docs/platform/evidence/phase1-verdicts-2026-09-26
DT=docs/platform/evidence/deltat-2026-09-25
WORK=${WORK:-$(mktemp -d)}
: "${DELTAT_SOURCES:?set DELTAT_SOURCES}" "${SWISS_EPHE:?set SWISS_EPHE}" "${RC7_ENGINE:?set RC7_ENGINE}"
export DELTAT_SOURCES PYTHONDONTWRITEBYTECODE=1
MODULE=$PWD/node_modules/@zodiacs/engine/dist/deltat.js
RES=$HERE/results

# 1.4: the shipped module against the reference, then gate 1, on a copy of
# the ΔT tools (they write their outputs beside themselves).
mkdir -p "$WORK/deltat" && cp -r "$DT/." "$WORK/deltat/"
(cd "$WORK/deltat" && DELTAT_MODULE=$MODULE python3 tools/parity.py > /dev/null && DELTAT_MODULE=$MODULE python3 tools/gate1.py > /dev/null)
cp "$WORK/deltat/outputs/parity.json" "$RES/step-1.4-parity.json"
cp "$WORK/deltat/outputs/gate1.json" "$RES/step-1.4-gate1.json"

# 1.4 gate 3: the installed rc.8 and the rc.7 tarball, against Swiss.
node --experimental-strip-types --no-warnings "$DT/tools/moon/multiyear-dump.mjs" "$MODULE" > "$WORK/multi-model.jsonl"
node --experimental-strip-types --no-warnings "$DT/tools/moon/corpus-dump.mjs" . "$MODULE" > "$WORK/corpus-model.jsonl"
cp "$DT/tools/moon/multiyear-dump.mjs" "$DT/tools/moon/corpus-dump.mjs" "$RC7_ENGINE/"
(cd "$RC7_ENGINE" && node --no-warnings multiyear-dump.mjs em > "$WORK/multi-em.jsonl" && node --no-warnings corpus-dump.mjs "$OLDPWD" em > "$WORK/corpus-em.jsonl")
python3 "$DT/tools/moon/moon_gate3.py" "$SWISS_EPHE" "$WORK/multi-model.jsonl" "$WORK/multi-em.jsonl" "$WORK/corpus-model.jsonl" "$WORK/corpus-em.jsonl" > "$RES/step-1.4-gate3.json"

# 1.4 holdout, scored from its committed draw.
node --no-warnings "$DT/tools/moon/holdout-dump.mjs" "$RES/holdout-1.4.json" > "$WORK/holdout-dump.jsonl"
python3 "$DT/tools/holdout_score.py" "$RES/holdout-1.4.json" "$WORK/holdout-dump.jsonl" "$SWISS_EPHE" > "$RES/holdout-1.4-score.json"
python3 "$HERE/tools/holdout_events.py" "$RES/holdout-1.4.json" > "$RES/holdout-1.4-events.json"

# 1.4 gate 2 and 1.11, 1.7, 1.10.
node --no-warnings "$HERE/tools/receipts.mjs" "$RC7_ENGINE" > "$RES/receipts.json"
node --no-warnings "$HERE/tools/span.mjs" > "$RES/step-1.7.json"
node --no-warnings "$HERE/tools/crossings-s2.mjs" > "$RES/step-1.10.json"
node --no-warnings "$HERE/tools/provenance.mjs" "$RC7_ENGINE" > "$RES/provenance.json"
echo "done: $RES"
