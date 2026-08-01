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

function tagParts(fragment, tag) {
  return [...fragment.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
    .map((match) => ({ attrs: match[1], inner: match[2], html: match[0] }));
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

describe('Gold, Bitcoin, and Zodiacs comparison contract', () => {
  const fig3 = sliceElement(HTML, /<figure\b[^>]*\bid=["']fig-3["'][^>]*>/i, 'figure');
  const table = sliceElement(fig3, /<table\b[^>]*class=["'][^"']*\bztbl\b[^"']*["'][^>]*>/i, 'table');

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
