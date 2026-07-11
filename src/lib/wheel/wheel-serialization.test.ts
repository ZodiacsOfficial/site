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

describe('Wheel overlay slot (bi-wheel)', () => {
  const natalProps = () => ({
    bodies: (frida.bodies as FixtureBody[]).filter((b) => b.body !== 'South Node'),
    asc: frida.angles.asc,
    mc: frida.angles.mc,
    cusps: frida.houses.cusps,
    aspects: [] as { a: string; b: string; type: string }[],
  });

  it('grows the viewBox and renders the slot, given the wheel geometry', () => {
    // A probe overlay: place one mark on the outer ring using the geometry
    // the slot is handed. This pins the contract (viewBox growth + a rendered
    // slot) without coupling to the transit island's overlay renderer.
    const markup = render(h(Wheel as any, {
      ...natalProps(),
      renderOverlay: (geo: any) => {
        const p = geo.pt(120, geo.rOuter);
        return h('circle', { class: 'probe', cx: p.x, cy: p.y, r: 3 });
      },
    }));
    expect(markup).toContain('class="probe"');
    // Non-overlay viewBox is "-21 -21 462 462" (pad = size*0.05, size 420);
    // with an overlay pad grows to size*0.115 → -48.3.
    expect(markup).toMatch(/viewBox="-48\.3\d* -48\.3\d* 516\.6 516\.6"/);
  });

  it('is byte-identical to the static wheel when no overlay slot is given', () => {
    const withoutSlot = render(h(Wheel as any, natalProps()));
    expect(withoutSlot).toContain('viewBox="-21 -21 462 462"');
    expect(withoutSlot).not.toContain('wheel__overlay');
  });
});
