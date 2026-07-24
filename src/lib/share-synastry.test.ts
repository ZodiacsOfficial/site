import { describe, expect, it } from 'vitest';
import {
  decodeSynastryLink,
  encodeSynastryLink,
  SYN_TOKEN_LIMIT,
} from './share-synastry';
import { POSITION_BODY_ORDER, type PositionsShareInput } from './share-positions';

function chart(offset: number, timed = true): PositionsShareInput {
  return {
    bodies: POSITION_BODY_ORDER.map((body, index) => ({
      body,
      lon: (offset + index * 27.123) % 360,
    })),
    angles: timed ? { asc: (offset + 12.345) % 360, mc: (offset + 101.234) % 360 } : null,
    houseSystem: 'whole',
    engineVersion: 'zodiacs-1.0.0',
  };
}

function base64Url(value: string): string {
  return btoa(value).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

describe('positions-only synastry share codec', () => {
  it('round-trips two canonical positions wires and labels', () => {
    const token = encodeSynastryLink({
      sides: [
        { chart: chart(10), label: 'Frida' },
        { chart: chart(90, false), label: 'Diego' },
      ],
    });
    expect(token).toMatch(/^s1\.[A-Za-z0-9_-]+$/u);
    expect(token!.length).toBeLessThanOrEqual(SYN_TOKEN_LIMIT);
    expect(decodeSynastryLink(token!)).toMatchObject({
      sides: [
        { label: 'Frida', timeKnown: true, chart: { angles: expect.any(Object) } },
        { label: 'Diego', timeKnown: false, chart: { angles: null } },
      ],
    });
  });

  it('normalizes harmless label whitespace without accepting control text', () => {
    const token = encodeSynastryLink({
      sides: [
        { chart: chart(0), label: '  Their\n side  ' },
        { chart: chart(40), label: undefined },
      ],
    });
    expect(decodeSynastryLink(token!)?.sides.map((side) => side.label))
      .toEqual(['Their side', '']);
  });

  it('rejects overlong labels and invalid position sides', () => {
    expect(encodeSynastryLink({
      sides: [
        { chart: chart(0), label: 'x'.repeat(25) },
        { chart: chart(40), label: 'B' },
      ],
    })).toBeNull();
    const invalid = chart(0);
    invalid.bodies = invalid.bodies.slice(1);
    expect(encodeSynastryLink({
      sides: [{ chart: invalid }, { chart: chart(40) }],
    })).toBeNull();
  });

  it('rejects hostile, noncanonical, oversized, extra-key, and mismatched-time input', () => {
    expect(decodeSynastryLink('s1.not*base64')).toBeNull();
    expect(decodeSynastryLink(`s1.${'a'.repeat(SYN_TOKEN_LIMIT)}`)).toBeNull();

    const normal = encodeSynastryLink({
      sides: [{ chart: chart(0) }, { chart: chart(40) }],
    })!;
    const parsed = JSON.parse(atob(normal.slice(3).replace(/-/gu, '+').replace(/_/gu, '/')));

    expect(decodeSynastryLink(`s1.${base64Url(JSON.stringify({ ...parsed, x: 1 }))}`)).toBeNull();
    expect(decodeSynastryLink(`s1.${base64Url(JSON.stringify({
      p: parsed.p,
      l: parsed.l,
      k: [false, true],
    }))}`)).toBeNull();

    const duplicateKeyJson = `{"p":${JSON.stringify(parsed.p)},"l":["",""],"k":[true,true],"\\u0070":[]}`;
    expect(decodeSynastryLink(`s1.${base64Url(duplicateKeyJson)}`)).toBeNull();
  });

  it('contains no birth-input vocabulary in its wire', () => {
    const token = encodeSynastryLink({
      sides: [{ chart: chart(0), label: 'A' }, { chart: chart(40), label: 'B' }],
    })!;
    const json = atob(token.slice(3).replace(/-/gu, '+').replace(/_/gu, '/'));
    expect(json).not.toMatch(/date|time|place|lat|lon|timezone|email|account|invite/iu);
  });
});
