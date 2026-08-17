#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C

games_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
games_repo_root="$(cd -- "${games_script_dir}/.." && pwd -P)"
games_database="zodiacs_games_test"
games_container_name="zodiacs-games-sql-$$-${RANDOM}-$(date -u +%s)"
games_container_id=""

cleanup_games_sql_container() {
  if [[ -n "${games_container_id}" ]]; then
    docker rm --force --volumes -- "${games_container_id}" >/dev/null 2>&1 || true
  fi
}

trap cleanup_games_sql_container EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

if ! command -v docker >/dev/null 2>&1; then
  echo "PostgreSQL 17 Zodiac Games SQL tests require Docker." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "PostgreSQL 17 Zodiac Games SQL tests require a running Docker daemon." >&2
  exit 1
fi

games_container_id="$(docker run \
  --detach \
  --rm \
  --name "${games_container_name}" \
  --env POSTGRES_DB="${games_database}" \
  --env POSTGRES_PASSWORD="games-local-test-only" \
  postgres:17
)"

games_ready="false"
for games_attempt in {1..60}; do
  if docker exec "${games_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --tuples-only \
      --username postgres \
      --dbname "${games_database}" \
      --command 'select 1' \
      >/dev/null 2>&1
  then
    games_ready="true"
    break
  fi
  sleep 1
done

if [[ "${games_ready}" != "true" ]]; then
  echo "PostgreSQL 17 did not become ready within 60 seconds." >&2
  docker logs "${games_container_id}" >&2 || true
  exit 1
fi

run_games_sql_file() {
  local games_sql_file="$1"
  echo "SQL test [${games_database}]: ${games_sql_file#"${games_repo_root}/"}"
  docker exec --interactive "${games_container_id}" \
    psql \
      --no-psqlrc \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${games_database}" \
    < "${games_sql_file}"
}

run_games_sql_file "${games_repo_root}/supabase/tests/bootstrap.sql"

games_migrations=("${games_repo_root}"/supabase/migrations/*.sql)
if [[ ! -e "${games_migrations[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi

for games_migration in "${games_migrations[@]}"; do
  run_games_sql_file "${games_migration}"
done

# The migration is replay-safe: a reviewed SQL Editor retry cannot create
# duplicate tables, grants, or definer functions.
run_games_sql_file \
  "${games_repo_root}/supabase/migrations/20260817080000_zodiac_games.sql"

run_games_sql_file \
  "${games_repo_root}/supabase/migrations/20260817080000_zodiac_games.sql"

run_games_sql_file "${games_repo_root}/supabase/tests/zodiac_games.sql"

run_games_sql_file "${games_repo_root}/supabase/tests/zodiac_games_concurrency.sql"

echo "PostgreSQL 17 Zodiac Games SQL tests passed."
