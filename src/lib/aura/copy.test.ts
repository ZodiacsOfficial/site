import { describe, expect, it } from 'vitest';
import type { SavedChart } from '../profile/schema';
import type { AuraNextActivation, AuraSignContext } from './types';
import {
  auraCalendarLine,
  auraDateStamp,
  auraFocalReason,
  auraRelativeDayNote,
  auraSinceLastLine,
  auraWheelDescription,
} from './copy';

const SKY_AT = '2026-07-16T12:00:00.000Z';

function context(overrides: Partial<AuraSignContext> = {}): AuraSignContext {
  return {
    sign: 'aries',
    natalEcho: [],
    activeNow: [],
    nextActivation: null,
    uncertainties: [],
    reading: {
      lead: 'A fixed reflection.',
      detail: 'A fixed detail.',
      text: 'A fixed reflection. A fixed detail.',
    },
    ...overrides,
  };
}

function chart(timeKnown = true): SavedChart {
  return {
    id: 'chart-copy-fixture',
    name: 'Copy fixture',
    createdAt: SKY_AT,
    updatedAt: SKY_AT,
    birth: {
      date: '1990-04-01',
      time: timeKnown ? '09:30' : null,
      timeKnown,
      place: null,
    },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1990-04-01T12:00:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: 10, retrograde: false },
        { body: 'Moon', lon: 40, retrograde: false },
        { body: 'Mercury', lon: 70, retrograde: false },
        { body: 'Venus', lon: 100, retrograde: false },
        { body: 'Mars', lon: 130, retrograde: false },
        { body: 'Jupiter', lon: 160, retrograde: false },
      ],
      angles: { asc: 190, mc: 280 },
      flags: [],
    },
  };
}

describe('Registry Aura focal evidence copy', () => {
  it('dates the exact sky event from its own timestamp', () => {
    const reason = auraFocalReason(
      context({
        activeNow: [{
          id: 'event:test-eclipse',
          source: 'event',
          kind: 'eclipse',
          sign: 'aries',
          eventId: 'test-eclipse',
          exactAt: '2026-07-17T00:30:00.000Z',
          activeFrom: '2026-07-16T00:30:00.000Z',
          activeUntil: '2026-07-18T00:30:00.000Z',
          label: 'Eclipse in Aries',
        }],
      }),
      '2026-07-16T23:30:00.000Z',
    );
    expect(reason).toContain('Eclipse in Aries');
    expect(reason).toContain('July 17, 2026 UTC');
    expect(reason).not.toContain('July 16, 2026');
  });

  it('explains a quiet zodiac-order focus without invented signal language', () => {
    expect(auraFocalReason(context(), SKY_AT)).toBe(
      'No dated sky or chart signal favors any held sign, so zodiac order chooses.',
    );
  });

  it('keeps the chart-echo reason free of ranking language', () => {
    const reason = auraFocalReason(
      context({
        natalEcho: [{
          id: 'natal:sun',
          source: 'chart',
          kind: 'natal-body',
          sign: 'aries',
          body: 'Sun',
          longitude: 10,
          precision: 'exact-time',
          label: 'Sun in Aries',
        }],
      }),
      SKY_AT,
    );
    expect(reason).toBe(
      'Aries appears in the selected birth chart; no held sign has a stronger dated sky signal.',
    );
  });

  it('never claims a selected chart for the illustrative example', () => {
    const echo = context({
      natalEcho: [{
        id: 'natal:sun',
        source: 'chart',
        kind: 'natal-body',
        sign: 'aries',
        body: 'Sun',
        longitude: 10,
        precision: 'exact-time',
        label: 'Sun in Aries',
      }],
    });
    expect(auraFocalReason(echo, SKY_AT, true)).toBe(
      'Aries appears in the example chart; no held sign has a stronger dated sky signal.',
    );
    expect(auraFocalReason(echo, SKY_AT, true)).not.toContain('selected birth chart');
  });
});

describe('Registry Aura calendar copy', () => {
  const activation = (overrides: Partial<AuraNextActivation>): AuraNextActivation => ({
    sign: 'cancer',
    kind: 'station',
    at: '2026-07-23T22:56:00.000Z',
    source: 'event-catalog',
    beginsAt: '2026-07-22T22:56:00.000Z',
    exactAt: '2026-07-23T22:56:00.000Z',
    label: 'Mercury stations direct',
    eventId: 'station:mercury-direct-cancer:2026-07-23T22:56:00.000Z',
    body: 'Mercury',
    eventType: 'direct',
    ...overrides,
  });

  it('names the public event with its body and both dates, without repo jargon', () => {
    const line = auraCalendarLine(activation({}));
    expect(line).toBe(
      'Across the held signs, Mercury stations direct comes next — exact Jul 23, 2026, 10:56 PM UTC; its ±24-hour window opens Jul 22, 2026, 10:56 PM UTC.',
    );
    expect(line).not.toMatch(/committed/i);
  });

  it('describes the exact Moon table as the published sky calendar', () => {
    const line = auraCalendarLine(activation({
      kind: 'moon-ingress',
      source: 'moon-ingress-catalog',
      sign: 'virgo',
      label: 'Moon enters Virgo',
      body: 'Moon',
      eventType: null,
      at: '2026-07-17T00:07:00.000Z',
      beginsAt: '2026-07-17T00:07:00.000Z',
      exactAt: '2026-07-17T00:07:00.000Z',
    }));
    expect(line).toBe(
      'Across the held signs, the Moon enters Virgo next — exact Jul 17, 2026, 12:07 AM UTC, from the Registry’s published sky calendar.',
    );
    expect(line).not.toMatch(/committed/i);
  });

  it('states an empty calendar without repo jargon', () => {
    expect(auraCalendarLine(null)).toBe(
      'No held-sign event falls within the published calendar’s range.',
    );
  });
});

describe('Registry Aura return-visit copy', () => {
  const savedAt = '2026-07-15T23:30:00.000Z';

  it('names the Moon sign change since the last reading', () => {
    expect(
      auraSinceLastLine(
        { sun: 'cancer', moon: 'leo' },
        { sun: 'cancer', moon: 'virgo' },
        savedAt,
      ),
    ).toBe('Since your last reading (Jul 15), the Moon has moved from Leo into Virgo.');
  });

  it('names both changes when the Sun moved too', () => {
    expect(
      auraSinceLastLine(
        { sun: 'cancer', moon: 'leo' },
        { sun: 'leo', moon: 'virgo' },
        savedAt,
      ),
    ).toBe(
      'Since your last reading (Jul 15), the Sun has moved into Leo and the Moon into Virgo.',
    );
  });

  it('says nothing when the sky has not visibly changed', () => {
    expect(
      auraSinceLastLine(
        { sun: 'cancer', moon: 'leo' },
        { sun: 'cancer', moon: 'leo' },
        savedAt,
      ),
    ).toBeNull();
  });
});

describe('Registry Aura date stamps', () => {
  it('formats the long UTC stamp', () => {
    expect(auraDateStamp(SKY_AT)).toBe('July 16, 2026 UTC');
  });

  it('adds a relative word only when the UTC days differ', () => {
    expect(auraRelativeDayNote('2026-07-16T01:00:00.000Z', SKY_AT)).toBeNull();
    expect(auraRelativeDayNote('2026-07-15T23:30:00.000Z', SKY_AT)).toBe('yesterday');
    expect(auraRelativeDayNote('2026-07-13T10:00:00.000Z', SKY_AT)).toBe('3 days earlier');
  });
});

describe('Registry Aura wheel description', () => {
  it('describes a recorded-time chart with its angles', () => {
    const description = auraWheelDescription(chart());
    expect(description).toContain('Sun in Aries');
    expect(description).toContain('Ascendant in Libra');
    expect(description).toContain('Midheaven in Capricorn');
  });

  it('omits Moon, angles, and degrees for an unknown birth time', () => {
    const unknown = chart(false);
    unknown.summary.angles = null;
    const description = auraWheelDescription(unknown);
    expect(/Moon|Ascendant|Midheaven|\d+°/.test(description)).toBe(false);
    expect(description).toContain('Sun in Aries');
  });
});
