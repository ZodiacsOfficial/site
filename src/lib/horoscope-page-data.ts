import type {
  HoroscopeEvidenceReceipt,
  HoroscopeProgram,
  HoroscopeReading,
  HoroscopeSign,
  HoroscopeSurface,
} from './horoscope-program';
import { signBySlug } from './signs';

export type HoroscopePageSurface = 'today' | 'tomorrow' | 'weekly' | 'monthly' | 'love' | 'career' | 'year';

export interface HoroscopeProgramPageReading {
  label: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
    receipt?: string;
  }>;
  action: string;
  sourceNote: string;
  datePublished: string;
  dateModified: string;
}

const SURFACE_KEY: Record<Exclude<HoroscopePageSurface, 'monthly'>, HoroscopeSurface> = {
  today: 'today',
  tomorrow: 'tomorrow',
  weekly: 'weekly',
  love: 'love',
  career: 'career',
  year: 'yearly-2027',
};

const TITLE: Record<Exclude<HoroscopePageSurface, 'monthly'>, string> = {
  today: 'daily horoscope',
  tomorrow: 'tomorrow horoscope',
  weekly: 'weekly horoscope',
  love: 'love horoscope',
  career: 'career horoscope',
  year: '2027 horoscope',
};

const SECTION_HEADS: Record<Exclude<HoroscopePageSurface, 'monthly' | 'year'>, string[]> = {
  today: ['What matters now', 'Where to focus', 'A moment to watch'],
  tomorrow: ['What matters tomorrow', 'Where to focus', 'A moment to watch'],
  weekly: ['The week begins', 'Early week', 'Midweek', 'A turning point', 'The week closes'],
  love: ['How to connect', 'What you need emotionally'],
  career: ['Where to focus', 'What supports progress'],
};

const ACTION: Record<Exclude<HoroscopePageSurface, 'monthly'>, string> = {
  today: 'Choose the decision already asking for your attention, then make the smallest honest move that changes it.',
  tomorrow: 'Leave one choice open until tomorrow’s facts arrive, while preparing the part that is already yours to do.',
  weekly: 'Name the week’s priority before the calendar fills itself, and review it again at the final Moon checkpoint.',
  love: 'Replace one assumption with one direct, kind question, then leave enough silence for the answer to be real.',
  career: 'Turn one broad intention into a named owner, a next step, and a time when the work will be checked.',
  year: 'Put a review point after each major marker and record what actually changed before assigning the year a story.',
};

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function dateLabel(date: string, short = false): string {
  return new Intl.DateTimeFormat('en-US', {
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function periodLabel(reading: HoroscopeReading, surface: Exclude<HoroscopePageSurface, 'monthly'>): string {
  if (surface === 'year') return '2027';
  if (surface === 'weekly') {
    return `${dateLabel(reading.period.from, true)}–${dateLabel(reading.period.through, true)}`;
  }
  return dateLabel(reading.period.from);
}

function evidenceMap(program: HoroscopeProgram): Map<string, HoroscopeEvidenceReceipt> {
  return new Map(program.evidence.map((receipt) => [receipt.id, receipt]));
}

function receiptLine(
  refs: readonly string[],
  receipts: ReadonlyMap<string, HoroscopeEvidenceReceipt>,
): string | undefined {
  const labels = refs
    .map((ref) => receipts.get(ref))
    .filter((receipt): receipt is HoroscopeEvidenceReceipt => Boolean(receipt))
    .filter((receipt) => receipt.kind !== 'solar-house')
    .map((receipt) => receipt.label);
  return [...new Set(labels)].slice(0, 2).join(' · ') || undefined;
}

function yearHeading(
  refs: readonly string[],
  receipts: ReadonlyMap<string, HoroscopeEvidenceReceipt>,
  index: number,
  total: number,
): string {
  if (index === 0) return 'The year in view';
  if (index >= total - 4) {
    return ['Relationships', 'Work and resources', 'The private counterweight', 'Read the year in sequence'][index - (total - 4)];
  }
  const event = refs.map((ref) => receipts.get(ref)).find((receipt) => receipt?.kind === 'sky-event');
  if (!event) return `Major marker ${String(index).padStart(2, '0')}`;
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(event.at));
  return `${date} · ${cap(event.eventKind ?? 'sky event')}`;
}

function descriptionFor(
  signName: string,
  surface: Exclude<HoroscopePageSurface, 'monthly'>,
  label: string,
): string {
  if (surface === 'today') {
    return `${signName} daily horoscope for ${label}: what needs your attention, what to watch, and one useful move.`;
  }
  if (surface === 'tomorrow') {
    return `${signName} horoscope for tomorrow, ${label}: what is gathering momentum and how to prepare.`;
  }
  if (surface === 'weekly') {
    return `${signName} weekly horoscope for ${label}: key themes, turning points, and one priority for the week.`;
  }
  if (surface === 'love') {
    return `${signName} love horoscope for ${label}: what connection needs, where to soften, and what to say clearly.`;
  }
  if (surface === 'career') {
    return `${signName} career horoscope for ${label}: where to focus your effort and what can move work forward.`;
  }
  return `${signName} 2027 horoscope: the year’s turning points in love, work, home, and personal growth.`;
}

function introFor(
  signName: string,
  surface: Exclude<HoroscopePageSurface, 'monthly'>,
): string {
  if (surface === 'today') return `What matters most for ${signName} today.`;
  if (surface === 'tomorrow') return `What ${signName} can prepare for tomorrow.`;
  if (surface === 'weekly') return `The choices and turning points shaping ${signName}’s week.`;
  if (surface === 'love') return `What connection is asking of ${signName} now.`;
  if (surface === 'career') return `Where ${signName}’s effort can make the most difference.`;
  return `The turning points shaping ${signName}’s 2027.`;
}

export function pageReadingFromProgram(
  program: HoroscopeProgram,
  sign: HoroscopeSign,
  surface: Exclude<HoroscopePageSurface, 'monthly'>,
): HoroscopeProgramPageReading {
  const signProgram = program.signs.find((entry) => entry.sign === sign);
  if (!signProgram) throw new Error(`Horoscope program is missing ${sign}`);
  const reading = signProgram.readings[SURFACE_KEY[surface]];
  if (reading.status !== 'publishable') {
    throw new Error(`${sign} ${surface} reading is not publishable: ${reading.fallbackReason ?? 'unknown reason'}`);
  }
  const signData = signBySlug(sign);
  const receipts = evidenceMap(program);
  const label = periodLabel(reading, surface);
  const heads = surface === 'year' ? null : SECTION_HEADS[surface];
  const sections = reading.passages.map((passage, index) => ({
    heading: heads?.[index]
      ?? yearHeading(passage.evidenceRefs, receipts, index, reading.passages.length),
    body: passage.text,
    receipt: receiptLine(passage.evidenceRefs, receipts),
  }));
  const datePublished = surface === 'year'
    ? '2026-07-19T00:00:00.000Z'
    : surface === 'weekly'
      ? `${reading.period.from}T00:00:00.000Z`
      : `${program.anchorDate}T00:15:00.000Z`;
  const dateModified = surface === 'year'
    ? datePublished
    : `${program.anchorDate}T00:15:00.000Z`;
  const sourceNote = surface === 'year'
    ? `The dates and positions here come from the 2027 eclipse, ingress, and retrograde calendar. Each event is read through ${signData.name} solar houses; all times use UTC.`
    : surface === 'weekly'
      ? `The astrology here follows seven noon-UTC sky snapshots from ${reading.period.from} through ${reading.period.through}. Each section connects to the recorded position or exact event shown below.`
      : `The astrology here follows the ${reading.period.from} noon-UTC sky. Each section connects to the recorded position or exact event shown below.`;
  return {
    label,
    title: TITLE[surface],
    description: descriptionFor(signData.name, surface, label),
    intro: introFor(signData.name, surface),
    sections,
    action: ACTION[surface],
    sourceNote,
    datePublished,
    dateModified,
  };
}
