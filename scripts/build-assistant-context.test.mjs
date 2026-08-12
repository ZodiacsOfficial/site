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
  consumerVocabularyScope,
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
      '/ask/',
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
      consumerRoutes: 682,
      glossary: 145,
      guides: 12,
      learn: 159,
      pairs: 78,
      staticPages: 43,
      tools: 17,
    });
    expect(context).toContain('- /birthday/february-29/ — Pisces birthday guide.');
    expect(context).toContain('- /compatibility/aries-pisces/ — Aries and Pisces in love and the long run.');
    expect(context).toContain('- /learn/placements/sun-in-aries/ — What Sun in Aries means in a birth chart.');
    expect(context).toContain('- /rising-sign/pisces/ — What Pisces rising means.');
    expect(context).toContain('- /terminal/ — Zodiac Terminal: the simple, identity-first view');
    expect(context).toContain('- /terminal/pro/ — Zodiac Terminal Pro: the dense market view');
    expect(context).toContain('ranked with price, 24-hour change, and indexed liquidity, plus a selected-sign chart');
    expect(context).toContain('- /registry/ — Zodiacs Registry: the read-only verification hub');
    expect(context).not.toContain('Astrofolio catalogue');
  });

  it('keeps privacy, calculation, time-zone, unknown-time, and horoscope-date boundaries explicit', async () => {
    const { context } = await generateAssistantContext();

    expect(context).toContain('Chart calculation does not send birth fields to a chart API.');
    expect(context).toContain('optional account sync uploads only the charts a person chooses');
    expect(context).toContain('The AI assistant sends chat messages to Anthropic');
    expect(context).toContain('placements-only chart summary only after the person explicitly chooses “Attach my chart”');
    expect(context).not.toContain('Birth details stay on the device.');

    expect(context).toContain('IANA/ICU history supplied by the visitor’s browser or device runtime');
    expect(context).toContain('historical coverage and tzdb version depend on that host');
    expect(context).toContain('uses 12:00 local civil time as a reference');
    expect(context).toContain('omits the rising sign, angles, and houses');
    expect(context).toContain('flags uncertainty if the Moon changes signs during that local date');

    expect(context).toContain('PAGE INVENTORY — DAILY AND MONTHLY HOROSCOPES');
    expect(context).toContain('Treat “today” as an exact UTC-date claim');
    expect(context).toContain('- /horoscopes/aries/ — Aries daily horoscope.');
    expect(context).toMatch(/- \/horoscopes\/aries\/monthly\/ — Aries in [A-Z][a-z]+ 20\d{2}/u);
    expect(context).not.toContain('PAGE INVENTORY — MONTHLY HOROSCOPES');
  });

  it('stays inside the cache-size band without localized routes or consumer-banned vocabulary', async () => {
    const { context } = await generateAssistantContext();
    const bytes = Buffer.byteLength(context);

    expect(bytes).toBeGreaterThanOrEqual(MIN_CONTEXT_BYTES);
    expect(bytes).toBeLessThanOrEqual(MAX_CONTEXT_BYTES);
    expect(context).not.toMatch(/(?:^|\s)\/es\//m);
    expect(context).not.toMatch(/(?:^|\s)\/pt\//m);
    expect(context).not.toMatch(/(?:^|\s)\/ru\//m);
    const consumerContext = consumerVocabularyScope(context);
    for (const word of BANNED_CONSUMER_VOCABULARY) {
      expect(consumerContext).not.toMatch(new RegExp(`\\b${word}(?:s)?\\b`, 'i'));
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
