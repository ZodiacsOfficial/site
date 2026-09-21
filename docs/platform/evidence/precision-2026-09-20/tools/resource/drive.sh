#!/bin/sh
# Interleaved rounds. Which system goes first alternates, so thermal drift and
# any background load fall on both sides rather than on whichever ran last.
set -eu
D="$(dirname "$0")"
EPHE=/tmp/claude-0/swisslab/ephe
KERNEL=/tmp/claude-0/swisslab/de440s.bsp
PY=/tmp/claude-0/swisslab/venv/bin/python3
OUT="${1:-/home/user/precision/lab/raw/resource-rounds.jsonl}"
REPS="${2:-300}"
ROUNDS="${3:-8}"
: > "$OUT"
r=1
while [ "$r" -le "$ROUNDS" ]; do
  if [ $((r % 2)) -eq 1 ]; then
    "$PY" "$D/bench_swiss.py" "$EPHE" "$r" "$REPS" >> "$OUT"
    node "$D/bench-zodiacs.mjs" core - "$r" "$REPS" >> "$OUT"
    node "$D/bench-zodiacs.mjs" core-lonly - "$r" "$REPS" >> "$OUT"
    node "$D/bench-zodiacs.mjs" prototype "$KERNEL" "$r" "$REPS" >> "$OUT"
  else
    node "$D/bench-zodiacs.mjs" prototype "$KERNEL" "$r" "$REPS" >> "$OUT"
    node "$D/bench-zodiacs.mjs" core-lonly - "$r" "$REPS" >> "$OUT"
    node "$D/bench-zodiacs.mjs" core - "$r" "$REPS" >> "$OUT"
    "$PY" "$D/bench_swiss.py" "$EPHE" "$r" "$REPS" >> "$OUT"
  fi
  r=$((r + 1))
done
echo "wrote $OUT"
