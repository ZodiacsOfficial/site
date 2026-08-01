export type TransitMonthStatus = 'current' | 'stale' | 'none';

export interface TransitMonthSelection {
  month: string | null;
  status: TransitMonthStatus;
}

const TRANSIT_MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

function utcMonth(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('selectTransitDisplayMonth requires a valid date');
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Select the month that a current-sky surface may render.
 *
 * Future data can support planning tools, but must never masquerade as the
 * current sky. If the current month is unavailable, render the newest past
 * month with an explicit stale state; future-only and empty inputs render no
 * monthly receipt at all.
 */
export function selectTransitDisplayMonth(
  availableMonths: readonly string[],
  nowUtc: Date,
): TransitMonthSelection {
  const currentMonth = utcMonth(nowUtc);
  const months = [...new Set(availableMonths)].sort();

  for (const month of months) {
    if (!TRANSIT_MONTH.test(month)) {
      throw new TypeError(`Invalid transit month: ${month}`);
    }
  }

  if (months.includes(currentMonth)) {
    return { month: currentMonth, status: 'current' };
  }

  const staleMonth = months.filter((month) => month < currentMonth).at(-1);
  if (staleMonth) return { month: staleMonth, status: 'stale' };

  return { month: null, status: 'none' };
}
