import type { WalletChain } from './types';

const BASE_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_VALUES = new Map([...BASE58_ALPHABET].map((character, index) => [character, BigInt(index)]));

export interface ParsedWalletAddress {
  chain: WalletChain;
  address: string;
}

/** Decode only far enough to enforce Solana's 32-byte public-key contract. */
export function isSolanaAddress(value: string): boolean {
  if (value.length < 32 || value.length > 44) return false;
  let decoded = 0n;
  for (const character of value) {
    const digit = BASE58_VALUES.get(character);
    if (digit === undefined) return false;
    decoded = decoded * 58n + digit;
  }

  let payloadBytes = 0;
  while (decoded > 0n) {
    payloadBytes += 1;
    decoded >>= 8n;
  }
  let leadingZeroBytes = 0;
  while (value[leadingZeroBytes] === '1') leadingZeroBytes += 1;
  return payloadBytes + leadingZeroBytes === 32;
}

export function isBaseAddress(value: string): boolean {
  return BASE_ADDRESS.test(value);
}

export function parseWalletAddress(input: unknown): ParsedWalletAddress | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (isBaseAddress(value)) return { chain: 'base', address: value.toLowerCase() };
  if (isSolanaAddress(value)) return { chain: 'solana', address: value };
  return null;
}

export function truncateWalletAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 7)}…${address.slice(-6)}`;
}

