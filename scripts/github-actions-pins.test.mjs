import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDirectory = resolve(root, '.github', 'workflows');
const immutableCommit = /^[0-9a-f]{40}$/iu;

function externalActionUse(line) {
  const match = /^\s*(?:-\s*)?uses:\s*["']?([^\s#"']+)/u.exec(line);
  if (!match || match[1].startsWith('./')) return null;
  return match[1];
}

describe('GitHub Actions supply chain', () => {
  it('pins every external action to an immutable commit SHA', async () => {
    const workflowFiles = (await readdir(workflowsDirectory))
      .filter((file) => /\.ya?ml$/u.test(file))
      .sort();
    const violations = [];
    let externalActionCount = 0;

    for (const file of workflowFiles) {
      const lines = (await readFile(resolve(workflowsDirectory, file), 'utf8')).split('\n');
      lines.forEach((line, index) => {
        const actionUse = externalActionUse(line);
        if (!actionUse) return;
        externalActionCount += 1;
        const separator = actionUse.lastIndexOf('@');
        const ref = separator >= 0 ? actionUse.slice(separator + 1) : '';
        if (!immutableCommit.test(ref)) {
          violations.push(`${file}:${index + 1} ${actionUse}`);
        }
      });
    }

    expect(externalActionCount).toBeGreaterThan(0);
    expect(violations, 'mutable external action references').toEqual([]);
  });
});
