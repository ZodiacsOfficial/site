#!/usr/bin/env node
/*
 * The claims ledger's command line. It reads; it never writes the ledger.
 *
 *   node scripts/claims-ledger.mjs --unlisted       selected sentences the ledger lacks (what R1 fails on)
 *   node scripts/claims-ledger.mjs --orphans        listed sentences no longer selected, claims nothing makes
 *   node scripts/claims-ledger.mjs --summary        claims by status and topic, and the open overstated list
 *   node scripts/claims-ledger.mjs --skeleton PATH  draft records for PATH's unlisted sentences, to paste and classify
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  CLAIM_STATUSES,
  CLAIM_TOPICS,
  nearestRecord,
  readLedger,
  selectFileSentences,
  selectSentences,
} from './claims-ledger-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, argument] = process.argv.slice(2);
const ledger = readLedger(repoRoot);

const byPath = new Map();
for (const record of ledger.sentences) {
  if (!byPath.has(record.path)) byPath.set(record.path, []);
  byPath.get(record.path).push(record);
}

async function unlisted() {
  const { selected } = await selectSentences(repoRoot);
  let count = 0;
  for (const [path, sentences] of selected) {
    const listed = byPath.get(path) ?? [];
    const texts = new Set(listed.map((record) => record.text));
    for (const { text, topics } of sentences) {
      if (texts.has(text)) continue;
      count += 1;
      const near = nearestRecord(text, listed);
      console.log(`${path} [${topics.join(', ') || 'dense block'}]\n  ${text}${near ? `\n  did you edit: ${near.text} (${near.claim ?? `exempt ${near.exempt}`})` : ''}`);
    }
  }
  console.log(`${count} unlisted sentence${count === 1 ? '' : 's'}`);
  return count;
}

async function orphans() {
  const { selected } = await selectSentences(repoRoot);
  let count = 0;
  for (const [path, records] of byPath) {
    const texts = new Set((selected.get(path) ?? []).map((sentence) => sentence.text));
    for (const record of records) {
      if (texts.has(record.text)) continue;
      count += 1;
      console.log(`${path}: listed but not selected\n  ${record.text}`);
    }
  }
  const used = new Set([
    ...ledger.sentences.map((record) => record.claim).filter(Boolean),
    ...ledger.machine.map((entry) => entry.claim),
  ]);
  for (const claim of ledger.claims) {
    if (used.has(claim.id)) continue;
    count += 1;
    console.log(`${claim.id}: no sentence or receipt value makes this claim`);
  }
  console.log(`${count} orphan${count === 1 ? '' : 's'}`);
  return count;
}

function summary() {
  const sentences = new Map();
  for (const record of ledger.sentences) if (record.claim) sentences.set(record.claim, (sentences.get(record.claim) ?? 0) + 1);
  const rows = CLAIM_TOPICS.map((topic) => [topic, ...CLAIM_STATUSES.map((status) => ledger.claims
    .filter((claim) => claim.topic === topic && claim.status === status).length)]);
  const header = ['topic', ...CLAIM_STATUSES];
  const widths = header.map((cell, index) => Math.max(cell.length, ...rows.map((row) => String(row[index]).length)));
  const format = (row) => row.map((cell, index) => String(cell).padEnd(widths[index])).join('  ');
  console.log(format(header));
  for (const row of rows) console.log(format(row));
  const exempt = ledger.sentences.filter((record) => record.exempt).length;
  console.log(`\n${ledger.claims.length} claims, ${ledger.sentences.length} sentences (${exempt} exempt), ${ledger.machine.length} receipt values`);
  const open = ledger.claims.filter((claim) => claim.status !== 'supported');
  if (open.length) {
    console.log(`\nnot supported (${open.length}; maxOpenOverstated ${ledger.maxOpenOverstated}):`);
    for (const claim of open) {
      const resolution = claim.resolution ?? {};
      const route = resolution.step ? `step ${resolution.step}` : resolution.owner ? `owner ${resolution.owner}` : `allowance ${resolution.allowance}`;
      console.log(`  ${claim.status.padEnd(10)} ${claim.id} (${sentences.get(claim.id) ?? 0} sentences) → ${route}: ${resolution.note ?? ''}`);
    }
  }
}

async function skeleton(path) {
  if (!path) throw new Error('--skeleton needs a repository-relative path');
  const source = await readFile(resolve(repoRoot, path), 'utf8');
  const listed = new Set((byPath.get(path) ?? []).map((record) => record.text));
  for (const { text, topics } of await selectFileSentences(path, source)) {
    if (listed.has(text)) continue;
    console.log(`${JSON.stringify({ path, text, claim: '?' })}  // ${topics.join(', ') || 'dense block'}`);
  }
}

switch (command) {
  case '--unlisted':
    process.exitCode = (await unlisted()) ? 1 : 0;
    break;
  case '--orphans':
    process.exitCode = (await orphans()) ? 1 : 0;
    break;
  case '--summary':
    summary();
    break;
  case '--skeleton':
    await skeleton(argument);
    break;
  default:
    console.error('usage: node scripts/claims-ledger.mjs --unlisted | --orphans | --summary | --skeleton <path>');
    process.exitCode = 2;
}
