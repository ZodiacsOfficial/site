import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

describe('Astrofolio beginner buying guide', () => {
  it('maps all twelve choices to unique canonical Solana records', async () => {
    const [source, registry] = await Promise.all([
      read('src/pages/astrofolio/how-to-buy/index.astro'),
      read('public/registry/zodiacs.registry.json').then(JSON.parse),
    ]);

    expect(source).toContain("import registryJson from '../../../../public/registry/zodiacs.registry.json'");
    expect(source).toContain("representation.chain === 'solana'");
    expect(source).toContain("new Set(records.map((record) => record.mint)).size !== 12");
    expect(registry.assets).toHaveLength(12);
    expect(new Set(registry.assets.map((asset) => (
      asset.representations.find((representation) => representation.chain === 'solana')?.address
    ))).size).toBe(12);
    for (const sign of signs) {
      expect(source).toContain(`href={\`/astrofolio/how-to-buy/\${record.slug}/\`}`);
      expect(registry.assets.some((asset) => asset.sign === sign)).toBe(true);
    }
  });

  it('teaches wallet and network safety before the executable convenience tool', async () => {
    const source = await read('src/pages/astrofolio/how-to-buy/index.astro');
    const wallet = source.indexOf('id="wallet"');
    const funding = source.indexOf('id="fund-wallet"');
    const verify = source.indexOf('id="verify"');
    const review = source.indexOf('id="review"');
    const jupiter = source.indexOf('id="jupiter"');
    expect(wallet).toBeGreaterThan(-1);
    expect(funding).toBeGreaterThan(wallet);
    expect(verify).toBeGreaterThan(funding);
    expect(review).toBeGreaterThan(verify);
    expect(jupiter).toBeGreaterThan(review);
    expect(source).toContain('Public wallet address');
    expect(source).toContain('Recovery phrase or private key');
    expect(source).toContain('Choose USDC and the Solana network.');
    expect(source).toContain('Send a small test amount first.');
    expect(source).toContain('Keep a little SOL for fees.');
    expect(source).toContain('Transactions are generally irreversible.');
    expect(source).toContain('can lose all of its market value');
    expect(source).toContain('Copy verified address');
  });

  it('loads the existing Jupiter runtime only after an explicit click', async () => {
    const source = await read('src/pages/astrofolio/how-to-buy/index.astro');
    expect(source).toContain('Nothing has connected and no quote has been requested.');
    expect(source).toContain("loadButton?.addEventListener('click', revealTrade)");
    expect(source).toContain("script.src = '/assets/trade.js'");
    expect(source).toContain('window as TradeWindow).zodiacsTrade?.mount');
    expect(source).not.toContain('<script src="/assets/trade.js"');
    expect(source).not.toContain('plugin.jup.ag');
    expect(source).not.toMatch(/referralAccount|referralFee|platformFeeBps/u);
    expect(source).toContain('receives no referral or trading fee');
    expect(source).toContain('loadButton.disabled = true');
    expect(source).toContain('tradeInstance?.destroy?.()');
  });

  it('changes both hydrated and no-JS Astrofolio actions to the selected guide', async () => {
    const [app, shell] = await Promise.all([
      read('src/app.jsx'),
      read('public/astrofolio/index.html'),
    ]);
    expect(app).toContain('function howToBuyPath(sign)');
    expect(app).toContain('href={howToBuyPath(item)}');
    expect(app).toContain('>How to buy</a>');
    expect(shell.match(/href="\/astrofolio\/how-to-buy\/[a-z]+\/">How to buy<\/a>/gu)).toHaveLength(12);
    expect(shell.match(/<a\b[^>]*data-terminal-static-view="pro"/gu) ?? []).toHaveLength(0);
  });

  it('ships with a narrow no-store policy and an owner-approved boundary', async () => {
    const [config, worker, decision, siteMap] = await Promise.all([
      read('vercel.json').then(JSON.parse),
      read('public/sw.js'),
      read('docs/REGISTRY-TRADE-OWNER-RISK-DECISION.md'),
      read('docs/GAMES-SITE-MAP.md'),
    ]);
    const headers = config.headers.find((entry) => entry.source === '/astrofolio/how-to-buy/(.*)')?.headers ?? [];
    const header = (key) => headers.find((entry) => entry.key === key)?.value;
    expect(header('Cache-Control')).toBe('no-store');
    expect(header('X-Robots-Tag')).toContain('noindex');
    expect(header('Content-Security-Policy')).toContain('https://lite-api.jup.ag');
    expect(header('Content-Security-Policy')).toContain("frame-src 'none'");
    expect(worker).toContain("url.pathname.startsWith('/astrofolio/how-to-buy/')");
    expect(decision).toContain('Addendum — 2026-08-22: Astrofolio beginner guide and optional Jupiter tool');
    expect(decision).toContain('after an explicit visitor action');
    expect(decision).toContain('receives no referral or platform fee');
    expect(siteMap).toContain('`/terminal/markets/` and');
    expect(siteMap).toContain('`/astrofolio/how-to-buy/` may reach `lite-api.jup.ag`');
    expect(siteMap).not.toContain('only `/terminal/markets/` may reach');
  });

  it('uses an execution-aware footer and accurately discloses the direct venue flow', async () => {
    const [base, footer, privacy] = await Promise.all([
      read('src/layouts/Base.astro'),
      read('src/components/SiteFooter.astro'),
      read('src/pages/privacy/index.astro'),
    ]);

    const guide = await read('src/pages/astrofolio/how-to-buy/index.astro');
    expect(guide).toContain('terminalMarketNotice');
    expect(guide).toContain(':global(body:has(.buy-guide) .footer .email-capture--footer)');
    expect(guide).toContain(':global(body:has(.buy-guide) .footer__note) { display: none; }');
    expect(base).toContain('<SiteFooter locale={locale} terminalMarketNotice={props.terminalMarketNotice} />');
    expect(footer).toContain('const terminalMarketNotice = Boolean(Astro.props.terminalMarketNotice)');
    expect(privacy).toContain("const updated = '22 August 2026'");
    expect(privacy).toContain('live, taker-less quote from Jupiter');
    expect(privacy).toContain('public Solana address to Jupiter');
    expect(privacy).toContain('signed transaction and Jupiter request identifier');
    expect(privacy).toContain('Neither the public');
    expect(privacy).toContain('is sent to a Zodiacs.org server');
    expect(privacy).toContain('recovery phrase or private key');
  });
});
