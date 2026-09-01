import type { APIRoute } from 'astro';
import sky from '../../data/sky.json';
import { bodyLongitude } from '../../lib/engine/full';
import { formatLongitude, signForLongitude } from '../../lib/signs';
import { serializeSkyEvents, type SkyCalendarEvent } from '../../lib/ical';

export const prerender = true;

const YEAR = 2027;

const events: SkyCalendarEvent[] = (sky.moons as { type: string; at: string }[])
  .filter((moon) => moon.type === 'full' && moon.at.startsWith(`${YEAR}-`))
  .map(({ at }) => {
    const date = new Date(at);
    const lon = bodyLongitude('Moon', date);
    const sign = signForLongitude(lon);
    const day = at.slice(0, 10);
    return {
      id: `full-moon-${day}`,
      start: date,
      summary: `Full moon in ${sign.name}`,
      description: `Full moon at ${formatLongitude(lon)}, exact at ${date.toISOString().slice(11, 16)} UTC on ${day}. Computed by Zodiacs.org.`,
      url: `https://zodiacs.org/full-moon-calendar/${YEAR}/#full-moon-${day}`,
    };
  });

const calendar = serializeSkyEvents(events, {
  generatedAt: sky.generatedAt,
  calendarName: `Zodiacs.org full moons ${YEAR}`,
});

export const GET: APIRoute = () => new Response(calendar, {
  headers: {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="zodiacs-full-moons-${YEAR}.ics"`,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  },
});
