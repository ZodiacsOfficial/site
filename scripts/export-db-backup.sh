#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C
umask 077

backup_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
backup_repo_root="$(cd -- "${backup_script_dir}/.." && pwd -P)"
backup_output_dir="${BACKUP_OUTPUT_DIR:-${backup_repo_root}}"
backup_work_dir="$(mktemp -d)"
backup_passphrase_copy="${backup_work_dir}/.backup-passphrase"
snapshot_pid=""

cleanup_backup() {
  if [[ -n "${snapshot_pid}" ]]; then
    kill "${snapshot_pid}" >/dev/null 2>&1 || true
    wait "${snapshot_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${backup_work_dir}" && "${backup_work_dir}" != "/" && -d "${backup_work_dir}" ]]; then
    rm -rf -- "${backup_work_dir}"
  fi
}

trap cleanup_backup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

for backup_command in pg_dump pg_restore psql gpg tar; do
  if ! command -v "${backup_command}" >/dev/null 2>&1; then
    echo "${backup_command} is required." >&2
    exit 1
  fi
done
if [[ ! -d "${backup_output_dir}" ]]; then
  echo "Backup output directory does not exist." >&2
  exit 1
fi
if [[ -z "${BACKUP_PASSPHRASE_FILE:-}" || ! -f "${BACKUP_PASSPHRASE_FILE}" ]]; then
  echo "BACKUP_PASSPHRASE_FILE must name a protected regular file." >&2
  exit 1
fi

# Copy the passphrase with shell builtins before spawning any child. The source
# file stays caller-owned; the private copy is opened only for GPG and unlinked
# immediately after the descriptor is established.
backup_passphrase=""
IFS= read -r backup_passphrase < "${BACKUP_PASSPHRASE_FILE}" || true
if [[ -z "${backup_passphrase}" ]]; then
  echo "Backup passphrase file is empty." >&2
  exit 1
fi
printf '%s\n' "${backup_passphrase}" > "${backup_passphrase_copy}"
chmod 0600 "${backup_passphrase_copy}"
unset backup_passphrase BACKUP_PASSPHRASE_FILE

# The configuration helper has already reduced the password-bearing URL to
# non-secret libpq fields plus a mode-0600 PGPASSFILE. Refuse fallback secret
# channels so database clients never inherit a URL or password environment.
if [[ -n "${SUPABASE_DB_URL:-}${PG_CLIENT_URL:-}${PGPASSWORD:-}${BACKUP_PASSPHRASE:-}" ]]; then
  echo "Use protected files; URL, password, and passphrase environments are not accepted." >&2
  exit 1
fi
for backup_connection_name in PGHOST PGPORT PGDATABASE PGUSER PGPASSFILE; do
  if [[ -z "${!backup_connection_name:-}" ]]; then
    echo "${backup_connection_name} is required." >&2
    exit 1
  fi
done

backup_pg_dump_version="$(pg_dump --version)"
if [[ ! "${backup_pg_dump_version}" =~ \(PostgreSQL\)[[:space:]]17\. ]]; then
  echo "PostgreSQL 17 client tools are required." >&2
  exit 1
fi

coproc BACKUP_SNAPSHOT_SESSION {
  psql -X --no-password --quiet --tuples-only --no-align --set ON_ERROR_STOP=1
}
snapshot_pid="${BACKUP_SNAPSHOT_SESSION_PID}"
snapshot_read_fd="${BACKUP_SNAPSHOT_SESSION[0]}"
snapshot_write_fd="${BACKUP_SNAPSHOT_SESSION[1]}"

printf '%s\n' \
  'begin isolation level repeatable read read only;' \
  "select current_setting('server_version_num');" \
  'select pg_export_snapshot();' \
  >&"${snapshot_write_fd}"
IFS= read -r backup_server_version <&"${snapshot_read_fd}"
if [[ ! "${backup_server_version}" =~ ^17[0-9]{4}$ ]]; then
  echo "Backup source must run PostgreSQL 17." >&2
  exit 1
fi
IFS= read -r backup_snapshot <&"${snapshot_read_fd}"
if [[ ! "${backup_snapshot}" =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9A-Fa-f]+$ ]]; then
  echo "Could not export a PostgreSQL snapshot." >&2
  exit 1
fi

# Discover optional application-owned private schemas inside the held snapshot.
# They are currently unreleased in production, but the backup automatically
# begins covering them in the same snapshot if a later authorized migration
# creates them.
psql \
  -X \
  --no-password \
  --quiet \
  --tuples-only \
  --no-align \
  --set ON_ERROR_STOP=1 \
  --set "backup_snapshot=${backup_snapshot}" \
  --file="${backup_script_dir}/db-backup-owned-schemas-snapshot.sql" \
  > "${backup_work_dir}/owned-schemas.txt"

backup_schema_args=(--schema=public --schema=supabase_migrations)
while IFS= read -r backup_owned_schema; do
  case "${backup_owned_schema}" in
    private|living_chart_private)
      backup_schema_args+=(--schema="${backup_owned_schema}")
      ;;
    '')
      ;;
    *)
      echo "Unexpected application schema discovery result." >&2
      exit 1
      ;;
  esac
done < "${backup_work_dir}/owned-schemas.txt"

# All application, Auth identity, migration-ledger, and manifest reads import
# the same held snapshot. No dump suppresses owners or privileges: application
# post-data must replay the exact SECURITY DEFINER and ACL contract.
pg_dump \
  --no-password \
  --format=custom \
  --strict-names \
  "${backup_schema_args[@]}" \
  --snapshot="${backup_snapshot}" \
  --file="${backup_work_dir}/application.dump"
pg_dump \
  --no-password \
  --format=custom \
  --strict-names \
  --data-only \
  --table=auth.users \
  --snapshot="${backup_snapshot}" \
  --file="${backup_work_dir}/auth-users.dump"
pg_dump \
  --no-password \
  --format=custom \
  --strict-names \
  --data-only \
  --table=auth.identities \
  --snapshot="${backup_snapshot}" \
  --file="${backup_work_dir}/auth-identities.dump"
psql \
  -X \
  --no-password \
  --quiet \
  --tuples-only \
  --no-align \
  --set ON_ERROR_STOP=1 \
  --set "backup_snapshot=${backup_snapshot}" \
  --file="${backup_script_dir}/db-backup-manifest-snapshot.sql" \
  > "${backup_work_dir}/source-manifest.txt"

printf '%s\n' 'commit;' '\q' >&"${snapshot_write_fd}"
exec {snapshot_write_fd}>&-
wait "${snapshot_pid}"
snapshot_pid=""
exec {snapshot_read_fd}<&-

# Generate, rather than hand-edit, ordered plain-SQL restore sections.
pg_restore --section=pre-data --file="${backup_work_dir}/application-pre.sql" \
  "${backup_work_dir}/application.dump"
pg_restore --section=data --file="${backup_work_dir}/application-data.sql" \
  "${backup_work_dir}/application.dump"
pg_restore --section=post-data --file="${backup_work_dir}/application-post.sql" \
  "${backup_work_dir}/application.dump"
pg_restore --data-only --file="${backup_work_dir}/auth-users.sql" \
  "${backup_work_dir}/auth-users.dump"
pg_restore --data-only --file="${backup_work_dir}/auth-identities.sql" \
  "${backup_work_dir}/auth-identities.dump"

backup_stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
{
  printf 'format=zodiacs-logical-backup-v2\n'
  printf 'created_at=%s\n' "${backup_stamp}"
  printf 'postgres_client=%s\n' "${backup_pg_dump_version}"
  printf 'postgres_server_major=17\n'
  printf 'snapshot=single-exported-repeatable-read\n'
  printf 'auth_data=users,identities\n'
  printf 'excluded_auth_data=sessions,refresh_tokens,mfa,sso,audit\n'
  printf 'application_schemas=public,plus-present-private-schemas\n'
  printf 'restore_order=application-pre,auth-users,auth-identities,application-data,application-post\n'
} > "${backup_work_dir}/BACKUP-METADATA.txt"

tar -C "${backup_work_dir}" -czf "${backup_work_dir}/backup.tar.gz" \
  BACKUP-METADATA.txt \
  source-manifest.txt \
  application-pre.sql \
  auth-users.sql \
  auth-identities.sql \
  application-data.sql \
  application-post.sql

backup_artifact="${backup_output_dir}/zodiacs-db-${backup_stamp}.tar.gz.gpg"
exec 3<"${backup_passphrase_copy}"
rm -f -- "${backup_passphrase_copy}"
gpg \
  --batch \
  --yes \
  --pinentry-mode loopback \
  --no-symkey-cache \
  --symmetric \
  --cipher-algo AES256 \
  --passphrase-fd 3 \
  --output "${backup_artifact}" \
  "${backup_work_dir}/backup.tar.gz"
exec 3<&-

printf 'Encrypted backup created: %s\n' "$(basename -- "${backup_artifact}")"
