import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function normalizedWords(source) {
  return source
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function shingles(source, width = 5) {
  const words = normalizedWords(source);
  return new Set(words.slice(0, Math.max(0, words.length - width + 1))
    .map((_, index) => words.slice(index, index + width).join(' ')));
}

export function jaccardSimilarity(a, b) {
  const left = a instanceof Set ? a : shingles(a);
  const right = b instanceof Set ? b : shingles(b);
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export async function checkCollectionUniqueness(collection, { threshold = 0.42 } = {}) {
  const directory = resolve(root, `src/content/${collection}`);
  const names = (await readdir(directory)).filter((name) => name.endsWith('.mdx')).sort();
  const pages = await Promise.all(names.map(async (name) => ({
    name,
    grams: shingles(await readFile(resolve(directory, name), 'utf8')),
  })));
  const collisions = [];
  let highest = { similarity: 0, pair: [] };
  for (let i = 0; i < pages.length; i += 1) {
    for (let j = i + 1; j < pages.length; j += 1) {
      const similarity = jaccardSimilarity(pages[i].grams, pages[j].grams);
      if (similarity > highest.similarity) highest = { similarity, pair: [pages[i].name, pages[j].name] };
      if (similarity > threshold) collisions.push({ a: pages[i].name, b: pages[j].name, similarity });
    }
  }
  return { count: pages.length, threshold, collisions, highest };
}

export function checkPairUniqueness(options) {
  return checkCollectionUniqueness('pairs', options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await checkPairUniqueness();
  if (report.count !== 78) throw new Error(`Expected 78 compatibility bodies; found ${report.count}.`);
  if (report.collisions.length) {
    const rows = report.collisions.map((item) => `${item.a} <> ${item.b}: ${item.similarity.toFixed(3)}`);
    throw new Error(`Compatibility-page similarity threshold ${report.threshold} exceeded:\n${rows.join('\n')}`);
  }
  console.log(`Compatibility uniqueness: 78 pages · max ${report.highest.similarity.toFixed(3)} (${report.highest.pair.join(' <> ')}) · limit ${report.threshold}.`);
}
