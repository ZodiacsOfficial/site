import type { Chart, Aspect } from '../../src/lib/engine/types';
import { natalAspectLine, topAspects } from '../../src/lib/natal';

export { placement } from './format';
const angles: Record<Aspect['type'], number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

/** Presentation only: every selectable connection must exist in the computed chart. */
export function explainConnections(chart: Chart) {
  return topAspects(chart.aspects.filter(a => chart.bodies.some(b => b.body === a.a) && chart.bodies.some(b => b.body === a.b)), 5).map(aspect => {
    const a = chart.bodies.find(b => b.body === aspect.a)!;
    const b = chart.bodies.find(b => b.body === aspect.b)!;
    return {
      id: `${aspect.a}:${aspect.type}:${aspect.b}`,
      title: `${aspect.a} & ${aspect.b}`,
      aspect,
      a, b,
      reading: natalAspectLine(aspect.a, aspect.type, aspect.b),
      exactAngle: angles[aspect.type],
      separation: Math.min(Math.abs(a.lon - b.lon), 360 - Math.abs(a.lon - b.lon)),
      prompt: aspect.type === 'square' || aspect.type === 'opposition'
        ? 'Where do you notice two different needs asking for your attention?'
        : 'When do these two parts of your life seem to work together?',
    };
  });
}
export type Connection = ReturnType<typeof explainConnections>[number];
