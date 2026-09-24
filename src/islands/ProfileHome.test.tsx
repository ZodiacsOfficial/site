import { describe, expect, it, vi } from 'vitest';
import { render } from 'preact-render-to-string';
import { keepCloseRoute } from './ProfileKeepClose';
import { nextLine, whenLabel } from './ProfilePeople';
import { takeCardFromLocation } from './ProfileCardInbox';
import ProfileIdentity from './ProfileIdentity';
import PlacementList, { cardPlacements, chartPlacements } from '../components/PlacementList';
import ProfilePeople from './ProfilePeople';
import ProfileKeepClose from './ProfileKeepClose';
import ProfileCardInbox from './ProfileCardInbox';
import type { ChartCard } from '../lib/profile/card-link';
import type { PersonRow, UpcomingKind } from '../lib/profile/your-people';
import type { SavedChart } from '../lib/profile/schema';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PIXEL = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function chart(timeKnown: boolean, sun = 141.3): SavedChart {
  return {
    id: '0f6c3c7a-3a52-4d0e-9a3b-1d2e3f4a5b6c',
    name: 'Leo Sun · 1990-08-14',
    relationship: 'self',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    birth: { date: '1990-08-14', time: timeKnown ? '09:30' : null, timeKnown, place: null },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1990-08-14T13:30:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: sun, retrograde: false },
        { body: 'Moon', lon: 61.1, retrograde: false },
      ],
      angles: { asc: 133.6, mc: 40 },
      flags: [],
    },
  };
}

describe('your page header', () => {
  it('renders the plain introduction before the browser has been read', () => {
    const html = render(<ProfileIdentity />);
    expect(html).toContain('<h1 class="display">Your charts, today and ahead.</h1>');
    expect(html).not.toContain('Your page');
  });

  it('states Sun, Moon and rising only as far as the chart settles them', () => {
    expect(chartPlacements(chart(true)).map((row) => `${row.label} ${row.name}`)).toEqual([
      'Sun Leo', 'Moon Gemini', 'Rising Leo',
    ]);
    expect(chartPlacements(chart(false)).map((row) => row.label)).toEqual(['Sun']);
    expect(chartPlacements(chart(false, 120.3))).toEqual([]);
  });

  it('reads a received card by the same rule', () => {
    const received = (timeKnown: boolean): ChartCard => ({
      chart: {
        bodies: [{ body: 'Sun', lon: 141.3 }, { body: 'Moon', lon: 61.1 }],
        angles: timeKnown ? { asc: 133.6, mc: 40 } : null,
        houseSystem: 'whole',
        engineVersion: 'fixture',
      },
      label: 'Maya',
      timeKnown,
    });
    expect(cardPlacements(received(true)).map((row) => `${row.label} ${row.name}`)).toEqual([
      'Sun Leo', 'Moon Gemini', 'Rising Leo',
    ]);
    expect(cardPlacements(received(false)).map((row) => row.label)).toEqual(['Sun']);
  });

  it('lists placements in the homepage grammar: mono labels beside sign chips', () => {
    const html = render(<PlacementList placements={chartPlacements(chart(true))} />);
    expect(html).toContain('<dl class="pf-three">');
    expect(html).toContain('<dt class="mono--label">Sun</dt>');
    expect(html).toContain('href="/leo/"');
    expect(html).toContain('href="/gemini/"');
    expect(html.match(/class="chip"/gu)).toHaveLength(3);

    const unlinked = render(<PlacementList placements={chartPlacements(chart(true))} linked={false} />);
    expect(unlinked).not.toContain('href=');
    expect(render(<PlacementList placements={[]} />)).toBe('');
  });
});

describe('your people', () => {
  const person = (days: number, kind: UpcomingKind, name = 'Maya'): PersonRow => ({
    key: 'k',
    kind: 'saved',
    id: 'id',
    name,
    mark: { bodies: [], asc: null, timeKnown: false },
    next: { kind, at: new Date(2026, 9, 12), days },
  });

  it('says when, in plain words', () => {
    expect(whenLabel(0)).toBe('today');
    expect(whenLabel(1)).toBe('tomorrow');
    expect(whenLabel(18)).toBe('in 18 days');
  });

  it('distinguishes a birthday from a Sun return', () => {
    expect(nextLine(person(18, 'birthday'))).toBe('Birthday Oct 12');
    expect(nextLine(person(18, 'sun-return'))).toBe('Sun returns Oct 12');
  });

  it('renders nothing on the server, where there is no one to list yet', () => {
    expect(render(<ProfilePeople />)).toBe('');
    expect(render(<ProfileKeepClose />)).toBe('');
    expect(render(<ProfileCardInbox />)).toBe('');
  });
});

describe('keeping the page close', () => {
  it('offers the browser install when it can, else the right instruction', () => {
    expect(keepCloseRoute(WINDOWS, true)).toBe('install');
    expect(keepCloseRoute(IPHONE, false)).toBe('ios');
    expect(keepCloseRoute(PIXEL, false)).toBe('android');
    expect(keepCloseRoute(MAC, false)).toBe('desktop-mac');
    expect(keepCloseRoute(WINDOWS, false)).toBe('desktop');
  });
});

describe('a card arriving', () => {
  it('reads the card once and takes it out of the address bar', () => {
    const replaceState = vi.fn();
    const arrival = takeCardFromLocation(
      { hash: '#card=c1.bad', pathname: '/profile/', search: '' },
      { replaceState },
    );
    expect(arrival).toEqual({ state: 'invalid' });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/profile/');
  });

  it('leaves any other fragment alone', () => {
    const replaceState = vi.fn();
    expect(takeCardFromLocation({ hash: '#saved-charts', pathname: '/profile/', search: '' }, { replaceState }))
      .toEqual({ state: 'none' });
    expect(replaceState).not.toHaveBeenCalled();
  });
});
