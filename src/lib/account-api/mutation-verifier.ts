import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';

type Environment = Record<string, unknown>;

const MAX_KEYS = 4;
const MAX_KEY_VERSION = 1_000_000;
const KEY_BYTES = 32;

export class AccountMutationVerifierFailure extends Error {
  constructor() {
    super('Account mutation verification is unavailable.');
    this.name = 'AccountMutationVerifierFailure';
  }
}

export function accountDeletionRecoveryPreimage(
  requestId: string,
  recoverySecret: string,
): string {
  return [
    'zodiacs.account-delete-recovery.v1',
    `request_id=${requestId.toLowerCase()}`,
    `recovery_secret=${recoverySecret}`,
  ].join('\n');
}

function envValue(env: Environment, name: string): string {
  const candidate = env[name];
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function canonicalKey(input: unknown): Buffer | null {
  if (typeof input !== 'string' || input.length !== 44 || !/^[A-Za-z0-9+/]{43}=$/u.test(input)) {
    return null;
  }
  const decoded = Buffer.from(input, 'base64');
  return decoded.byteLength === KEY_BYTES && decoded.toString('base64') === input ? decoded : null;
}

function keyring(env: Environment): { active: number; keys: Map<number, Buffer> } {
  const activeRaw = envValue(env, 'ACCOUNT_SYNC_V2_ACTIVE_FINGERPRINT_KEY_VERSION');
  if (!/^[1-9]\d{0,5}$/u.test(activeRaw)) throw new AccountMutationVerifierFailure();
  const active = Number(activeRaw);
  if (active > MAX_KEY_VERSION) throw new AccountMutationVerifierFailure();

  let parsed: unknown;
  try {
    parsed = JSON.parse(envValue(env, 'ACCOUNT_SYNC_V2_FINGERPRINT_KEYS')) as unknown;
  } catch {
    throw new AccountMutationVerifierFailure();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AccountMutationVerifierFailure();
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length < 1 || entries.length > MAX_KEYS) throw new AccountMutationVerifierFailure();
  const keys = new Map<number, Buffer>();
  for (const [rawVersion, rawKey] of entries) {
    if (!/^[1-9]\d{0,5}$/u.test(rawVersion)) throw new AccountMutationVerifierFailure();
    const version = Number(rawVersion);
    const key = canonicalKey(rawKey);
    if (version > MAX_KEY_VERSION || !key || keys.has(version)) {
      throw new AccountMutationVerifierFailure();
    }
    keys.set(version, key);
  }
  if (!keys.has(active)) throw new AccountMutationVerifierFailure();
  return { active, keys };
}

/**
 * Returns active-first server-only HMAC verifiers. The database stores the
 * active value and may match any retained version on retry during rotation.
 */
export function accountMutationRequestVerifiers(
  canonicalPreimage: string,
  env: Environment = process.env,
): string[] {
  if (canonicalPreimage.length < 1 || Buffer.byteLength(canonicalPreimage, 'utf8') > 64 * 1024) {
    throw new AccountMutationVerifierFailure();
  }
  const { active, keys } = keyring(env);
  const versions = [active, ...[...keys.keys()].filter((version) => version !== active).sort((a, b) => a - b)];
  try {
    return versions.map((version) => {
      const key = keys.get(version);
      if (!key) throw new AccountMutationVerifierFailure();
      const digest = createHmac('sha256', key).update(canonicalPreimage, 'utf8').digest('hex');
      return `${version}:${digest}`;
    });
  } finally {
    for (const key of keys.values()) key.fill(0);
  }
}
