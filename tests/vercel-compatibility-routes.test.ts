import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface RewriteRule {
  source: string;
  destination: string;
}

interface HeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

const config = JSON.parse(
  readFileSync(resolve(__dirname, '../vercel.json'), 'utf8'),
) as { rewrites?: RewriteRule[]; headers?: HeaderRule[] };

describe('Phase 4 compatibility routing', () => {
  it('preserves every public API path behind one deployed dispatcher', () => {
    expect(config.rewrites).toContainEqual({
      source: '/api/compatibility/:action',
      destination: '/api/compatibility?action=:action',
    });
    expect(config.rewrites).toContainEqual({
      source: '/c/:token/',
      destination: '/api/compatibility?action=invite-exchange&token=:token',
    });
  });

  it('keeps private invitation arrivals out of caches and search', () => {
    const invitationHeaders = config.headers?.find((rule) => rule.source === '/c/(.*)');
    expect(invitationHeaders?.headers).toEqual(expect.arrayContaining([
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ]));
  });
});
