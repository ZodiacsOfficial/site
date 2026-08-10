import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

async function source(path) {
  return readFile(resolve(ROOT, path), 'utf8');
}

describe('Registry Pro public and capability posture', () => {
  it('keeps the quiet page noindexed, quote-only, and candid about risk', async () => {
    const html = await source('public/registry/pro/index.html');
    expect(html).toContain('<link rel="canonical" href="https://zodiacs.org/registry/pro/" />');
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).toMatch(/thinly traded/u);
    expect(html).toMatch(/lose all market value/u);
    expect(html).toMatch(/independent third-party observations/u);
    expect(html).toMatch(/Provider quotes are non-executable/u);
    expect(html).toMatch(/official Registry mint/u);
    expect(html).toMatch(/irreversible/u);
    expect(html).toMatch(/does not connect a wallet, build a transaction/u);
    expect(html).not.toMatch(/institutional.grade|best execution|order book/iu);
  });

  it('adds no acquisition link from the Registry hub or Cabinet', async () => {
    for (const path of ['public/registry/index.html', 'src/pages/registry/collection/index.astro']) {
      expect(await source(path)).not.toMatch(/registry\/pro|Registry Pro|Quote Laboratory/iu);
    }
  });

  it('allows browser market reads and same-origin quotes, never direct execution providers', async () => {
    const vercel = JSON.parse(await source('vercel.json'));
    const route = vercel.headers.find((entry) => entry.source === '/registry/pro/(.*)');
    expect(route).toBeTruthy();
    const headers = Object.fromEntries(route.headers.map((entry) => [entry.key, entry.value]));
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['X-Robots-Tag']).toContain('noindex');
    expect(headers['Content-Security-Policy']).toContain("connect-src 'self' https://api.dexscreener.com https://api.geckoterminal.com https://plausible.io");
    expect(headers['Content-Security-Policy']).not.toMatch(/jup\.ag|raydium|supabase/iu);
  });

  it('contains no transaction, signing, wallet, referral, or write-RPC implementation', async () => {
    const implementation = (await Promise.all([
      'src/pro/browser.mjs',
      'src/pro/catalog.mjs',
      'src/pro/terminal.mjs',
      'src/pro/execution/contracts.mjs',
      'src/pro/execution/coordinator.mjs',
      'src/pro/execution/jupiter-v2.mjs',
      'src/pro/execution/raydium.mjs',
      'src/pro/server/quote-gateway.mjs',
      'api/registry-pro-quotes.ts',
    ].map(source))).join('\n');
    expect(implementation).not.toMatch(/signTransaction|signMessage|sendTransaction|sendRawTransaction|wallet-adapter/iu);
    expect(implementation).not.toMatch(/\/execute\b|transaction\/swap-base-in|\/transaction\/swap/iu);
    expect(implementation).not.toMatch(/createClient\(|signInWithWeb3|SUPABASE_SERVICE_ROLE/iu);
    expect(implementation).toContain("'referrer', 'referralAccount', 'referralFee', 'feeBps'");
    expect(implementation).toContain('prepare: false');
    expect(implementation).toContain('sign: false');
    expect(implementation).toContain('submit: false');
  });

  it('pins the firewall instrument and bounded pilot in both owner controls and launch operations', async () => {
    const decision = await source('docs/REGISTRY-PRO-OWNER-RISK-DECISION.md');
    const runbook = await source('docs/REGISTRY-PRO-LAUNCH-RUNBOOK.md');
    for (const document of [decision, runbook]) {
      expect(document).toContain('registry-pro-quotes-v1');
      expect(document).toMatch(/12 requests per 60 seconds|12-request limit/u);
      expect(document).toMatch(/source.IP/u);
      expect(document).toMatch(/30 days/u);
    }
    expect(runbook).toMatch(/returns? `429`/u);
    expect(runbook).toMatch(/fixed window/u);
  });

  it('uses specific, prominent Jupiter product attribution and treats the license as a launch gate', async () => {
    const terminal = await source('src/pro/terminal.mjs');
    const decision = await source('docs/REGISTRY-PRO-OWNER-RISK-DECISION.md');
    const runbook = await source('docs/REGISTRY-PRO-LAUNCH-RUNBOOK.md');
    expect(terminal).toContain('Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode');
    expect(terminal).not.toContain("'Jupiter Swap V2'");
    for (const document of [decision, runbook]) {
      expect(document).toContain('SDK & API License Agreement');
      expect(document).toContain('written confirmation');
      expect(document).toContain('Powered by Jupiter');
      expect(document).toMatch(/legal operator|service's legal operator/u);
      expect(document).toMatch(/operating jurisdiction/u);
      expect(document).toMatch(/geographic or eligibility control/u);
    }
  });

});
