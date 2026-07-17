import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const signs = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

function compact(value) {
  return value.replace(/\s+/g, ' ');
}

describe('Registry risk and trust copy', () => {
  it('keeps loss and third-party transaction warnings beside acquisition in both canonical sources', async () => {
    const [landingSource, signSource] = await Promise.all([
      readFile(resolve(root, 'src/app.jsx'), 'utf8'),
      readFile(resolve(root, 'scripts/build-sign-pages.mjs'), 'utf8'),
    ]);

    for (const source of [landingSource, signSource]) {
      const text = compact(source);
      expect(text).toContain('independent third-party');
      expect(text).toContain('can lose all market value');
      expect(text).toContain('lose all money');
      expect(text).toContain('cannot be reversed');
      expect(text).toContain('Verify the official mint, network, amount, and destination');
      expect(text).toContain('/privacy/');
      expect(text).toContain('/terms/');
    }

    expect(compact(landingSource)).toContain('third-party onchain services');
    expect(landingSource).not.toContain('leading onchain apps');
    expect(compact(landingSource)).toContain('Operator and economic-interest statements remain pending confirmation');
    expect(compact(landingSource)).toContain('Shown in zodiac order');
    expect(landingSource).not.toContain('The Standings');
    expect(landingSource).not.toContain('aria-label="Rank"');
    expect(landingSource).not.toMatch(/\.sort\(\(a, b\) => \(b\.marketCap/);
    expect(signSource).not.toContain('Acquire via Jupiter');
  });

  it('keeps the generated Registry application aligned with its canonical source', async () => {
    const bundle = await readFile(resolve(root, 'public/assets/app.js'), 'utf8');
    expect(bundle).toContain('third-party onchain services');
    expect(bundle).toContain('can lose all market value');
    expect(bundle).toContain('could lose all money');
    expect(bundle).toContain('not government, regulator, wallet, or exchange approval');
    expect(bundle).toContain('Market snapshot');
    expect(bundle).toContain('Shown in zodiac order');
    expect(bundle).not.toContain('The Standings');
    expect(bundle).not.toContain('leading onchain apps');
  });

  it('keeps the static Registry fallback precise about official status, records, and outbound services', async () => {
    const html = compact(await readFile(resolve(root, 'public/registry/index.html'), 'utf8'));

    expect(html).toContain('“Official” means that an asset address appears in this Registry');
    expect(html).toContain('not government, regulator, wallet, or exchange approval');
    expect(html).toContain('value can fall to zero');
    expect(html).toContain('Acquisition links open independently operated third-party venues');
    expect(html).toContain('No purchase is required to use Registry Aura');
    expect(html).toContain('Public Record Lookup');
    expect(html).toContain('Never share a seed phrase or private key');
    expect(html).toContain('provenance pending');
    expect(html).toContain('Operator and economic-interest statements remain pending confirmation');
    expect(html).toContain('href="/privacy/"');
    expect(html).toContain('href="/terms/"');
    expect(html).not.toMatch(/Verified Ownership|public ownership|Read-only site/i);
  });

  it('regenerates all twelve catalogue pages with the same contextual boundary', async () => {
    for (const sign of signs) {
      const html = compact(await readFile(
        resolve(root, `public/registry/${sign}/index.html`),
        'utf8',
      ));
      expect(html, sign).toContain('Independent third-party data, not a valuation or recommendation');
      expect(html, sign).toContain('can lose all market value');
      expect(html, sign).toContain('could lose all money used to acquire a Zodiac');
      expect(html, sign).toContain('an onchain transaction that cannot be reversed');
      expect(html, sign).toContain('Open Jupiter route');
      expect(html, sign).toContain('View market data');
      expect(html, sign).toContain('This Registry page does not request custody, signing, approvals, or transactions');
      expect(html, sign).toContain('Operator and economic-interest statements remain pending confirmation');
      expect(html, sign).toContain('Date pending provenance');
      expect(html, sign).not.toContain('AD 2024');
      expect(html, sign).toContain('href="/privacy/"');
      expect(html, sign).toContain('href="/terms/"');
      expect(html, sign).not.toMatch(/Acquire via Jupiter|Read-only site|Hold what you are content to hold/i);
    }
  });

  it('keeps the optional Shelf on the minimized same-origin holdings endpoint', async () => {
    const [source, bundle, privacy] = await Promise.all([
      readFile(resolve(root, 'src/app.jsx'), 'utf8'),
      readFile(resolve(root, 'public/assets/app.js'), 'utf8'),
      readFile(resolve(root, 'src/pages/privacy/index.astro'), 'utf8'),
    ]);

    for (const value of [source, bundle]) {
      expect(value).toContain('/api/aura-holdings');
      expect(value).not.toContain('api.mainnet-beta.solana.com');
      expect(value).not.toContain('getTokenAccountsByOwner');
      expect(value).not.toContain('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    }
    expect(source).toContain('check only the twelve Registry mints');
    expect(privacy).toContain("Registry landing page's optional");
    expect(privacy).toContain('Dex Screener');
    expect(privacy).toContain('Wikimedia');
    expect(privacy).toContain('do not include a wallet address');
  });

  it('names the current blockchain-data provider in every privacy locale', async () => {
    // The Aura/Shelf lookup forwards the public address to a third party;
    // the disclosure must say WHICH third party, in every language, and
    // must be updated together with the production RPC configuration.
    for (const path of [
      'src/pages/privacy/index.astro',
      'src/pages/es/privacy/index.astro',
      'src/pages/fr/privacy/index.astro',
      'src/pages/it/privacy/index.astro',
      'src/pages/pt/privacy/index.astro',
    ]) {
      const html = await readFile(resolve(root, path), 'utf8');
      expect(html, path).toContain('PublicNode');
      expect(html, path).toContain('Allnodes');
    }
  });

  it('gives the Aura route a constrained browser connection policy', async () => {
    const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
    const route = config.headers.find((entry) => entry.source === '/registry/aura/(.*)');
    const csp = route?.headers?.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
    const referrer = route?.headers?.find((header) => header.key === 'Referrer-Policy')?.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://plausible.io");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("connect-src 'self' https://plausible.io");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/connect-src[^;]*\*/);
    // same-origin, never no-referrer: a no-referrer document policy makes the
    // browser serialize Origin as `null` on the page's own same-origin POSTs,
    // which the endpoint's CSRF gate must reject — the page would 403 itself.
    expect(referrer).toBe('same-origin');
  });
});
