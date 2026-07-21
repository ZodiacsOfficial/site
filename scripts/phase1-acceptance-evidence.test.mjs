import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { phase1TemplateSourceSha256, sha256 } from '../tests/visual/phase1-evidence-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceRoot = resolve(root, 'docs/acceptance/phase1');
const expectedTemplates = new Map([
  ['today', '/today/'],
  ['horoscopes-hub', '/horoscopes/'],
  ['daily', '/horoscopes/aries/'],
  ['tomorrow', '/horoscopes/aries/tomorrow/'],
  ['weekly', '/horoscopes/aries/weekly/'],
  ['monthly', '/horoscopes/aries/monthly/'],
  ['love', '/horoscopes/aries/love/'],
  ['career', '/horoscopes/aries/career/'],
  ['yearly', '/horoscopes/aries/2027/'],
]);
const expectedViewports = new Map([
  [360, 800],
  [1280, 900],
]);

function pngDimensions(bytes) {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe('Phase 1 durable acceptance evidence', () => {
  it('contains exact 360px and 1280px captures for every new template', async () => {
    const manifest = JSON.parse(
      await readFile(resolve(evidenceRoot, 'screenshots/manifest.json'), 'utf8'),
    );
    const playwrightPackage = JSON.parse(
      await readFile(resolve(root, 'node_modules/playwright-core/package.json'), 'utf8'),
    );

    expect(manifest.schema).toBe('zodiacs.phase1-visual-acceptance.v3');
    expect(manifest.driver).toEqual({
      name: 'playwright-core',
      version: playwrightPackage.version,
      script: 'tests/phase1-acceptance-drive.mjs',
      contractVersion: 3,
    });
    expect(Number.isFinite(Date.parse(manifest.capturedAt))).toBe(true);
    expect(manifest.browser).toMatch(/^Chromium \d+/);
    expect(manifest.publicationCanonicalSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.templateSourceSha256).toBe(await phase1TemplateSourceSha256(root));
    expect(manifest.renderPayloadSha256).toEqual({
      daily: expect.stringMatching(/^[a-f0-9]{64}$/),
      dailyPublication: expect.stringMatching(/^[a-f0-9]{64}$/),
      dailyPublicationManifest: expect.stringMatching(/^[a-f0-9]{64}$/),
      horoscopeProgram: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(manifest.buildReceipt).toEqual({
      schema: 'zodiacs.phase1-build-receipt.v1',
      builtAt: expect.any(String),
      templateSourceSha256: manifest.templateSourceSha256,
      dailyDate: manifest.dailyDate,
      publicationCanonicalSha256: manifest.publicationCanonicalSha256,
      renderPayloadSha256: manifest.renderPayloadSha256,
    });
    expect(Number.isFinite(Date.parse(manifest.buildReceipt.builtAt))).toBe(true);
    expect(Date.parse(manifest.capturedAt)).toBeGreaterThanOrEqual(
      Date.parse(manifest.buildReceipt.builtAt),
    );
    expect(manifest.captures).toHaveLength(expectedTemplates.size * expectedViewports.size);

    const captureKeys = manifest.captures.map((capture) => `${capture.template}:${capture.viewport.width}`);
    const expectedKeys = [...expectedTemplates.keys()].flatMap((template) => (
      [...expectedViewports.keys()].map((width) => `${template}:${width}`)
    ));
    expect([...captureKeys].sort()).toEqual([...expectedKeys].sort());
    expect(new Set(captureKeys).size).toBe(manifest.captures.length);
    expect(new Set(manifest.captures.map((capture) => capture.screenshot.file)).size)
      .toBe(manifest.captures.length);
    expect(new Set(manifest.captures.map((capture) => capture.screenshot.sha256)).size)
      .toBe(manifest.captures.length);

    for (const [template, expectedPath] of expectedTemplates) {
      const captures = manifest.captures.filter((capture) => capture.template === template);
      expect(captures.map((capture) => capture.viewport.width).sort((a, b) => a - b)).toEqual([360, 1280]);
      for (const capture of captures) {
        expect(capture.path).toBe(expectedPath);
        expect(capture.viewport.height).toBe(expectedViewports.get(capture.viewport.width));
        expect(capture.status).toBe(200);
        expect(capture.errors).toEqual([]);
        expect(capture.layout.overlay).toBe(false);
        expect(capture.layout.contentLength).toBeGreaterThan(100);
        expect(capture.layout.clientWidth).toBe(capture.viewport.width);
        expect(capture.layout.scrollWidth).toBeLessThanOrEqual(capture.layout.clientWidth);
        expect(capture.screenshot.width).toBe(capture.viewport.width);
        expect(capture.screenshot.height).toBeGreaterThanOrEqual(capture.viewport.height);
        expect(capture.screenshot.height).toBe(capture.layout.scrollHeight);
        expect(capture.screenshot.file).toBe(`${template}-${capture.viewport.width}.png`);
        const bytes = await readFile(resolve(evidenceRoot, 'screenshots', capture.screenshot.file));
        expect(capture.screenshot.sha256).toBe(sha256(bytes));
        expect(pngDimensions(bytes)).toEqual({
          width: capture.screenshot.width,
          height: capture.screenshot.height,
        });
      }
    }
  });

  it('records the three-page cold read and the deliberate accessory removal', async () => {
    const review = await readFile(resolve(evidenceRoot, 'cold-read.md'), 'utf8');

    expect(review).toContain('/horoscopes/aries/');
    expect(review).toContain('/horoscopes/virgo/weekly/');
    expect(review).toContain('/horoscopes/capricorn/2027/');
    expect(review).toMatch(/generic|competitor/i);
    expect(review).toMatch(/accessory removed/i);
    expect(review).toContain('third sky-strip marker');
  });

  it('invalidates stale evidence when a transitive render source or bundled font changes', async () => {
    const baseline = await phase1TemplateSourceSha256(root);
    for (const changedPath of [
      resolve(root, 'src/components/BrandMark.astro'),
      resolve(root, 'public/fonts/instrument-sans-latin-wght-normal.woff2'),
      resolve(root, 'src/lib/email/config.ts'),
      resolve(root, 'src/lib/email/daily-capture-copy.ts'),
      resolve(root, 'src/lib/email/daily-config.ts'),
      resolve(root, 'src/lib/email/daily-segment-id.ts'),
      resolve(root, 'src/lib/email/post-chart-state.ts'),
    ]) {
      const changed = await phase1TemplateSourceSha256(root, {
        readSource: async (path) => {
          const bytes = await readFile(path);
          return path === changedPath ? Buffer.concat([bytes, Buffer.from('phase-1-change')]) : bytes;
        },
      });
      expect(changed, changedPath).not.toBe(baseline);
    }
  });

  it('keeps server-only email delivery changes outside the Phase 1 visual receipt', async () => {
    const baseline = await phase1TemplateSourceSha256(root);
    const deliveryPaths = new Set([
      resolve(root, 'src/lib/daily-email/segments.ts'),
      resolve(root, 'src/lib/email/daily-resend.ts'),
    ]);
    let deliveryRead = false;
    const changed = await phase1TemplateSourceSha256(root, {
      readSource: async (path) => {
        const bytes = await readFile(path);
        if (!deliveryPaths.has(path)) return bytes;
        deliveryRead = true;
        return Buffer.concat([bytes, Buffer.from('server-delivery-change')]);
      },
    });

    expect(deliveryRead).toBe(false);
    expect(changed).toBe(baseline);
  });

  it('keeps reviewed template geometry valid across payload-only daily editions', async () => {
    const baseline = await phase1TemplateSourceSha256(root);
    const payloadPaths = new Set([
      resolve(root, 'src/data/daily.json'),
      resolve(root, 'src/data/daily-publication.json'),
      resolve(root, 'src/data/daily-publication-manifest.json'),
      resolve(root, 'src/data/horoscope-program.json'),
    ]);
    let payloadRead = false;
    const changed = await phase1TemplateSourceSha256(root, {
      readSource: async (path) => {
        const bytes = await readFile(path);
        if (!payloadPaths.has(path)) return bytes;
        payloadRead = true;
        return Buffer.concat([bytes, Buffer.from('next-unattended-edition')]);
      },
    });

    expect(payloadRead).toBe(false);
    expect(changed).toBe(baseline);
  });
});
