import { expect, test } from 'vitest';
import { inspectCrowdedGeometry } from './explorer-crowded-wheel-checks.mjs';

const box = (left, top, right, bottom) => ({ left, top, right, bottom });
const marker = (id, x, y) => ({ id, x, y, r: 8, stroke: 1,
  glyph: box(x - 3, y - 3, x + 3, y + 3), rx: null,
  tick: { x: x * 2, y: y * 2 }, leader: null });
const snapshot = (...bodies) => ({ center: { x: 0, y: 0 }, scale: 1, bodies });

test('visible gutter uses both strokes and actual SVG-to-CSS scale', () => {
  const a = marker('A', 20, 0), b = marker('B', 40, 0);
  expect(inspectCrowdedGeometry(snapshot(a, b)).minimumGutterPx).toBe(3);
  expect(inspectCrowdedGeometry({ ...snapshot(a, b), scale: 0.25 }).failures).toContain('A/B: only 0.750 CSS px marker gutter');
  expect(inspectCrowdedGeometry(snapshot(a, marker('B', 35, 0))).failures.some((failure) => failure.includes('marker gutter'))).toBe(true);
});

test('label bounds cannot hide within circle clearance', () => {
  const a = marker('A', 20, 0), b = marker('B', 40, 0);
  a.rx = box(19, -2, 24, 2);
  expect(inspectCrowdedGeometry(snapshot(a, b)).failures).toContain('A: glyph intersects its own Rx bounds');
  a.rx = box(26, 5, 30, 8);
  expect(inspectCrowdedGeometry(snapshot(a, b)).failures).toContain('A: Rx bounds escape its marker');
  a.rx = box(35, -2, 41, 2);
  expect(inspectCrowdedGeometry(snapshot(a, b)).failures).toContain('A: ink bounds enter B');
});

test('rendered leaders must exist, connect their own mark and avoid other bubbles', () => {
  const a = marker('A', 20, 0), b = marker('B', 40, 0);
  a.tick = { x: 0, y: 40 };
  expect(inspectCrowdedGeometry(snapshot(a, b)).failures).toContain('A: displaced marker has no true-position leader');
  a.leader = [{ x: 0, y: 39 }, { x: 50, y: 0 }, { x: 28, y: 0 }];
  const failures = inspectCrowdedGeometry(snapshot(a, b)).failures;
  expect(failures).toContain('A: leader misses its true-position tick');
  expect(failures).toContain('A: leader enters B');
});

test('interior leader crossings fail even when marker circles remain separate', () => {
  const a = marker('A', 20, 0), b = marker('B', 0, 20);
  a.tick = { x: 40, y: 40 };
  b.tick = { x: 0, y: 40 };
  a.leader = [a.tick, { x: 28, y: 0 }];
  b.leader = [b.tick, { x: 40, y: 10 }, { x: 0, y: 28 }];
  expect(inspectCrowdedGeometry(snapshot(a, b)).failures).toContain('A/B: leaders cross in their interiors');
});
