/*
 * Find whitespace seams in rendered HTML copy. Run after `npm run build`:
 *
 *   node scripts/check-text-seams.mjs
 *
 * The scanner joins text across inline elements, where Astro/JSX whitespace
 * mistakes surface, but starts a new run at block elements. It ignores code,
 * scripts, styles, templates, SVG, MathML, hidden content, CSS-composed labels,
 * and formatting-only indentation. That keeps the report focused on prose a
 * visitor can read.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ROOT = resolve(repo, 'dist');

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'br', 'button', 'caption',
  'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'legend',
  'li', 'main', 'nav', 'ol', 'option', 'p', 'section', 'summary', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'wbr',
]);
const SKIP_TAGS = new Set([
  'code', 'footer', 'kbd', 'math', 'nav', 'noscript', 'pre', 'samp', 'script',
  'style', 'svg', 'template',
]);
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);
const CONNECTORS = new Set([
  'al', 'and', 'by', 'con', 'de', 'del', 'el', 'en', 'for', 'from', 'in', 'la',
  'las', 'los', 'of', 'or', 'para', 'por', 'sin', 'sobre', 'the', 'to', 'un',
  'una', 'unas', 'unos', 'with',
]);
const PROSE_TAGS = new Set(['blockquote', 'dd', 'dt', 'figcaption', 'p', 'summary']);
const ENTITIES = Object.freeze({
  amp: '&', apos: "'", gt: '>', lt: '<', mdash: '—', nbsp: '\u00a0',
  ndash: '–', quot: '"', rsquo: '’',
});

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, token) => {
    if (token[0] === '#') {
      const hexadecimal = token[1]?.toLowerCase() === 'x';
      const number = Number.parseInt(token.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : entity;
    }
    return ENTITIES[token.toLowerCase()] ?? entity;
  });
}

function renderedWhitespace(value) {
  return value.replace(/[\t\n\f\r ]+/g, ' ');
}

function excerpt(value, needle = '') {
  const text = renderedWhitespace(value).trim();
  const at = needle ? Math.max(0, text.indexOf(needle)) : 0;
  const start = Math.max(0, at - 55);
  const end = Math.min(text.length, at + Math.max(needle.length, 1) + 55);
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function parseTag(raw) {
  const closing = /^<\s*\//.test(raw);
  const name = raw.match(/^<\s*\/?\s*([\w:-]+)/)?.[1]?.toLowerCase();
  const composedText = /\sclass\s*=\s*(?:"[^"]*\b(?:dc|glossary__meta)\b[^"]*"|'[^']*\b(?:dc|glossary__meta)\b[^']*')/i.test(raw);
  return {
    closing,
    hidden: !closing && (/\s(?:hidden|inert)(?:\s|=|>|\/)/i.test(raw)
      || /\saria-hidden\s*=\s*(?:"true"|'true'|true)(?:\s|>|\/)/i.test(raw)
      || composedText),
    name,
    selfClosing: /\/\s*>$/.test(raw),
  };
}

function tagEnd(html, start) {
  let quote = '';
  for (let index = start + 1; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index + 1;
    }
  }
  return html.length;
}

function blockClosingIndex(html, from, tag) {
  const match = new RegExp(`<\\s*\\/\\s*${tag}\\s*>`, 'ig');
  match.lastIndex = from;
  const found = match.exec(html);
  return found ? found.index + found[0].length : html.length;
}

function doubledSpaceFindings(text) {
  const findings = [];
  for (const match of text.matchAll(/\S {2,}\S/g)) {
    const seam = match[0].slice(1, -1);
    findings.push({
      kind: 'doubled-space',
      match: seam,
      excerpt: excerpt(text, match[0]),
    });
  }
  return findings;
}

function runFindings(segments, { checkEmDashes }) {
  if (!segments.length) return [];
  const findings = [];
  const text = segments.map((segment) => segment.text).join('');
  const rendered = renderedWhitespace(text);

  if (checkEmDashes) {
    for (const match of rendered.matchAll(/\p{Ll}—\p{Ll}|\p{Ll}—|—\p{Ll}/gu)) {
      const after = rendered[match.index + match[0].length];
      // An em dash immediately before a closing quote marks interrupted speech,
      // not a parenthetical dash that needs surrounding spaces.
      if (match[0].endsWith('—') && /["'’”]/u.test(after ?? '')) continue;
      findings.push({
        kind: 'unspaced-em-dash',
        match: match[0],
        excerpt: excerpt(rendered, match[0]),
      });
    }
  }

  for (let index = 1; index < segments.length; index += 1) {
    const left = segments[index - 1].text;
    const right = segments[index].text;
    if (!left || !right || /\s$/u.test(left) || /^\s/u.test(right)) continue;

    const leftWord = left.match(/([\p{L}]+)$/u)?.[1];
    const rightLetter = right.match(/^([\p{L}])/u)?.[1];
    if (!leftWord || !rightLetter) continue;
    // A link may wrap a singular headword while the following text node
    // carries its plural suffix (for example, "Libra" + "s").
    if (/^(?:s|es)\b/u.test(right)) continue;

    const seam = `${leftWord}${right.match(/^[\p{L}]+/u)?.[0] ?? rightLetter}`;
    if (segments[index - 1].prose && segments[index].prose) {
      findings.push({
        kind: 'inline-letter-join',
        match: seam,
        excerpt: excerpt(rendered, seam),
      });
      continue;
    }
    if (!CONNECTORS.has(leftWord.toLowerCase())) continue;
    findings.push({
      kind: 'inline-word-join',
      match: seam,
      excerpt: excerpt(rendered, seam),
    });
  }

  return findings;
}

export function findTextSeams(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i);
  const body = bodyMatch?.[1] ?? html;
  const language = html.match(/<html\b[^>]*\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const languageCode = (language?.[1] ?? language?.[2] ?? language?.[3] ?? '').toLowerCase();
  const checkEmDashes = !languageCode.startsWith('es');
  const findings = [];
  const stack = [];
  let hiddenDepth = 0;
  let proseDepth = 0;
  let segments = [];

  const flush = () => {
    findings.push(...runFindings(segments, { checkEmDashes }));
    segments = [];
  };

  for (let index = 0; index < body.length;) {
    if (body.startsWith('<!--', index)) {
      const end = body.indexOf('-->', index + 4);
      index = end === -1 ? body.length : end + 3;
      continue;
    }

    if (body[index] !== '<') {
      const end = body.indexOf('<', index);
      const raw = body.slice(index, end === -1 ? body.length : end);
      if (!hiddenDepth && raw) {
        const text = decodeHtmlEntities(raw);
        findings.push(...doubledSpaceFindings(text));
        segments.push({ text, prose: proseDepth > 0 });
      }
      index = end === -1 ? body.length : end;
      continue;
    }

    if (body.startsWith('<!', index) || body.startsWith('<?', index)) {
      index = tagEnd(body, index);
      continue;
    }

    const end = tagEnd(body, index);
    const parsed = parseTag(body.slice(index, end));
    if (!parsed.name) {
      index = end;
      continue;
    }

    if (!parsed.closing && SKIP_TAGS.has(parsed.name)) {
      flush();
      index = blockClosingIndex(body, end, parsed.name);
      continue;
    }

    if (BLOCK_TAGS.has(parsed.name)) flush();

    if (parsed.closing) {
      let entry;
      do {
        entry = stack.pop();
        if (entry?.hidden) hiddenDepth -= 1;
        if (entry?.prose) proseDepth -= 1;
      } while (entry && entry.name !== parsed.name);
    } else if (!parsed.selfClosing && !VOID_TAGS.has(parsed.name)) {
      const prose = PROSE_TAGS.has(parsed.name);
      stack.push({ name: parsed.name, hidden: parsed.hidden, prose });
      if (prose) proseDepth += 1;
      if (parsed.hidden) {
        flush();
        hiddenDepth += 1;
      }
    }

    index = end;
  }
  flush();

  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.kind}|${finding.match}|${finding.excerpt}`;
    if (!unique.has(key)) unique.set(key, finding);
  }
  return [...unique.values()];
}

async function htmlFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

export async function checkTextSeams(root = DEFAULT_ROOT) {
  const files = await htmlFiles(root);
  const findings = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const finding of findTextSeams(html)) {
      findings.push({ file: relative(root, file), ...finding });
    }
  }
  return { files: files.length, findings };
}

async function main() {
  const root = resolve(process.argv[2] ?? DEFAULT_ROOT);
  if (!(await exists(root))) {
    console.error(`check-text-seams: ${relative(repo, root)}/ not found — run npm run build first.`);
    process.exitCode = 1;
    return;
  }

  const result = await checkTextSeams(root);
  if (result.findings.length) {
    console.error(`check-text-seams: ${result.findings.length} seam(s) in ${result.files} HTML files`);
    for (const finding of result.findings) {
      console.error(`  ✗ ${finding.file} [${finding.kind}: ${finding.match}] ${finding.excerpt}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`check-text-seams: OK — ${result.files} HTML files, no rendered text seams.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
