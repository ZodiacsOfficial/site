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

export type WalletBirthErrorCode =
  | 'not_found'
  | 'unavailable'
  | 'history_too_deep'
  | 'disabled'
  | 'forbidden'
  | 'method';

