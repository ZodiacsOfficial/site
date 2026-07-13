import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ASSISTANT_CONTEXT } from '../api/_assistant/context.ts';
import {
  BANNED_CONSUMER_VOCABULARY,
  MAX_CONTEXT_BYTES,
  MIN_CONTEXT_BYTES,
  TOOL_ROUTES,
  buildAssistantContext,
  extractCanonicalLabels,
  extractLearnTopics,
  generateAssistantContext,
} from './build-assistant-context.mjs';

let temporaryDirectory;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = undefined;
  }
});

describe('assistant site context', () => {
  it('contains every tool route and the complete live route families', async () => {
    const { context, counts } = await generateAssistantContext();

    expect(TOOL_ROUTES).toEqual([
      '/baby-zodiac/',
      '/birth-chart/',
      '/birthday/',
      '/compatibility/',
      '/eclipses/',
      '/full-moon-calendar/',
      '/mercury-retrograde/',
      '/moon-phase/',
      '/moon-sign/',
      '/profile/',
      '/retrogrades/',
      '/rising-sign/',
      '/saturn-return/',
      '/solar-return/',
      '/transits/',
      '/widgets/',
    ]);
    for (const route of TOOL_ROUTES) expect(context).toContain(`- ${route} —`);

    expect(counts).toEqual({
      birthdays: 366,
      consumerRoutes: 660,
      glossary: 139,
      guides: 12,
      learn: 159,
      pairs: 78,
      staticPages: 33,
      tools: 16,
    });
    expect(context).toContain('- /birthday/february-29/ — Pisces birthday guide.');
    expect(context).toContain('- /compatibility/aries-pisces/ — Aries and Pisces in love and the long run.');
    expect(context).toContain('- /learn/placements/sun-in-aries/ — What Sun in Aries means in a birth chart.');
    expect(context).toContain('- /rising-sign/pisces/ — What Pisces rising means.');
  });

  it('stays inside the cache-size band without Spanish routes or consumer-banned vocabulary', async () => {
    const { context } = await generateAssistantContext();
    const bytes = Buffer.byteLength(context);

    expect(bytes).toBeGreaterThanOrEqual(MIN_CONTEXT_BYTES);
    expect(bytes).toBeLessThanOrEqual(MAX_CONTEXT_BYTES);
    expect(context).not.toMatch(/(?:^|\s)\/es\//m);
    for (const word of BANNED_CONSUMER_VOCABULARY) {
      expect(context).not.toMatch(new RegExp(`\\b${word}(?:s)?\\b`, 'i'));
    }
  });

  it('extracts the learn-hub topics and the canonical strategy labels from their sources', () => {
    const topics = extractLearnTopics(`
      <a class="tile clusters__card" href="/learn/planets/">
        <strong>The planets</strong><p>Ten planets, ten jobs.</p>
      </a>
    `);
    expect(topics).toEqual([{
      route: '/learn/planets/',
      title: 'The planets',
      description: 'Ten planets, ten jobs.',
    }]);

    const labels = extractCanonicalLabels(`
## 4. Voice & microcopy
Canonical labels: "Get your free birth chart" · "Save this chart" · "Saved charts" ·
"Find your moon sign" · "Find your rising sign" · "Read your sign" · "Registry" ·
"Registro" · "the Twelve" · "View the record" · "Nothing saved yet"

## 5. Next
    `);
    expect(labels).toContain('Get your free birth chart');
    expect(labels).toContain('the Twelve');
  });

  it('is byte-identical across two builds and matches the committed module', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'zodiacs-assistant-context-'));
    const output = join(temporaryDirectory, 'context.ts');

    const first = await buildAssistantContext({ output });
    const firstBytes = await readFile(output);
    const second = await buildAssistantContext({ output });
    const secondBytes = await readFile(output);

    expect(second.context).toBe(first.context);
    expect(second.source).toBe(first.source);
    expect(secondBytes.equals(firstBytes)).toBe(true);
    expect(ASSISTANT_CONTEXT).toBe(first.context);
  });
});
