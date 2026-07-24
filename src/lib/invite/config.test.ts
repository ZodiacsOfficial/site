import { describe, expect, it } from 'vitest';
import {
  compatibilityInviteBaseUrl,
  compatibilityInviteCreationEnabled,
  compatibilityInviteUserAllowed,
  hasCompatibilityInviteContract,
} from './config';
import {
  compatibilityInviteTokenHash,
  constantTimeSecretMatch,
  createCompatibilityInviteSessionHandle,
  createCompatibilityInviteToken,
  validCompatibilityInviteSessionHandle,
} from './token';

const USER = '110e8400-e29b-41d4-a716-446655440000';

describe('Phase 4 invite configuration and token boundary', () => {
  it('fails closed until the complete server contract and exact flag exist', () => {
    const base = {
      PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
    expect(hasCompatibilityInviteContract(base)).toBe(true);
    expect(compatibilityInviteCreationEnabled(base)).toBe(false);
    expect(compatibilityInviteCreationEnabled({ ...base, COMPAT_INVITES_ENABLED: '1' })).toBe(true);
    expect(compatibilityInviteCreationEnabled({
      ...base,
      PUBLIC_SUPABASE_URL: 'http://project.invalid',
      COMPAT_INVITES_ENABLED: '1',
    })).toBe(false);
  });

  it('fails closed without a canary allowlist and permits only named users', () => {
    expect(compatibilityInviteUserAllowed(USER, {})).toBe(false);
    expect(compatibilityInviteUserAllowed(USER, {
      COMPAT_INVITE_TEST_USER_IDS: `220e8400-e29b-41d4-a716-446655440000, ${USER}`,
    })).toBe(true);
    expect(compatibilityInviteUserAllowed(USER, {
      COMPAT_INVITE_TEST_USER_IDS: '220e8400-e29b-41d4-a716-446655440000',
    })).toBe(false);
  });

  it('mints exactly 256-bit base64url secrets and hashes them deterministically', () => {
    const first = createCompatibilityInviteToken();
    const second = createCompatibilityInviteToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).not.toBe(first);
    expect(compatibilityInviteTokenHash(first)).toMatch(/^[0-9a-f]{64}$/u);
    expect(compatibilityInviteTokenHash('not-a-token')).toBeNull();
  });

  it('mints a separate non-secret 128-bit handle for each browser session', () => {
    const first = createCompatibilityInviteSessionHandle();
    const second = createCompatibilityInviteSessionHandle();
    expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(second).not.toBe(first);
    expect(validCompatibilityInviteSessionHandle(first)).toBe(true);
    expect(validCompatibilityInviteSessionHandle('malformed')).toBe(false);
    expect(validCompatibilityInviteSessionHandle(createCompatibilityInviteToken())).toBe(false);
  });

  it('compares sweep secrets without a prefix or length shortcut', () => {
    const secret = 's'.repeat(32);
    expect(constantTimeSecretMatch(secret, secret)).toBe(true);
    expect(constantTimeSecretMatch(`${secret}x`, secret)).toBe(false);
    expect(constantTimeSecretMatch('x'.repeat(32), secret)).toBe(false);
  });

  it('accepts only HTTPS invite origins', () => {
    expect(compatibilityInviteBaseUrl({})).toBe('https://zodiacs.org');
    expect(() => compatibilityInviteBaseUrl({
      COMPAT_INVITE_BASE_URL: 'http://zodiacs.org',
    })).toThrow(/HTTPS/u);
  });
});
