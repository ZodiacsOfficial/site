/*
 * Builds assets/distribution.json — the ownership-spread snapshot behind
 * "The Standings". For each of the twelve registry mints it reads, from a
 * public Solana RPC:
 *
 *   - getTokenSupply          (total on-chain supply)
 *   - getTokenLargestAccounts (the 20 largest token accounts)
 *
 * and records what share of supply the largest 1 / 10 / 20 accounts hold.
 * The output deliberately calls these token accounts, not people or unique
 * wallets. Accounts can represent pools, bridges, exchanges, or custodians,
 * and one owner can use more than one account.
 *
 * Best-effort by design (same philosophy as the Trends layer of the
 * pulse): when the RPC fails for a sign, the previous snapshot's values
 * for that sign are kept with their original observation timestamps; when
 * there is no previous value the sign is omitted and the site renders a dash.
 *
 * Run from the repo root:
 *
 *   node scripts/build-distribution.mjs
 *
 * RPC_URL overrides the endpoint (default: api.mainnet-beta.solana.com,
 * falling back to solana-rpc.publicnode.com).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'public/assets/distribution.json');

const ENDPOINTS = [
  process.env.RPC_URL,
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com'
].filter(Boolean);

export const DISTRIBUTION_SCHEMA = 'zodiacs.distribution.v2';
export const DISTRIBUTION_COMMITMENT = 'finalized';

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
// Number) and rounded half-up to two decimals.
export function percentage(part, total) {
  if (total === 0n) return null;
  return Number((part * 10000n + total / 2n) / total) / 100;
}

async function readSign({ sign, mint }) {
  const options = { commitment: DISTRIBUTION_COMMITMENT };
  const supplyRes = await rpc('getTokenSupply', [mint, options]);
  const largestRes = await rpc('getTokenLargestAccounts', [mint, options]);
  const supply = BigInt(supplyRes.value.amount);
  const amounts = (largestRes.value ?? []).map((a) => BigInt(a.amount));
  const sumTop = (n) => amounts.slice(0, n).reduce((s, a) => s + a, 0n);
  const supplySlot = Number(supplyRes.context?.slot);
  const largestAccountsSlot = Number(largestRes.context?.slot);
  if (!Number.isSafeInteger(supplySlot) || !Number.isSafeInteger(largestAccountsSlot)) {
    throw new Error(`${sign}: RPC response is missing finalized context slots`);
  }
  return {
    capturedAt: new Date().toISOString(),
    captureMode: 'observed',
    commitment: DISTRIBUTION_COMMITMENT,
    supplySlot,
    largestAccountsSlot,
    supply: supplyRes.value.uiAmountString,
    accountsSampled: amounts.length,
    top1Pct: percentage(sumTop(1), supply),
    top10Pct: percentage(sumTop(10), supply),
    top20Pct: percentage(sumTop(20), supply)
  };
}

function legacyCapturedAt(value) {
  if (typeof value !== 'string' || !value) return null;
  return /^\d{4}-\d{2}-\d{2}$/u.test(value) ? `${value}T00:00:00.000Z` : value;
}

export function carryForwardSign(entry, priorDocumentCapturedAt = null) {
  const capturedAt = legacyCapturedAt(entry?.capturedAt ?? priorDocumentCapturedAt);
  if (!entry || !capturedAt) return null;
  const safeSlot = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  return {
    ...entry,
    capturedAt,
    captureMode: 'carried-forward',
    commitment: entry.commitment ?? DISTRIBUTION_COMMITMENT,
    supplySlot: safeSlot(entry.supplySlot),
    largestAccountsSlot: safeSlot(entry.largestAccountsSlot),
  };
}

export function shouldWriteSnapshot(observedCount) {
  return Number(observedCount) > 0;
}

export function distributionOutput(signs, { generatedAt, observedCount, expectedCount }) {
  const entries = Object.values(signs);
  const captured = entries
    .map((entry) => legacyCapturedAt(entry?.capturedAt))
    .filter(Boolean)
    .sort();
  const carriedForward = entries.filter((entry) => entry.captureMode === 'carried-forward').length;
  return {
    schema: DISTRIBUTION_SCHEMA,
    generatedAt,
    // Backward-compatible conservative date: the oldest observation included.
    // New consumers must use each sign's capturedAt.
    capturedAt: captured[0]?.slice(0, 10) ?? null,
    coverage: {
      expected: expectedCount,
      observedInRun: observedCount,
      carriedForward,
      missing: Math.max(0, expectedCount - entries.length),
    },
    method:
      'Finalized getTokenSupply + getTokenLargestAccounts via public Solana RPC. ' +
      'Shares compare raw native Solana supply with the largest token accounts. ' +
      'Token accounts are not verified people or unique wallet owners: one owner may use ' +
      'several accounts, and an account may represent a liquidity pool, bridge, exchange, ' +
      'or custodian. No real-world identity is inferred.',
    signs,
  };
}

export async function main() {
  const registry = JSON.parse(
    await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8')
  );
  const mints = registry.assets.map((asset) => {
    const solana = asset.representations.find((r) => r.chain === 'solana');
    if (!solana?.address) throw new Error(`Registry missing solana mint: ${asset.sign}`);
    return { sign: asset.sign, mint: solana.address };
  });

  let previous = { signs: {} };
  try {
    previous = JSON.parse(await readFile(outPath, 'utf8'));
  } catch {
    // first run — no previous snapshot to fall back on
  }

  const signs = {};
  let fresh = 0;
  for (const entry of mints) {
    try {
      signs[entry.sign] = await readSign(entry);
      fresh += 1;
    } catch (error) {
      const kept = carryForwardSign(previous.signs?.[entry.sign], previous.capturedAt);
      if (kept) {
        signs[entry.sign] = kept;
        console.warn(`${entry.sign}: RPC failed (${error.message}) — kept its prior observation date`);
      } else {
        console.warn(`${entry.sign}: RPC failed (${error.message}) — omitted`);
      }
    }
    await sleep(250);
  }

  if (!shouldWriteSnapshot(fresh)) {
    if (Object.keys(previous.signs ?? {}).length > 0) {
      console.warn('No sign was read fresh — leaving distribution.json unchanged.');
      return;
    }
    throw new Error('No sign could be read and no previous snapshot exists — not writing.');
  }

  const generatedAt = new Date().toISOString();
  const out = distributionOutput(signs, {
    generatedAt,
    observedCount: fresh,
    expectedCount: mints.length,
  });
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${outPath} — ${fresh}/${mints.length} signs read fresh.`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await main();
