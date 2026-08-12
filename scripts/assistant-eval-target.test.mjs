import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_EVAL_PREVIEW_REF,
  ASSISTANT_EVAL_PRODUCTION_REF,
  validateAssistantEvalTarget,
} from './assistant-eval-target.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const immutablePreview = 'https://zodiacs-irbfh87vm-zodiacsofficial.vercel.app';

describe('Ask Zodiacs live-evaluation target', () => {
  it.each([
    {
      name: 'production on main',
      baseUrl: 'https://zodiacs.org',
      ref: ASSISTANT_EVAL_PRODUCTION_REF,
      expected: { kind: 'production', origin: 'https://zodiacs.org' },
    },
    {
      name: 'immutable Ask preview on the reviewed branch',
      baseUrl: immutablePreview,
      ref: ASSISTANT_EVAL_PREVIEW_REF,
      expected: { kind: 'preview', origin: immutablePreview },
    },
  ])('accepts $name', ({ baseUrl, ref, expected }) => {
    expect(validateAssistantEvalTarget({ baseUrl, ref })).toEqual(expected);
  });

  it.each([
    ['production on the Ask branch', 'https://zodiacs.org', ASSISTANT_EVAL_PREVIEW_REF],
    ['production on another branch', 'https://zodiacs.org', 'refs/heads/release'],
    ['preview on main', immutablePreview, ASSISTANT_EVAL_PRODUCTION_REF],
    ['preview on another branch', immutablePreview, 'refs/heads/feature/ask'],
    [
      'mutable Vercel branch alias',
      'https://zodiacs-org-git-codex-ask-zodiacs-guide-zodiacsofficial.vercel.app',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    ['production over HTTP', 'http://zodiacs.org', ASSISTANT_EVAL_PRODUCTION_REF],
    [
      'preview over HTTP',
      'http://zodiacs-irbfh87vm-zodiacsofficial.vercel.app',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    ['production with a trailing slash', 'https://zodiacs.org/', ASSISTANT_EVAL_PRODUCTION_REF],
    ['preview with a trailing slash', `${immutablePreview}/`, ASSISTANT_EVAL_PREVIEW_REF],
    ['preview with a path', `${immutablePreview}/ask`, ASSISTANT_EVAL_PREVIEW_REF],
    ['preview with a query', `${immutablePreview}?suite=guided`, ASSISTANT_EVAL_PREVIEW_REF],
    ['preview with a fragment', `${immutablePreview}#ask`, ASSISTANT_EVAL_PREVIEW_REF],
    [
      'preview with credentials',
      'https://operator@zodiacs-irbfh87vm-zodiacsofficial.vercel.app',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    ['preview with a non-default port', `${immutablePreview}:444`, ASSISTANT_EVAL_PREVIEW_REF],
    ['preview with an explicit default port', `${immutablePreview}:443`, ASSISTANT_EVAL_PREVIEW_REF],
    [
      'lookalike parent domain',
      'https://zodiacs-irbfh87vm-zodiacsofficial.vercel.app.evil.example',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    [
      'different Vercel team',
      'https://zodiacs-irbfh87vm-attacker.vercel.app',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    [
      'missing immutable deployment token',
      'https://zodiacs--zodiacsofficial.vercel.app',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    [
      'trailing hostname dot',
      'https://zodiacs-irbfh87vm-zodiacsofficial.vercel.app.',
      ASSISTANT_EVAL_PREVIEW_REF,
    ],
    ['noncanonical hostname case', 'https://ZODIACS.ORG', ASSISTANT_EVAL_PRODUCTION_REF],
    ['surrounding whitespace', ' https://zodiacs.org ', ASSISTANT_EVAL_PRODUCTION_REF],
    ['malformed URL', 'not-a-url', ASSISTANT_EVAL_PREVIEW_REF],
    ['empty URL', '', ASSISTANT_EVAL_PREVIEW_REF],
    ['empty ref', immutablePreview, ''],
    ['missing URL', undefined, ASSISTANT_EVAL_PREVIEW_REF],
    ['missing ref', immutablePreview, undefined],
  ])('rejects %s', (_name, baseUrl, ref) => {
    expect(() => validateAssistantEvalTarget({ baseUrl, ref }))
      .toThrow('Evaluation target/ref is not an approved exact deployment origin.');
  });

  it('rejects a missing target pair', () => {
    expect(() => validateAssistantEvalTarget())
      .toThrow('Evaluation target/ref is not an approved exact deployment origin.');
  });

  it('keeps the workflow and operator instructions bound to the tested contract', async () => {
    const [workflow, setup] = await Promise.all([
      readFile(resolve(root, '.github/workflows/assistant-eval.yml'), 'utf8'),
      readFile(resolve(root, 'SETUP.md'), 'utf8'),
    ]);
    const validationJob = workflow.slice(
      workflow.indexOf('  validate-target:'),
      workflow.indexOf('\n  evaluate:'),
    );

    expect(validationJob).toContain('uses: actions/checkout@v6');
    expect(validationJob).toContain('EVAL_BASE: ${{ inputs.base_url }}');
    expect(validationJob).toContain('EVAL_REF: ${{ github.ref }}');
    expect(validationJob).toContain('node scripts/assistant-eval-target.mjs');
    expect(validationJob).not.toContain('const cleanOrigin');
    expect(workflow).toContain('needs: validate-target');
    expect(workflow).toContain('"--base=${EVAL_BASE}"');
    expect(workflow).toContain('"--origin=${EVAL_BASE}"');
    expect(workflow).toContain('evidence.base !== process.argv[3]');
    expect(workflow).toContain('shard.base !== process.env.EVAL_BASE');
    expect(workflow).toContain('- name: Record evaluated source');
    expect(workflow).not.toContain('- name: Record reviewed main source');
    expect(setup).toContain('immutable Vercel deployment origin');
    expect(setup).toContain('Run `grounded`, `guided`, and `redteam` sequentially');
  });
});
