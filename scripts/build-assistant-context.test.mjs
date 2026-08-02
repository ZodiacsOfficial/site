import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ASSISTANT_CONTEXT, ASSISTANT_KNOWLEDGE_INDEX } from '../api/_assistant/context.ts';
import {
  BANNED_CONSUMER_VOCABULARY,
  MAX_KNOWLEDGE_CHUNK_CHARS,
  MAX_CONTEXT_BYTES,
  MIN_KNOWLEDGE_CHUNK_CHARS,
  MIN_CONTEXT_BYTES,
  TOOL_ROUTES,
  buildAssistantContext,
  chunkKnowledgeText,
  extractCanonicalLabels,
  extractLearnTopics,
  generateAssistantContext,
  renderedMainText,
  sanitizeRenderedMainHtml,
} from './build-assistant-context.mjs';

let temporaryDirectory;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = undefined;
  }
});

describe('assistant site context', { timeout: 30_000 }, () => {
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
    expect(context).toContain(
      '- /ask/ — Ask a reflective astrology guide grounded in Zodiacs sources and deterministic chart facts.',
    );

    expect(counts).toEqual({
      birthdays: 366,
      consumerRoutes: 681,
      glossary: 145,
      guides: 12,
      learn: 159,
      pairs: 78,
      staticPages: 42,
      tools: 17,
    });
    expect(context).toContain('- /birthday/february-29/ — Pisces birthday guide.');
    expect(context).toContain('- /compatibility/aries-pisces/ — Aries and Pisces in love and the long run.');
    expect(context).toContain('- /learn/placements/sun-in-aries/ — What Sun in Aries means in a birth chart.');
    expect(context).toContain('- /rising-sign/pisces/ — What Pisces rising means.');
  });

  it('keeps privacy, calculation, time-zone, unknown-time, and horoscope-date boundaries explicit', async () => {
    const { context } = await generateAssistantContext();

    expect(context).toContain('Chart calculation does not send birth fields to a chart API.');
    expect(context).toContain('optional account sync uploads only the charts a person chooses');
    expect(context).toContain('Ask Zodiacs sends chat messages and explicitly selected, placements-only chart facts transiently to OpenAI');
    expect(context).toContain('store is disabled for the model request');
    expect(context).toContain('never sends the saved name, chart ID, birth date, birth time, birth place, or coordinates');
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

  it('commits rendered, localized, source-addressable chunks in the reviewed size band', async () => {
    const { knowledgeIndex } = await generateAssistantContext();
    expect(knowledgeIndex.version).toBe(1);
    expect(knowledgeIndex.hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(knowledgeIndex.chunks.length).toBeGreaterThan(2_000);
    expect(new Set(knowledgeIndex.chunks.map(({ id }) => id)).size).toBe(knowledgeIndex.chunks.length);
    expect(new Set(knowledgeIndex.chunks.map(({ locale }) => locale))).toEqual(
      new Set(['en', 'es', 'pt', 'fr', 'it']),
    );
    for (const chunk of knowledgeIndex.chunks) {
      expect(chunk.id).toMatch(/^src_[0-9a-f]{20}$/u);
      expect(chunk.path).toMatch(/^\/.+\/$|^\/$/u);
      expect(['en', 'es', 'pt', 'fr', 'it']).toContain(chunk.locale);
      expect(chunk.text.length).toBeGreaterThanOrEqual(MIN_KNOWLEDGE_CHUNK_CHARS);
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_KNOWLEDGE_CHUNK_CHARS);
      expect(chunk.text).not.toMatch(/(?:import\.meta\.env|Astro\.props|<Base\b|^---$)/u);
    }
    expect(knowledgeIndex.chunks.some(({ path, text }) => (
      path === '/learn/planets/saturn/' && /Saturn return/u.test(text)
    ))).toBe(true);
    expect(knowledgeIndex.chunks.some(({ path, locale }) => (
      path === '/es/privacy/' && locale === 'es'
    ))).toBe(true);
    expect(ASSISTANT_KNOWLEDGE_INDEX).toEqual(knowledgeIndex);
  });

  it('extracts only visitor-visible rendered main content', () => {
    const text = renderedMainText(`<!doctype html><html><head><title>Ignore</title></head><body>
      <nav>Ignore navigation</nav><main id="main"><h1>Chart guide</h1>
      <p>Read this visible interpretation.</p><script>import.meta.env.SECRET</script>
      <style>.hidden { color: red }</style><svg><text>decorative</text></svg></main>
      <footer>Ignore footer</footer></body></html>`);
    expect(text).toBe('Chart guide Read this visible interpretation.');
  });

  it('removes every build-clock-dependent fragment while preserving dated source material', () => {
    const variants = [
      {
        date: 'Aug 2, 2026',
        planet: 'Mars',
        position: '23°59′ Gemini',
        state: 'now',
        next: 'New moon in Leo',
      },
      {
        date: 'Aug 3, 2026',
        planet: 'Venus',
        position: '26°41′ Virgo',
        state: 'ahead',
        next: 'Jupiter trine Saturn',
      },
    ];

    const eventTexts = variants.map((variant) => renderedMainText(`
      <main>
        <h1>Sky events</h1>
        <div class="evhub-now"><span>As of ${variant.date}</span><strong>${variant.planet} retrograde right now.</strong></div>
        <section aria-labelledby="next-up-head"><h2 id="next-up-head">Next up</h2><div class="evhub-next">${variant.next}</div></section>
        <section aria-labelledby="calendar-head"><h2 id="calendar-head">The calendar</h2>
          <details class="evhub-earlier"><summary><h2>Earlier in 2026</h2><span>${variant.date === 'Aug 2, 2026' ? 7 : 8} months</span></summary>
            <section><h2>January 2026</h2><p>Jan 3 · Full moon in Cancer</p></section>
          </details>
          <section><h2>August 2026</h2><p>Aug 12 · New moon in Leo</p></section>
        </section>
        <p>Evergreen calendar guidance.</p>
      </main>
    `, '/events/'));
    expect(new Set(eventTexts).size).toBe(1);
    expect(eventTexts[0]).toContain('January 2026 Jan 3 · Full moon in Cancer');
    expect(eventTexts[0]).toContain('August 2026 Aug 12 · New moon in Leo');
    expect(eventTexts[0]).not.toContain('As of');
    expect(eventTexts[0]).not.toContain('Next up');
    expect(eventTexts[0]).not.toContain('Earlier in');

    const retrogradeTexts = variants.map((variant) => renderedMainText(`
      <main><h1>Retrogrades</h1>
        <div class="rx-now">As of ${variant.date}: ${variant.planet} is retrograde right now.</div>
        <h2>Mercury <span class="planet__now">retrograde now</span></h2>
        <table><tr><td>Oct 24 – Nov 13</td><td>20° Scorpio</td><td class="rx-table__state">${variant.state}</td></tr></table>
        <details><summary>Which planets are retrograde right now?</summary><p>${variant.planet}, as of ${variant.date}.</p></details>
        <details><summary>What is a station?</summary><p>The turnaround in apparent motion.</p></details>
      </main>
    `, '/retrogrades/'));
    expect(new Set(retrogradeTexts).size).toBe(1);
    expect(retrogradeTexts[0]).toContain('Oct 24 – Nov 13 20° Scorpio');
    expect(retrogradeTexts[0]).toContain('What is a station? The turnaround in apparent motion.');
    expect(retrogradeTexts[0]).not.toContain('retrograde now');

    const placementTexts = variants.map((variant) => renderedMainText(`
      <main><h1>Mars in Gemini</h1><dl class="plc-panel">
        <div class="plc-panel__row"><dt>Classical standing</dt><dd>neutral</dd></div>
        <div class="plc-panel__row"><dt>In Gemini now</dt><dd>${variant.date}</dd></div>
        <div class="plc-panel__row"><dt>${variant.state === 'now' ? 'Then' : 'Next'}</dt><dd>${variant.position}</dd></div>
        <div class="plc-panel__row"><dt>Most recent eras</dt><dd>${variant.date}</dd></div>
      </dl><p>Stable placement interpretation.</p></main>
    `, '/learn/placements/mars-in-gemini/'));
    expect(new Set(placementTexts).size).toBe(1);
    expect(placementTexts[0]).toContain('Classical standing neutral');
    expect(placementTexts[0]).not.toContain('In Gemini now');

    const risingTexts = variants.map((variant) => renderedMainText(`
      <main><h1>Aries rising</h1><dl class="plc-panel">
        <div class="plc-panel__row"><dt>Chart ruler</dt><dd>Mars</dd></div>
        <div class="plc-panel__row"><dt>Mars as of ${variant.date}</dt><dd>${variant.position}</dd></div>
        <div class="plc-panel__row"><dt>Element · Modality</dt><dd>fire · cardinal</dd></div>
      </dl><p>Stable rising interpretation.</p></main>
    `, '/rising-sign/aries/'));
    expect(new Set(risingTexts).size).toBe(1);
    expect(risingTexts[0]).toContain('Chart ruler Mars Element · Modality fire · cardinal');
    expect(risingTexts[0]).not.toContain('as of');

    const planetTexts = variants.map((variant) => renderedMainText(`
      <main><h1>Mars</h1>
        <p class="learn-detail__facts">Rules a sign · in Gemini as of ${variant.date}</p>
        <p>Stable planet interpretation.</p>
      </main>
    `, '/learn/planets/mars/'));
    expect(new Set(planetTexts).size).toBe(1);
    expect(planetTexts[0]).toBe('Mars Stable planet interpretation.');

    const moonTexts = variants.map((variant) => renderedMainText(`
      <main><h1>Moon phase</h1><h2>Upcoming lunations</h2>
        <ul class="lunations"><li>${variant.date} · ${variant.position}</li></ul>
        <p>Stable moon-phase explanation.</p>
      </main>
    `, '/moon-phase/'));
    expect(new Set(moonTexts).size).toBe(1);
    expect(moonTexts[0]).toContain('Upcoming lunations Stable moon-phase explanation.');

    // A legitimate dated disclosure is not removed merely for saying "as of".
    expect(renderedMainText('<main><p>Holdings as of 20 July 2026.</p></main>', '/disclosure/'))
      .toBe('Holdings as of 20 July 2026.');
    expect(sanitizeRenderedMainHtml('<p>Stable copy.</p>', '/learn/')).toBe('<p>Stable copy.</p>');
  });

  it('keeps whole words while balancing a short tail between chunks', () => {
    const source = Array.from({ length: 250 }, (_, index) => `word${index}`).join(' ');
    const chunks = chunkKnowledgeText(source);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ')).toBe(source);
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThanOrEqual(MIN_KNOWLEDGE_CHUNK_CHARS);
      expect(chunk.length).toBeLessThanOrEqual(MAX_KNOWLEDGE_CHUNK_CHARS);
    }
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
    expect(ASSISTANT_KNOWLEDGE_INDEX).toEqual(first.knowledgeIndex);
  });
});
