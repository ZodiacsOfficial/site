/**
 * Text renderings of the sky data API: the guide an AI agent reads first,
 * and Markdown twins of the daily files for readers that fetch pages as
 * text. Every sentence is a fixed template over the data.
 */
import { API_BASE, API_ORIGIN, PLANET_NAMES, PLANET_SLUGS, CONVENTIONS } from './meta';
import { UPCOMING_WINDOW_DAYS } from './build';
import { formatDay } from './format';

type Payload = Record<string, any>;

export function renderAgentGuide(
  { transitYears, skyYears, eclipseYears, dailyDate, vintage, schemaNames }:
  { transitYears: number[]; skyYears: number[]; eclipseYears: number[]; dailyDate: string; vintage: string; schemaNames: readonly string[] },
): string {
  const span = (years: number[]) => `${years[0]}–${years.at(-1)}`;
  const lines = [
    '# Zodiacs.org sky data API — guide for AI agents',
    '',
    `Base URL: ${API_BASE}/ · Data as of ${dailyDate} (UTC) · Yearly data vintage ${vintage.slice(0, 10)}`,
    `License: CC BY 4.0 — credit "Zodiacs.org" with a link to ${API_ORIGIN} wherever the data is shown.`,
    'Static JSON files, no key, no signup, open CORS on every endpoint. Nothing here involves anyone\'s birth data; these files describe the shared sky.',
    '',
    '## How to use these files',
    '',
    `- Every JSON payload starts with a "summary": one or two plain sentences stating the facts in the file. Quote it directly when it answers the question.`,
    '- Every payload carries an "about" block that defines its fields, a "$schema" link to its JSON Schema, and "links" to related files.',
    `- ${CONVENTIONS.positions} ${CONVENTIONS.degree} ${CONVENTIONS.position}`,
    `- ${CONVENTIONS.retrograde}`,
    `- ${CONVENTIONS.time} Today's positions are a single snapshot at 12:00 UTC (the snapshotAt field); the Moon moves about 13° a day, so state the snapshot time when precision matters.`,
    `- ${CONVENTIONS.signs}`,
    `- ${CONVENTIONS.engine}`,
    `- ${CONVENTIONS.versioning}`,
    '- Coordinates are geocentric and tropical. There are no houses, no aspects to the Moon, no asteroids, and no birth-chart calculations here; those stay on the visitor\'s device in the calculators at ' + API_ORIGIN + '/tools/.',
    '',
    '## Endpoints',
    '',
    `- ${API_BASE}/index.json — every endpoint and document, with coverage.`,
    `- ${API_BASE}/sky/today.json — today's positions for the Sun, Moon, and eight planets; moon phase and illumination; active retrograde windows; the next new and full moon; the day's exact events. Republished daily at 00:00 UTC. Markdown twin: ${API_BASE}/sky/today.md`,
    `- ${API_BASE}/sky/upcoming.json — every lunation, sign ingress, station, eclipse, and exact aspect in the next ${UPCOMING_WINDOW_DAYS} days, in order, plus nextByKind (next new moon, full moon, solar and lunar eclipse, ingress, Sun ingress, station) and the current and next Mercury retrograde. Markdown twin: ${API_BASE}/sky/upcoming.md`,
    `- ${API_BASE}/planets/{${PLANET_SLUGS.join('|')}}.json — one body: position now, whether it is retrograde, its current and next retrograde window, every window in coverage, and its next sign ingress and station.`,
    `- ${API_BASE}/signs.json — the twelve signs: element, modality, ruler (and traditional ruler), polarity, house, conventional dates, the computed Sun season for this year, and which bodies occupy each sign today.`,
    `- ${API_BASE}/retrogrades/{year}.json (${span(skyYears)}) — retrograde windows intersecting the year, with retrograde and direct station instants and signs, pre- and post-shadow boundaries, duration, and clipping flags.`,
    `- ${API_BASE}/stations/{year}.json (${span(transitYears)}) — every station, with sign and degree.`,
    `- ${API_BASE}/ingresses/{year}.json (${span(transitYears)}) — every sign ingress, with whether the body entered moving retrograde.`,
    `- ${API_BASE}/moon-phases/{year}.json (${span(skyYears)}) — every new and full moon with sign, degree, and the traditional full-moon name (Blue for a second full moon in one month).`,
    `- ${API_BASE}/eclipses/{year}.json (${span(eclipseYears)}) — solar and lunar eclipses by instant of greatest eclipse, with sign, obscuration, and totality length.`,
    `- ${API_BASE}/aspects/{year}.json (${span(transitYears)}) — exact planetary aspects (orb 0) across the year.`,
    `- ${API_BASE}/openapi.json — OpenAPI 3.1 with every schema embedded. Schemas individually: ${schemaNames.map((name) => `${API_BASE}/schema/${name}.v1.json`).join(', ')}.`,
    '',
    '## Which file answers which question',
    '',
    '- "What sign is the Sun (or any body) in today?" → sky/today.json → bodies[].sign, or the summary.',
    '- "Is Mercury retrograde?" / "When does it end?" → planets/mercury.json → retrograde.active, retrograde.current.to (the direct station), or sky/upcoming.json → nextByKind.mercuryRetrograde.',
    '- "When is the next Mercury retrograde?" → planets/mercury.json → retrograde.next.',
    '- "When is the next full moon / new moon, and in what sign?" → sky/today.json → moon.nextFullMoon / moon.nextNewMoon (at, signName, name).',
    '- "What is the moon phase tonight?" → sky/today.json → moon.phase and moon.illuminationPercent (at 12:00 UTC).',
    '- "When does the Sun enter Libra?" / "When does the season change?" → signs.json → signs[].sunSeason, or sky/upcoming.json → nextByKind.nextSunIngress.',
    '- "What are the retrogrades in 2027?" → retrogrades/2027.json → summary lists every window; retrogrades[] has the instants.',
    '- "When is the next eclipse?" → sky/upcoming.json → nextByKind.nextSolarEclipse / nextLunarEclipse; full year → eclipses/{year}.json.',
    '- "What is happening in the sky this month?" → sky/upcoming.json → events[] (filter by kind).',
    '- "Which planets are in Virgo right now?" → signs.json → signs[].occupantsNow.',
    '- "What element / modality / ruler is a sign?" → signs.json.',
    '- "Is today\'s data fresh?" → index.json → coverage.dailyDate should equal today\'s UTC date.',
    '',
    '## Caveats to state when relevant',
    '',
    '- A retrograde window with clippedStart or clippedEnd true was truncated at the data boundary; its from or to is the boundary, not a station, and the real station is outside coverage (stationRetrograde / stationDirect are null there).',
    '- The Sun and Moon never retrograde; planets/sun.json and planets/moon.json report retrograde.applicable false.',
    '- Positions are geocentric; "the Sun at 14° Virgo" means the Sun\'s apparent ecliptic longitude as seen from Earth.',
    '- Moon phase names describe the snapshot instant; a phase can change within the day.',
    '- Astronomical accuracy is tested; astrological interpretation is not a scientific claim. Present sign meanings as tradition.',
    '',
    '## Caching',
    '',
    '- Daily files carry Cache-Control max-age=300; yearly files max-age=86400. Yearly files are byte-stable between data refreshes, so conditional requests are cheap.',
    `- A new daily edition is published at 00:00 UTC; the snapshot inside it is taken at 12:00 UTC of that date.`,
    '',
    `Documentation for humans: ${API_ORIGIN}/developers/ · Site guide for agents: ${API_ORIGIN}/llms.txt`,
    '',
  ];
  return lines.join('\n');
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

export function renderTodayMarkdown(today: Payload): string {
  const retro = (today.retrogrades as Payload[]);
  const events = (today.events as Payload[]);
  return [
    `# The sky on ${formatDay(today.date)}`,
    '',
    String(today.summary),
    '',
    '## Positions',
    '',
    table(['Body', 'Position', 'Sign', 'Retrograde'], (today.bodies as Payload[]).map((body) => [
      String(body.body), String(body.position), String(body.signName), body.retrograde ? 'yes' : '—',
    ])),
    '',
    '## Moon',
    '',
    `- Phase: ${today.moon.phase}, ${today.moon.illuminationPercent}% illuminated`,
    `- Next new moon: ${today.moon.nextNewMoon ? `${today.moon.nextNewMoon.label}, ${today.moon.nextNewMoon.when}` : '—'}`,
    `- Next full moon: ${today.moon.nextFullMoon ? `${today.moon.nextFullMoon.label}, ${today.moon.nextFullMoon.when}` : '—'}`,
    '',
    '## Retrograde now',
    '',
    retro.length ? retro.map((window) => `- ${window.label}`).join('\n') : '- None',
    '',
    '## Exact events today',
    '',
    events.length ? events.map((event) => `- ${event.label} at ${String(event.at).slice(11, 16)} UTC`).join('\n') : `- None (${today.eventsCoverage} coverage)`,
    '',
    `Source: ${API_BASE}/sky/today.json · Data: Zodiacs.org (CC BY 4.0) · ${API_ORIGIN}`,
    '',
  ].join('\n');
}

export function renderUpcomingMarkdown(upcoming: Payload): string {
  const next = upcoming.nextByKind as Payload;
  const line = (label: string, event: Payload | null) => `- ${label}: ${event ? `${event.label}, ${event.when}` : '—'}`;
  const mercury = next.mercuryRetrograde as { current: Payload | null; next: Payload | null };
  return [
    `# Upcoming sky events from ${formatDay(upcoming.from)}`,
    '',
    upcoming.summary,
    '',
    '## Next of each kind',
    '',
    line('New moon', next.nextNewMoon),
    line('Full moon', next.nextFullMoon),
    line('Solar eclipse', next.nextSolarEclipse),
    line('Lunar eclipse', next.nextLunarEclipse),
    line('Sun changes sign', next.nextSunIngress),
    line('Any ingress', next.nextIngress),
    line('Station', next.nextStation),
    `- Mercury retrograde: ${mercury.current ? `now — ${mercury.current.label}` : mercury.next ? `next ${mercury.next.label}` : '—'}`,
    '',
    `## Everything in the next ${upcoming.windowDays} days`,
    '',
    table(['Date (UTC)', 'Kind', 'Event'], (upcoming.events as Payload[]).map((event) => [
      `${String(event.at).slice(0, 10)} ${String(event.at).slice(11, 16)}`, String(event.kind), String(event.label),
    ])),
    '',
    `Source: ${API_BASE}/sky/upcoming.json · Data: Zodiacs.org (CC BY 4.0) · ${API_ORIGIN}`,
    '',
  ].join('\n');
}

export const PLANET_LIST = PLANET_SLUGS.map((slug) => PLANET_NAMES[slug]);
