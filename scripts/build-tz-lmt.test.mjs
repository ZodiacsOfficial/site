import { describe, expect, it } from 'vitest';
import { buildEras, lmtEraEnd, lmtEraLines, parseClock, parseTzdb, untilToUnixSeconds } from './build-tz-lmt.mjs';

// Excerpts in tzdb's own syntax; the full table is generated from the pinned
// release and checked with `node scripts/build-tz-lmt.mjs --check`.
const MAIN = `
# Zone	NAME		STDOFF	RULES	FORMAT	[UNTIL]
Zone America/New_York	-4:56:02 -	LMT	1883 Nov 18 17:00u
			-5:00	US	E%sT	1920
			-5:00	NYC	E%sT
Zone Asia/Manila	-15:56:08 -	LMT	1844 Dec 31
			8:03:52 -	LMT	1899 Sep  6  4:00u
			8:00	Phil	P%sT
Zone Europe/Paris	0:09:21 -	LMT	1891 Mar 16
			0:09:21 -	PMT	1911 Mar 11
			0:00	France	WE%sT
Zone Africa/Sao_Tome	 0:26:56 -	LMT	1884
			-0:36:45 -	LMT	1912 Jan 1 00:00u
			 0:00	-	GMT
Zone Antarctica/Troll	0	-	-00	2005 Feb 12
			0:00	Troll	%s
Zone Europe/Berlin	0:53:28 -	LMT	1893 Apr
			1:00	C-Eur	CE%sT
Link	Europe/Berlin	Europe/Oslo
Link	America/New_York	US/Eastern
`;
const BACKZONE = `
Zone	Europe/Oslo	0:43:00 -	LMT	1895 Jan  1
			1:00	Norway	CE%sT
`;

describe('the local mean time era builder', () => {
  it('reads tzdb clock fields, rounding fractional seconds half to even as zic does', () => {
    expect(parseClock('-4:56:02')).toBe(-(4 * 3600 + 56 * 60 + 2));
    expect(parseClock('0:09:21')).toBe(561);
    expect(parseClock('8')).toBe(28_800);
    expect(parseClock('-0:36:44.5')).toBe(-(36 * 60 + 44));
    expect(parseClock('0:36:44.5')).toBe(36 * 60 + 44);
    expect(parseClock('0:00:45.5')).toBe(46);
    expect(parseClock('0:00:45.51')).toBe(46);
    expect(parseClock('0:00:44.49')).toBe(44);
    expect(() => parseClock('noon')).toThrow('unrecognised time');
  });

  it('turns an UNTIL on a local mean time line into a Unix instant', () => {
    expect(untilToUnixSeconds(['1883', 'Nov', '18', '17:00u'], parseClock('-4:56:02')))
      .toBe(Date.UTC(1883, 10, 18, 17) / 1000);
    // Wall time on the line's own offset.
    expect(untilToUnixSeconds(['1891', 'Mar', '16'], 561)).toBe(Date.UTC(1891, 2, 16) / 1000 - 561);
    expect(untilToUnixSeconds(['1884'], 1616)).toBe(Date.UTC(1884, 0, 1) / 1000 - 1616);
    expect(untilToUnixSeconds(['1911', 'Mar', 'Sun>=8'], 0)).toBe(Date.UTC(1911, 2, 12) / 1000);
    expect(untilToUnixSeconds(['1916', 'Oct', 'lastSun'], 0)).toBe(Date.UTC(1916, 9, 29) / 1000);
  });

  it('ends an era at the first legal clock, including a legal mean time on the same offset', () => {
    const { zones } = parseTzdb(MAIN);
    expect(lmtEraEnd(zones.get('America/New_York'))).toBe(Date.UTC(1883, 10, 18, 17) / 1000);
    // Paris Mean Time from 1891 is a legal adoption of the same offset.
    expect(lmtEraEnd(zones.get('Europe/Paris'))).toBe(Date.UTC(1891, 2, 16) / 1000 - 561);
  });

  it('continues an era across a date line move and stops at a later local mean time line', () => {
    const { zones } = parseTzdb(MAIN);
    // Manila moved west to east of the date line in 1844 and kept its own mean time.
    expect(lmtEraEnd(zones.get('Asia/Manila'))).toBe(Date.UTC(1899, 8, 6, 4) / 1000);
    expect(lmtEraLines(zones.get('Asia/Manila'))).toEqual([
      [Date.UTC(1844, 11, 31) / 1000 + parseClock('15:56:08'), parseClock('-15:56:08')],
      [Date.UTC(1899, 8, 6, 4) / 1000, parseClock('8:03:52')],
    ]);
    // São Tomé's second LMT line is Lisbon's clock adopted in 1884, not the town's.
    expect(lmtEraEnd(zones.get('Africa/Sao_Tome'))).toBe(Date.UTC(1884, 0, 1) / 1000 - parseClock('0:26:56'));
    expect(lmtEraEnd(zones.get('Antarctica/Troll'))).toBeNull();
  });

  it('prefers backzone over a main-data link and resolves the remaining links', () => {
    const { eras, offsets, dateLine } = buildEras(parseTzdb(MAIN), parseTzdb(BACKZONE));
    // Eras that crossed the date line carry their lines; the rest their offset.
    expect(Object.keys(dateLine)).toEqual(['Asia/Manila']);
    expect(offsets['Europe/Oslo']).toBe(43 * 60);
    expect(offsets['US/Eastern']).toBe(parseClock('-4:56:02'));
    expect(Object.keys(offsets).length + Object.keys(dateLine).length).toBe(Object.keys(eras).length);
    expect(eras['Europe/Oslo']).toBe(Date.UTC(1895, 0, 1) / 1000 - 43 * 60);
    expect(eras['US/Eastern']).toBe(eras['America/New_York']);
    expect(eras).not.toHaveProperty('Antarctica/Troll');
    expect(Object.keys(eras)).toEqual([...Object.keys(eras)].sort());
  });

  it('refuses tzdb it does not understand rather than guess', () => {
    expect(() => lmtEraEnd([['-4:56:02', 'US', 'LMT', '1883']])).toThrow('with rules');
    expect(() => lmtEraEnd([['-4:56:02', '-', 'LMT']])).toThrow('never leaves');
    expect(() => buildEras(parseTzdb('Link Nowhere/Zone Some/Name'), parseTzdb(''))).toThrow('resolves to no zone');
  });
});
