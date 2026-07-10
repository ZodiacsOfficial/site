/**
 * Serialization regression gate for the Wheel refactor.
 *
 * The share-card renderer (src/lib/share-card.ts) renders <Wheel> headlessly
 * with EXACTLY the props used here and serializes the SVG. The Chart Explorer
 * adds optional interaction props to Wheel; with those props omitted the
 * rendered markup must stay byte-identical, or every previously shared card
 * silently changes. The committed snapshot was generated from the
 * pre-Explorer Wheel — do not regenerate it to make a diff pass without
 * understanding exactly which pixels you are changing.
 *
 * (preact-render-to-string ships as a dependency of @astrojs/preact — no new
 * package. It renders the same VDOM the browser path serializes via
 * XMLSerializer; attribute order is stable in both.)
 */
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import Wheel from './Wheel';
import frida from '../../data/demo-chart-frida.json';

type FixtureBody = { body: string; lon: number; retrograde: boolean };

function shareCardProps() {
  return {
    bodies: (frida.bodies as FixtureBody[]).filter((b) => b.body !== 'South Node'),
    asc: frida.angles.asc,
    mc: frida.angles.mc,
    cusps: frida.houses.cusps,
    aspects: [
      // A representative chord of each type so every ASPECT_COLOR path renders.
      { a: 'Sun', b: 'Moon', type: 'sextile' },
      { a: 'Sun', b: 'North Node', type: 'conjunction' },
      { a: 'Moon', b: 'Mars', type: 'square' },
      { a: 'Venus', b: 'Mars', type: 'opposition' },
      { a: 'Mercury', b: 'Saturn', type: 'trine' },
    ],
  };
}

describe('Wheel share-card serialization', () => {
  it('renders byte-identically with interaction props omitted', () => {
    const markup = render(h(Wheel as any, shareCardProps()));
    expect(markup).toMatchSnapshot();
  });

  it('renders the no-angles fallback identically (0° Aries anchor, no spokes)', () => {
    const markup = render(h(Wheel as any, {
      bodies: (frida.bodies as FixtureBody[]).filter((b) => b.body !== 'South Node'),
      asc: null,
      mc: null,
      cusps: null,
      aspects: [],
    }));
    expect(markup).toMatchSnapshot();
  });
});
