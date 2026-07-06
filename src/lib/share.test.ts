/**
 * The share codec carries birth data through hostile territory (chat
 * apps, URL bars, hand-editing). Round-trips must be lossless; anything
 * else — garbage, truncation, tampered fields, future versions — must
 * come back null, never a throw or a half-valid chart.
 */
import { describe, expect, it } from 'vitest';
import { decodeChartLink, encodeChartLink } from './share';
import type { ShareChartInput } from './share';

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
