import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Vercel applies every matching header rule in order; a later rule wins on the same key. */
function effectiveHeaders(config, path) {
  const headers = new Map();
  for (const rule of config.headers ?? []) {
    const pattern = new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '(.*)').replace(/:[a-z]+/g, '[^/]+')}$`);
    if (!pattern.test(path)) continue;
    for (const { key, value } of rule.headers) headers.set(key.toLowerCase(), value);
  }
  return headers;
}

describe('embed widget delivery headers', () => {
  it('lets every /embed/ route be framed by any host while the rest of the site stays unframeable', async () => {
    const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));

    for (const path of ['/embed/sky/', '/embed/sky/light/', '/embed/moon/', '/embed/chart/']) {
      const headers = effectiveHeaders(config, path);
      expect(headers.get('x-frame-options'), path).toBe('ALLOWALL');
      expect(headers.get('content-security-policy'), path).toMatch(/frame-ancestors \*/);
      expect(headers.get('content-security-policy'), path).not.toMatch(/frame-ancestors 'none'/);
    }

    for (const path of ['/', '/birth-chart/', '/horoscopes/aries/', '/widgets/']) {
      const headers = effectiveHeaders(config, path);
      expect(headers.get('x-frame-options'), path).toBe('DENY');
      expect(headers.get('content-security-policy'), path).toMatch(/frame-ancestors 'none'/);
    }
  });
});
