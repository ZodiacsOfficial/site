import { describe, expect, it } from 'vitest';
import { eventsCatalog } from './catalog';
import {
  MOON_MONTH_NAMES, eventClock, eventDay, moonNameForDate, moonNameLabel,
  timelineLine, windowLabel,
} from './format';

describe('events format — moon-name tradition', () => {
  it('pins the twelve almanac names to the table on /full-moon-calendar/', () => {
    expect([...MOON_MONTH_NAMES]).toEqual([
      'Wolf', 'Snow', 'Worm', 'Pink', 'Flower', 'Strawberry',
      'Buck', 'Sturgeon', 'Corn', 'Hunter’s', 'Beaver', 'Cold',
    ]);
  });

  it('names months by UTC month and blue moons by second-in-month', () => {
    expect(moonNameForDate('2026-07-29T14:36:19.011Z', false)).toBe('Buck');
    expect(moonNameForDate('2026-05-31T00:00:00.000Z', true)).toBe('Blue');
    expect(moonNameLabel('Buck')).toBe('the Buck Moon');
    expect(moonNameLabel('Blue')).toBe('a blue moon');
  });
});

describe('events format — receipts', () => {
  it('renders UTC days, clocks, and window labels', () => {
    expect(eventDay('2026-07-29T14:36:19.011Z')).toBe('July 29, 2026');
    expect(eventClock('2026-07-29T14:36:19.011Z')).toBe('14:36 UTC');
    expect(windowLabel('2026-06-29T17:37:12.860Z', '2026-07-23T22:56:19.394Z'))
      .toBe('Jun 29, 2026 – Jul 23, 2026');
    expect(windowLabel('2026-06-29T17:37:12.860Z', null))
      .toBe('Jun 29, 2026 – past the data horizon');
  });
});

describe('events format — generated timeline lines', () => {
  it('gives every catalog event a clean, complete one-liner', () => {
    const banned = /delve|unlock|embark|tapestry|vibrant|elevate|empower|harness|!/i;
    for (const event of eventsCatalog().events) {
      const line = timelineLine(event.facts);
      expect(line.length, event.facts.id).toBeGreaterThan(20);
      expect(line.endsWith('.'), `${event.facts.id}: ${line}`).toBe(true);
      expect(banned.test(line), `${event.facts.id}: ${line}`).toBe(false);
    }
  });
});
