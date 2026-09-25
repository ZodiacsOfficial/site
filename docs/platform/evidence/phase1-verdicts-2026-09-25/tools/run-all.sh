#!/usr/bin/env bash
# Steps 1.2 (rule 1a), 1.3 (rule 1b), 1.8 (rule 1g) and 1.9 (rule 1h) of the engine brief's
# Phase 1, on the vendored @zodiacs/engine 0.1.1-rc.7: every command that produced a number in
# ../results/, in order, then summarize.mjs, which writes ../results/ from what the run left in
# WORK.
#
# Environment (default in brackets):
#   SITE_ROOT    the site repository [the root this folder sits in]
#   WORK         scratch output, outside the repository [${TMPDIR:-/tmp}/phase1-verdicts-2026-09-25]
#   SWISS_EPHE   directory with sepl_18.se1 and semo_18.se1 [$WORK/ephe]
#   JPL_KERNEL   de440s.bsp, for step 1.8's arbiter [$WORK/de440s.bsp]
#   PYTHON       Python 3.11 importing swisseph (pyswisseph 2.10.03), erfa (pyerfa 2.0.1.5),
#                numpy and jplephem 2.24; set PYTHONPATH if they live apart [python3]
#   ENGINE_REPO  optional checkout of zodiacs-org/engine, to compare its artifacts/ tarball
#   RESULTS      where summarize.mjs writes [../results]
#
# Reads the repository and writes nothing git tracks there, apart from summarize.mjs's
# results/; git status is compared before and after the measurements. (The site's own vitest
# run keeps its usual cache in node_modules/.vite.) Swiss Ephemeris output is an instrument
# reading: it is written only under WORK and never committed. About 3 minutes.
set -euo pipefail

T="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
absolute() { case "$1" in /*) echo "$1" ;; *) echo "$PWD/$1" ;; esac; }
# Absolute before export: some steps run from SITE_ROOT, and the tools resolve paths from their cwd.
SITE_ROOT="$(cd "${SITE_ROOT:-$T/../../../../..}" && pwd)"
WORK="$(absolute "${WORK:-${TMPDIR:-/tmp}/phase1-verdicts-2026-09-25}")"
SWISS_EPHE="$(absolute "${SWISS_EPHE:-$WORK/ephe}")"
JPL_KERNEL="$(absolute "${JPL_KERNEL:-$WORK/de440s.bsp}")"
export SITE_ROOT WORK SWISS_EPHE JPL_KERNEL
export PYTHONDONTWRITEBYTECODE=1   # no __pycache__ inside the repository
PY="${PYTHON:-python3}"
C=docs/platform/evidence/engine-beyond-swiss/corpora
step() { echo "[${SECONDS}s] $*" >&2; }

case "$WORK/" in
  "$SITE_ROOT"/*) echo "WORK ($WORK) is inside the repository ($SITE_ROOT)" >&2; exit 1 ;;
esac
for f in "$SWISS_EPHE/sepl_18.se1" "$SWISS_EPHE/semo_18.se1" "$JPL_KERNEL"; do
  test -f "$f" || { echo "missing $f (see SWISS_EPHE and JPL_KERNEL above)" >&2; exit 1; }
done
mkdir -p "$WORK"/{env,s12,s18/probe,s13/erfa-rebuild,s19}
git -C "$SITE_ROOT" status --porcelain > "$WORK/env/tree-status-before.txt"

step "0. Engine bytes and instrument identity"
rm -rf "$WORK/tgz" "$WORK/tgz-rc6" && mkdir -p "$WORK/tgz" "$WORK/tgz-rc6"
tar -xzf "$SITE_ROOT/vendor/zodiacs-engine-0.1.1-rc.7.tgz" -C "$WORK/tgz"
tar -xzf "$SITE_ROOT/vendor/zodiacs-engine-0.1.1-rc.6.tgz" -C "$WORK/tgz-rc6"
ln -sfn "$SITE_ROOT/node_modules" "$WORK/tgz-rc6/node_modules"      # astronomy-engine for the rc.6 control
diff -r "$WORK/tgz/package" "$SITE_ROOT/node_modules/@zodiacs/engine"   # installed == vendored rc.7 tarball
node "$T/env/provenance.mjs" > "$WORK/env/provenance-node.json"
"$PY" "$T/env/provenance.py" > "$WORK/env/provenance-py.json"

step "1.2: the 2024 Swiss scan (it must be the audit's file, as corpora/README.md names it), rc.7 against it, the sweeps"
"$PY" "$T/s12/swiss_scan_2024.py" > "$WORK/s12/swiss-scan.log"
scan="$(sha256sum < "$WORK/s12/swiss-2024.json" | cut -d' ' -f1)"
test "$scan" = 0dc4b21fc5cbc9b45ad3b31cbbbc5330a2b23bd017bd13d60cdba3e682af3dc0 \
  || { echo "swiss-2024.json is $scan, not the audit's 0dc4b21f...3dc0" >&2; exit 1; }
node "$T/s12/classify.mjs" > "$WORK/s12/classify.log"
node "$T/s12/set-aside.mjs" > "$WORK/s12/set-aside.json"
node "$T/s12/synthetic.mjs" > "$WORK/s12/synthetic.log"
node "$T/s12/verifier_sweep.mjs" > "$WORK/s12/verifier-sweep.log"
node "$T/s12/engine_own.mjs" > "$WORK/s12/engine-own.log"
node "$T/s12/engine-own-set-aside.mjs" > "$WORK/s12/engine-own-set-aside.json"

step "1.8: apsides and stations from Swiss (flags checked on every call), rc.7 speeds and flags, the DE440s arbiter"
"$PY" "$T/s18/swiss_apsides.py" > "$WORK/s18/swiss-apsides.log"
node "$T/s18/moon_engine.mjs" > "$WORK/s18/moon-engine.log"
"$PY" "$T/s18/moon_swiss.py" > "$WORK/s18/moon-swiss.log"
node "$T/s18/moon_compare.mjs" > "$WORK/s18/moon-compare.log"
node "$T/s18/rc6_baseline.mjs" > "$WORK/s18/rc6-baseline.log"
node "$T/s18/state_route.mjs" > "$WORK/s18/state-route.log"
node "$T/s18/self_derivative.mjs" > "$WORK/s18/self-derivative.log"
"$PY" "$T/s18/swiss_self_probe.py" > "$WORK/s18/probe/swiss-self-probe.log"
"$PY" "$T/s18/arbiter_moon.py" > "$WORK/s18/arbiter-moon.log"
node "$T/s18/arbiter_compare.mjs" > "$WORK/s18/arbiter-compare.log"
"$PY" "$T/s18/swiss_stations.py" > "$WORK/s18/swiss-stations.log"
node "$T/s18/engine_stations.mjs" > "$WORK/s18/engine-stations.log"
node "$T/s18/flags_hourly_engine.mjs" > "$WORK/s18/flags-hourly-engine.log"
"$PY" "$T/s18/flags_hourly_swiss.py" > "$WORK/s18/flags-hourly.log"

step "1.3 and 1.9: the site's computeChart on grids A and L, Swiss's readings, the ERFA arbiter rebuilt"
(cd "$SITE_ROOT" && npx vite-node --config "$T/vite.config.mjs" "$T/s13/engine_grids.mjs") > "$WORK/s13/engine-grids.log"
"$PY" "$T/s13/swiss_grids.py" > "$WORK/s13/swiss-grids.log"
(cd "$SITE_ROOT" && npx vite-node --script "$C/tools/angle-clock.ts") > "$WORK/s13/erfa-rebuild/angle-clock.json"
"$PY" "$SITE_ROOT/$C/tools/angle-arbiter.py" "$WORK/s13/erfa-rebuild/angle-clock.json" > "$WORK/s13/erfa-rebuild/angle-grid-erfa.json"
cmp "$WORK/s13/erfa-rebuild/angle-grid-erfa.json" "$SITE_ROOT/$C/angle-grid-erfa.json"   # the committed arbiter, byte for byte
"$PY" "$T/s13/compare13.py" > "$WORK/s13/compare13.log"
"$PY" "$T/s13/sidt_window_probe.py" > "$WORK/s13/sidt-window-probe.json"
node "$T/s13/rc6_control.mjs" > "$WORK/s13/rc6-control.json"
node "$T/s13/crosscheck_js.mjs" > "$WORK/s13/crosscheck-js.json"
(cd "$SITE_ROOT" && npx vitest run scripts/angles-grid.test.mjs --reporter=verbose) > "$WORK/s13/site-angles-grid-test.log" 2>&1
node "$T/s19/compare19.mjs" > "$WORK/s19/compare19.log"
"$PY" "$T/s19/erfa_inputs.py" > "$WORK/s19/erfa-inputs.log"
node "$T/s19/endtoend.mjs" > "$WORK/s19/endtoend.json"
node "$T/s13/extra_vectors_cusps.mjs" > "$WORK/s13/extra-vectors-cusps.json"
"$PY" "$T/s19/ladder_gains.py" > "$WORK/s19/ladder-gains.json"

step "The repository is untouched by the measurements"
git -C "$SITE_ROOT" status --porcelain > "$WORK/env/tree-status-after.txt"
cmp "$WORK/env/tree-status-before.txt" "$WORK/env/tree-status-after.txt"
(cd "$WORK" && find . -type f \( -name '*.json' -o -name '*.log' -o -name '*.txt' \) \
  -not -path './tgz/*' -not -path './tgz-rc6/*' | LC_ALL=C sort | xargs sha256sum > SHA256SUMS)

step "Statistics for results/"
node "$T/summarize.mjs"
step "done"
