import { isBaseAddress, isSolanaAddress } from './address';
import type { WalletChain } from './types';

interface BrowserEventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
}

interface StandardAccount {
  address: string;
  chains?: readonly string[];
}

interface StandardConnectFeature {
  connect(): Promise<{ accounts?: readonly StandardAccount[] }>;
}

interface StandardDisconnectFeature {
  disconnect(): Promise<void>;
}

interface StandardEventsFeature {
  on(event: 'change', listener: (change: { accounts?: readonly StandardAccount[] }) => void): () => void;
}

export interface StandardWallet {
  name: string;
  /** Wallet Standard self-announced icon (a data URI per the spec). */
  icon?: string;
  accounts?: readonly StandardAccount[];
  features: Record<string, unknown> & {
    'standard:connect'?: StandardConnectFeature;
    'standard:disconnect'?: StandardDisconnectFeature;
    'standard:events'?: StandardEventsFeature;
  };
}

export interface Eip1193Provider {
  request(input: { method: 'eth_requestAccounts' }): Promise<unknown>;
  on?(event: 'accountsChanged' | 'disconnect', listener: (value?: unknown) => void): void;
  removeListener?(event: 'accountsChanged' | 'disconnect', listener: (value?: unknown) => void): void;
  off?(event: 'accountsChanged' | 'disconnect', listener: (value?: unknown) => void): void;
}

export interface Eip6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon?: string;
    rdns?: string;
  };
  provider: Eip1193Provider;
}

export interface ConnectedWalletSession {
  chain: WalletChain;
  address: string;
  walletName: string;
  disconnect(): Promise<void>;
  dispose(): void;
}

export type AccountChangeHandler = (address: string | null) => void;

function CustomEventConstructor(): typeof CustomEvent {
  return globalThis.CustomEvent;
}

function solanaAccount(accounts: readonly StandardAccount[] | undefined): StandardAccount | null {
  return accounts?.find((account) => (
    isSolanaAddress(account.address)
    && (!account.chains?.length || account.chains.some((chain) => chain.startsWith('solana:')))
  )) ?? null;
}

/**
 * Minimal Wallet Standard discovery. Registration is passive; no account API
 * is called until the visitor presses a wallet button.
 */
export function watchSolanaWallets(
  onWallets: (wallets: readonly StandardWallet[]) => void,
  target: BrowserEventTarget = window,
): () => void {
  const wallets = new Set<StandardWallet>();
  const publish = () => onWallets([...wallets].sort((a, b) => a.name.localeCompare(b.name)));
  const api = Object.freeze({
    register: (...registered: StandardWallet[]) => {
      for (const wallet of registered) {
        if (wallet?.features?.['standard:connect']) wallets.add(wallet);
      }
      publish();
      return () => {
        for (const wallet of registered) wallets.delete(wallet);
        publish();
      };
    },
  });
  const receive = ((event: Event) => {
    const callback = (event as Event & { detail?: unknown }).detail;
    if (typeof callback === 'function') callback(api);
  }) as EventListener;

  target.addEventListener('wallet-standard:register-wallet', receive);
  const AppReadyEvent = CustomEventConstructor();
  target.dispatchEvent(new AppReadyEvent('wallet-standard:app-ready', { detail: api }));
  publish();

  return () => target.removeEventListener('wallet-standard:register-wallet', receive);
}

export async function connectSolanaWallet(
  wallet: StandardWallet,
  onAccountChange: AccountChangeHandler,
): Promise<ConnectedWalletSession> {
  const connector = wallet.features['standard:connect'];
  if (!connector) throw new Error('wallet_unavailable');

  const connected = await connector.connect();
  const account = solanaAccount(connected.accounts ?? wallet.accounts);
  if (!account) throw new Error('account_unavailable');

  const events = wallet.features['standard:events'];
  const off = events?.on('change', (change) => {
    // Wallet Standard change payloads contain only the properties that
    // changed. A chains/features-only event must not be read as an empty
    // account list and therefore as a disconnect.
    if (change.accounts === undefined) return;
    onAccountChange(solanaAccount(change.accounts)?.address ?? null);
  }) ?? (() => {});

  return {
    chain: 'solana',
    address: account.address,
    walletName: wallet.name,
    async disconnect() {
      try {
        await wallet.features['standard:disconnect']?.disconnect();
      } catch {
        // Wallet permission revocation is best-effort. The session owner still
        // clears its local result exactly once after this promise settles.
      }
    },
    dispose: off,
  };
}

/** EIP-6963 discovery stays passive and never reads an account. */
export function watchEip6963Providers(
  onProviders: (providers: readonly Eip6963ProviderDetail[]) => void,
  target: BrowserEventTarget = window,
): () => void {
  const providers = new Map<string, Eip6963ProviderDetail>();
  const announce = ((event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.info?.uuid || !detail.provider?.request) return;
    providers.set(detail.info.uuid, detail);
    onProviders([...providers.values()].sort((a, b) => a.info.name.localeCompare(b.info.name)));
  }) as EventListener;

  target.addEventListener('eip6963:announceProvider', announce);
  onProviders([]);
  target.dispatchEvent(new Event('eip6963:requestProvider'));

  return () => target.removeEventListener('eip6963:announceProvider', announce);
}

function evmAccount(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const address = value.find((candidate): candidate is string => (
    typeof candidate === 'string' && isBaseAddress(candidate)
  ));
  return address?.toLowerCase() ?? null;
}

export async function connectEip6963Provider(
  detail: Eip6963ProviderDetail,
  onAccountChange: AccountChangeHandler,
): Promise<ConnectedWalletSession> {
  const accounts = await detail.provider.request({ method: 'eth_requestAccounts' });
  const address = evmAccount(accounts);
  if (!address) throw new Error('account_unavailable');

  const changed = (value?: unknown) => onAccountChange(evmAccount(value));
  const disconnected = () => onAccountChange(null);
  detail.provider.on?.('accountsChanged', changed);
  detail.provider.on?.('disconnect', disconnected);

  // `on` and `removeListener` are independently optional in the wild; some
  // providers expose only `off`. Falling through keeps dispose a real
  // unsubscribe, so a dead session can never fire the island callback.
  const unsubscribe = (
    event: 'accountsChanged' | 'disconnect',
    listener: (value?: unknown) => void,
  ) => {
    if (typeof detail.provider.removeListener === 'function') {
      detail.provider.removeListener(event, listener);
    } else {
      detail.provider.off?.(event, listener);
    }
  };
  const dispose = () => {
    unsubscribe('accountsChanged', changed);
    unsubscribe('disconnect', disconnected);
  };

  return {
    chain: 'base',
    address,
    walletName: detail.info.name,
    async disconnect() {
      // EIP-1193 has no standard disconnect request. The session owner clears
      // its local connection state after this best-effort hook resolves.
    },
    dispose,
  };
}
