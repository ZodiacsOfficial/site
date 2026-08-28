#!/usr/bin/env node
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function oneLine(value, label) {
  if (/\r|\n/u.test(value)) throw new Error(`${label} must be one line.`);
  return value;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function pgpass(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
}

function decode(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`${label} has invalid percent encoding.`);
  }
}

if (process.env.PG_CLIENT_URL) {
  throw new Error('Use PG_CLIENT_URL_FILE so the database URL is never inherited by child processes.');
}
const urlFile = oneLine(required('PG_CLIENT_URL_FILE'), 'PG_CLIENT_URL_FILE');
const rawUrl = readFileSync(urlFile, 'utf8').replace(/\r?\n$/u, '');
if (/\r|\n/u.test(rawUrl)) {
  throw new Error('Database URL file must contain exactly one line.');
}
let input;
try {
  input = new URL(rawUrl);
} catch {
  // Node's ERR_INVALID_URL includes its complete `input` value in the stack.
  // Replace it before it can disclose a password-bearing URL to CI logs.
  throw new Error('Database URL is invalid.');
}
if (input.protocol !== 'postgresql:' && input.protocol !== 'postgres:') {
  throw new Error('Database URL must use postgresql://.');
}
if (!input.hostname || !input.username || !input.password) {
  throw new Error('Database URL must include host, user, and password.');
}

const host = oneLine(input.hostname, 'Database host');
const port = oneLine(input.port || '5432', 'Database port');
const database = oneLine(decode(input.pathname.replace(/^\//u, ''), 'Database name') || 'postgres', 'Database name');
const user = oneLine(decode(input.username, 'Database user'), 'Database user');
const password = oneLine(decode(input.password, 'Database password'), 'Database password');
const sslmode = oneLine(input.searchParams.get('sslmode') || 'require', 'sslmode');
if (!/^(?:require|verify-ca|verify-full)$/u.test(sslmode)) {
  throw new Error('Database URL must require TLS (sslmode=require, verify-ca, or verify-full).');
}

if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65_535) {
  throw new Error('Database URL has an invalid port.');
}
if ([host, database, user].some((value) => value.includes('*'))) {
  throw new Error('Database connection fields cannot contain pgpass wildcards.');
}

const passfile = oneLine(required('PGPASSFILE'), 'PGPASSFILE');
const envFile = oneLine(required('PG_CLIENT_ENV_FILE'), 'PG_CLIENT_ENV_FILE');
const appName = oneLine(process.env.PG_CLIENT_APPNAME || 'zodiacs-backup', 'PG_CLIENT_APPNAME');
writeFileSync(
  passfile,
  `${[host, port, database, user, password].map(pgpass).join(':')}\n`,
  { mode: 0o600 },
);
chmodSync(passfile, 0o600);

const exports = [
  ['PGHOST', host],
  ['PGPORT', port],
  ['PGDATABASE', database],
  ['PGUSER', user],
  ['PGSSLMODE', sslmode],
  ['PGPASSFILE', passfile],
  ['PGCONNECT_TIMEOUT', '30'],
  ['PGAPPNAME', appName],
].map(([name, value]) => `export ${name}=${shellQuote(value)}`).join('\n');
writeFileSync(envFile, `${exports}\n`, { mode: 0o600 });
chmodSync(envFile, 0o600);
