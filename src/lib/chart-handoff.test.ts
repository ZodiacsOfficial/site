import { describe, expect, it } from 'vitest';
import { decodeChartLink, type ShareChartInput } from './share';
import {
  chartHandoffFragment,
  compatibilityHandoffPath,
  mineHandoffFromHash,
  someoneElseHandoffPath,
  subjectModeFromHash,
} from './chart-handoff';

const PERSON: ShareChartInput = {
  date: '1990-06-15',
  time: '14:30',
  timeKnown: true,
  lat: 40.7128,
  lon: -74.006,
  tz: 'America/New_York',
  name: 'A friend',
  place: 'New York',
  houseSystem: 'whole',
};

const MINE: ShareChartInput = {
  ...PERSON,
  date: '1988-02-03',
  name: undefined,
};

describe('private chart handoffs', () => {
  it('keeps subject mode, optional label, and current-chart context in the fragment', () => {
    const fragment = chartHandoffFragment(PERSON, {
      subjectMode: 'other',
      mine: { kind: 'input', input: MINE },
    });
    const params = new URLSearchParams(fragment);
    expect(params.get('subject')).toBe('other');
    expect(decodeChartLink(params.get('c')!)).toMatchObject({ name: 'A friend' });
    expect(mineHandoffFromHash(`#${fragment}`)).toEqual({ kind: 'input', input: MINE });
  });

  it('defaults unmarked and malformed subject context to self', () => {
    expect(subjectModeFromHash('#c=anything')).toBe('self');
    expect(subjectModeFromHash('#subject=other&subject=self')).toBe('self');
  });

  it('carries the current chart into the someone-else route without a query string', () => {
    const path = someoneElseHandoffPath(MINE);
    expect(path.startsWith('/birth-chart/someone-else/#mine=')).toBe(true);
    expect(mineHandoffFromHash(path.split('#')[1])).toEqual({ kind: 'input', input: MINE });
  });

  it('prefills both compatibility sides from current input', () => {
    const path = compatibilityHandoffPath(PERSON, { kind: 'input', input: MINE });
    const fragment = new URLSearchParams(path.split('#')[1]);
    expect(path.startsWith('/compatibility/#')).toBe(true);
    expect(decodeChartLink(fragment.get('a')!)).toEqual(MINE);
    expect(decodeChartLink(fragment.get('b')!)).toEqual(PERSON);
  });

  it('reuses a device-local saved chart id without putting birth details in the query', () => {
    const path = compatibilityHandoffPath(PERSON, { kind: 'saved', id: 'chart-local-1' });
    const url = new URL(path, 'https://zodiacs.org');
    expect(url.searchParams.get('a')).toBe('chart-local-1');
    expect(url.searchParams.has('name')).toBe(false);
    expect(decodeChartLink(new URLSearchParams(url.hash.slice(1)).get('b')!)).toEqual(PERSON);
  });
});
