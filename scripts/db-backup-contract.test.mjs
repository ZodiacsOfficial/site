import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('database backup and restore contract', () => {
  it('keeps credentials off argv and preserves snapshot, ACL, and atomic restore semantics', async () => {
    const [exporter, restore, workflow, manifest, acceptance, prelude] = await Promise.all([
      readFile(resolve(root, 'scripts/export-db-backup.sh'), 'utf8'),
      readFile(resolve(root, 'scripts/restore-db-backup.sh'), 'utf8'),
      readFile(resolve(root, '.github/workflows/db-backup.yml'), 'utf8'),
      readFile(resolve(root, 'scripts/db-backup-manifest.sql'), 'utf8'),
      readFile(resolve(root, 'scripts/db-restore-acceptance.sql'), 'utf8'),
      readFile(resolve(root, 'scripts/db-restore-prelude.sql'), 'utf8'),
    ]);

    expect(exporter).toContain('--pinentry-mode loopback');
    expect(exporter).toContain('--passphrase-fd 3');
    expect(exporter).not.toMatch(/--passphrase(?:=|\s)/u);
    expect(exporter).toContain('--snapshot="${backup_snapshot}"');
    expect(exporter.match(/--snapshot="\$\{backup_snapshot\}"/gu)).toHaveLength(3);
    expect(exporter).toContain('--set "backup_snapshot=${backup_snapshot}"');
    expect(exporter).toContain("private|living_chart_private)");
    expect(exporter).toContain('"${backup_schema_args[@]}"');
    expect(exporter).toContain('--schema=supabase_migrations');
    expect(exporter).not.toContain('--no-owner');
    expect(exporter).not.toContain('--no-privileges');
    expect(exporter).toContain('${BACKUP_PASSPHRASE:-}');
    expect(exporter.match(/--no-password/gu)?.length).toBeGreaterThanOrEqual(6);
    expect(exporter).not.toMatch(/pg_dump\s+["']?\$\{?(?:SUPABASE_DB_URL|PG_CLIENT_URL)/u);

    expect(restore).toContain('--pinentry-mode loopback');
    expect(restore).toContain('--passphrase-fd 3');
    expect(restore).not.toMatch(/--passphrase(?:=|\s)/u);
    expect(restore).toContain('production_project_ref="mftpcdpttteuwbolobye"');
    expect(restore).toContain('--single-transaction');
    expect(restore).toContain('--set ON_ERROR_STOP=1');
    expect(restore.match(/--no-password/gu)).toHaveLength(2);
    expect(restore).toContain('-X');
    expect(restore.indexOf('--file="auth-users.sql"')).toBeLessThan(
      restore.indexOf('--file="auth-identities.sql"'),
    );
    expect(restore.indexOf('--file="auth-identities.sql"')).toBeLessThan(
      restore.indexOf('--file="application-data.sql"'),
    );
    expect(restore).toContain('every restored user must reauthenticate');
    expect(manifest).toContain("'private', 'living_chart_private', 'supabase_migrations'");
    expect(manifest).not.toContain('default_acl.defaclnamespace = 0');
    expect(acceptance).toContain('requires an uninitialized migration ledger');
    expect(prelude).not.toMatch(/\bcascade\b/iu);

    expect(workflow).toContain('bash scripts/export-db-backup.sh');
    expect(workflow).not.toMatch(/pg_dump\s+["']?\$SUPABASE_DB_URL/u);
    expect(workflow).not.toMatch(/--passphrase(?:=|\s)/u);
  });

  it('converts a protected URL file into mode-0600 libpq files', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'zodiacs-pg-client-'));
    const urlFile = resolve(directory, 'url');
    const passfile = resolve(directory, 'pgpass');
    const envFile = resolve(directory, 'env');
    await writeFile(
      urlFile,
      'postgresql://postgres.test:dummy%3Avalue@db.test.supabase.co:5432/postgres?sslmode=require\n',
      { mode: 0o600 },
    );

    const result = spawnSync(
      process.execPath,
      [resolve(root, 'scripts/configure-pg-client.mjs')],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          PG_CLIENT_URL_FILE: urlFile,
          PGPASSFILE: passfile,
          PG_CLIENT_ENV_FILE: envFile,
        },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(passfile, 'utf8')).toBe(
      'db.test.supabase.co:5432:postgres:postgres.test:dummy\\:value\n',
    );
    expect((await stat(passfile)).mode & 0o777).toBe(0o600);
    expect((await stat(envFile)).mode & 0o777).toBe(0o600);
    expect(await readFile(envFile, 'utf8')).not.toContain('dummy');
  });

  it('rejects a decoded newline in the password', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'zodiacs-pg-client-newline-'));
    const urlFile = resolve(directory, 'url');
    await writeFile(
      urlFile,
      'postgresql://postgres.test:dummy%0Ainjected@db.test.supabase.co/postgres\n',
      { mode: 0o600 },
    );
    const result = spawnSync(
      process.execPath,
      [resolve(root, 'scripts/configure-pg-client.mjs')],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          PG_CLIENT_URL_FILE: urlFile,
          PGPASSFILE: resolve(directory, 'pgpass'),
          PG_CLIENT_ENV_FILE: resolve(directory, 'env'),
        },
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Database password must be one line.');
    expect(result.stderr).not.toContain('dummy');
  });

  it('redacts malformed password-bearing URL input from errors', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'zodiacs-pg-client-invalid-'));
    const urlFile = resolve(directory, 'url');
    await writeFile(urlFile, 'not-a-url-top-secret-password\n', { mode: 0o600 });
    const result = spawnSync(
      process.execPath,
      [resolve(root, 'scripts/configure-pg-client.mjs')],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          PG_CLIENT_URL_FILE: urlFile,
          PGPASSFILE: resolve(directory, 'pgpass'),
          PG_CLIENT_ENV_FILE: resolve(directory, 'env'),
        },
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Database URL is invalid.');
    expect(result.stderr).not.toContain('top-secret-password');
    expect(result.stderr).not.toContain('not-a-url');
  });
});
