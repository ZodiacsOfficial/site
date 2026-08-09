import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = (path) => readFile(resolve(root, path), 'utf8');

const localeFiles = (surface) => [
  `src/pages/${surface}/index.astro`,
  ...['es', 'pt', 'fr', 'it', 'ru'].map((locale) => `src/pages/${locale}/${surface}/index.astro`),
];

describe('public trust-surface claims', () => {
  it('keeps the AI-readable context aligned with actual opt-in transmissions', async () => {
    const [short, full] = await Promise.all([text('public/llms.txt'), text('public/llms-full.txt')]);
    for (const copy of [short, full]) {
      expect(copy).toMatch(/12:00 local civil time/);
      expect(copy).toMatch(/angles.*houses/s);
      expect(copy).toMatch(/OpenAI/);
      expect(copy).toMatch(/(?:Attach my chart|selects? (?:it|a chart)|explicitly approved)/i);
      expect(copy).toMatch(/birth date.*time.*place.*coordinates/s);
      expect(copy).toMatch(/90 days/);
      expect(copy).toMatch(/IANA\/ICU.*(?:browser|runtime)/s);
      expect(copy).toMatch(/raw IP.*user agent.*24 hours/s);
    }
    expect(short).toMatch(/daily horoscopes RSS/);
    expect(short).not.toMatch(/monthly horoscopes RSS/i);
    expect(full).toMatch(/dated daily edition/);
  });

  it('does not overclaim host timezone coverage or unknown-time precision', async () => {
    const paths = [
      'src/pages/index.astro',
      ...localeFiles('birth-chart'),
      ...localeFiles('methodology'),
      ...localeFiles('moon-sign'),
      ...localeFiles('compatibility'),
      ...['en', 'es', 'pt', 'fr', 'it', 'ru'].map((locale) => `src/lib/i18n/ui/${locale}.ts`),
    ];
    const copy = (await Promise.all(paths.map(text))).join('\n');
    expect(copy).not.toMatch(/full IANA|complete IANA|complete historical database|historia(?:l)? completa|base completa (?:de |da |dell’)?IANA|todo o histórico|historique complet|tout l’historique|intera cronologia|полная история|полной баз/iu);
    expect(copy).not.toMatch(/planets (?:are|remain|are still) exact to the day|planets are exact for the day|planetas (?:son|siguen siendo) precisos para el día|posições dos planetas continuam precisas para o dia|planètes (?:sont|restent) précises pour la journée|pianeti restano precisi per il giorno|планеты .*точны для (?:этого )?дня/iu);
  });

  it('states the complete no-time policy on every methodology page', async () => {
    const rules = {
      en: [/12:00 local civil time/, /rising sign, angles, and houses/, /both adjacent signs remain possible/],
      es: [/12:00 del tiempo civil local/, /ascendente, ángulos y casas/, /ambos signos vecinos siguen siendo posibles/],
      pt: [/12:00 no horário civil local/, /ascendente, ângulos e casas/, /dois signos vizinhos continuam possíveis/],
      fr: [/12 h en heure civile locale/, /l’ascendant, les angles et les maisons/, /deux signes voisins restent possibles/],
      it: [/12:00 dell’ora civile locale/, /ascendente, angoli e case/, /entrambi i segni vicini restano possibili/],
      ru: [/12:00 местного гражданского времени/, /асцендент, углы и дома/, /возможны оба соседних знака/],
    };
    for (const [locale, patterns] of Object.entries(rules)) {
      const path = locale === 'en'
        ? 'src/pages/methodology/index.astro'
        : `src/pages/${locale}/methodology/index.astro`;
      const copy = await text(path);
      for (const pattern of patterns) expect(copy, `${path}: ${pattern}`).toMatch(pattern);
    }
  });

  it('names assistant consent and bounded analytics processing on every privacy page', async () => {
    for (const path of localeFiles('privacy')) {
      const copy = await text(path);
      expect(copy, path).toMatch(/OpenAI/);
      expect(copy, path).toMatch(/Plausible/);
      expect(copy, path).toMatch(/24 (?:hours|horas|heures|ore|часа)/u);
    }
    const [assistant, memory] = await Promise.all([
      text('src/lib/assistant/open-assistant.ts'),
      text('src/lib/assistant/memory.ts'),
    ]);
    expect(assistant).toMatch(/OpenAI/);
    expect(assistant).toMatch(/90 (?:days|días|dias|jours|giorni)/u);
    expect(memory).toMatch(/sessionStorage/);
  });

  it('discloses a provider pseudonym distinct from the quota pseudonym in every released locale', async () => {
    const paths = [
      'src/pages/privacy/index.astro',
      ...['es', 'pt', 'fr', 'it'].map((locale) => `src/pages/${locale}/privacy/index.astro`),
    ];
    const patterns = [
      /separate, domain-separated HMAC\s+pseudonym/iu,
      /seudónimo HMAC\s+distinto.*separación\s+de\s+dominio/isu,
      /pseudônimo HMAC\s+distinto.*separação\s+de\s+domínio/isu,
      /pseudonyme HMAC\s+distinct.*séparation\s+de\s+domaine/isu,
      /pseudonimo HMAC\s+distinto.*separazione\s+di\s+dominio/isu,
    ];
    const copies = await Promise.all(paths.map(text));
    copies.forEach((copy, index) => expect(copy, paths[index]).toMatch(patterns[index]));
    expect(copies.join('\n')).not.toMatch(/same pseudonym|mismo seudónimo|mesmo pseudônimo|même pseudonyme|stesso pseudonimo/iu);
  });

  it('keeps the runtime provider request aligned with the public disclosure', async () => {
    const [provider, handler, context] = await Promise.all([
      text('api/_assistant/openai.ts'),
      text('api/assistant.ts'),
      text('scripts/build-assistant-context.mjs'),
    ]);
    expect(provider).toMatch(/store:\s*false/);
    expect(provider).toMatch(/safety_identifier/);
    expect(handler).toMatch(/update\(`quota:\$\{clientIp\}`\)/);
    expect(handler).toMatch(/update\(`openai:\$\{visitorHash\}`\)/);
    expect(context).toMatch(/placements-only chart facts transiently to OpenAI/);
    expect(context).toMatch(/store is disabled/);
    expect(context).toMatch(/never sends the saved name, chart ID, birth date, birth time, birth place, or coordinates/);
  });
});

describe('repository operating claims', () => {
  it('keeps the canonical strategy precise about opt-in birth-data transmission', async () => {
    const strategy = await text('docs/STRATEGY.md');
    expect(strategy).not.toMatch(/birth data never leaves the device/iu);
    expect(strategy).toMatch(/chart calculation stays on the device/iu);
    expect(strategy).toMatch(/opts into account sync/iu);
    expect(strategy).toMatch(/types them into Ask Zodiacs/iu);
    expect(strategy).toMatch(/placements-only payload transiently to OpenAI/iu);
    expect(strategy).toMatch(/not the saved name, chart ID, birth date, time, place, or coordinates/iu);
  });

  it('keeps Growth OS measurement independent and aggregate-only', async () => {
    const [desk, review] = await Promise.all([
      text('docs/growth/playbooks/growth-signal-desk.md'),
      text('docs/growth/templates/weekly-review.md'),
    ]);
    for (const copy of [desk, review]) {
      expect(copy).toMatch(/independent(?:ly)? aggregate/iu);
      expect(copy).toMatch(/not .*linked.*user|never a linked visitor/isu);
      expect(copy).toMatch(/retention/iu);
      expect(copy).toMatch(/N\/A/u);
    }
    expect(`${desk}\n${review}`).not.toMatch(
      /eligible landing sessions|eligible returning visitors|visitors with a local save|consumer sessions|Journey scorecard/iu,
    );
  });

  it('records the accepted nonpersistent Plausible deduplication boundary in source and output', async () => {
    const [generator, report] = await Promise.all([
      text('scripts/build-build-report.mjs'),
      text('BUILD-REPORT.md'),
    ]);
    for (const copy of [generator, report]) {
      expect(copy).toMatch(/no cookies or persistent\/browser fingerprinting/iu);
      expect(copy).toMatch(/IP address and User-Agent/iu);
      expect(copy).toMatch(/site\/device\/day identifier/iu);
      expect(copy).toMatch(/salt rotates and is deleted every 24 hours/iu);
      expect(copy).toMatch(/no identifier is exposed to Zodiacs\.org or Growth OS/iu);
    }
  });
});

describe('homepage social card', () => {
  it('wires the reviewed byte-exact black 1200x630 card with prominent pastel symbols into homepage metadata', async () => {
    const [page, seo, bytes] = await Promise.all([
      text('src/pages/index.astro'),
      text('src/components/SEO.astro'),
      readFile(resolve(root, 'public/assets/og/v2/share-pastel-wheel-20260809.png')),
    ]);
    expect(page).toContain('image="/assets/og/v2/share-pastel-wheel-20260809.png"');
    expect(page).toMatch(/imageAlt="[^"]*large ring of twelve pastel zodiac symbols/);
    expect(seo).toContain('<meta property="og:image:type" content={imageType} />');
    expect(seo).toContain('<meta name="twitter:image" content={imageUrl} />');
    expect(createHash('sha256').update(bytes).digest('hex'))
      .toBe('c35c76b2452eec03fa3a20346f83de858ac8b42e6fa6f65ab128d8b4b8a51fcd');
  });
});
