#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C

phase3_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
phase3_repo_root="$(cd -- "${phase3_script_dir}/.." && pwd -P)"
phase3_database="zodiacs_phase3_test"
phase3_container_name="zodiacs-phase3-sql-$$-${RANDOM}-$(date -u +%s)"
phase3_container_id=""

cleanup_phase3_sql_container() {
  if [[ -n "${phase3_container_id}" ]]; then
    docker rm --force --volumes -- "${phase3_container_id}" >/dev/null 2>&1 || true
  fi
}

trap cleanup_phase3_sql_container EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

if ! command -v docker >/dev/null 2>&1; then
  echo "PostgreSQL 17 SQL tests require Docker." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "PostgreSQL 17 SQL tests require a running Docker daemon." >&2
  exit 1
fi

phase3_container_id="$(docker run \
  --detach \
  --rm \
  --name "${phase3_container_name}" \
  --env POSTGRES_DB="${phase3_database}" \
  --env POSTGRES_PASSWORD="phase3-local-test-only" \
  postgres:17
)"

phase3_ready="false"
for phase3_attempt in {1..60}; do
  if docker exec "${phase3_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --tuples-only \
      --username postgres \
      --dbname "${phase3_database}" \
      --command 'select 1' \
      >/dev/null 2>&1
  then
    phase3_ready="true"
    break
  fi
  sleep 1
done

if [[ "${phase3_ready}" != "true" ]]; then
  echo "PostgreSQL 17 did not become ready within 60 seconds." >&2
  docker logs "${phase3_container_id}" >&2 || true
  exit 1
fi

run_phase3_sql_file() {
  local phase3_sql_file="$1"
  echo "SQL test: ${phase3_sql_file#"${phase3_repo_root}/"}"
  docker exec --interactive "${phase3_container_id}" \
    psql \
      --no-psqlrc \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${phase3_database}" \
    < "${phase3_sql_file}"
}

run_phase3_sql_file "${phase3_repo_root}/supabase/tests/bootstrap.sql"

phase3_migrations=("${phase3_repo_root}"/supabase/migrations/*.sql)
if [[ ! -e "${phase3_migrations[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi

for phase3_migration in "${phase3_migrations[@]}"; do
  run_phase3_sql_file "${phase3_migration}"
done

run_phase3_sql_file "${phase3_repo_root}/supabase/tests/phase3_habit_layer.sql"
run_phase3_sql_file "${phase3_repo_root}/supabase/tests/phase3_delivery_guards.sql"
run_phase3_sql_file "${phase3_repo_root}/supabase/tests/phase3_delivery_guards_concurrency.sql"

echo "PostgreSQL 17 Phase 3 SQL tests passed."
