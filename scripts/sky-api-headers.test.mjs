import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadSkyApiSources } from '../src/lib/sky-api/sources.ts';
import { buildSkyApi } from '../src/lib/sky-api/files.ts';

/**
 * The shared sky API is public data served as static files, so everything a
 * consumer can rely on about delivery — that it is reachable cross-origin
 * without a key, that it is not indexed as pages, and that a cached copy never
 * outlives the cadence the API itself advertises — lives in `vercel.json` and
 * nowhere else. The payloads are gated by `sky-api.test.mjs`; this gates how
 * they arrive, and ties the cache tiers to the endpoint manifest so the two
 * cannot drift apart silently.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_AT = '2026-09-07T00:00:00.000Z';
const DAY_SECONDS = 86_400;

const sources = await loadSkyApiSources(root);
const build = buildSkyApi(sources, { generatedAt: GENERATED_AT });
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));

/** Every file the builder actually writes, as the path it is served from. */
const servedPaths = [...build.files.keys()].map((file) => `/api/v1/${file}`);
const advertised = build.payloads.get('index.json').endpoints;

/** Vercel applies every matching rule in order; a later rule wins on the same key. */
function effectiveHeaders(path) {
  const headers = new Map();
  for (const rule of config.headers ?? []) {
    const pattern = new RegExp(`^${rule.source.replace(/\(\.\*\)/gu, '(.*)').replace(/:[a-z]+/giu, '[^/]+')}$`);
    if (!pattern.test(path)) continue;
    for (const { key, value } of rule.headers) headers.set(key.toLowerCase(), value);
  }
  return headers;
}

function maxAge(path) {
  const value = effectiveHeaders(path).get('cache-control');
  const match = /max-age=(\d+)/u.exec(value ?? '');
  return match ? Number(match[1]) : null;
}

describe('shared sky API delivery headers', () => {
  it('serves every file it writes cross-origin, unindexed, and revalidated', () => {
    expect(servedPaths.length).toBeGreaterThan(40);

    for (const path of servedPaths) {
      const headers = effectiveHeaders(path);
      // Public data with no key: a browser on someone else's origin can read it.
      expect(headers.get('access-control-allow-origin'), path).toBe('*');
      // Data, not pages. Indexing these would put raw JSON in search results.
      expect(headers.get('x-robots-tag'), path).toBe('noindex');
      // `must-revalidate` is the promise that a stale copy is never served as
      // if it were current once its freshness window has passed.
      expect(headers.get('cache-control'), path).toMatch(/must-revalidate/u);
      expect(maxAge(path), path).not.toBeNull();
    }
  });

  it('never caches an endpoint for longer than the cadence it advertises', () => {
    // Two cadences exist: daily editions, and yearly files that change only
    // when their source data is refreshed. A daily endpoint cached for more
    // than a day would hand consumers an edition the API says was replaced;
    // the yearly ones are bounded by the family default, which is a day.
    const daily = advertised.filter(({ updates }) => /daily/u.test(updates));
    expect(daily.length).toBeGreaterThan(0);

    for (const { path, updates } of advertised) {
      const age = maxAge(path);
      expect(age, `${path} has no max-age`).not.toBeNull();
      expect(age, `${path} is cached past its stated cadence: ${updates}`).toBeLessThanOrEqual(DAY_SECONDS);
    }
  });

  it('caches the two entry points at least as tightly as the rest', () => {
    // Today's sky is the most time-sensitive payload and the index is what a
    // consumer polls to discover the others; neither may be the stalest thing
    // in the family.
    const today = maxAge('/api/v1/sky/today.json');
    const index = maxAge('/api/v1/index.json');
    const others = servedPaths
      .filter((path) => path !== '/api/v1/sky/today.json' && path !== '/api/v1/index.json')
      .map((path) => maxAge(path));

    expect(today).toBeLessThanOrEqual(Math.min(...others));
    expect(index).toBeLessThanOrEqual(Math.max(...others));
    expect(today).toBeLessThanOrEqual(index);
  });

  it('keeps the API delivery rules off the rest of the site', () => {
    for (const path of ['/', '/birth-chart/', '/today/', '/horoscopes/aries/', '/developers/']) {
      const headers = effectiveHeaders(path);
      expect(headers.get('access-control-allow-origin'), path).toBeUndefined();
      expect(headers.get('x-robots-tag'), path).toBeUndefined();
    }
  });
});
