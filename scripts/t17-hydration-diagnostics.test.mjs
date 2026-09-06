import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackHydrationDiagnostics } from '../tests/t17-hydration-diagnostics.mjs';

const directories = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(screenshot = vi.fn().mockResolvedValue(undefined)) {
  const outputDir = await mkdtemp(join(tmpdir(), 't17-hydration-'));
  directories.push(outputDir);
  const page = Object.assign(new EventEmitter(), {
    url: () => 'http://127.0.0.1:4332/birth-chart/?private=query#p=private-fragment',
    screenshot,
  });
  const errors = ['pageerror:Failed module http://127.0.0.1:4332/_astro/chart.js?private=query#private'];
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const run = trackHydrationDiagnostics(page, { baseURL: 'http://127.0.0.1:4332', errors, outputDir });
  return { outputDir, page, errors, log, run };
}

function request(path, type = 'script', origin = 'http://127.0.0.1:4332') {
  return {
    url: () => `${origin}${path}?private=query#private`,
    resourceType: () => type,
    failure: () => ({ errorText: 'net::ERR_CONNECTION_RESET' }),
  };
}

describe('T17 hydration failure diagnostics', () => {
  it('preserves the original failure, records local failed assets, and removes URL payloads', async () => {
    const { outputDir, page, log, run } = await fixture();
    page.emit('requestfailed', request('/_astro/chart.js'));
    page.emit('response', { request: () => request('/_astro/styles.css', 'stylesheet'), status: () => 404 });
    page.emit('response', { request: () => request('/_astro/healthy.js'), status: () => 200 });
    page.emit('requestfailed', request('/external.js', 'script', 'https://outside.example'));
    page.emit('requestfailed', request('/birth-chart/', 'document'));
    const failure = new Error('Hydration timed out');
    const hydrate = vi.fn().mockRejectedValue(failure);
    await expect(run(hydrate)).rejects.toBe(failure);
    expect(hydrate).toHaveBeenCalledTimes(1);
    const report = JSON.parse(await readFile(join(outputDir, 'hydration-failure.json'), 'utf8'));
    expect(report.failedAssets).toEqual([
      { path: '/_astro/chart.js', type: 'script', status: null, error: 'net::ERR_CONNECTION_RESET' },
      { path: '/_astro/styles.css', type: 'stylesheet', status: 404, error: null },
    ]);
    expect(report.path).toBe('/birth-chart/');
    expect(report.errors).toEqual(['pageerror:Failed module http://127.0.0.1:4332/_astro/chart.js']);
    expect(JSON.stringify(report)).not.toContain('private');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    expect(page.screenshot).toHaveBeenCalledWith(expect.objectContaining({
      path: join(outputDir, 'hydration-failure.png'), fullPage: false, timeout: 5_000,
    }));
  });

  it('retains errors and the original failure when the screenshot is unavailable', async () => {
    const screenshot = vi.fn().mockRejectedValue(new Error('Target page closed'));
    const { outputDir, run } = await fixture(screenshot);
    const failure = new Error('Hydration timed out');
    await expect(run(async () => { throw failure; })).rejects.toBe(failure);
    const report = JSON.parse(await readFile(join(outputDir, 'hydration-failure.json'), 'utf8'));
    expect(report.screenshot).toEqual({ captured: false, error: 'Target page closed' });
    expect(report.errors).toHaveLength(1);
  });

  it('preserves the original failure even when diagnostic files cannot be written', async () => {
    const { outputDir, page, errors } = await fixture();
    const blocked = join(outputDir, 'file');
    await writeFile(blocked, 'file blocks a directory');
    const run = trackHydrationDiagnostics(page, { baseURL: 'http://127.0.0.1:4332', errors, outputDir: blocked });
    const failure = new Error('Hydration timed out');
    await expect(run(async () => { throw failure; })).rejects.toBe(failure);
    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it('does not capture or log diagnostics on successful hydration', async () => {
    const { outputDir, page, log, run } = await fixture();
    await run(async () => {});
    expect(page.screenshot).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(await readdir(outputDir)).toEqual([]);
  });
});
