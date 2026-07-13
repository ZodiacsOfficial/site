import type { TransitContact } from '../../lib/engine/transit-scan';

export const TRANSIT_SEARCH_RESULT_CAP = 200;

export interface TransitSearchContactGroup {
  key: string;
  transitBody: TransitContact['transitBody'];
  natalPoint: TransitContact['natalPoint'];
  aspect: TransitContact['aspect'];
  contacts: TransitContact[];
}

export interface TransitSearchMonthGroup {
  /** UTC YYYY-MM, suitable for stable sorting and locale-independent tests. */
  key: string;
  contacts: TransitSearchContactGroup[];
}

export interface GroupedTransitSearchResults {
  total: number;
  shown: number;
  capped: boolean;
  months: TransitSearchMonthGroup[];
}

const contactKey = (contact: TransitContact) =>
  `${contact.transitBody}|${contact.aspect}|${contact.natalPoint}`;

/**
 * Cap globally in chronological order, then group the visible passes under
 * UTC month and contact headings. A contact spanning months intentionally
 * repeats its heading so every pass remains under the right month.
 */
export function groupTransitSearchResults(
  contacts: readonly TransitContact[],
  limit = TRANSIT_SEARCH_RESULT_CAP,
): GroupedTransitSearchResults {
  const sorted = [...contacts].sort((a, b) =>
    a.exactUtc.localeCompare(b.exactUtc)
    || contactKey(a).localeCompare(contactKey(b)));
  const visible = sorted.slice(0, Math.max(0, limit));
  const months: TransitSearchMonthGroup[] = [];

  for (const contact of visible) {
    const monthKey = contact.exactUtc.slice(0, 7);
    let month = months.at(-1);
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, contacts: [] };
      months.push(month);
    }

    const key = contactKey(contact);
    let group = month.contacts.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        transitBody: contact.transitBody,
        natalPoint: contact.natalPoint,
        aspect: contact.aspect,
        contacts: [],
      };
      month.contacts.push(group);
    }
    group.contacts.push(contact);
  }

  return {
    total: sorted.length,
    shown: visible.length,
    capped: visible.length < sorted.length,
    months,
  };
}
