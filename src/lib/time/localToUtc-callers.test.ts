import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * A birthplace longitude makes an early date need the local mean time table,
 * and resolving without it throws. So every production call that passes a
 * longitude sits in a module that prepares the table first, or that re-exports
 * the preparation to the islands that call it. Calls without a longitude keep
 * the zone's clock, and each is listed here with its reason.
 */
const root = resolve(process.cwd(), 'src');

const WITHOUT_LONGITUDE: Record<string, string> = {
  'lib/chart-date-certainty.ts': 'local midnights of a date on the zone clock; used only by tests',
  'lib/learning-source.ts': 'checks that a stored birth resolves at all; the chart itself goes through ChartCalculator',
  'islands/WalletChart.tsx': 'Registry scope, frozen for Phase 1; planets only, no angles',
};

/** Islands that prepare the table for a compute module that re-exports it. */
const PREPARED_BY: Record<string, string[]> = {
  'islands/lunar-return/compute.ts': ['islands/LunarReturnCalculator.tsx'],
  'islands/solar-return/compute.ts': ['islands/SolarReturnCalculator.tsx'],
};

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function calls(source: string): string[] {
  const found: string[] = [];
  for (let at = source.indexOf('resolveLocalToUtc('); at >= 0; at = source.indexOf('resolveLocalToUtc(', at + 1)) {
    let depth = 0;
    let end = at + 'resolveLocalToUtc'.length;
    for (; end < source.length; end += 1) {
      if (source[end] === '(') depth += 1;
      if (source[end] === ')' && --depth === 0) break;
    }
    found.push(source.slice(at, end + 1));
  }
  return found;
}

const sources = walk(root)
  .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path))
  .map((path) => ({ path: relative(root, path).split(sep).join('/'), source: readFileSync(path, 'utf8') }))
  .filter(({ path, source }) => path !== 'lib/time/localToUtc.ts' && calls(source).length > 0);

describe('callers of resolveLocalToUtc', () => {
  it('finds the production callers', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('prepare the local mean time table wherever they pass a longitude', () => {
    const unprepared = sources
      .filter(({ source }) => calls(source).some((call) => call.includes('longitude')))
      .filter(({ path, source }) => {
        if (/\bawait prepareLocalTime\(|\bprepareLocalTime\(\w/.test(source)) return false;
        const islands = PREPARED_BY[path];
        if (!islands || !/export \{ prepareLocalTime \}/.test(source)) return true;
        return islands.some((island) => !/\bprepareLocalTime\(/.test(readFileSync(resolve(root, island), 'utf8')));
      })
      .map(({ path }) => path);
    expect(unprepared).toEqual([]);
  });

  it('pass a longitude everywhere except the listed places', () => {
    const without = sources
      .filter(({ source }) => calls(source).some((call) => !call.includes('longitude')))
      .map(({ path }) => path)
      .sort();
    expect(without).toEqual(Object.keys(WITHOUT_LONGITUDE).sort());
  });
});
