import { describe, expect, it } from 'vitest';
import {
  parseNameStatus,
  protectedPathLabels,
  selectComparisonBase,
} from './phase1-scope-guard.mjs';

describe('Phase 1 protected-scope guard', () => {
  it('retains deletions and both sides of a rename', () => {
    expect(parseNameStatus([
      'D', 'src/content/guides/aries.mdx',
      'R100', 'src/pages/registry/aura/index.astro', 'src/pages/elsewhere/aura.astro',
      'A', 'src/pages/horoscopes/index.astro',
      '',
    ].join('\0'))).toEqual([
      'src/content/guides/aries.mdx',
      'src/pages/registry/aura/index.astro',
      'src/pages/elsewhere/aura.astro',
      'src/pages/horoscopes/index.astro',
    ]);
  });

  it.each([
    'src/app.jsx',
    'public/assets/app.js',
    'public/assets/art/registry-loop.mp4',
    'public/assets/og/v2/registry/aries.png',
    'public/assets/astrofolio/aries.png',
    'public/assets/cabinet-materials/black-onyx.webp',
    'public/assets/sdk/zodiac-icons/circle/aries.png',
    'public/assets/venues/observatory.webp',
    'api/aura-holdings.ts',
    'src/islands/RegistryAura.tsx',
    'src/islands/WalletChart.tsx',
    'src/islands/aura/AuraResult.tsx',
    'src/lib/aura/compose.ts',
    'src/lib/aura-share-card.ts',
    'src/lib/wallet/aura-connectors.ts',
    'src/styles/registry-aura.css',
    'src/strings/wallet-chart.ts',
    'src/data/aura-moon-ingresses.json',
    'src/content/guides/aries.mdx',
    'scripts/build-sign-pages.mjs',
    'scripts/sign-data.mjs',
    'src/pages/learn/index.astro',
    'src/strings/additions.fr.mjs',
    'src/data/es-guides.ts',
    'src/data/fr-guides.test.ts',
  ])('protects %s', (path) => {
    expect(protectedPathLabels(path)).not.toEqual([]);
  });

  it('allows the additive Phase 1 horoscope wing', () => {
    expect(protectedPathLabels('src/pages/horoscopes/aries/index.astro')).toEqual([]);
  });

  it('fails closed instead of falling back when an explicit base is empty or invalid', () => {
    expect(() => selectComparisonBase({ requested: '', explicit: true, verify: () => {} }))
      .toThrow(/cannot be empty/u);
    expect(() => selectComparisonBase({
      requested: 'missing-sha',
      explicit: true,
      verify: () => { throw new Error('missing'); },
    })).toThrow(/explicit comparison base is invalid: missing-sha/u);
  });

  it('uses an explicit valid base without consulting fallback refs', () => {
    const checked = [];
    expect(selectComparisonBase({
      requested: 'abc123',
      explicit: true,
      verify: (candidate) => checked.push(candidate),
    })).toBe('abc123');
    expect(checked).toEqual(['abc123']);
  });
});
