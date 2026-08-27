import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('weekly digest operational boundary', () => {
  it('enforces the scheduled ceiling and least-privilege unsubscribe contract', async () => {
    const [sender, workflow, endpoint] = await Promise.all([
      readFile(resolve(root, 'scripts/send-weekly-digest.ts'), 'utf8'),
      readFile(resolve(root, '.github/workflows/weekly-digest.yml'), 'utf8'),
      readFile(resolve(root, 'api/unsubscribe.ts'), 'utf8'),
    ]);

    expect(sender).toContain('const HARD_SEND_CEILING = 80;');
    expect(sender).toContain("Math.min(envInt('DIGEST_MAX_SENDS', DEFAULT_LIMIT), HARD_SEND_CEILING)");
    expect(workflow).toContain('DIGEST_MAX_SENDS: "80"');
    expect(workflow).toContain('default: "80"');
    expect(workflow).not.toContain('DIGEST_UNSUBSCRIBE_SECRET');
    expect(endpoint).toContain('/rest/v1/rpc/weekly_digest_unsubscribe_v1');
    expect(endpoint).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('prints rendered bodies only for the synthetic fixture', async () => {
    const sender = await readFile(resolve(root, 'scripts/send-weekly-digest.ts'), 'utf8');
    expect(sender).toMatch(/if \(options\.dryRun\) \{\s+if \(options\.fixture\) \{[\s\S]*?rendered\.text/u);
    expect(sender).toContain('(all personalized fields redacted)');
    expect(sender.match(/rendered\.text/g)).toHaveLength(2);
  });
});
