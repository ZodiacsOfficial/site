#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C

phase6_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
phase6_repo_root="$(cd -- "${phase6_script_dir}/.." && pwd -P)"
phase6_database="zodiacs_phase6_test"
phase6_container_name="zodiacs-phase6-sql-$$-${RANDOM}-$(date -u +%s)"
phase6_container_id=""

cleanup_phase6_sql_container() {
  if [[ -n "${phase6_container_id}" ]]; then
    docker rm --force --volumes -- "${phase6_container_id}" >/dev/null 2>&1 || true
  fi
}

trap cleanup_phase6_sql_container EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

if ! command -v docker >/dev/null 2>&1; then
  echo "PostgreSQL 17 Phase 6 SQL tests require Docker." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "PostgreSQL 17 Phase 6 SQL tests require a running Docker daemon." >&2
  exit 1
fi

phase6_container_id="$(docker run \
  --detach \
  --rm \
  --name "${phase6_container_name}" \
  --env POSTGRES_DB="${phase6_database}" \
  --env POSTGRES_PASSWORD="phase6-local-test-only" \
  postgres:17
)"

phase6_ready="false"
for phase6_attempt in {1..60}; do
  if docker exec "${phase6_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --tuples-only \
      --username postgres \
      --dbname "${phase6_database}" \
      --command 'select 1' \
      >/dev/null 2>&1
  then
    phase6_ready="true"
    break
  fi
  sleep 1
done

if [[ "${phase6_ready}" != "true" ]]; then
  echo "PostgreSQL 17 did not become ready within 60 seconds." >&2
  docker logs "${phase6_container_id}" >&2 || true
  exit 1
fi

run_phase6_sql_file() {
  local phase6_sql_file="$1"
  echo "SQL test: ${phase6_sql_file#"${phase6_repo_root}/"}"
  docker exec --interactive "${phase6_container_id}" \
    psql \
      --no-psqlrc \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${phase6_database}" \
    < "${phase6_sql_file}"
}

run_phase6_sql_file "${phase6_repo_root}/supabase/tests/bootstrap.sql"

phase6_migrations=("${phase6_repo_root}"/supabase/migrations/*.sql)
if [[ ! -e "${phase6_migrations[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi

for phase6_migration in "${phase6_migrations[@]}"; do
  run_phase6_sql_file "${phase6_migration}"
done

# The migration is replay-safe: a reviewed SQL Editor retry cannot create
# duplicate tables, grants, or definer functions.
run_phase6_sql_file \
  "${phase6_repo_root}/supabase/migrations/20260727050000_phase6_assistant_quota.sql"

run_phase6_sql_file \
  "${phase6_repo_root}/supabase/migrations/20260727050000_phase6_assistant_quota.sql"

run_phase6_sql_file \
  "${phase6_repo_root}/supabase/tests/phase6_assistant_quota.sql"
echo "PostgreSQL 17 Phase 6 assistant-quota SQL tests passed."
