import { describe, expect, it } from 'vitest';
import {
  clearInviteCapabilityCookie,
  hasExactJsonContentType,
  inviteCapabilityCookie,
  inviteSessionHandle,
  requestBodyWithinLimit,
  setInviteCapabilityCookie,
} from './request';

describe('Phase 4 invite request boundary', () => {
  it('accepts JSON with a charset and rejects other media types', () => {
    expect(hasExactJsonContentType({ headers: { 'content-type': 'application/json; charset=utf-8' } }))
      .toBe(true);
    expect(hasExactJsonContentType({ headers: { 'content-type': 'text/plain' } })).toBe(false);
  });

  it('bounds parsed and raw request bodies', () => {
    expect(requestBodyWithinLimit({ headers: {}, body: { ok: true } })).toBe(true);
    expect(requestBodyWithinLimit({ headers: {}, body: 'x'.repeat(1_025) })).toBe(false);
    expect(requestBodyWithinLimit({
      headers: { 'content-length': '1025' },
      body: {},
    })).toBe(false);
  });

  it('uses a private, scoped, expiring HttpOnly cookie', () => {
    const firstHandle = 'A'.repeat(22);
    const secondHandle = 'B'.repeat(22);
    const cookie = setInviteCapabilityCookie(firstHandle, 'raw-capability-a', 120);
    expect(cookie).toContain(`zodiacs_compat_invite_${firstHandle}=raw-capability-a`);
    expect(cookie).toContain('Path=/api/compatibility');
    expect(cookie).toContain('Max-Age=120');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(clearInviteCapabilityCookie(firstHandle))
      .toContain(`zodiacs_compat_invite_${firstHandle}=`);
    expect(clearInviteCapabilityCookie(firstHandle)).toContain('Max-Age=0');
    expect(inviteCapabilityCookie({
      headers: {
        cookie: `other=1; zodiacs_compat_invite_${firstHandle}=raw-capability-a; zodiacs_compat_invite_${secondHandle}=raw-capability-b`,
      },
    }, firstHandle)).toBe('raw-capability-a');
    expect(inviteCapabilityCookie({
      headers: {
        cookie: `zodiacs_compat_invite_${firstHandle}=raw-capability-a; zodiacs_compat_invite_${secondHandle}=raw-capability-b`,
      },
    }, secondHandle)).toBe('raw-capability-b');
    expect(inviteCapabilityCookie({ headers: { cookie: cookie } }, 'malformed')).toBe('');
    expect(inviteSessionHandle({ query: { session: firstHandle } })).toBe(firstHandle);
    expect(inviteSessionHandle({ query: { session: [firstHandle, secondHandle] } })).toBe('');
    expect(inviteSessionHandle({ query: { session: 'malformed' } })).toBe('');
    expect(() => setInviteCapabilityCookie('malformed', 'secret', 120)).toThrow(/handle/u);
    expect(() => clearInviteCapabilityCookie('malformed')).toThrow(/handle/u);
  });
});
