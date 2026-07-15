import type {
  WalletBirth,
  WalletBirthProvider,
  WalletChain,
  WalletBirthSource,
} from './types';
import { validWalletProviderEndpoint, type WalletEnvironment } from './config';

type Fetcher = typeof fetch;

export class ProviderUnavailableError extends Error {}
export class HistoryCostBoundaryError extends Error {}

function positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function asUtcIso(seconds: unknown): string | null {
  const numeric = typeof seconds === 'string' ? Number(seconds) : seconds;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric) || numeric <= 0) return null;
  const date = new Date(numeric * 1_000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function responseJson(response: Response): Promise<any> {
  if (!response.ok) throw new ProviderUnavailableError(`upstream status ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new ProviderUnavailableError('upstream returned invalid JSON');
  }
}

export class SolanaWalletBirthProvider implements WalletBirthProvider {
  readonly chain = 'solana' as const;

  constructor(
    private readonly rpcUrl: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly maxPages = 200,
  ) {}

  async resolveEarliestTransaction(address: string): Promise<Omit<WalletBirth, 'heldSigns'> | null> {
    const pageSize = 1_000;
    let before: string | undefined;
    let earliest: number | null = null;

    for (let pageNumber = 0; pageNumber < this.maxPages; pageNumber += 1) {
      const options: Record<string, unknown> = { limit: pageSize, commitment: 'confirmed' };
      if (before) options.before = before;
      const response = await this.fetcher(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: pageNumber + 1,
          method: 'getSignaturesForAddress',
          params: [address, options],
        }),
      });
      const payload = await responseJson(response);
      if (payload.error || !Array.isArray(payload.result)) {
        throw new ProviderUnavailableError('Solana history query failed');
      }
      const page = payload.result as { signature?: unknown; blockTime?: unknown }[];
      if (page.length === 0) break;
      for (const item of page) {
        if (typeof item.blockTime === 'number' && Number.isFinite(item.blockTime)) {
          earliest = earliest === null ? item.blockTime : Math.min(earliest, item.blockTime);
        }
      }
      if (page.length < pageSize) break;
      const cursor = page.at(-1)?.signature;
      if (typeof cursor !== 'string' || !cursor || cursor === before) {
        throw new ProviderUnavailableError('Solana pagination cursor was invalid');
      }
      before = cursor;
      if (pageNumber === this.maxPages - 1) {
        throw new HistoryCostBoundaryError('Solana history exceeded the configured page boundary');
      }
    }

    const birthTimestamp = asUtcIso(earliest);
    return birthTimestamp
      ? { chain: this.chain, address, birthTimestamp, source: 'solana-rpc' }
      : null;
  }
}

export class BaseExplorerWalletBirthProvider implements WalletBirthProvider {
  readonly chain = 'base' as const;

  constructor(
    private readonly apiKey: string,
    private readonly apiUrl = 'https://api.etherscan.io/v2/api',
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async resolveEarliestTransaction(address: string): Promise<Omit<WalletBirth, 'heldSigns'> | null> {
    const url = new URL(this.apiUrl);
    url.searchParams.set('chainid', '8453');
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'txlist');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '1');
    url.searchParams.set('sort', 'asc');
    url.searchParams.set('apikey', this.apiKey);

    const payload = await responseJson(await this.fetcher(url));
    const first = Array.isArray(payload.result) ? payload.result[0] : undefined;
    if (!first) {
      const noTransactions = typeof payload.message === 'string'
        && payload.message.toLowerCase().includes('no transactions');
      if (noTransactions || payload.status === '0' && Array.isArray(payload.result)) return null;
      throw new ProviderUnavailableError('Base explorer history query failed');
    }
    const birthTimestamp = asUtcIso(first.timeStamp);
    if (!birthTimestamp) throw new ProviderUnavailableError('Base explorer timestamp was invalid');
    return { chain: this.chain, address, birthTimestamp, source: 'base-explorer' };
  }
}

export class BaseRpcWalletBirthProvider implements WalletBirthProvider {
  readonly chain = 'base' as const;
  private requestId = 0;

  constructor(
    private readonly rpcUrl: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  private async rpc(method: string, params: unknown[]): Promise<any> {
    const payload = await responseJson(await this.fetcher(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++this.requestId, method, params }),
    }));
    if (payload.error || payload.result === undefined) {
      throw new ProviderUnavailableError(`Base RPC ${method} failed`);
    }
    return payload.result;
  }

  private async transactionCount(address: string, block: number | 'latest'): Promise<number> {
    const tag = block === 'latest' ? block : `0x${block.toString(16)}`;
    const value = await this.rpc('eth_getTransactionCount', [address, tag]);
    const count = typeof value === 'string' ? Number.parseInt(value, 16) : Number.NaN;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new ProviderUnavailableError('Base RPC nonce was invalid');
    }
    return count;
  }

  async resolveEarliestTransaction(address: string): Promise<Omit<WalletBirth, 'heldSigns'> | null> {
    // Standard JSON-RPC has no address-history index. The monotonic account
    // nonce lets an archive node locate the first outgoing transaction only;
    // the UI must never describe this fallback as full incoming history.
    if (await this.transactionCount(address, 'latest') === 0) return null;
    const latestHex = await this.rpc('eth_blockNumber', []);
    const latest = typeof latestHex === 'string' ? Number.parseInt(latestHex, 16) : Number.NaN;
    if (!Number.isSafeInteger(latest) || latest < 0) {
      throw new ProviderUnavailableError('Base RPC head was invalid');
    }

    let low = 0;
    let high = latest;
    while (low < high) {
      const midpoint = Math.floor((low + high) / 2);
      if (await this.transactionCount(address, midpoint) > 0) high = midpoint;
      else low = midpoint + 1;
    }

    const block = await this.rpc('eth_getBlockByNumber', [`0x${low.toString(16)}`, true]);
    const transactions = Array.isArray(block?.transactions) ? block.transactions : [];
    const outgoing = transactions.find((transaction: any) =>
      typeof transaction?.from === 'string' && transaction.from.toLowerCase() === address.toLowerCase());
    if (!outgoing) throw new ProviderUnavailableError('Base RPC boundary block lacked the wallet transaction');
    const seconds = typeof block.timestamp === 'string' ? Number.parseInt(block.timestamp, 16) : Number.NaN;
    const birthTimestamp = asUtcIso(seconds);
    if (!birthTimestamp) throw new ProviderUnavailableError('Base RPC timestamp was invalid');
    return { chain: this.chain, address, birthTimestamp, source: 'base-rpc-outgoing' };
  }
}

class ExplorerWithRpcFallback implements WalletBirthProvider {
  readonly chain = 'base' as const;

  constructor(
    private readonly explorer: WalletBirthProvider,
    private readonly fallback?: WalletBirthProvider,
  ) {}

  async resolveEarliestTransaction(address: string): Promise<Omit<WalletBirth, 'heldSigns'> | null> {
    try {
      return await this.explorer.resolveEarliestTransaction(address);
    } catch (error) {
      if (!this.fallback || error instanceof HistoryCostBoundaryError) throw error;
      return this.fallback.resolveEarliestTransaction(address);
    }
  }
}

export function createWalletBirthProvider(
  chain: WalletChain,
  env: WalletEnvironment,
  fetcher: Fetcher = fetch,
): WalletBirthProvider | null {
  if (chain === 'solana') {
    const rpcUrl = env.SOLANA_RPC_URL?.trim();
    if (!rpcUrl || !validWalletProviderEndpoint(rpcUrl, env)) return null;
    return new SolanaWalletBirthProvider(
      rpcUrl,
      fetcher,
      positiveInteger(env.SOLANA_WALLET_MAX_PAGES, 200, 1_000),
    );
  }

  const rpcUrl = validWalletProviderEndpoint(env.BASE_RPC_URL, env)
    ? env.BASE_RPC_URL!.trim()
    : '';
  const fallback = rpcUrl ? new BaseRpcWalletBirthProvider(rpcUrl, fetcher) : undefined;
  const key = env.BASE_EXPLORER_API_KEY?.trim();
  if (!key) return fallback ?? null;
  const customExplorerUrl = env.BASE_EXPLORER_API_URL?.trim();
  if (customExplorerUrl && !validWalletProviderEndpoint(customExplorerUrl, env)) return fallback ?? null;
  const explorer = new BaseExplorerWalletBirthProvider(
    key,
    customExplorerUrl || undefined,
    fetcher,
  );
  return new ExplorerWithRpcFallback(explorer, fallback);
}

export function walletBirthSourceIsComplete(source: WalletBirthSource): boolean {
  return source !== 'base-rpc-outgoing';
}
