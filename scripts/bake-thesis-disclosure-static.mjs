/**
 * Bake the current thesis disclosure JSONs into the static /thesis/ page.
 *
 * The page's render contract is JSON-first: every disclosure slot carries a
 * [data-field] and the browser re-hydrates it from the JSON files, so the
 * JSONs always win. This tool makes the static default match the JSONs, so
 * no-JavaScript readers see the same resolved values instead of the amber
 * pending chips. A field whose JSON status is "pending" is (re)baked as the
 * standing pending chip. Idempotent: re-running against unchanged JSONs is a
 * no-op.
 *
 * Run after `npm run data:disclosure` (or any manual JSON edit):
 *   node scripts/bake-thesis-disclosure-static.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = resolve(root, 'public/thesis/index.html');
const SECTIONS = [
  { id: 'the-instrument', json: 'public/thesis/thesis-disclosure.json', tracksUpdated: true },
  { id: 'the-candidacy', json: 'public/thesis/thesis-candidacy.json', tracksUpdated: false },
  { id: 'the-test', json: 'public/thesis/thesis-test.json', tracksUpdated: false },
];

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function fieldAt(data, path) {
  let node = data;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return null;
    node = node[part];
  }
  return node && typeof node === 'object' ? node : null;
}

function bakedMarkup(field, path) {
  if (!field || field.status === 'pending' || field.value == null) {
    return `<span class="pending-disclosure" data-field="${escapeHtml(path)}">Pending disclosure</span>`;
  }
  let inner = `<span class="disc-val">${escapeHtml(field.value)}</span>`;
  if (field.asOf) inner += `<span class="disc-asof"> as of ${escapeHtml(field.asOf)}</span>`;
  if (field.verifyUrl) {
    inner += `<a class="disc-verify" href="${escapeHtml(field.verifyUrl)}" rel="noopener noreferrer"> Verify ↗</a>`;
  }
  return `<span data-field="${escapeHtml(path)}">${inner}</span>`;
}

function sectionBounds(html, id) {
  const open = html.indexOf(`id="${id}"`);
  if (open === -1) throw new Error(`Section #${id} not found`);
  const start = html.lastIndexOf('<section', open);
  const end = html.indexOf('</section>', open);
  if (start === -1 || end === -1 || start > open) throw new Error(`Section #${id} is not a <section>`);
  return { start, end };
}

/** Extent of the complete <span …data-field…>…</span> element starting at openStart. */
function spanExtent(html, openStart) {
  const openEnd = html.indexOf('>', openStart);
  if (openEnd === -1) throw new Error('Unterminated span tag');
  let depth = 1;
  let cursor = openEnd + 1;
  while (depth > 0) {
    const nextOpen = html.indexOf('<span', cursor);
    const nextClose = html.indexOf('</span>', cursor);
    if (nextClose === -1) throw new Error('Unbalanced span nesting');
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 5;
    } else {
      depth -= 1;
      cursor = nextClose + '</span>'.length;
    }
  }
  return cursor;
}

let html = await readFile(pagePath, 'utf8');
let baked = 0;
let latest = null;

for (const { id, json, tracksUpdated } of SECTIONS) {
  const data = JSON.parse(await readFile(resolve(root, json), 'utf8'));
  let { start, end } = sectionBounds(html, id);

  let cursor = start;
  while (true) {
    const attr = html.indexOf('data-field="', cursor);
    if (attr === -1 || attr >= end) break;
    const spanStart = html.lastIndexOf('<span', attr);
    const path = html.slice(attr + 'data-field="'.length, html.indexOf('"', attr + 'data-field="'.length));
    const spanEnd = spanExtent(html, spanStart);
    const field = fieldAt(data, path);
    const replacement = bakedMarkup(field, path);
    if (tracksUpdated && field?.asOf && field.status !== 'pending' && (!latest || field.asOf > latest)) {
      latest = field.asOf;
    }
    html = html.slice(0, spanStart) + replacement + html.slice(spanEnd);
    baked += 1;
    end += replacement.length - (spanEnd - spanStart);
    cursor = spanStart + replacement.length;
  }

  // Scoreboard as-of column mirrors the client [data-asof-field] hydration.
  const section = html.slice(start, end).replace(
    /(<span class="score__d" role="cell" data-asof-field="([^"]+)">)[^<]*(<\/span>)/g,
    (match, open, path, close) => {
      const field = fieldAt(data, path);
      return `${open}${field?.asOf ? escapeHtml(field.asOf) : '—'}${close}`;
    },
  );
  html = html.slice(0, start) + section + html.slice(end);
}

if (latest) {
  html = html.replace(
    /(<p class="disc-updated" data-disclosure-updated>)[^<]*(<\/p>)/,
    `$1Last updated: ${escapeHtml(latest)}$2`,
  );
}

await writeFile(pagePath, html, 'utf8');
console.log(`baked ${baked} disclosure slots; instrument last updated ${latest ?? 'n/a'}`);
