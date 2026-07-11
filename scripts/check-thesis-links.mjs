/*
 * QA gate for the thesis page: every markdown hyperlink in
 * zodiacs-thesis-v3.md must appear in public/thesis/index.html with the
 * SAME URL and the SAME anchor text (byte-for-byte, entity-decoded).
 *
 *   node scripts/check-thesis-links.mjs
 */
import { readFileSync } from 'node:fs';

const md = readFileSync('zodiacs-thesis-v3.md', 'utf8');
const html = readFileSync('public/thesis/index.html', 'utf8');

// Collapse the page's insignificant whitespace the way a renderer would,
// then compare anchors as (href, text) pairs.
const anchors = new Map();
for (const m of html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)) {
  const href = (m[1].match(/href="([^"]*)"/) ?? [])[1];
  const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    .replaceAll('&amp;', '&').replaceAll('&nbsp;', ' ');
  if (!href) continue;
  if (!anchors.has(href)) anchors.set(href, new Set());
  anchors.get(href).add(text);
}

let failures = 0;
let checked = 0;
for (const m of md.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
  const [, text, url] = m;
  checked += 1;
  const texts = anchors.get(url);
  if (!texts) {
    console.error(`MISSING URL   ${url}`);
    failures += 1;
  } else if (!texts.has(text)) {
    console.error(`TEXT MISMATCH ${url}\n  md:   "${text}"\n  page: ${[...texts].map((t) => `"${t}"`).join(' | ')}`);
    failures += 1;
  }
}
console.log(`check-thesis-links: ${checked} markdown links checked, ${failures} failures`);
process.exit(failures ? 1 : 0);
