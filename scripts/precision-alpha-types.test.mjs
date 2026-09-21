/**
 * The alpha's shipped type declarations, compiled against as a consumer
 * would compile against them.
 *
 * This exists because a claim about the declarations was wrong and nothing
 * caught it: the result union was believed to make an exact total
 * unreachable off the proved branch, and it did not, because TypeScript
 * discriminates a union on a direct property and not on a nested one. A
 * test that greps a `.d.ts` cannot find that. A compiler can.
 *
 * It resolves `@zodiacs/precision-alpha` at the declarations through
 * `paths`, so it checks the FILES THE ARCHIVE SHIPS, not the source.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = resolve(root, 'examples/precision-alpha/types');
const fixtures = resolve(root, 'scripts/fixtures/precision-alpha-types');

function compile(files) {
  const dir = mkdtempSync(join(tmpdir(), 'alpha-types-'));
  try {
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, skipLibCheck: false, types: [],
        module: 'esnext', moduleResolution: 'bundler', target: 'es2022',
        lib: ['es2022', 'dom'],
        baseUrl: '.',
        paths: {
          '@zodiacs/precision-alpha': [`${types}/index.d.ts`],
          '@zodiacs/precision-alpha/node': [`${types}/node.d.ts`],
          '@zodiacs/precision-alpha/browser': [`${types}/browser.d.ts`],
        },
      },
      files: files.map((f) => resolve(fixtures, f)),
    }));
    try {
      execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['-p', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return '';
    } catch (error) {
      return `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('the alpha ships declarations a consumer can actually use', () => {
  it('has the three declaration files the exports map points at', () => {
    for (const f of ['index.d.ts', 'node.d.ts', 'browser.d.ts']) {
      expect(existsSync(resolve(types, f)), f).toBe(true);
    }
  });

  it('compiles a strict consumer using both entry points and both search modes', () => {
    expect(compile(['consumer.ts'])).toBe('');
  });

  it('rejects everything it should, including an exact total off the proved branch', () => {
    // Each @ts-expect-error in the fixture IS the assertion: tsc fails on
    // an unused suppression, so a declaration that got looser fails here.
    expect(compile(['rejects.ts'])).toBe('');
  });
});
