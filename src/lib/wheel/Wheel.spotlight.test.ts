import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { computeChart } from '../engine/full';
import { buildSceneModel } from '../scene/build';
import { emphasisFor } from '../scene/emphasis';
import { entityId, type EntityRef } from '../scene/types';
import Wheel from './Wheel';

const chart = computeChart({
  utc: new Date('1907-07-06T15:06:36.000Z'),
  latitude: 19.35,
  longitude: -99.16,
  houseSystem: 'whole',
  timeKnown: true,
  flags: ['lmt'],
});
const scene = buildSceneModel(chart);

function markup(selection: EntityRef) {
  const id = entityId(selection);
  return render(h(Wheel, {
    bodies: chart.bodies.filter((body) => body.body !== 'South Node'),
    asc: chart.angles?.asc ?? null,
    mc: chart.angles?.mc ?? null,
    cusps: chart.houses?.cusps ?? null,
    aspects: chart.aspects.filter((aspect) => aspect.orb < 6),
    interactive: {
      scene,
      selection,
      emphasis: emphasisFor(scene, selection),
      onSelect: () => {},
      label: 'Interactive chart',
      spotlight: { id, run: 7, phase: 'settled', motion: 'animated' },
    },
  }));
}

describe('Wheel spotlight', () => {
  it('renders a body halo as the only primary target', () => {
    const output = markup({ kind: 'body', body: 'Sun' });
    expect(output).toContain('data-spotlight-target="body:Sun"');
    expect(output).toContain('data-spotlight-kind="body"');
    expect(output).toContain('wheel__focus-body-halo');
    expect(output.match(/data-spotlight-target=/g)).toHaveLength(1);
  });

  it('renders an annular house wedge', () => {
    const output = markup({ kind: 'house', house: 10 });
    expect(output).toContain('data-spotlight-target="house:10"');
    expect(output).toContain('data-spotlight-kind="house"');
    expect(output).toContain('wheel__focus-house');
    expect(output.match(/data-spotlight-target=/g)).toHaveLength(1);
  });

  it('renders a bright aspect chord with two endpoint nodes', () => {
    const aspect = scene.aspects[0];
    const output = markup({ kind: 'aspect', a: aspect.a, b: aspect.b, type: aspect.type });
    expect(output).toContain(`data-spotlight-target="${entityId({ kind: 'aspect', a: aspect.a, b: aspect.b, type: aspect.type })}"`);
    expect(output).toContain('data-spotlight-kind="aspect"');
    expect(output).toContain('wheel__focus-aspect');
    expect(output.match(/wheel__focus-aspect-node/g)).toHaveLength(2);
    expect(output.match(/data-spotlight-target=/g)).toHaveLength(1);
  });

  it('renders a rising-axis cue for the Big Three action', () => {
    const output = markup({ kind: 'angle', angle: 'asc' });
    expect(output).toContain('data-spotlight-target="angle:asc"');
    expect(output).toContain('data-spotlight-kind="angle"');
    expect(output).toContain('wheel__focus-angle');
  });
});
