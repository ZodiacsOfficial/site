import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { buildServiceWorker } from './build-service-worker.mjs';
import { PWA_PUSH_EN } from '../src/strings/pwa.en.mjs';

const ROOT = resolve(import.meta.dirname, '..');

describe('offline service worker posture', () => {
  it('never stale-serves Registry authority JSON', async () => {
    const source = await readFile(resolve(ROOT, 'public/sw.js'), 'utf8');
    expect(source).toContain("url.pathname === '/registry/zodiacs.registry.json'");
    expect(source).toMatch(/if \(registryAuthority\(url\)\) \{\s*event\.respondWith\(fetch\(request\)\)/);
  });

  it('ships with push disabled and versioned shell/data caches', async () => {
    const source = await readFile(resolve(ROOT, 'public/sw.js'), 'utf8');
    expect(source).toContain('const PUSH_ENABLED = false');
    expect(source).toContain('zodiacs-shell-${CACHE_VERSION}');
    expect(source).toContain('zodiacs-data-${CACHE_VERSION}');
  });

  it('renders future notification defaults from the English catalogue', async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), 'zodiacs-sw-'));
    try {
      await buildServiceWorker({ outputDirectory, pushEnabled: false });
      const built = await readFile(resolve(outputDirectory, 'sw.js'), 'utf8');
      expect(built).toContain(JSON.stringify(PWA_PUSH_EN.title));
      expect(built).toContain(JSON.stringify(PWA_PUSH_EN.body));
      expect(built).not.toContain('__PUSH_NOTIFICATION_TITLE__');
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
