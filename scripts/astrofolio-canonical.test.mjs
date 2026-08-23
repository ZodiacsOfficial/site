import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const currentCopyFiles = [
  'src/app.jsx',
  'src/strings/en.mjs',
  'src/strings/additions.es.mjs',
  'src/strings/additions.fr.mjs',
  'src/strings/additions.it.mjs',
  'src/strings/additions.pt.mjs',
  'src/pages/about/index.astro',
  'src/pages/terms/index.astro',
  'i18n-additions.md',
  'LISTINGS.md',
  'DESIGNER_HANDOFF.md',
  'ZODIAC-GAMES.md',
  'zodiacs-thesis-v4.md',
  'docs/STRATEGY.md',
  'public/astrofolio/index.html',
  'public/thesis/index.html',
  'public/sdk/index.html',
  'public/llms-full.txt',
];

describe('Astrofolio canonical surface', () => {
  it('permanently redirects both Astrofolio hostnames to the canonical page', async () => {
    const config = JSON.parse(await read('vercel.json'));
    const redirect = config.redirects.find(({ has = [] }) => (
      has.some(({ type, value }) => (
        type === 'host'
        && new RegExp(value).test('astrofolio.xyz')
        && new RegExp(value).test('www.astrofolio.xyz')
      ))
    ));

    expect(redirect).toMatchObject({
      source: '/:path(.*)',
      destination: 'https://zodiacs.org/astrofolio/',
      permanent: true,
    });
    expect(new RegExp(redirect.has[0].value).test('zodiacs.org')).toBe(false);
  });

  it('names zodiacs.org/astrofolio as the official consumer experience', async () => {
    const [sdk, guidance, reviewed] = await Promise.all([
      read('public/sdk/index.html'),
      read('public/llms-full.txt'),
      read('scripts/thesis-disclosure-reviewed.json'),
    ]);

    expect(sdk).toContain('"url": "https://zodiacs.org/astrofolio/"');
    expect(sdk).toContain('href="/astrofolio/"');
    expect(guidance).toContain('https://zodiacs.org/astrofolio/');
    expect(guidance).toContain('official consumer collection experience');
    expect(await read('public/astrofolio/index.html')).toContain('"dateModified": "2026-08-24"');
    expect(JSON.parse(reviewed).continuity).toEqual({
      value: 'Astrofolio at zodiacs.org/astrofolio · the official consumer collection experience',
      asOf: '2026-08-23',
      verifyUrl: 'https://zodiacs.org/astrofolio/',
    });
  });

  it('does not publish the retired separate-project description', async () => {
    const copies = await Promise.all(currentCopyFiles.map(async (path) => [path, await read(path)]));
    const retired = [
      /Astrofolio\.xyz is (?:a )?(?:related )?external consumer/i,
      /Astrofolio\.xyz is a separate website/i,
      /do not control Astrofolio\.xyz/i,
      /does not control Astrofolio\.xyz/i,
      /Astrofolio is a related but separate consumer product/i,
      /Astrofolio may be referenced subtly as a related experience/i,
    ];

    for (const [path, copy] of copies) {
      for (const pattern of retired) {
        expect(copy, `${path} still contains ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('keeps the redirecting domain out of live navigation and evidence links', async () => {
    const files = [
      'src/app.jsx',
      'public/assets/app.js',
      'public/astrofolio/index.html',
      'public/thesis/index.html',
      'public/thesis/thesis-disclosure.json',
    ];
    const copies = await Promise.all(files.map(async (path) => [path, await read(path)]));

    for (const [path, copy] of copies) {
      expect(copy, `${path} links to the redirect instead of its canonical page`)
        .not.toMatch(/https:\/\/astrofolio\.xyz\//i);
    }
  });
});
