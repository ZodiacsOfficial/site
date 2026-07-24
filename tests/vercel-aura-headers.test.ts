import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

const config = JSON.parse(
  readFileSync(resolve(__dirname, '../vercel.json'), 'utf8'),
) as { headers?: HeaderRule[] };

describe('Registry Collection response headers', () => {
  it('never sets Referrer-Policy: no-referrer on a page that POSTs same-origin', () => {
    // Fetch serializes the Origin header of a non-CORS POST as `null` when
    // the document's referrer policy is no-referrer, which would make
    // isAllowedWalletRequest reject every /api/aura-holdings call with 403.
    // `same-origin` keeps cross-origin privacy without nulling Origin.
    for (const rule of config.headers ?? []) {
      const appliesToAura =
        rule.source === '/(.*)' || rule.source.startsWith('/registry/collection');
      if (!appliesToAura) continue;
      for (const header of rule.headers) {
        if (header.key.toLowerCase() !== 'referrer-policy') continue;
        expect(
          header.value,
          `${rule.source} must not null the Origin header of Aura's own lookups`,
        ).not.toBe('no-referrer');
      }
    }
  });

  it('keeps a dedicated Aura policy that still limits cross-origin referrers', () => {
    const auraRule = (config.headers ?? []).find((rule) =>
      rule.source.startsWith('/registry/collection'),
    );
    const policy = auraRule?.headers.find(
      (header) => header.key.toLowerCase() === 'referrer-policy',
    );
    expect(policy?.value).toBe('same-origin');
  });
});
