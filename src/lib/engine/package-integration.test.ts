import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ENGINE_VERSION as packageEngineVersion } from '@zodiacs/engine';
import { computeBodies as packageComputeBodies } from '@zodiacs/engine/internal';

import { computeBodies } from './full';
import { ENGINE_VERSION } from './types';

const artifactPath = resolve(process.cwd(), 'vendor/zodiacs-engine-0.1.0.tgz');
const docsPath = resolve(process.cwd(), 'public/sdk/engine');

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('vendored @zodiacs/engine integration', () => {
  it('matches both recorded checksums in the repository', () => {
    const artifact = readFileSync(artifactPath);
    const checksum = readFileSync(
      resolve(process.cwd(), 'vendor/zodiacs-engine-0.1.0.sha256'),
      'utf8',
    ).trim().split(/\s+/u)[0];
    const lock = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'),
    ) as {
      packages: Record<string, { integrity?: string }>;
    };

    expect(createHash('sha256').update(artifact).digest('hex')).toBe(checksum);
    expect(`sha512-${createHash('sha512').update(artifact).digest('base64')}`).toBe(
      lock.packages['node_modules/@zodiacs/engine']?.integrity,
    );
  });

  it('preserves the site body shape while using package positions and version', () => {
    const date = new Date('2020-01-01T00:00:00Z');
    const packageBodies = packageComputeBodies(date);
    const siteBodies = computeBodies(date);

    expect(ENGINE_VERSION).toBe(packageEngineVersion);
    expect(ENGINE_VERSION).toBe('0.1.0');
    expect(siteBodies).toEqual(
      packageBodies.map(({ body, lon, lat, speed, retrograde }) => ({
        body,
        lon,
        lat,
        speed,
        retrograde,
      })),
    );
    expect(siteBodies.some((body) => 'sign' in body || 'degree' in body)).toBe(false);
  });

  it('publishes every TypeDoc page with its absolute canonical and icon rail', () => {
    const pages = walk(docsPath).filter((path) => path.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(0);

    for (const path of pages) {
      const route = relative(docsPath, path).split(sep).join('/');
      const expectedCanonical = route === 'index.html'
        ? 'https://zodiacs.org/sdk/engine/'
        : new URL(route, 'https://zodiacs.org/sdk/engine/').href;
      const html = readFileSync(path, 'utf8');
      expect(html).toContain(`<link rel="canonical" href="${expectedCanonical}"/>`);
      expect(html).toContain('<meta name="robots" content="noindex,follow"/>');
      expect(html).toContain('class="engine-sign-rail"');
      expect(html.match(/\/assets\/zodiac-icons\/48\/[a-z]+\.webp/gu)).toHaveLength(12);
    }
  });
});
