#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C

e2e_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
e2e_repo_root="$(cd -- "${e2e_script_dir}/.." && pwd -P)"
e2e_source_database="zodiacs_backup_source"
e2e_target_database="zodiacs_backup_restore"
e2e_container_name="zodiacs-backup-restore-e2e-$$-${RANDOM}-$(date -u +%s)"
e2e_container_id=""
e2e_password="backup-e2e-local-only"
e2e_passphrase="backup-e2e-passphrase-local-only"

cleanup_backup_e2e_container() {
  if [[ -n "${e2e_container_id}" ]]; then
    docker rm --force --volumes -- "${e2e_container_id}" >/dev/null 2>&1 || true
  fi
}

trap cleanup_backup_e2e_container EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

if ! command -v docker >/dev/null 2>&1; then
  echo "The encrypted backup/restore E2E test requires Docker." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "The encrypted backup/restore E2E test requires a running Docker daemon." >&2
  exit 1
fi

e2e_container_id="$(docker run \
  --detach \
  --rm \
  --name "${e2e_container_name}" \
  --env POSTGRES_PASSWORD="${e2e_password}" \
  --entrypoint bash \
  postgres:17 \
  -c 'set -Eeuo pipefail
    openssl req -new -x509 -days 1 -nodes \
      -out /tmp/server.crt \
      -keyout /tmp/server.key \
      -subj /CN=localhost \
      >/dev/null 2>&1
    chown postgres:postgres /tmp/server.crt /tmp/server.key
    chmod 0600 /tmp/server.key
    exec /usr/local/bin/docker-entrypoint.sh postgres \
      -c ssl=on \
      -c ssl_cert_file=/tmp/server.crt \
      -c ssl_key_file=/tmp/server.key'
)"

e2e_ready="false"
for e2e_attempt in {1..60}; do
  if docker exec "${e2e_container_id}" \
    pg_isready --username postgres --dbname postgres >/dev/null 2>&1
  then
    e2e_ready="true"
    break
  fi
  sleep 1
done

if [[ "${e2e_ready}" != "true" ]]; then
  echo "PostgreSQL 17 did not become ready within 60 seconds." >&2
  docker logs "${e2e_container_id}" >&2 || true
  exit 1
fi

# Colima and Docker Desktop do not expose every macOS temporary directory for
# bind mounts. Copy the exact checkout into the disposable container instead.
docker cp "${e2e_repo_root}/." "${e2e_container_id}:/repo"

# The official PostgreSQL image supplies matching v17 client tools. Install
# only the two additional runtime dependencies used by the production wrappers.
docker exec "${e2e_container_id}" bash -c \
  'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq gnupg nodejs >/dev/null'

docker exec "${e2e_container_id}" \
  createdb --username postgres "${e2e_source_database}"
docker exec "${e2e_container_id}" \
  createdb --username postgres "${e2e_target_database}"

run_e2e_sql_file() {
  local e2e_database="$1"
  local e2e_file="$2"
  docker exec --interactive "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_database}" \
    < "${e2e_file}"
}

create_e2e_auth_identities() {
  local e2e_database="$1"
  docker exec --interactive "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_database}" <<'SQL'
create table auth.identities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  identity_data jsonb not null default '{}'::jsonb
);
create table auth.oauth_clients (
  id uuid primary key
);
create table auth.oauth_consents (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade
);
create table auth.instances (
  id uuid primary key
);
create table auth.schema_migrations (
  version text primary key
);
insert into auth.instances(id)
values ('00000000-0000-4000-8000-000000000010');
insert into auth.schema_migrations(version)
values ('managed-auth-baseline');

-- Representative excluded credential/flow tables. The restore-target guard
-- is catalog-driven, so every present Auth relation outside its narrow
-- managed allowlist must be empty before restore.
create table auth.sessions (id uuid primary key);
create table auth.refresh_tokens (id uuid primary key);
create table auth.flow_state (id uuid primary key);
create table auth.oauth_client_states (id uuid primary key);
create table auth.webauthn_challenges (id uuid primary key);
SQL
}

run_e2e_sql_file \
  "${e2e_source_database}" \
  "${e2e_repo_root}/supabase/tests/bootstrap.sql"
create_e2e_auth_identities "${e2e_source_database}"

e2e_migrations=("${e2e_repo_root}"/supabase/migrations/*.sql)
if [[ ! -e "${e2e_migrations[0]}" ]]; then
  echo "No Supabase migrations found." >&2
  exit 1
fi
for e2e_migration in "${e2e_migrations[@]}"; do
  run_e2e_sql_file "${e2e_source_database}" "${e2e_migration}"
done

docker exec --interactive "${e2e_container_id}" \
  psql \
    --no-psqlrc \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --username postgres \
    --dbname "${e2e_source_database}" <<'SQL'
create schema supabase_migrations authorization postgres;
create table supabase_migrations.schema_migrations (
  version text primary key,
  statements text[]
);
insert into supabase_migrations.schema_migrations(version, statements)
values ('20260827090000', array['weekly digest capability']);

insert into auth.users(id)
values ('00000000-0000-4000-8000-000000000001');
insert into auth.identities(id, user_id, provider, identity_data)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'email',
  '{"sub":"00000000-0000-4000-8000-000000000001"}'::jsonb
);
insert into public.profiles(user_id, digest_opt_in)
values ('00000000-0000-4000-8000-000000000001', true);
insert into public.charts(id, user_id, payload)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '{"name":"E2E chart"}'::jsonb
);
SQL

for e2e_durable_table in oauth_clients oauth_consents; do
  if [[ "${e2e_durable_table}" == "oauth_clients" ]]; then
    e2e_durable_insert="insert into auth.oauth_clients(id) values ('00000000-0000-4000-8000-000000000004')"
  else
    e2e_durable_insert="insert into auth.oauth_consents(id, user_id) values ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001')"
  fi
  docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_source_database}" \
      --command "${e2e_durable_insert}"
  if docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_source_database}" \
      --file=/repo/scripts/db-auth-durable-state-guard.sql \
      >/dev/null 2>&1
  then
    echo "Durable Auth guard accepted nonempty auth.${e2e_durable_table}." >&2
    exit 1
  fi
  docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_source_database}" \
      --command "delete from auth.${e2e_durable_table}"
done

printf '%s\n' "${e2e_passphrase}" | docker exec --interactive "${e2e_container_id}" \
  bash -c 'umask 077; dd of=/tmp/backup-passphrase status=none'
printf 'localhost:5432:%s:postgres:%s\n' "${e2e_source_database}" "${e2e_password}" \
  | docker exec --interactive "${e2e_container_id}" \
      bash -c 'umask 077; dd of=/tmp/backup-pgpass status=none'
docker exec "${e2e_container_id}" mkdir /tmp/backup-output

docker exec \
  --env BACKUP_OUTPUT_DIR=/tmp/backup-output \
  --env BACKUP_PASSPHRASE_FILE=/tmp/backup-passphrase \
  --env PGHOST=localhost \
  --env PGPORT=5432 \
  --env PGDATABASE="${e2e_source_database}" \
  --env PGUSER=postgres \
  --env PGPASSFILE=/tmp/backup-pgpass \
  --env PGSSLMODE=require \
  "${e2e_container_id}" \
  bash /repo/scripts/export-db-backup.sh

e2e_artifact="$(docker exec "${e2e_container_id}" \
  bash -c 'find /tmp/backup-output -maxdepth 1 -type f -name "zodiacs-db-*.tar.gz.gpg" -print -quit')"
if [[ -z "${e2e_artifact}" ]]; then
  echo "Encrypted backup artifact was not created." >&2
  exit 1
fi

run_e2e_sql_file \
  "${e2e_target_database}" \
  "${e2e_repo_root}/supabase/tests/bootstrap.sql"
create_e2e_auth_identities "${e2e_target_database}"

# Managed Auth configuration/migration rows are valid on a fresh Supabase
# project. Any excluded session, credential, challenge, flow, or future Auth
# relation with rows must fail closed before the destructive restore prompt.
run_e2e_sql_file \
  "${e2e_target_database}" \
  "${e2e_repo_root}/scripts/db-auth-restore-target-state-guard.sql"

for e2e_excluded_auth_table in \
  sessions \
  refresh_tokens \
  flow_state \
  oauth_client_states \
  webauthn_challenges
do
  docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_target_database}" \
      --command "insert into auth.${e2e_excluded_auth_table}(id) values ('00000000-0000-4000-8000-000000000020')"
  if docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_target_database}" \
      --file=/repo/scripts/db-auth-restore-target-state-guard.sql \
      >/dev/null 2>&1
  then
    echo "Fresh-target guard accepted residual auth.${e2e_excluded_auth_table} state." >&2
    exit 1
  fi
  docker exec "${e2e_container_id}" \
    psql \
      --no-psqlrc \
      --quiet \
      --set ON_ERROR_STOP=1 \
      --username postgres \
      --dbname "${e2e_target_database}" \
      --command "delete from auth.${e2e_excluded_auth_table}"
done

printf '%s\n%s\n%s\n' \
  "${e2e_passphrase}" \
  "postgresql://postgres:${e2e_password}@localhost:5432/${e2e_target_database}?sslmode=require" \
  'RESTORE' \
  | docker exec --interactive "${e2e_container_id}" \
      bash /repo/scripts/restore-db-backup.sh "${e2e_artifact}"

e2e_counts="$(docker exec "${e2e_container_id}" \
  psql \
    --no-psqlrc \
    --quiet \
    --tuples-only \
    --no-align \
    --username postgres \
    --dbname "${e2e_target_database}" \
    --command "select (select count(*) from auth.users) || '|' || (select count(*) from auth.identities) || '|' || (select count(*) from public.profiles) || '|' || (select count(*) from public.charts);")"

if [[ "${e2e_counts}" != "1|1|1|1" ]]; then
  echo "Unexpected restored counts: ${e2e_counts}" >&2
  exit 1
fi

echo "Encrypted PostgreSQL 17 backup/restore E2E passed: ${e2e_counts}"
