import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatClock,
  formatPrice,
  hitTest,
  layoutCandles,
  niceTicks,
  priceExtent,
  timeTickIndices,
  volumeExtent,
  yForPrice,
} from '../src/exchange/chart-model.mjs';

const CANDLES = [
  { ts: 1786233600, o: 1, h: 3, l: 0.5, c: 2, v: 10 },
  { ts: 1786237200, o: 2, h: 4, l: 1.5, c: 3, v: 30 },
  { ts: 1786240800, o: 3, h: 5, l: 2.5, c: 4, v: 20 },
];

describe('extents', () => {
  it('pads the high-low range and never goes below zero', () => {
    const extent = priceExtent(CANDLES);
    expect(extent.min).toBeCloseTo(Math.max(0, 0.5 - 4.5 * 0.08));
    expect(extent.max).toBeCloseTo(5 + 4.5 * 0.08);
  });

  it('opens a window around a flat series instead of collapsing', () => {
    const extent = priceExtent([{ ts: 1, o: 2, h: 2, l: 2, c: 2, v: 0 }]);
    expect(extent.max).toBeGreaterThan(extent.min);
  });

  it('answers null for nothing', () => {
    expect(priceExtent([])).toBeNull();
  });

  it('finds the loudest volume bar', () => {
    expect(volumeExtent(CANDLES)).toBe(30);
  });
});

describe('ticks', () => {
  it('lands on 1/2/5 steps inside the extent', () => {
    const ticks = niceTicks(0, 10, 4);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks[0]).toBeGreaterThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(10);
    const step = ticks[1] - ticks[0];
    const magnitude = 10 ** Math.floor(Math.log10(step));
    expect([1, 2, 5]).toContain(Math.round(step / magnitude));
  });

  it('answers nothing for a degenerate range', () => {
    expect(niceTicks(5, 5, 4)).toEqual([]);
  });
});

describe('layout', () => {
  it('spaces candles by index across the width', () => {
    const { step, centers, bodyWidth } = layoutCandles(4, 400);
    expect(step).toBe(100);
    expect(centers).toEqual([50, 150, 250, 350]);
    expect(bodyWidth).toBeGreaterThan(0);
  });

  it('keeps at least one pixel of body when candles crowd', () => {
    expect(layoutCandles(2000, 400).bodyWidth).toBe(1);
  });

  it('maps price to y top-down', () => {
    const extent = { min: 0, max: 10 };
    expect(yForPrice(0, extent, 100)).toBe(100);
    expect(yForPrice(10, extent, 100)).toBe(0);
    expect(yForPrice(5, extent, 100)).toBe(50);
  });

  it('hit-tests by index and refuses the outside', () => {
    expect(hitTest(50, 4, 400)).toBe(0);
    expect(hitTest(399, 4, 400)).toBe(3);
    expect(hitTest(-1, 4, 400)).toBeNull();
    expect(hitTest(400, 4, 400)).toBeNull();
  });

  it('thins time labels to a readable few', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ ts: i }));
    const indices = timeTickIndices(many, '1h', 6);
    expect(indices.length).toBeLessThanOrEqual(6);
    expect(indices[0]).toBe(0);
  });
});

describe('formatting', () => {
  it('holds four significant digits from dollars down to dust', () => {
    expect(formatPrice(77.2923)).toBe('77.29');
    expect(formatPrice(0.00007272)).toBe('0.00007272');
    expect(formatPrice(1)).toBe('1');
    expect(formatPrice('nope')).toBe('—');
  });

  it('never falls into scientific notation', () => {
    expect(formatPrice(0.000000094)).not.toMatch(/e/i);
  });

  it('labels daily frames by date and finer frames by clock', () => {
    expect(formatClock(1786233600, '1d')).toBe('9 Aug');
    expect(formatClock(1786233600, '1h')).toMatch(/^9 Aug \d{2}:\d{2}$/);
  });

  it('ages the tape in plain units', () => {
    const now = 1_000_000_000;
    expect(formatAge(now - 30_000, now)).toBe('30s ago');
    expect(formatAge(now - 300_000, now)).toBe('5m ago');
    expect(formatAge(now - 7_200_000, now)).toBe('2h ago');
  });
});
