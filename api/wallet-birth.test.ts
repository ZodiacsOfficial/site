import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWalletBirthCache,
  handleWalletBirth,
  isAllowedWalletRequest,
} from './wallet-birth';
import type { WalletBirthProvider } from '../src/lib/wallet/types';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const ENV = {
  NODE_ENV: 'production',
  PUBLIC_WALLET_CHART_ENABLED: '1',
  BASE_EXPLORER_API_KEY: 'secret',
};

function request(body: unknown = { address: ADDRESS }) {
  return {
    method: 'POST',
    headers: { origin: 'https://zodiacs.org', host: 'zodiacs.org' },
    body,
  };
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

beforeEach(() => clearWalletBirthCache());

describe('wallet birth endpoint', () => {
  it('requires an exact same-origin request', () => {
    expect(isAllowedWalletRequest(request(), ENV)).toBe(true);
    expect(isAllowedWalletRequest({ ...request(), headers: { origin: 'https://attacker.test', host: 'zodiacs.org' } }, ENV)).toBe(false);
    expect(isAllowedWalletRequest({ ...request(), headers: { host: 'zodiacs.org' } }, ENV)).toBe(false);
  });

  it('returns the neutral not-found outcome for malformed input', async () => {
    const response = responseRecorder();
    await handleWalletBirth(request({ address: 'invalid' }), response, { env: ENV });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'not_found' });
  });

  it('caches only public timestamp context and optional official sign slugs', async () => {
    const provider: WalletBirthProvider = {
      chain: 'base',
      resolveEarliestTransaction: vi.fn().mockResolvedValue({
        chain: 'base', address: ADDRESS, source: 'base-explorer',
        birthTimestamp: '2024-01-01T00:00:00.000Z',
      }),
    };
    const resolveHeldSigns = vi.fn().mockResolvedValue(['aries']);
    const first = responseRecorder();
    await handleWalletBirth(request(), first, { env: ENV, provider, resolveHeldSigns, now: () => 1_000 });
    const second = responseRecorder();
    await handleWalletBirth(request(), second, { env: ENV, provider, resolveHeldSigns, now: () => 2_000 });

    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({
      chain: 'base', address: ADDRESS, source: 'base-explorer',
      birthTimestamp: '2024-01-01T00:00:00.000Z', heldSigns: ['aries'],
    });
    expect(provider.resolveEarliestTransaction).toHaveBeenCalledTimes(1);
    expect(resolveHeldSigns).toHaveBeenCalledTimes(1);
    expect(first.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('is unavailable when the feature flag is off, before any provider call', async () => {
    const response = responseRecorder();
    await handleWalletBirth(request(), response, { env: { BASE_EXPLORER_API_KEY: 'secret' } });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
  });
});

