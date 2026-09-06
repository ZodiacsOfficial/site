import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeChart } from '../../src/lib/engine/full';
import { explainConnections, placement } from './model';
import { examples } from './fixtures';

describe('Show me computed evidence', () => {
  it('only explains actual chart aspects and independently matches each orb to geometry', () => {
    const chart = computeChart({ utc: new Date('1990-06-15T12:30:00Z'), latitude: 40.7128, longitude: -74.006, timeKnown: true, houseSystem: 'whole' });
    const connections = explainConnections(chart);
    assert.equal(connections.length, 5);
    for (const c of connections) {
      assert.ok(chart.aspects.includes(c.aspect));
      assert.ok(Math.abs(Math.abs(c.separation - c.exactAngle) - c.aspect.orb) < 1e-8);
      assert.ok(c.reading.includes(c.a.body) && c.reading.includes(c.b.body));
    }
  });
  it('uses separate calculations for examples and marks unknown time', () => {
    assert.notDeepEqual(examples[0].connections, examples[1].connections);
    assert.equal(examples[1].timeKnown, false);
    assert.match(examples[1].description, /reference/);
  });
  it('does not invent a relationship when none exists', () => {
    const chart = computeChart({ utc: new Date('1990-06-15T12:30:00Z'), timeKnown: false, houseSystem: 'whole' });
    assert.deepEqual(explainConnections({ ...chart, aspects: [] }), []);
    assert.deepEqual(explainConnections({ ...chart, bodies: [] }), []);
  });
  it('formats the zodiac wrap correctly', () => {
    assert.equal(placement(360), '0.00° Aries');
    assert.equal(placement(-1), '29.00° Pisces');
  });
});
