import { describe, expect, it, vi } from 'vitest';
import { render } from 'preact-render-to-string';
import { keepCloseRoute } from './ProfileKeepClose';
import { nextLine, soonLine, whenLabel } from './ProfilePeople';
import { takeCardFromLocation } from './ProfileCardInbox';
import ProfileIdentity, { bigThree } from './ProfileIdentity';
import ProfilePeople from './ProfilePeople';
import ProfileKeepClose from './ProfileKeepClose';
import ProfileCardInbox from './ProfileCardInbox';
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

  it('states the big three only as far as the chart settles them', () => {
    expect(bigThree(chart(true)).map((row) => `${row.label} ${row.name}`)).toEqual([
      'Sun Leo', 'Moon Gemini', 'Rising Leo',
    ]);
    expect(bigThree(chart(false)).map((row) => row.label)).toEqual(['Sun']);
    expect(bigThree(chart(false, 120.3))).toEqual([]);
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
    expect(soonLine(person(18, 'birthday'))).toMatch(/^Maya’s birthday · .+Oct 12 · in 18 days$/u);
    expect(soonLine(person(1, 'sun-return', ''))).toMatch(/^Sun return · .+ · tomorrow$/u);
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
