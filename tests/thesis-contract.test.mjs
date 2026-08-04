import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(resolve(ROOT, 'public/thesis/index.html'), 'utf8');
const MANUSCRIPT = readFileSync(resolve(ROOT, 'zodiacs-thesis-v4.md'), 'utf8');

const MATRIX = [
  ['Millennia of history', '✓', '×', '✓'],
  ['Ancient mythology and symbolism', '✓', '×', '✓'],
  ['Identity from birth', '×', '×', '✓'],
  ['Scarcity', '✓', '✓', '✓'],
  ['Fixed supply', '×', '✓', '✓'],
  ['Public verification', '×', '✓', '✓'],
  ['Digital ownership', '×', '✓', '✓'],
  ['Permissionless online transfer', '×', '✓', '✓'],
  ['Programmable', '×', '✓', '✓'],
  ['Base-layer settlement in seconds', '×', '×', '✓'],
  ['Predictably low base-layer fees', '×', '×', '✓'],
];

const MOVEMENTS = [
  'The sign you already carry',
  'A story that survived every medium',
  'Ownership becomes personal',
  'Modern rails',
  'Something you can carry',
];

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const KEY_COPY = [
  'Bitcoin made digital ownership possible. Zodiacs makes it personal.',
  'Before you had a username, you had a sign.',
  'Gold carries history and lore. Bitcoin made ownership digital. Solana makes it fast and efficient. Zodiacs brings those qualities to a sign people already know.',
  'Find your sign. See its record. Decide what it means to you.',
];

function decodeEntities(value) {
  return value
    .replace(/&times;|&#215;|&#xd7;/gi, '×')
    .replace(/&#10003;|&#x2713;/gi, '✓')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function textOf(fragment) {
  return decodeEntities(fragment)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<span\b[^>]*class=["'][^"']*\bdc\b[^"']*["'][^>]*>([^<]+)<\/span>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleTextOf(fragment) {
  const withoutScreenReaderLabels = fragment.replace(
    /<([a-z][\w-]*)\b[^>]*class=["'][^"']*\bsr-only\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
    ' ',
  );
  return textOf(withoutScreenReaderLabels);
}

function sliceElement(source, selectorPattern, tag) {
  const startMatch = source.match(selectorPattern);
  if (!startMatch || startMatch.index == null) return '';
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  tokens.lastIndex = startMatch.index;
  let depth = 0;
  let token;
  while ((token = tokens.exec(source))) {
    if (token[0].startsWith('</')) depth -= 1;
    else if (!token[0].endsWith('/>')) depth += 1;
    if (depth === 0) return source.slice(startMatch.index, tokens.lastIndex);
  }
  return '';
}

function sliceMatchedElement(source, selectorPattern) {
  const startMatch = source.match(selectorPattern);
  const tag = startMatch?.[0].match(/^<([a-z][\w-]*)\b/i)?.[1];
  return tag ? sliceElement(source, selectorPattern, tag) : '';
}

function tagParts(fragment, tag) {
  return [...fragment.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
    .map((match) => ({ attrs: match[1], inner: match[2], html: match[0] }));
}

function voidTagParts(fragment, tag) {
  return [...fragment.matchAll(new RegExp(`<${tag}\\b([^>]*)\\/?>`, 'gi'))]
    .map((match) => ({ attrs: match[1], html: match[0] }));
}

function classedDetailsRemoved(source) {
  return source.replace(
    /<details\b[^>]*class=["'][^"']*\bevidence-drawer\b[^"']*["'][^>]*>[\s\S]*?<\/details>/gi,
    (drawer) => drawer.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? ' ',
  );
}

function visibleEssayText() {
  let essay = sliceElement(HTML, /<article\b[^>]*\bid=["']essay["'][^>]*>/i, 'article');
  const evidenceVault = essay.search(/<details\b[^>]*class=["'][^"']*\bevidence-vault\b/i);
  if (evidenceVault !== -1) essay = essay.slice(0, evidenceVault);
  essay = classedDetailsRemoved(essay)
    .replace(/<section\b[^>]*\bid=["']changelog["'][^>]*>[\s\S]*?<\/section>/gi, ' ');
  return visibleTextOf(essay).toLowerCase();
}

describe('thesis Nº 09 editorial contract', () => {
  it('keeps the edition, five movements, and central consumer copy in sync', () => {
    const htmlText = textOf(HTML).toLowerCase();
    const manuscriptText = MANUSCRIPT.replace(/[*_#>`]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    const htmlMovements = tagParts(HTML, 'h2')
      .filter(({ attrs }) => /class=["'][^"']*\bmov__title\b/i.test(attrs))
      .slice(0, 5)
      .map(({ inner }) => textOf(inner).replace(/\.$/, ''));
    const manuscriptMovements = [...MANUSCRIPT.matchAll(/^## Part [IVX]+\.\s+(.+)$/gm)]
      .slice(0, 5)
      .map((match) => match[1].replace(/[*_]/g, '').replace(/\.$/, ''));

    expect(htmlText).toContain('nº 09');
    expect(manuscriptText).toContain('nº 09');
    expect(htmlMovements).toEqual(MOVEMENTS);
    expect(manuscriptMovements).toEqual(MOVEMENTS);
    for (const phrase of [...MOVEMENTS, ...KEY_COPY]) {
      expect(htmlText, `HTML is missing: ${phrase}`).toContain(phrase.toLowerCase());
      expect(manuscriptText, `manuscript is missing: ${phrase}`).toContain(phrase.toLowerCase());
    }
  });

  it('keeps defensive and adverse language out of the visible reading path', () => {
    const visible = visibleEssayText();
    const rejected = [
      'dead bag',
      'adverse events',
      'young records',
      'attention is an input, never proof of demand',
      'demand is not proven',
      'not proof of demand',
      'not proof of lasting demand',
      'it does not show that they want these records',
      'that distinction is the honest center of the thesis',
      'these records must earn their own place',
      'whether people choose these particular records is still unproven',
      'none of it transfers to a token automatically',
      'this is not a replacement for bitcoin',
      'still has to be earned',
      'what still has to be earned',
      'a young record with nothing hidden',
      'independent adoption has not arrived',
      'the questions we should ask',
      'the possibility is beautiful',
      'the outcome is not promised',
      'the technology becomes a smooth path beneath the story',
    ];
    for (const phrase of rejected) {
      expect(visible, `visible essay still contains: ${phrase}`).not.toContain(phrase);
    }
  });
});

describe('thesis hero icon contract', () => {
  const heroIcons = sliceElement(
    HTML,
    /<div\b[^>]*class=["'][^"']*\bhero__twelve\b[^"']*["'][^>]*>/i,
    'div',
  );

  it('uses the twelve canonical pastel icons in registry order', () => {
    const links = tagParts(heroIcons, 'a');
    expect(links).toHaveLength(12);
    links.forEach(({ attrs, inner }, index) => {
      const slug = SIGNS[index];
      const label = `${slug[0].toUpperCase()}${slug.slice(1)} — registry record`;
      expect(attrs).toMatch(new RegExp(`\\bhref=["']/registry/${slug}/["']`, 'i'));
      expect(attrs).toContain(`aria-label="${label}"`);
      expect(inner).toContain(`src="/assets/zodiac-icons/48/${slug}.webp"`);
      expect(inner).toMatch(/class="hero__twelve-icon"/);
      expect(inner).toMatch(/\bwidth="24"\s+height="24"/);
      expect(inner).toMatch(/\balt=""/);
      expect(inner).toMatch(/\baria-hidden="true"/);
    });
  });

  it('contains no platform-rendered zodiac emoji or legacy glyph spans', () => {
    expect(heroIcons).not.toMatch(/[♈♉♊♋♌♍♎♏♐♑♒♓]/u);
    expect(heroIcons).not.toContain('hero__twelve-glyph');
  });
});

describe('thesis hero background contract', () => {
  const hero = sliceElement(HTML, /<header\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>/i, 'header');

  it('keeps the ambient zodiac-clock video and its lightweight poster', () => {
    const videos = tagParts(hero, 'video');
    expect(videos).toHaveLength(1);
    expect(videos[0].attrs).toMatch(/class="hero__media"/);
    expect(videos[0].attrs).not.toMatch(/\bautoplay\b/);
    expect(videos[0].attrs).toMatch(/\bmuted\b/);
    expect(videos[0].attrs).toMatch(/\bloop\b/);
    expect(videos[0].attrs).toMatch(/\bplaysinline\b/);
    expect(videos[0].attrs).toContain('preload="auto"');
    expect(videos[0].attrs).toContain('poster="/assets/art/zodiac-clock-768.avif"');
    expect(videos[0].attrs).toContain('fetchpriority="high"');
    expect(videos[0].inner).toContain('src="/assets/art/zodiac-clock.mp4"');
    expect(HTML).toContain('<link rel="preload" as="image" type="image/avif" href="/assets/art/zodiac-clock-768.avif" fetchpriority="high" />');
  });

  it('does not replace the moving background with a static canvas', () => {
    expect(hero).not.toContain('data-hero-art');
    expect(hero).not.toMatch(/<canvas\b/i);
  });
});

describe('thesis transmission and gallery contract', () => {
  const fig1 = sliceElement(HTML, /<figure\b[^>]*\bid=["']fig-1["'][^>]*>/i, 'figure');
  const eras = [...fig1.matchAll(
    /<div\b([^>]*class=["'][^"']*\bera\b[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi,
  )].map((match) => ({ attrs: match[1], inner: match[2], html: match[0] }));
  const holding = sliceElement(
    HTML,
    /<section\b[^>]*\bid=["']what-holding-means["'][^>]*>/i,
    'section',
  );
  const galleryTag = /<[a-z][^>]*\bdata-gallery-stage(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>/i;
  const gallery = sliceMatchedElement(holding, galleryTag);

  it('ends F1 with the canonical circle image and exact digital-asset copy', () => {
    expect(eras).toHaveLength(7);
    const finalEra = eras.at(-1);
    const name = sliceElement(
      finalEra?.inner ?? '',
      /<span\b[^>]*class=["'][^"']*\bera__name\b[^"']*["'][^>]*>/i,
      'span',
    );
    const time = sliceElement(
      finalEra?.inner ?? '',
      /<span\b[^>]*class=["'][^"']*\bera__time\b[^"']*["'][^>]*>/i,
      'span',
    );
    const images = voidTagParts(finalEra?.inner ?? '', 'img');

    expect(textOf(name)).toBe('Digital asset');
    expect(textOf(time)).toBe('5 Jul 2024');
    expect(images).toHaveLength(1);
    expect(images[0].attrs).toMatch(/\bsrc=["']\/assets\/app-icons\/v3\/icon-192\.png["']/i);
    expect(images[0].attrs).toMatch(/\balt=["']["']/i);
    expect(finalEra?.inner).not.toMatch(/<svg\b/i);
  });

  it('places one gallery after the Section IV network evidence drawer', () => {
    const allGalleryTags = [...HTML.matchAll(new RegExp(galleryTag.source, 'gi'))];
    const sectionGalleryTags = [...holding.matchAll(new RegExp(galleryTag.source, 'gi'))];
    const drawer = sliceElement(
      holding,
      /<details\b[^>]*class=["'][^"']*\bevidence-drawer\b[^"']*["'][^>]*>/i,
      'details',
    );
    const drawerEnd = holding.indexOf(drawer) + drawer.length;
    const galleryStart = holding.indexOf(gallery);

    expect(holding).not.toBe('');
    expect(drawer).not.toBe('');
    expect(allGalleryTags).toHaveLength(1);
    expect(sectionGalleryTags).toHaveLength(1);
    expect(gallery).not.toBe('');
    expect(galleryStart).toBeGreaterThanOrEqual(drawerEnd);
  });

  it('removes the gallery display labels while retaining an accessible figure and stage name', () => {
    const galleryFigure = sliceElement(
      holding,
      /<figure\b[^>]*\bdata-thesis-gallery\b[^>]*>/i,
      'figure',
    );
    const stageAttrs = gallery.match(/^<[a-z][^>]*>/i)?.[0] ?? '';
    const caption = tagParts(galleryFigure, 'figcaption');

    expect(galleryFigure).not.toBe('');
    expect(caption).toHaveLength(1);
    expect(caption[0].attrs).toMatch(/\bclass=["'][^"']*\bsr-only\b/i);
    expect(galleryFigure).not.toMatch(/\bthesis-gallery__head\b/i);
    expect(galleryFigure).not.toMatch(/\bgband__fallback-title\b/i);
    expect(visibleTextOf(galleryFigure)).not.toMatch(/\bthe gallery\b|\bgold sculptures\b/i);
    expect(stageAttrs).toMatch(/\baria-label=["'][^"']+["']/i);
    expect(stageAttrs).not.toMatch(/\bthe gallery\b|\bgold sculptures\b/i);
  });

  it('keeps exactly twelve linked fallback records inside the gallery', () => {
    const fallback = sliceMatchedElement(
      gallery,
      /<[a-z][^>]*\bdata-gallery-fallback(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>/i,
    );
    const links = tagParts(fallback, 'a')
      .filter(({ attrs }) => /\bdata-gallery-fallback-record\b/i.test(attrs));
    const images = voidTagParts(fallback, 'img');

    expect(fallback).not.toBe('');
    expect(links).toHaveLength(12);
    expect(images).toHaveLength(12);
    links.forEach(({ attrs, inner }, index) => {
      const slug = SIGNS[index];
      const image = voidTagParts(inner, 'img');
      const ariaLabel = attrs.match(/\baria-label=["']([^"']*)["']/i)?.[1] ?? '';
      const imageAlt = image[0]?.attrs.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
      const accessibleCopy = `${ariaLabel} ${imageAlt} ${textOf(inner)}`;

      expect(attrs).toMatch(new RegExp(`\\bhref=["']/registry/${slug}/["']`, 'i'));
      expect(image).toHaveLength(1);
      expect(image[0].attrs).toMatch(new RegExp(
        `\\bsrc=["']/assets/nuggets/thumb/${slug}\\.png["']`,
        'i',
      ));
      expect(accessibleCopy).toMatch(new RegExp(slug, 'i'));
    });
  });

  it('references the gallery bundle only from a viewport-lazy loader', () => {
    const loaders = tagParts(HTML, 'script')
      .filter(({ attrs, inner }) => /\/assets\/gallery\.js/.test(`${attrs} ${inner}`));

    expect(loaders).toHaveLength(1);
    expect(loaders[0].attrs).not.toMatch(/\bsrc=["']\/assets\/gallery\.js["']/i);
    expect(loaders[0].inner).toContain('/assets/gallery.js');
    expect(loaders[0].inner).toMatch(/\bIntersectionObserver\b/);
    expect(HTML).not.toMatch(/<script\b[^>]*\bsrc=["']\/assets\/gallery\.js["'][^>]*>/i);
  });
});

describe('Gold, Bitcoin, and Zodiacs comparison contract', () => {
  const fig3 = sliceElement(HTML, /<figure\b[^>]*\bid=["']fig-3["'][^>]*>/i, 'figure');
  const convergence = sliceElement(
    fig3,
    /<div\b[^>]*class=["'][^"']*\bsource-convergence\b[^"']*["'][^>]*>/i,
    'div',
  );
  const table = sliceElement(fig3, /<table\b[^>]*class=["'][^"']*\bztbl\b[^"']*["'][^>]*>/i, 'table');

  it('explicitly connects all three sources to the Zodiacs result', () => {
    const links = [...convergence.matchAll(
      /\bdata-convergence-link=["']([^"']+)["']/gi,
    )].map((match) => match[1]);

    expect(convergence).not.toBe('');
    expect([...new Set(links)]).toEqual(['gold', 'bitcoin', 'solana']);
    expect(links).toHaveLength(6);
    expect(convergence).toMatch(/\bdata-convergence-connectors\b/i);
    expect(convergence).toMatch(/\bdata-convergence-result\b/i);
    expect(convergence).toMatch(/\brole=["']group["']/i);
    expect(convergence).toMatch(
      /aria-label=["']Gold, Bitcoin, and Solana combine to form Zodiacs["']/i,
    );
  });

  it('uses a single bullion-bar mark for Gold in the diagram and table', () => {
    expect([...fig3.matchAll(/\bdata-icon=["']gold-bar["']/gi)]).toHaveLength(2);
    expect([...fig3.matchAll(/\bdata-gold-bar\b/gi)]).toHaveLength(2);
  });

  it('is always visible rather than nested in a disclosure', () => {
    expect(fig3).not.toBe('');
    expect(table).not.toBe('');
    const tableStart = fig3.indexOf(table);
    const beforeTable = fig3.slice(0, tableStart);
    const openedDetails = (beforeTable.match(/<details\b/gi) ?? []).length;
    const closedDetails = (beforeTable.match(/<\/details>/gi) ?? []).length;
    expect(openedDetails, 'comparison table has an open <details> ancestor').toBe(closedDetails);
    expect(fig3).toMatch(/class=["'][^"']*\bcomparison-panel\b/);
  });

  it('uses accessible column and row headers for exactly eleven approved properties', () => {
    const thead = sliceElement(table, /<thead\b[^>]*>/i, 'thead');
    const tbody = sliceElement(table, /<tbody\b[^>]*>/i, 'tbody');
    const columnHeaders = tagParts(thead, 'th');
    const rows = tagParts(tbody, 'tr');

    expect(columnHeaders).toHaveLength(4);
    expect(columnHeaders.every(({ attrs }) => /\bscope=["']col["']/i.test(attrs))).toBe(true);
    expect(columnHeaders.map(({ inner }) => textOf(inner))).toEqual(['Property', 'Gold', '₿ Bitcoin', 'Zodiacs']);
    expect(rows).toHaveLength(11);
    expect(rows.map(({ inner }) => textOf(tagParts(inner, 'th')[0]?.inner ?? '')))
      .toEqual(MATRIX.map(([property]) => property));
    for (const { inner } of rows) {
      const rowHeaders = tagParts(inner, 'th');
      expect(rowHeaders).toHaveLength(1);
      expect(rowHeaders[0].attrs).toMatch(/\bscope=["']row["']/i);
      const rowId = rowHeaders[0].attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
      expect(rowId).toBeTruthy();
      tagParts(inner, 'td').forEach(({ attrs }, column) => {
        const headers = attrs.match(/\bheaders=["']([^"']+)["']/i)?.[1]?.split(/\s+/) ?? [];
        expect(headers).toEqual([rowId, ['gold-col', 'bitcoin-col', 'zodiacs-col'][column]]);
      });
    }
  });

  it('renders only a check or X in every comparison cell, plus an sr-only label', () => {
    const tbody = sliceElement(table, /<tbody\b[^>]*>/i, 'tbody');
    const rows = tagParts(tbody, 'tr');
    const actual = rows.map(({ inner }) => {
      const rowHeader = tagParts(inner, 'th')[0];
      const cells = tagParts(inner, 'td');
      expect(cells).toHaveLength(3);
      const marks = cells.map(({ inner: cell }) => visibleTextOf(cell));
      cells.forEach(({ inner: cell }, column) => {
        expect(cell).toMatch(/class=["'][^"']*\bcomparison-mark\b/);
        expect(cell).toMatch(/class=["'][^"']*\bcomparison-mark\b[^>]*aria-hidden=["']true["']/);
        expect(cell).toMatch(/class=["'][^"']*\bsr-only\b/);
        const srOnly = cell.match(/<[^>]*class=["'][^"']*\bsr-only\b[^"']*["'][^>]*>([\s\S]*?)<\//i);
        expect(textOf(srOnly?.[1] ?? '')).toBe(marks[column] === '✓' ? 'Yes' : 'No');
        expect(['✓', '×']).toContain(marks[column]);
      });
      return [textOf(rowHeader?.inner ?? ''), ...marks];
    });

    expect(actual).toEqual(MATRIX);
    expect(actual.every((row) => row[3] === '✓'), 'every Zodiacs property should be checked').toBe(true);
  });

  it('keeps explanations and sources outside the matrix', () => {
    const measurementDrawer = fig3.match(
      /<details\b[^>]*class=["'][^"']*\bevidence-drawer\b[^"']*["'][^>]*>[\s\S]*?<\/details>/i,
    )?.[0] ?? '';
    expect(textOf(measurementDrawer)).toMatch(/How this comparison is measured/i);
    expect(visibleTextOf(table)).not.toMatch(/\b(?:yes|no|limited|unproven)\b/i);
  });
});

describe('thesis disclosure compatibility contract', () => {
  it.each(['the-candidacy', 'the-test', 'the-instrument'])('preserves section #%s', (id) => {
    expect(HTML).toMatch(new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i'));
  });

  it('preserves all 114 baked disclosure field slots', () => {
    expect([...HTML.matchAll(/\bdata-field=["'][^"']+["']/g)]).toHaveLength(114);
  });
});
