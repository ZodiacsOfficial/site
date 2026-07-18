import type { AuraCabinetHolding } from '../aura/types';

export type WalletChain = 'solana' | 'base';

export type WalletBirthSource =
  | 'solana-rpc'
  | 'base-explorer'
  | 'base-rpc-outgoing';

export interface WalletBirth {
  chain: WalletChain;
  address: string;
  /** Earliest supported transaction time, always serialized as UTC. */
  birthTimestamp: string;
  source: WalletBirthSource;
  /** Present only after a successful read-only official-asset balance check. */
  heldSigns?: string[];
}

/** Server-side provider boundary. It can read public chain history only. */
export interface WalletBirthProvider {
  readonly chain: WalletChain;
  resolveEarliestTransaction(address: string): Promise<Omit<WalletBirth, 'heldSigns'> | null>;
}

export interface AuraHoldings {
  chain: WalletChain;
  /** Canonical sign order retained for clients that predate cabinet finishes. */
  heldSigns: string[];
  /** One privacy-safe material classification for each represented sign. */
  holdings: AuraCabinetHolding[];
  /** Time the public balance check completed, always serialized as UTC. */
  checkedAt: string;
}

export type AuraHoldingsErrorCode =
  | 'invalid_address'
  | 'unavailable'
  | 'disabled'
  | 'forbidden'
  | 'method'
  | 'rate_limited';

export type WalletBirthErrorCode =
  | 'not_found'
  | 'unavailable'
  | 'history_too_deep'
  | 'disabled'
  | 'forbidden'
  | 'method';
