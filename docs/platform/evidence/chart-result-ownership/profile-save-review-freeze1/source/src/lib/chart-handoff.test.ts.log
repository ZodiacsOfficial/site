import { describe, expect, it } from 'vitest';
import { decodeChartLink, type ShareChartInput } from './share';
import {
  chartHandoffFragment,
  compatibilityHandoffPath,
  mineHandoffFromHash,
  profileChartHandoffFragment,
  profileChartIdFromHash,
  profileHandoffOriginsFromHash,
  someoneElseHandoffPath,
  someoneElseProfileHandoffPath,
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
const PROFILE_CHART_ID = '11111111-1111-4111-8111-111111111111';

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

  it('marks saved-profile provenance without changing ordinary public handoffs', () => {
    const primaryFragment = profileChartHandoffFragment(PROFILE_CHART_ID)!;
    expect(profileChartIdFromHash(primaryFragment)).toBe(PROFILE_CHART_ID);
    expect(primaryFragment).not.toMatch(/1990|1988|America|New_York/);
    expect(profileHandoffOriginsFromHash(primaryFragment)).toEqual({ chart: true, mine: false });

    const profileMineFragment = chartHandoffFragment(PERSON, {
      mine: { kind: 'saved', id: PROFILE_CHART_ID },
      mineProfileOrigin: true,
    });
    expect(profileHandoffOriginsFromHash(profileMineFragment)).toEqual({ chart: false, mine: true });

    const publicFragment = chartHandoffFragment(PERSON, {
      mine: { kind: 'input', input: MINE },
    });
    expect(profileHandoffOriginsFromHash(publicFragment)).toEqual({ chart: false, mine: false });
    expect(new URLSearchParams(publicFragment).has('profileChartId')).toBe(false);
    expect(new URLSearchParams(publicFragment).has('mineSource')).toBe(false);
  });

  it('fails closed to public provenance for duplicate or malformed origin markers', () => {
    expect(profileHandoffOriginsFromHash('#profileChartId=a&profileChartId=a'))
      .toEqual({ chart: false, mine: false });
    expect(profileHandoffOriginsFromHash('#mineSource=saved')).toEqual({ chart: false, mine: false });
    expect(profileHandoffOriginsFromHash('#mine=anything&mineSource=profile'))
      .toEqual({ chart: false, mine: false });
    expect(profileChartHandoffFragment('birth details instead of an opaque id')).toBeNull();
    const invalidPrivateMine = new URLSearchParams(chartHandoffFragment(PERSON, {
      mine: { kind: 'saved', id: 'not-an-opaque-profile-id' },
      mineProfileOrigin: true,
    }));
    expect(invalidPrivateMine.has('mineId')).toBe(false);
    expect(invalidPrivateMine.has('mineSource')).toBe(false);
  });

  it('carries the current chart into the someone-else route without a query string', () => {
    const path = someoneElseHandoffPath(MINE);
    expect(path.startsWith('/birth-chart/someone-else/#mine=')).toBe(true);
    expect(mineHandoffFromHash(path.split('#')[1])).toEqual({ kind: 'input', input: MINE });
  });

  it('can mark the someone-else mine context as profile-derived', () => {
    const path = someoneElseProfileHandoffPath(PROFILE_CHART_ID)!;
    expect(profileHandoffOriginsFromHash(path.split('#')[1])).toEqual({ chart: false, mine: true });
    expect(mineHandoffFromHash(path.split('#')[1])).toEqual({ kind: 'saved', id: PROFILE_CHART_ID });
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
