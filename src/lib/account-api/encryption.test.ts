import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SYNC_V2_ACTIVE_KEY_VERSION_ENV,
  ACCOUNT_SYNC_V2_ENCRYPTION_KEYS_ENV,
  AccountEncryptionFailure,
  decryptAccountDailySunAliasLocator,
  decryptAccountDeletionProviderPayload,
  decryptAccountPrivatePayload,
  encryptAccountDailySunAliasLocator,
  encryptAccountDeletionProviderPayload,
  encryptAccountPrivatePayload,
  type AccountEncryptedEnvelope,
} from './encryption.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHART_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_CHART_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_REQUEST_ID = '55555555-5555-4555-8555-555555555555';
const RECIPIENT_HASH = 'a'.repeat(64);
const OTHER_RECIPIENT_HASH = 'b'.repeat(64);
const KEY_1 = Buffer.alloc(32, 0x11).toString('base64');
const KEY_2 = Buffer.alloc(32, 0x22).toString('base64');
const PLAINTEXT = JSON.stringify({
    schema: 'zodiacs.account.private-chart.v1',
  date: '1990-01-01',
  time: '08:45',
  timeKnown: true,
  place: { name: 'Private', admin1: '', country: '', lat: 1, lon: 2, tz: 'Etc/UTC' },
});

const context = { userId: USER_ID, chartId: CHART_ID, revision: 1 };

function env(activeVersion = 1, includeFirst = true) {
  return {
    [ACCOUNT_SYNC_V2_ENCRYPTION_KEYS_ENV]: JSON.stringify({
      ...(includeFirst ? { 1: KEY_1 } : {}),
      2: KEY_2,
    }),
    [ACCOUNT_SYNC_V2_ACTIVE_KEY_VERSION_ENV]: String(activeVersion),
  };
}

function copyEnvelope(envelope: AccountEncryptedEnvelope): AccountEncryptedEnvelope {
  return {
    ...envelope,
    ciphertext: Buffer.from(envelope.ciphertext),
    nonce: Buffer.from(envelope.nonce),
    wrappedKey: Buffer.from(envelope.wrappedKey),
  };
}

describe('account birth-input envelope encryption', () => {
  it('uses a fresh data key and AES-GCM nonces without retaining plaintext in the envelope', () => {
    const first = encryptAccountPrivatePayload(PLAINTEXT, context, env());
    const second = encryptAccountPrivatePayload(PLAINTEXT, context, env());

    expect(first.format).toBe('opaque_v1');
    expect(first.keyScope).toBe('service');
    expect(first.keyVersion).toBe(1);
    expect(first.nonce).toHaveLength(12);
    expect(first.wrappedKey).toHaveLength(68);
    expect(first.ciphertext.equals(Buffer.from(PLAINTEXT, 'utf8'))).toBe(false);
    expect(first.nonce.equals(second.nonce)).toBe(false);
    expect(first.wrappedKey.equals(second.wrappedKey)).toBe(false);
    expect(decryptAccountPrivatePayload(first, context, env())).toBe(PLAINTEXT);
    expect(decryptAccountPrivatePayload(second, context, env())).toBe(PLAINTEXT);
  });

  it('binds both ciphertext layers to account, chart, and server revision through AAD', () => {
    const envelope = encryptAccountPrivatePayload(PLAINTEXT, context, env());

    expect(() => decryptAccountPrivatePayload(envelope, {
      ...context,
      chartId: OTHER_CHART_ID,
    }, env())).toThrow(AccountEncryptionFailure);
    expect(() => decryptAccountPrivatePayload(envelope, {
      ...context,
      revision: 2,
    }, env())).toThrow(AccountEncryptionFailure);
    expect(() => decryptAccountPrivatePayload(envelope, {
      ...context,
      userId: '44444444-4444-4444-8444-444444444444',
    }, env())).toThrow(AccountEncryptionFailure);
  });

  it.each(['ciphertext', 'nonce', 'wrappedKey'] as const)('rejects %s tampering', (field) => {
    const envelope = copyEnvelope(encryptAccountPrivatePayload(PLAINTEXT, context, env()));
    envelope[field][envelope[field].length - 1] ^= 0x01;
    expect(() => decryptAccountPrivatePayload(envelope, context, env())).toThrow(AccountEncryptionFailure);
  });

  it('decrypts old records during rotation and uses only the active version for new writes', () => {
    const oldEnvelope = encryptAccountPrivatePayload(PLAINTEXT, context, env(1));
    const newEnvelope = encryptAccountPrivatePayload(PLAINTEXT, { ...context, revision: 2 }, env(2));

    expect(oldEnvelope.keyVersion).toBe(1);
    expect(newEnvelope.keyVersion).toBe(2);
    expect(decryptAccountPrivatePayload(oldEnvelope, context, env(2))).toBe(PLAINTEXT);
    expect(decryptAccountPrivatePayload(newEnvelope, { ...context, revision: 2 }, env(2))).toBe(PLAINTEXT);
    expect(() => decryptAccountPrivatePayload(oldEnvelope, context, env(2, false)))
      .toThrow(AccountEncryptionFailure);
  });

  it.each([
    [{}, 'missing keyring'],
    [{
      [ACCOUNT_SYNC_V2_ENCRYPTION_KEYS_ENV]: JSON.stringify({ 1: Buffer.alloc(31).toString('base64') }),
      [ACCOUNT_SYNC_V2_ACTIVE_KEY_VERSION_ENV]: '1',
    }, 'wrong key size'],
    [{
      [ACCOUNT_SYNC_V2_ENCRYPTION_KEYS_ENV]: JSON.stringify({ 1: KEY_1 }),
      [ACCOUNT_SYNC_V2_ACTIVE_KEY_VERSION_ENV]: '2',
    }, 'missing active version'],
  ])('fails closed for an invalid configuration', (invalidEnv, _label) => {
    expect(() => encryptAccountPrivatePayload(PLAINTEXT, context, invalidEnv))
      .toThrow(AccountEncryptionFailure);
  });
});

describe('Daily Sun provider cleanup envelopes', () => {
  const aliasContext = { userId: USER_ID, recipientHash: RECIPIENT_HASH };
  const deletionContext = { requestId: REQUEST_ID, recipientHash: RECIPIENT_HASH };

  it('encrypts a canonical email locator without exposing it in either envelope layer', () => {
    const envelope = encryptAccountDailySunAliasLocator('person@example.com', aliasContext, env());
    const encoded = Buffer.concat([
      envelope.ciphertext,
      envelope.nonce,
      envelope.wrappedKey,
    ]).toString('utf8');

    expect(encoded).not.toContain('person@example.com');
    expect(decryptAccountDailySunAliasLocator(envelope, aliasContext, env()))
      .toBe('person@example.com');
  });

  it('binds a deletion payload to its request, recipient alias, and purpose', () => {
    const envelope = encryptAccountDeletionProviderPayload(
      'person@example.com',
      deletionContext,
      env(),
    );

    expect(decryptAccountDeletionProviderPayload(envelope, deletionContext, env()))
      .toBe('person@example.com');
    expect(() => decryptAccountDeletionProviderPayload(envelope, {
      ...deletionContext,
      requestId: OTHER_REQUEST_ID,
    }, env())).toThrow(AccountEncryptionFailure);
    expect(() => decryptAccountDeletionProviderPayload(envelope, {
      ...deletionContext,
      recipientHash: OTHER_RECIPIENT_HASH,
    }, env())).toThrow(AccountEncryptionFailure);
    expect(() => decryptAccountDailySunAliasLocator(envelope, aliasContext, env()))
      .toThrow(AccountEncryptionFailure);
  });

  it('supports retained-key rotation and rejects non-canonical email plaintext', () => {
    const oldEnvelope = encryptAccountDeletionProviderPayload(
      'person@example.com',
      deletionContext,
      env(1),
    );
    const currentEnvelope = encryptAccountDeletionProviderPayload(
      'person@example.com',
      deletionContext,
      env(2),
    );

    expect(decryptAccountDeletionProviderPayload(oldEnvelope, deletionContext, env(2)))
      .toBe('person@example.com');
    expect(decryptAccountDeletionProviderPayload(currentEnvelope, deletionContext, env(2)))
      .toBe('person@example.com');
    expect(() => encryptAccountDeletionProviderPayload(
      'Person@Example.com',
      deletionContext,
      env(),
    )).toThrow(AccountEncryptionFailure);
  });
});
