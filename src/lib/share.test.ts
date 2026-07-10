/**
 * The share codec carries birth data through hostile territory (chat
 * apps, URL bars, hand-editing). Round-trips must be lossless; anything
 * else — garbage, truncation, tampered fields, future versions — must
 * come back null, never a throw or a half-valid chart.
 */
import { describe, expect, it } from 'vitest';
import { decodeChartLink, encodeChartLink } from './share';
import type { ShareChartInput } from './share';
import {
  decodePositionsLink,
  encodePositionsLink,
  POSITION_BODY_ORDER,
} from './share-positions';
import type { PositionsShareInput } from './share-positions';

const FULL: ShareChartInput = {
  date: '1990-06-15',
  time: '08:30',
  timeKnown: true,
  lat: 40.7128,
  lon: -74.006,
  tz: 'America/New_York',
  name: 'Alex',
  place: 'New York',
  houseSystem: 'whole',
};

describe('encodeChartLink / decodeChartLink', () => {
  it('round-trips a full input losslessly', () => {
    expect(decodeChartLink(encodeChartLink(FULL))).toEqual(FULL);
  });

  it('round-trips a no-time chart (time null, timeKnown false)', () => {
    const input: ShareChartInput = { ...FULL, time: null, timeKnown: false };
    delete (input as Partial<ShareChartInput>).name;
    delete (input as Partial<ShareChartInput>).place;
    expect(decodeChartLink(encodeChartLink(input))).toEqual(input);
  });

  it('round-trips placidus and non-ASCII labels', () => {
    const input: ShareChartInput = {
      ...FULL, houseSystem: 'placidus', name: 'José', place: 'São Paulo', tz: 'America/Sao_Paulo',
    };
    expect(decodeChartLink(encodeChartLink(input))).toEqual(input);
  });

  it('drops the time when timeKnown is false even if a time string is present', () => {
    const decoded = decodeChartLink(encodeChartLink({ ...FULL, timeKnown: false }));
    expect(decoded?.time).toBeNull();
    expect(decoded?.timeKnown).toBe(false);
  });

  it('truncates names and places to their caps', () => {
    const decoded = decodeChartLink(encodeChartLink({
      ...FULL,
      name: 'x'.repeat(60),
      place: 'y'.repeat(90),
    }));
    expect(decoded?.name?.length).toBe(24);
    expect(decoded?.place?.length).toBe(40);
  });

  it('keeps links short enough to paste anywhere', () => {
    expect(encodeChartLink(FULL).length).toBeLessThan(180);
  });

  it('produces only URL-safe characters', () => {
    expect(encodeChartLink(FULL)).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  });
});

describe('decodeChartLink rejects', () => {
  const encode = (wire: object) =>
    `1.${Buffer.from(JSON.stringify(wire)).toString('base64url')}`;
  const BASE = { d: '1990-06-15', t: '08:30', z: 'America/New_York', la: 40.7, lo: -74 };

  it('garbage, empty, and non-token strings', () => {
    expect(decodeChartLink('')).toBeNull();
    expect(decodeChartLink('not a token')).toBeNull();
    expect(decodeChartLink('1.!!!!')).toBeNull();
    expect(decodeChartLink('1.')).toBeNull();
    expect(decodeChartLink(`1.${Buffer.from('[1,2]').toString('base64url')}`)).toBeNull();
  });

  it('future versions', () => {
    expect(decodeChartLink(encode(BASE).replace(/^1\./, '2.'))).toBeNull();
  });

  it('bad dates', () => {
    expect(decodeChartLink(encode({ ...BASE, d: '1700-01-01' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, d: '1990-13-01' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, d: 'yesterday' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, d: 42 }))).toBeNull();
  });

  it('bad times', () => {
    expect(decodeChartLink(encode({ ...BASE, t: '24:00' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, t: '8:30' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, t: 830 }))).toBeNull();
  });

  it('bad timezones', () => {
    expect(decodeChartLink(encode({ ...BASE, z: 'Mars/Olympus_Mons' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, z: '' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, z: 7 }))).toBeNull();
  });

  it('out-of-range coordinates', () => {
    expect(decodeChartLink(encode({ ...BASE, la: 91 }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, lo: -181 }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, la: 'north' }))).toBeNull();
    expect(decodeChartLink(encode({ ...BASE, la: Infinity }))).toBeNull();
  });

  it('unknown house systems', () => {
    expect(decodeChartLink(encode({ ...BASE, h: 'koch' }))).toBeNull();
  });

  it('missing required fields', () => {
    const { d, ...noDate } = { ...BASE };
    expect(decodeChartLink(encode(noDate))).toBeNull();
    const { z, ...noTz } = { ...BASE };
    expect(decodeChartLink(encode(noTz))).toBeNull();
  });
});

const POSITION_LONGITUDES: Record<(typeof POSITION_BODY_ORDER)[number], number> = {
  Sun: 84.12349,
  Moon: 346.98761,
  Mercury: 72.00049,
  Venus: 41.31415,
  Mars: 359.9996,
  Jupiter: 107.4,
  Saturn: 294.5522,
  Uranus: 278.1001,
  Neptune: 283.7654,
  Pluto: 227.2222,
  'North Node': 312.9999,
  'South Node': 132.9999,
};

const POSITIONS: PositionsShareInput = {
  // Deliberately reversed: the encoder contract, not engine emission order,
  // determines the wire order.
  bodies: [...POSITION_BODY_ORDER].reverse().map((body) => ({
    body,
    lon: POSITION_LONGITUDES[body],
  })),
  angles: { asc: 123.45678, mc: 31.99949 },
  houseSystem: 'placidus',
  engineVersion: '1.0.0',
};

const encodeV2Wire = (wire: unknown) =>
  `2.${Buffer.from(JSON.stringify(wire)).toString('base64url')}`;

const readV2Wire = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(token.slice(2), 'base64url').toString('utf8')) as Record<string, unknown>;

describe('positions-only v2 share codec', () => {
  it('round-trips in the fixed twelve-body order at documented 3dp precision', () => {
    const token = encodePositionsLink(POSITIONS);
    expect(token).not.toBeNull();
    const decoded = decodePositionsLink(token!);

    expect(decoded).toEqual({
      bodies: [
        { body: 'Sun', lon: 84.123 },
        { body: 'Moon', lon: 346.988 },
        { body: 'Mercury', lon: 72 },
        { body: 'Venus', lon: 41.314 },
        // Values that round across 360° are canonicalized to 0°.
        { body: 'Mars', lon: 0 },
        { body: 'Jupiter', lon: 107.4 },
        { body: 'Saturn', lon: 294.552 },
        { body: 'Uranus', lon: 278.1 },
        { body: 'Neptune', lon: 283.765 },
        { body: 'Pluto', lon: 227.222 },
        { body: 'North Node', lon: 313 },
        { body: 'South Node', lon: 133 },
      ],
      angles: { asc: 123.457, mc: 31.999 },
      houseSystem: 'placidus',
      engineVersion: '1.0.0',
    });
  });

  it('round-trips a whole-sign no-time chart with no angle field', () => {
    const input: PositionsShareInput = {
      ...POSITIONS,
      angles: null,
      houseSystem: 'whole',
      engineVersion: '1.0.0-beta+7',
    };
    const token = encodePositionsLink(input);
    expect(token).not.toBeNull();
    expect(readV2Wire(token!)).toEqual({
      b: POSITION_BODY_ORDER.map((body) => {
        const rounded = Math.round(POSITION_LONGITUDES[body] * 1e3) / 1e3;
        return rounded === 360 ? 0 : rounded;
      }),
      h: 'w',
      v: '1.0.0-beta+7',
    });
    expect(decodePositionsLink(token!)).toMatchObject({
      angles: null,
      houseSystem: 'whole',
      engineVersion: '1.0.0-beta+7',
    });
  });

  it('emits a compact, deterministic URL-safe token', () => {
    const first = encodePositionsLink(POSITIONS);
    const second = encodePositionsLink({
      ...POSITIONS,
      bodies: [...POSITIONS.bodies].reverse(),
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^2\.[A-Za-z0-9_-]+$/);
    expect(first!.length).toBeLessThan(256);
  });

  it('serializes only positions, angles, house system, and engine version', () => {
    const hostileExtras = {
      ...POSITIONS,
      bodies: POSITIONS.bodies.map((body) => ({
        ...body, lat: 1.25, speed: -0.5, retrograde: true, private: 'body-secret',
      })),
      angles: {
        ...POSITIONS.angles!, dsc: 303.45678, ic: 211.99949, private: 'angle-secret',
      },
      date: '1990-06-15',
      time: '08:30',
      tz: 'America/New_York',
      lat: 40.7128,
      lon: -74.006,
      name: 'Alex Private',
      place: 'New York Private',
      flags: ['dst-fold'],
    } as PositionsShareInput;
    const token = encodePositionsLink(hostileExtras);
    expect(token).not.toBeNull();

    const wire = readV2Wire(token!);
    expect(Object.keys(wire)).toEqual(['b', 'h', 'v', 'a']);
    expect(JSON.stringify(wire)).not.toMatch(
      /1990|08:30|America|40\.7128|-74\.006|Alex|New York|dst-fold|secret|date|time|tz|lat|lon|name|place|flags|speed|retrograde|dsc|ic/,
    );
  });

  it('keeps the v1 namespace and behavior separate', () => {
    const v1 = encodeChartLink(FULL);
    const v2 = encodePositionsLink(POSITIONS)!;
    expect(decodePositionsLink(v1)).toBeNull();
    expect(decodeChartLink(v2)).toBeNull();
    expect(decodeChartLink(v1)).toEqual(FULL);
  });
});

describe('encodePositionsLink rejects invalid chart data', () => {
  it('rejects missing, duplicate, and unknown bodies', () => {
    expect(encodePositionsLink({ ...POSITIONS, bodies: POSITIONS.bodies.slice(1) })).toBeNull();
    expect(encodePositionsLink({
      ...POSITIONS,
      bodies: POSITIONS.bodies.map((position, index) => (
        index === 0 ? { ...position, body: 'Sun' } : position
      )),
    })).toBeNull();
    expect(encodePositionsLink({
      ...POSITIONS,
      bodies: POSITIONS.bodies.map((position, index) => (
        index === 0 ? { ...position, body: 'Chiron' as 'Sun' } : position
      )),
    })).toBeNull();
  });

  it('rejects invalid longitudes, angles, house systems, and versions', () => {
    for (const lon of [-0.001, 360, Number.NaN, Number.POSITIVE_INFINITY]) {
      const bodies = POSITIONS.bodies.map((position, index) => (
        index === 0 ? { ...position, lon } : position
      ));
      expect(encodePositionsLink({ ...POSITIONS, bodies })).toBeNull();
    }
    expect(encodePositionsLink({ ...POSITIONS, angles: { asc: 360, mc: 20 } })).toBeNull();
    expect(encodePositionsLink({
      ...POSITIONS,
      houseSystem: 'koch' as 'whole',
    })).toBeNull();
    expect(encodePositionsLink({ ...POSITIONS, engineVersion: '' })).toBeNull();
    expect(encodePositionsLink({ ...POSITIONS, engineVersion: '1.0.0 private' })).toBeNull();
    expect(encodePositionsLink({ ...POSITIONS, engineVersion: 'v'.repeat(33) })).toBeNull();
  });
});

describe('decodePositionsLink rejects hostile or tampered input', () => {
  const BASE_WIRE = {
    b: POSITION_BODY_ORDER.map((_, index) => index * 29.5),
    a: [120.5, 30.25],
    h: 'w',
    v: '1.0.0',
  };

  it('never throws for arbitrary values or malformed encodings', () => {
    const hostile = [
      '', '2.', '2.!!!!', '1.abc', '3.abc',
      `2.${'A'.repeat(255)}`,
      `2.${Buffer.from('{').toString('base64url')}`,
      `2.${Buffer.from('[1,2]').toString('base64url')}`,
      `2.${Buffer.from('null').toString('base64url')}`,
      `2.${Buffer.from(Uint8Array.from([0xff, 0xfe, 0xfd])).toString('base64url')}`,
    ];
    for (const token of hostile) {
      expect(() => decodePositionsLink(token)).not.toThrow();
      expect(decodePositionsLink(token)).toBeNull();
    }
    expect(() => decodePositionsLink(null as unknown as string)).not.toThrow();
    expect(decodePositionsLink(null as unknown as string)).toBeNull();
  });

  it('enforces the maximum token length before decoding', () => {
    expect(decodePositionsLink(`2.${'A'.repeat(255)}`)).toBeNull();
  });

  it('requires exactly the v2 keys, with angles the only optional key', () => {
    const { b: _bodies, ...missingBodies } = BASE_WIRE;
    const { v: _version, ...missingVersion } = BASE_WIRE;
    const { h: _house, ...missingHouse } = BASE_WIRE;
    expect(decodePositionsLink(encodeV2Wire(missingBodies))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire(missingVersion))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire(missingHouse))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, d: '1990-06-15' }))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, name: 'private' }))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, flags: [] }))).toBeNull();
  });

  it('rejects duplicate wire keys instead of accepting JSON last-write-wins', () => {
    const json = JSON.stringify(BASE_WIRE).replace('"v":"1.0.0"', '"v":"private","v":"1.0.0"');
    expect(decodePositionsLink(`2.${Buffer.from(json).toString('base64url')}`)).toBeNull();
  });

  it('rejects duplicate keys hidden behind JSON unicode escapes', () => {
    const json = JSON.stringify(BASE_WIRE).replace(
      '{"b":',
      `{"\\u0062":${JSON.stringify(BASE_WIRE.b)},"b":`,
    );
    expect(json).toContain('"\\u0062"');
    expect(decodePositionsLink(`2.${Buffer.from(json).toString('base64url')}`)).toBeNull();
  });

  it('requires exactly twelve finite longitudes in [0, 360)', () => {
    expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, b: BASE_WIRE.b.slice(1) }))).toBeNull();
    expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, b: [...BASE_WIRE.b, 12] }))).toBeNull();
    for (const value of [-0.001, 360, null, '12', Number.NaN, Number.POSITIVE_INFINITY]) {
      const b = [...BASE_WIRE.b];
      b[4] = value as number;
      expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, b }))).toBeNull();
    }
  });

  it('requires either no angles or exactly two valid [asc, mc] longitudes', () => {
    const { a: _angles, ...withoutAngles } = BASE_WIRE;
    expect(decodePositionsLink(encodeV2Wire(withoutAngles))?.angles).toBeNull();
    for (const a of [null, [], [1], [1, 2, 3], [-1, 2], [1, 360], ['1', 2]]) {
      expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, a }))).toBeNull();
    }
  });

  it('accepts only whole/placidus codes and bounded ASCII engine versions', () => {
    for (const h of ['whole', 'placidus', 'k', '', 1, null]) {
      expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, h }))).toBeNull();
    }
    for (const v of ['', '.1', '1 0', '1/0', 'privaté', 'v'.repeat(33), 1, null]) {
      expect(decodePositionsLink(encodeV2Wire({ ...BASE_WIRE, v }))).toBeNull();
    }
  });

  it('rejects padded and non-canonical base64url payloads', () => {
    const canonical = encodeV2Wire(BASE_WIRE);
    expect(decodePositionsLink(`${canonical}=`)).toBeNull();

    // For a one-byte payload, the low four bits of the second base64 digit
    // are padding and must be zero. `Zh` decodes like canonical `Zg` in
    // permissive base64 implementations, but is not a canonical spelling.
    expect(decodePositionsLink('2.Zh')).toBeNull();
  });
});
