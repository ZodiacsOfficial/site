import { useState } from 'preact/hooks';
import { SIGNS, signBySlug } from '../../lib/signs';
import { trackAnalytics } from '../../lib/analytics';
import {
  parseWalletAddress,
  truncateWalletAddress,
  type ParsedWalletAddress,
} from '../../lib/wallet/address';
import type { WalletChain } from '../../lib/wallet/types';
import {
  CABINET_SIZE,
  cabinetOf,
  tierFor,
  totalHeld,
  type CollectionTierId,
} from '../../lib/collection/tiers';
import { collectionText, tierName } from '../../strings/collection';

interface Props {
  availableChains: WalletChain[];
}

export interface CollectionReading {
  chain: WalletChain;
  address: string;
  holdings: { sign: string; amount: number }[];
  totalAmount: number;
  checkedAt: string;
}

type RequestState = 'idle' | 'busy';

function validHolding(value: unknown): value is { sign: string; amount: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { sign?: unknown; amount?: unknown };
  if (typeof candidate.sign !== 'string' || typeof candidate.amount !== 'number') return false;
  if (!Number.isFinite(candidate.amount) || candidate.amount < 0) return false;
  try { signBySlug(candidate.sign); return true; } catch { return false; }
}

export function collectionReadingMatchesRequest(
  value: unknown,
  request: ParsedWalletAddress,
): value is CollectionReading {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CollectionReading>;
  return candidate.chain === request.chain
    && candidate.address === request.address
    && Array.isArray(candidate.holdings)
    && candidate.holdings.every(validHolding)
    && typeof candidate.totalAmount === 'number'
    && Number.isFinite(candidate.totalAmount)
    && typeof candidate.checkedAt === 'string'
    && Number.isFinite(new Date(candidate.checkedAt).getTime());
}

export function formatHeldAmount(amount: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: amount >= 1_000 ? 0 : 2,
  }).format(amount);
}

function checkedDate(checkedAt: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(checkedAt));
}

export default function Cabinet({ availableChains }: Props) {
  const [address, setAddress] = useState('');
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<CollectionReading | null>(null);

  if (availableChains.length === 0) {
    return (
      <aside class="cabinet-offline">
        <h3>{collectionText('offlineTitle')}</h3>
        <p>{collectionText('offlineBody')}</p>
      </aside>
    );
  }

  const networkNames = availableChains
    .map((chain) => collectionText(chain === 'solana' ? 'solana' : 'base'))
    .join(' · ');

  async function submitAddress(event: Event) {
    event.preventDefault();
    if (requestState === 'busy') return;
    const parsed = parseWalletAddress(address);
    if (!parsed) {
      setReading(null);
      setError(collectionText('invalidAddress'));
      return;
    }
    if (!availableChains.includes(parsed.chain)) {
      setReading(null);
      setError(collectionText('unavailable'));
      return;
    }

    setRequestState('busy');
    setError(null);
    try {
      const response = await fetch('/api/collection-holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: parsed.address }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const invalid = payload && typeof payload === 'object' && 'error' in payload
          && (payload as { error?: unknown }).error === 'invalid_address';
        throw new Error(collectionText(invalid ? 'invalidAddress' : 'unavailable'));
      }
      if (!collectionReadingMatchesRequest(payload, parsed)) {
        throw new Error(collectionText('invalidResponse'));
      }
      setReading(payload);
      setAddress(parsed.address);
      const tier = tierFor(payload.holdings);
      trackAnalytics('collection_checked', {
        chain: payload.chain,
        tier,
        full_cabinet: cabinetOf(payload.holdings).length === CABINET_SIZE,
      });
    } catch (caught) {
      setReading(null);
      setError(caught instanceof Error ? caught.message : collectionText('invalidResponse'));
    } finally {
      setRequestState('idle');
    }
  }

  const cabinet = reading ? new Set(cabinetOf(reading.holdings)) : null;
  const amounts = reading
    ? new Map(reading.holdings.map((holding) => [holding.sign, holding.amount]))
    : null;
  const tier: CollectionTierId = reading ? tierFor(reading.holdings) : 'none';
  const total = reading ? totalHeld(reading.holdings) : 0;

  return (
    <div class="cabinet-checker">
      <form class="cabinet-checker__lookup" onSubmit={submitAddress} aria-busy={requestState === 'busy'}>
        <div class="field">
          <label class="field__label" for="cabinet-address">{collectionText('addressLabel')}</label>
          <input
            id="cabinet-address"
            class="field__input cabinet-checker__address"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellcheck={false}
            required
            value={address}
            placeholder={collectionText('addressPlaceholder')}
            onInput={(event) => setAddress((event.target as HTMLInputElement).value)}
          />
          <p class="field__help">{collectionText('addressHelp')}</p>
          <p class="field__help">{collectionText('supportedNetworks', { networks: networkNames })}</p>
        </div>
        <button class="btn btn--primary" type="submit" disabled={requestState === 'busy'}>
          {collectionText(requestState === 'busy' ? 'checking' : 'check')}
        </button>
      </form>

      <div class="cabinet-checker__status" aria-live="polite">
        {error && <p class="cabinet-checker__error" role="status">{error}</p>}
      </div>

      {reading && cabinet && amounts && (
        <section class="cabinet-reading" aria-labelledby="cabinet-reading-title">
          <header class="cabinet-reading__header">
            <em class="kicker">{collectionText('resultKicker')}</em>
            <h3 id="cabinet-reading-title" class="display">
              {tier === 'none'
                ? collectionText('standsAtNone', { address: truncateWalletAddress(reading.address) })
                : collectionText('standsAt', {
                    address: truncateWalletAddress(reading.address),
                    tier: tierName(tier),
                  })}
            </h3>
            <p class="cabinet-reading__summary mono">
              {tier === 'none'
                ? collectionText('resultSummaryNone', { date: checkedDate(reading.checkedAt) })
                : collectionText('resultSummary', {
                    total: formatHeldAmount(total),
                    count: cabinet.size,
                    date: checkedDate(reading.checkedAt),
                  })}
            </p>
            {tier === 'master' && <p class="cabinet-reading__master">{collectionText('masterNote')}</p>}
            {tier !== 'master' && cabinet.size === CABINET_SIZE && (
              <p class="cabinet-reading__full">{collectionText('fullCabinetNote')}</p>
            )}
          </header>

          <ul class={`cabinet cabinet--reading cabinet--tier-${tier}`}>
            {SIGNS.map((sign) => {
              const held = cabinet.has(sign.slug);
              return (
                <li
                  key={sign.slug}
                  class={held ? 'cabinet__seat cabinet__seat--held' : 'cabinet__seat'}
                  style={`--sign: ${sign.hue}`}
                >
                  <img
                    src={`/assets/zodiac-icons/128/${sign.slug}.webp`}
                    width="64"
                    height="64"
                    loading="lazy"
                    decoding="async"
                    alt=""
                  />
                  <span class="cabinet__seat-name">{sign.name}</span>
                  <span class="cabinet__seat-amount mono">
                    {held
                      ? collectionText('seatAmount', { amount: formatHeldAmount(amounts.get(sign.slug) ?? 0) })
                      : collectionText('seatEmpty')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
