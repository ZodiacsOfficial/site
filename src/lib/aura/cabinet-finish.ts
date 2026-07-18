import type {
  AuraCabinetFinish,
  AuraCabinetHolding,
  AuraSign,
} from './types';

const BRONZE_MINIMUM = 10_000n;
const SILVER_MINIMUM = 100_000n;
const GOLD_MINIMUM = 1_000_000n;

function decimalScale(decimals: number): bigint {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError('Token decimals must be an integer from 0 to 255.');
  }
  return 10n ** BigInt(decimals);
}

/** Classifies one exact token balance without converting it through Number. */
export function cabinetFinishForAtomicAmount(
  amount: bigint,
  decimals: number,
): AuraCabinetFinish | null {
  if (amount < 0n) throw new RangeError('Token amount cannot be negative.');
  const scale = decimalScale(decimals);
  if (amount === 0n) return null;
  if (amount >= GOLD_MINIMUM * scale) return 'gold';
  if (amount >= SILVER_MINIMUM * scale) return 'silver';
  if (amount >= BRONZE_MINIMUM * scale) return 'bronze';
  return 'pastel';
}

export function isCanonicalGoldCount(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}

/** Counts complete Gold editions while discarding the underlying remainder. */
export function goldCountForAtomicAmount(
  amount: bigint,
  decimals: number,
): string | null {
  if (amount < 0n) throw new RangeError('Token amount cannot be negative.');
  const goldUnit = GOLD_MINIMUM * decimalScale(decimals);
  const count = amount / goldUnit;
  return count > 0n ? count.toString(10) : null;
}

/** Converts one exact balance into the only collection data allowed past the provider boundary. */
export function cabinetHoldingForAtomicAmount(
  sign: AuraSign,
  amount: bigint,
  decimals: number,
): AuraCabinetHolding | null {
  const finish = cabinetFinishForAtomicAmount(amount, decimals);
  if (!finish) return null;
  if (finish !== 'gold') return { sign, finish };
  const goldCount = goldCountForAtomicAmount(amount, decimals);
  if (!goldCount) throw new Error('Gold balance did not produce a Gold edition count.');
  return { sign, finish, goldCount };
}
