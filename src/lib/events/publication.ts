import source from '../../data/events-publication.json';

export interface PublishedEventDescriptor {
  id: string;
  path: string;
  title: string;
  anchor: string;
  family: string;
  subtype: string;
  bodies: string[];
  signs: string[];
  summary: string;
  lastModified: string;
  publishedAt?: string;
  card?: string;
}

export interface EventsPublication {
  schema: 'zodiacs.events-publication.v1';
  locale: 'en';
  window: { from: string; to: string };
  lastModified: string;
  hub: {
    path: '/events/';
    title: string;
    card: string;
    indexEligible: boolean;
  };
  pages: PublishedEventDescriptor[];
  timeline: PublishedEventDescriptor[];
}

export const eventsPublication = source as EventsPublication;
export const publishedEventPages = eventsPublication.pages;
export const publishedEventById = new Map(
  publishedEventPages.map((event) => [event.id, event] as const),
);

const DAY_MS = 86_400_000;

/** One canonical sign only; multi-sign aspects cannot be assigned to one house. */
export function singlePublishedEventSign(event: PublishedEventDescriptor): string | null {
  const signs = [...new Set(event.signs)];
  return signs.length === 1 && signs[0] ? signs[0] : null;
}

/** Standalone, approved event pages from today through five calendar days out. */
export function upcomingPublishedEvents(
  date: string,
  { days = 5, limit = 3 }: { days?: number; limit?: number } = {},
  publication: EventsPublication = eventsPublication,
): PublishedEventDescriptor[] {
  const start = new Date(`${date}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || days < 0 || limit < 1) return [];
  const end = start + (Math.floor(days) + 1) * DAY_MS;
  const candidates = publication.pages
    .filter((event) => {
      const anchor = new Date(event.anchor).getTime();
      return anchor >= start && anchor < end;
    })
    .sort((left, right) => left.anchor.localeCompare(right.anchor) || left.id.localeCompare(right.id));

  // An eclipse and its lunation are the same physical alignment with two
  // editorial views. Keep the eclipse as the one daily link on that date.
  const eclipseDays = new Set(
    candidates
      .filter((event) => event.family === 'eclipse')
      .map((event) => event.anchor.slice(0, 10)),
  );
  return candidates
    .filter((event) => event.family !== 'lunation' || !eclipseDays.has(event.anchor.slice(0, 10)))
    .slice(0, limit);
}

/** Published event pages after the edition date, through `days` calendar days out. */
export function futurePublishedEvents(
  date: string,
  { days = 5, limit = 3 }: { days?: number; limit?: number } = {},
  publication: EventsPublication = eventsPublication,
): PublishedEventDescriptor[] {
  const start = new Date(`${date}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || days < 1 || limit < 1) return [];
  const tomorrow = new Date(start + DAY_MS).toISOString().slice(0, 10);
  return upcomingPublishedEvents(
    tomorrow,
    { days: Math.floor(days) - 1, limit },
    publication,
  );
}
