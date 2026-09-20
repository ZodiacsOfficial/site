/**
 * The worked example on the engine page, executed.
 *
 * The page prints a program and, underneath it, the output that program
 * produces. Typing that output by hand would be a fabricated transcript the
 * first time a body moved or a field was renamed, so this runs the exact
 * source the page renders against the packaged engine and compares stdout
 * byte for byte.
 *
 * Nothing is stubbed. The engine makes no network request, so there is
 * nothing to stub: this is the real calculation, and if it changes the page
 * has to change with it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENGINE_DEMO_SOURCE, ENGINE_DEMO_OUTPUT } from '../src/lib/engine-demo.ts';

const root = process.cwd();
const page = readFileSync(resolve(root, 'src/pages/developers/engine/index.astro'), 'utf8');
const candidate = JSON.parse(readFileSync(resolve(root, 'src/data/platform-engine-candidate.json'), 'utf8'));

describe('the worked example on the engine page', () => {
  it('is the source the page publishes, not a copy of it', () => {
    expect(page).toMatch(/import \{[^}]*\bENGINE_DEMO_SOURCE\b[^}]*\} from '[^']*\/engine-demo'/u);
    expect(page).toContain('<code>{ENGINE_DEMO_SOURCE}</code>');
    expect(page).toContain('<code>{ENGINE_DEMO_OUTPUT}</code>');
  });

  it('prints exactly the output printed beside it', () => {
    // Run from the repository root so the bare specifier resolves against the
    // installed package — the same import a reader writes after installing.
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', ENGINE_DEMO_SOURCE], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(stdout).toBe(ENGINE_DEMO_OUTPUT);
  });

  it('demonstrates the version the page says it demonstrates', () => {
    expect(ENGINE_DEMO_OUTPUT).toContain(`engine ${candidate.version}`);
  });

  it('uses no real birth details and no network', () => {
    expect(ENGINE_DEMO_SOURCE).not.toMatch(/fetch|XMLHttpRequest|https?:\/\//u);
    // Round public coordinates, not a street address.
    expect(ENGINE_DEMO_SOURCE).toMatch(/latitude: 51\.5074/u);
  });
});
