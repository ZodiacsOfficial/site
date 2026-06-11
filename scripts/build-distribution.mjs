/*
 * Builds assets/distribution.json — the ownership-spread snapshot behind
 * "The Standings". For each of the twelve registry mints it reads, from a
 * public Solana RPC:
 *
 *   - getTokenSupply          (total on-chain supply)
 *   - getTokenLargestAccounts (the 20 largest token accounts)
 *
 * and records what share of supply the largest 1 / 10 / 20 accounts hold.
 * Honesty note carried on-site: the largest accounts include DEX liquidity
 * pools, so wallet concentration is lower than the raw figures read.
 *
 * Best-effort by design (same philosophy as the Trends layer of the
 * pulse): when the RPC fails for a sign, the previous snapshot's values
 * for that sign are kept; when there is no previous value the sign is
 * omitted and the site renders a dash.
 *
 * Run from the repo root:
 *
 *   node scripts/build-distribution.mjs
 *
 * RPC_URL overrides the endpoint (default: api.mainnet-beta.solana.com,
 * falling back to solana-rpc.publicnode.com).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'assets/distribution.json');

const ENDPOINTS = [
  process.env.RPC_URL,
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com'
].filter(Boolean);

const registry = JSON.parse(
  await readFile(resolve(root, 'registry/zodiacs.registry.json'), 'utf8')
);

const MINTS = registry.assets.map((asset) => {
  const solana = asset.representations.find((r) => r.chain === 'solana');
  if (!solana?.address) throw new Error(`Registry missing solana mint: ${asset.sign}`);
  return { sign: asset.sign, mint: solana.address };
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let endpointIndex = 0;
async function rpc(method, params) {
  let lastError;
  for (let i = endpointIndex; i < ENDPOINTS.length; i += 1) {
    try {
      const res = await fetch(ENDPOINTS[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
      });
      if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(`${method}: ${json.error.message || 'rpc error'}`);
      endpointIndex = i; // stick with the endpoint that answered
      return json.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`${method}: no endpoint reachable`);
}

// Shares are computed on raw integer amounts (BigInt — supplies overflow
// Number) and rounded to two decimals.
function pct(part, total) {
  if (total === 0n) return null;
  return Number((part * 10000n) / total) / 100;
}

async function readSign({ sign, mint }) {
  const supplyRes = await rpc('getTokenSupply', [mint]);
  const largestRes = await rpc('getTokenLargestAccounts', [mint]);
  const supply = BigInt(supplyRes.value.amount);
  const amounts = (largestRes.value ?? []).map((a) => BigInt(a.amount));
  const sumTop = (n) => amounts.slice(0, n).reduce((s, a) => s + a, 0n);
  return {
    supply: supplyRes.value.uiAmountString,
    accountsSampled: amounts.length,
    top1Pct: pct(sumTop(1), supply),
    top10Pct: pct(sumTop(10), supply),
    top20Pct: pct(sumTop(20), supply)
  };
}

let previous = { signs: {} };
try {
  previous = JSON.parse(await readFile(outPath, 'utf8'));
} catch {
  // first run — no previous snapshot to fall back on
}

const signs = {};
let fresh = 0;
for (const entry of MINTS) {
  try {
    signs[entry.sign] = await readSign(entry);
    fresh += 1;
  } catch (error) {
    const kept = previous.signs?.[entry.sign];
    if (kept) {
      signs[entry.sign] = kept;
      console.warn(`${entry.sign}: RPC failed (${error.message}) — kept previous values`);
    } else {
      console.warn(`${entry.sign}: RPC failed (${error.message}) — omitted`);
    }
  }
  await sleep(250);
}

if (fresh === 0 && Object.keys(signs).length === 0) {
  console.error('No sign could be read and no previous snapshot exists — not writing.');
  process.exit(1);
}

const out = {
  capturedAt: new Date().toISOString().slice(0, 10),
  method:
    'getTokenSupply + getTokenLargestAccounts via public Solana RPC. ' +
    'Shares are of raw on-chain supply; the largest accounts include ' +
    'DEX liquidity pools, so wallet concentration is lower than the ' +
    'raw figures read.',
  signs
};

await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${fresh}/${MINTS.length} signs read fresh.`);
