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
snapshot_command_fifo="${backup_work_dir}/.snapshot-command"
snapshot_result_fifo="${backup_work_dir}/.snapshot-result"
backup_tar_command=""

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

for backup_command in pg_dump pg_restore psql gpg mkfifo; do
  if ! command -v "${backup_command}" >/dev/null 2>&1; then
    echo "${backup_command} is required." >&2
    exit 1
  fi
done

# macOS ships BSD tar as `tar`; Homebrew installs GNU tar as `gtar`. Archive
# member handling is part of the restore security boundary, so do not silently
# accept a tar implementation with different path/quoting semantics.
for backup_tar_candidate in gtar tar; do
  if command -v "${backup_tar_candidate}" >/dev/null 2>&1; then
    backup_tar_version="$("${backup_tar_candidate}" --version 2>/dev/null || true)"
    case "${backup_tar_version}" in
      *"GNU tar"*)
        backup_tar_command="${backup_tar_candidate}"
        break
        ;;
    esac
  fi
done
if [[ -z "${backup_tar_command}" ]]; then
  echo "GNU tar is required (install it as gtar on macOS)." >&2
  exit 1
fi
if [[ ! -d "${backup_output_dir}" ]]; then
  echo "Backup output directory does not exist." >&2
  exit 1
fi
if [[ -z "${BACKUP_PASSPHRASE_FILE:-}" || ! -f "${BACKUP_PASSPHRASE_FILE}" ]]; then
  echo "BACKUP_PASSPHRASE_FILE must name a protected regular file." >&2
  exit 1
fi

# Copy and validate the passphrase with shell builtins before spawning any
# child. Public workflow artifacts make this the sole confidentiality boundary:
# require one control-free line with 32..1024 bytes, while leaving entropy
# generation to the owner's password manager. The source file stays
# caller-owned; the private copy is opened only for GPG and unlinked
# immediately after the descriptor is established.
backup_passphrase=""
backup_passphrase_extra=""
backup_passphrase_extra_status=0
exec 7<"${BACKUP_PASSPHRASE_FILE}"
IFS= read -r backup_passphrase <&7 || true
IFS= read -r backup_passphrase_extra <&7 || backup_passphrase_extra_status=$?
exec 7<&-
if [[ -z "${backup_passphrase}" ]]; then
  echo "Backup passphrase file is empty." >&2
  exit 1
fi
if [[ "${backup_passphrase_extra_status}" -eq 0 || -n "${backup_passphrase_extra}" ]]; then
  echo "Backup passphrase must contain exactly one line." >&2
  exit 1
fi
if [[ "${backup_passphrase}" == *[[:cntrl:]]* ]]; then
  echo "Backup passphrase must not contain control bytes." >&2
  exit 1
fi
backup_passphrase_bytes="${#backup_passphrase}"
if [[ "${backup_passphrase_bytes}" -lt 32 || "${backup_passphrase_bytes}" -gt 1024 ]]; then
  echo "Backup passphrase must contain between 32 and 1024 bytes." >&2
  exit 1
fi
printf '%s\n' "${backup_passphrase}" > "${backup_passphrase_copy}"
chmod 0600 "${backup_passphrase_copy}"
unset backup_passphrase backup_passphrase_bytes backup_passphrase_extra \
  backup_passphrase_extra_status BACKUP_PASSPHRASE_FILE

# The configuration helper has already reduced the password-bearing URL to
# non-secret libpq fields plus a mode-0600 PGPASSFILE. Refuse fallback secret
# channels so database clients never inherit a URL or password environment.
if [[ -n "${SUPABASE_DB_URL:-}${PG_CLIENT_URL:-}${PGPASSWORD:-}${BACKUP_PASSPHRASE:-}" ]]; then
  echo "Use protected files; URL, password, and passphrase environments are not accepted." >&2
  exit 1
fi
for backup_connection_name in PGHOST PGPORT PGDATABASE PGUSER PGSSLMODE PGPASSFILE; do
  if [[ -z "${!backup_connection_name:-}" ]]; then
    echo "${backup_connection_name} is required." >&2
    exit 1
  fi
done
case "${PGSSLMODE}" in
  require|verify-ca|verify-full) ;;
  *)
    echo "PGSSLMODE must require TLS (require, verify-ca, or verify-full)." >&2
    exit 1
    ;;
esac

backup_pg_dump_version="$(pg_dump --version)"
if [[ ! "${backup_pg_dump_version}" =~ \(PostgreSQL\)[[:space:]]17\. ]]; then
  echo "PostgreSQL 17 client tools are required." >&2
  exit 1
fi

# Bash 3.2 has neither named coprocesses nor dynamic descriptor allocation.
# Two private FIFOs keep one psql transaction open while every dump imports its
# exported snapshot, and fixed descriptors keep the wrapper macOS-compatible.
mkfifo "${snapshot_command_fifo}" "${snapshot_result_fifo}"
psql -X --no-password --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 \
  < "${snapshot_command_fifo}" > "${snapshot_result_fifo}" &
snapshot_pid="$!"
exec 8>"${snapshot_command_fifo}"
exec 9<"${snapshot_result_fifo}"
rm -f -- "${snapshot_command_fifo}" "${snapshot_result_fifo}"

printf '%s\n' \
  'begin isolation level repeatable read read only;' \
  "select current_setting('server_version_num');" \
  'select pg_export_snapshot();' \
  >&8
IFS= read -r backup_server_version <&9
if [[ ! "${backup_server_version}" =~ ^17[0-9]{4}$ ]]; then
  echo "Backup source must run PostgreSQL 17." >&2
  exit 1
fi
IFS= read -r backup_snapshot <&9
if [[ ! "${backup_snapshot}" =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9A-Fa-f]+$ ]]; then
  echo "Could not export a PostgreSQL snapshot." >&2
  exit 1
fi

# MFA enrollment and SSO provider/domain configuration are durable security
# state. Until their full dependency graph is part of the ordered Auth dump,
# refuse to create an artifact that would silently omit non-empty tables.
psql \
  -X \
  --no-password \
  --quiet \
  --set ON_ERROR_STOP=1 \
  --set "backup_snapshot=${backup_snapshot}" \
  --file="${backup_script_dir}/db-backup-auth-boundary-snapshot.sql"

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
psql \
  -X \
  --no-password \
  --quiet \
  --tuples-only \
  --no-align \
  --set ON_ERROR_STOP=1 \
  --set "backup_snapshot=${backup_snapshot}" \
  --file="${backup_script_dir}/db-backup-public-schema-acl-snapshot.sql" \
  > "${backup_work_dir}/public-schema-acl.sql"

printf '%s\n' 'commit;' '\q' >&8
exec 8>&-
wait "${snapshot_pid}"
snapshot_pid=""
exec 9<&-

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

# Sequence values are outside MVCC snapshots. The manifest samples each value
# once after the data dump, and these appended setval calls deliberately
# override pg_dump's earlier sample so acceptance compares the exact state that
# the bundle restores. Application-owned identifiers are migration-controlled;
# fail closed instead of trying to quote an unexpected identifier in shell.
printf '\n-- Canonical sequence state sampled for restore acceptance.\n' \
  >> "${backup_work_dir}/application-data.sql"
while IFS='|' read -r sequence_record sequence_qualified_name \
  sequence_last_value sequence_is_called sequence_extra; do
  if [[ "${sequence_record}" != "sequence-state" ]]; then
    continue
  fi
  sequence_schema="${sequence_qualified_name%%.*}"
  sequence_name="${sequence_qualified_name#*.}"
  if [[ "${sequence_schema}" == "${sequence_qualified_name}" \
     || -n "${sequence_extra}" \
     || ! "${sequence_schema}" =~ ^[a-z_][a-z0-9_]*$ \
     || ! "${sequence_name}" =~ ^[a-z_][a-z0-9_]*$ \
     || ! "${sequence_last_value}" =~ ^-?[0-9]+$ \
     || ! "${sequence_is_called}" =~ ^[tf]$ ]]; then
    echo "Backup manifest contained an unsafe sequence-state record." >&2
    exit 1
  fi
  if [[ "${sequence_is_called}" == "t" ]]; then
    sequence_called_sql="true"
  else
    sequence_called_sql="false"
  fi
  printf "select pg_catalog.setval('%s.%s', %s, %s);\n" \
    "${sequence_schema}" \
    "${sequence_name}" \
    "${sequence_last_value}" \
    "${sequence_called_sql}" \
    >> "${backup_work_dir}/application-data.sql"
done < "${backup_work_dir}/source-manifest.txt"

backup_stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
{
  printf 'format=zodiacs-logical-backup-v2\n'
  printf 'created_at=%s\n' "${backup_stamp}"
  printf 'postgres_client=%s\n' "${backup_pg_dump_version}"
  printf 'postgres_server_major=17\n'
  printf 'snapshot=single-exported-repeatable-read\n'
  printf 'auth_data=users,identities\n'
  printf 'excluded_auth_data=sessions,refresh_tokens,audit,oauth_flow_state;required_empty=mfa,passkeys,sso,oauth_clients,oauth_consents,custom_oauth\n'
  printf 'application_schemas=public,plus-present-private-schemas\n'
  printf 'restore_order=application-pre,auth-users,auth-identities,application-data,application-post,public-schema-acl\n'
} > "${backup_work_dir}/BACKUP-METADATA.txt"

"${backup_tar_command}" -C "${backup_work_dir}" -czf "${backup_work_dir}/backup.tar.gz" \
  BACKUP-METADATA.txt \
  source-manifest.txt \
  application-pre.sql \
  auth-users.sql \
  auth-identities.sql \
  application-data.sql \
  application-post.sql \
  public-schema-acl.sql

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
