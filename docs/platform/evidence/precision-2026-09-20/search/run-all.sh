#!/bin/sh
# Regenerate every artefact in this directory, in dependency order.
#
#   sh run-all.sh
#
# Nothing here writes outside /home/user/precision/search. The repository at
# /home/user/site is read only: the fixture, the v6 policy and the DE prototype
# module are loaded, never modified.
set -eu
cd "$(dirname "$0")"
mkdir -p raw

echo "== analytic suite (proven enclosures) =="
node test-analytic.mjs

echo "== reproduce the original failure =="
node reproduce.mjs > raw/reproduction.json

echo "== four-way decomposition and stationary audit =="
node decompose.mjs > raw/decomposition.json

echo "== the real Uranus D case under the new contract =="
node uranus-d.mjs > raw/uranus-d.json

echo "== done =="
ls -l raw
