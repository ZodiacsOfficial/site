import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PNG } from 'pngjs';
import { compositeFixtureToken, compositeSavedFixtures, inspectCompositePng, inspectCompositeTextLayout, isExpectedCompositeAbort } from './composite-browser-checks.mjs';
import { resolveSavedChart } from '../src/lib/profile/resolve';

const decode = (token) => JSON.parse(Buffer.from(token.slice(token.indexOf('.') + 1), 'base64url').toString());

test('saved composite fixtures resolve exact synthetic positions without an ephemeris or birth-data rewrite', async () => {
  const fixtures = compositeSavedFixtures();
  const before = JSON.stringify(fixtures);
  assert.equal(new Set(fixtures.map((chart) => chart.id)).size, 4);
  for (const chart of fixtures) {
    const resolved = await resolveSavedChart(chart, async () => { throw new Error('Imported positions must not recompute'); });
    assert.deepEqual(resolved.bodies, chart.summary.bodies.map(({ body, lon }) => ({ body, lon })));
    assert.equal(resolved.timeKnown, chart.birth.timeKnown);
    assert.equal(resolved.asc, chart.birth.timeKnown ? 15 : null);
  }
  assert.equal(JSON.stringify(fixtures), before);
});

test('composite browser fixtures stay within the positions-only grammar and preserve explicit unknown time', () => {
  for (const options of [{}, { unknown: true }, { bothUnknown: true }, { reversed: true }]) {
    const wire = decode(compositeFixtureToken(options));
    assert.deepEqual(Object.keys(wire), ['p', 'l', 'k']);
    assert.equal(wire.p.length, 2);
    const sides = wire.p.map(decode);
    for (let i = 0; i < sides.length; i += 1) {
      assert.equal(sides[i].b.length, 12);
      assert.equal(Object.hasOwn(sides[i], 'a'), wire.k[i]);
      assert.ok(sides[i].b.every((lon) => Number.isFinite(lon) && lon >= 0 && lon < 360));
      assert.ok(Object.keys(sides[i]).every((key) => ['b', 'a', 'h', 'v'].includes(key)));
    }
    if (options.unknown) assert.deepEqual(wire.k, [true, false]);
    if (options.bothUnknown) assert.deepEqual(wire.k, [false, false]);
    if (options.reversed) assert.deepEqual(sides.map((side) => side.b[0]), [180, 0]);
  }
});

test('PNG observation rejects blank and heading-only images as full composite evidence', () => {
  const png = new PNG({ width: 1080, height: 1350 });
  for (let i = 0; i < png.data.length; i += 4) png.data[i + 3] = 255;
  const blank = inspectCompositePng(PNG.sync.write(png));
  assert.equal(blank.foreground, 0);
  assert.equal(blank.middleForeground, 0);
  assert.equal(blank.wheelForeground, 0);
  for (let y = 0; y < 100; y += 1) {
    for (let x = 100; x < 900; x += 1) {
      const i = (y * png.width + x) * 4;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = 255;
    }
  }
  const heading = inspectCompositePng(PNG.sync.write(png));
  assert.ok(heading.foreground > 1000);
  assert.equal(heading.middleForeground, 0);
  assert.equal(heading.wheelForeground, 0);
  for (let y = 400; y < 600; y += 1) {
    for (let x = 400; x < 600; x += 1) {
      const i = (y * png.width + x) * 4;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = 255;
    }
  }
  const body = inspectCompositePng(PNG.sync.write(png));
  assert.ok(body.middleForeground > 500);
  assert.ok(body.wheelForeground > 400);
  assert.equal(body.width, 1080);
  assert.equal(body.height, 1350);
});

test('PNG observation rejects invalid download bytes', () => {
  assert.throws(() => inspectCompositePng(Buffer.from('not a PNG')));
});


test('native text observation rejects clipped, missing and overlapping ink boxes', () => {
  const a = { text: 'A', left: 64, right: 240, top: 100, bottom: 125 };
  const b = { text: 'B', left: 300, right: 420, top: 100, bottom: 125 };
  assert.deepEqual(inspectCompositeTextLayout([a, b]), { clipped: [], overlaps: [] });
  assert.equal(inspectCompositeTextLayout([{ ...a, left: -1 }]).clipped.length, 1);
  assert.equal(inspectCompositeTextLayout([{ ...a, bottom: 1400 }]).clipped.length, 1);
  assert.equal(inspectCompositeTextLayout([{ text: 'missing metrics' }]).clipped.length, 1);
  assert.deepEqual(inspectCompositeTextLayout([a, { ...b, left: 200 }]).overlaps, [['A', 'B']]);
});


test('artwork error allowance matches only the explicitly held fetch and exact abort', () => {
  const request = (type = 'fetch', errorText = 'net::ERR_ABORTED') => ({ resourceType: () => type, failure: () => ({ errorText }) });
  const held = request(); const expected = new Set([held]);
  assert.equal(isExpectedCompositeAbort(held, expected), true);
  assert.equal(isExpectedCompositeAbort(request(), expected), false);
  for (const unexpected of [request('image'), request('fetch', 'net::ERR_FAILED')]) {
    assert.equal(isExpectedCompositeAbort(unexpected, new Set([unexpected])), false);
  }
});
