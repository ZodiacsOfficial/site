import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { REGISTRY_PRO_CSS } from '../src/pro/styles.mjs';

const ROOT = resolve(import.meta.dirname, '..');

describe('Zodiac Markets runtime presentation', () => {
  it('styles every behavioral surface and mobile/reduced-motion states', () => {
    for (const selector of [
      '.rp__rail', '.rp-market', '.rp__workspace', '.rp-chart__canvas',
      '.rp-tape__scroll', '.rp-ticket__form', '.rp-quote', '.rp-chat__log',
      '.rp-chat__composer-input', '.rp-status', '.rp-ticket__attribution',
    ]) expect(REGISTRY_PRO_CSS).toContain(selector);
    expect(REGISTRY_PRO_CSS).toMatch(/\.rp-ticket__attribution\s*\{[^}]*font-size:\s*10px/isu);
    expect(REGISTRY_PRO_CSS).toContain('@media (max-width: 480px)');
    expect(REGISTRY_PRO_CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(REGISTRY_PRO_CSS).toContain('.rp-ticket__input input');
  });

  it('uses no remote assets, gold, or red/green status pair', () => {
    expect(REGISTRY_PRO_CSS).not.toMatch(/url\(['"]?https?:|@import/iu);
    expect(REGISTRY_PRO_CSS).not.toMatch(/gold|#d4a017|#ffd700|#ff0000|#00ff00/iu);
    expect(REGISTRY_PRO_CSS).toContain('--rp-ready: #a9d4c4');
    expect(REGISTRY_PRO_CSS).toContain('--rp-waiting: #b29dd0');
  });

  it('keeps the committed classic bundle inside its explicit budget', async () => {
    const bundle = await readFile(resolve(ROOT, 'public/assets/registry-pro.js'));
    expect(bundle.byteLength).toBeLessThan(80_000);
    expect(gzipSync(bundle).byteLength).toBeLessThan(25_000);
    expect(bundle.toString('utf8')).toContain('Generated from src/pro/');
  });
});
