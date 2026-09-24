import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import ChartMark from './ChartMark';
import type { ChartMarkSource } from '../lib/chart-mark/common';

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const known: ChartMarkSource = {
  bodies: [
    { body: 'Sun', lon: 141.3 }, { body: 'Moon', lon: 61.1 }, { body: 'Mercury', lon: 168.5 },
    { body: 'Venus', lon: 110.2 }, { body: 'Mars', lon: 30.4 }, { body: 'Jupiter', lon: 105.9 },
    { body: 'Saturn', lon: 293.1 }, { body: 'Uranus', lon: 276.2 }, { body: 'Neptune', lon: 282.9 },
    { body: 'Pluto', lon: 225.6 },
  ],
  asc: 133.6,
  timeKnown: true,
};

describe('chart marks', () => {
  it('draws the constellation at avatar size, as a labelled picture', () => {
    const html = render(<ChartMark source={known} size={112} label="Your chart mark" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Your chart mark"');
    expect(html.match(/<circle\b/gu)!.length).toBeGreaterThanOrEqual(13);
    expect(html).toContain('#E0A9B4');
    expect(html).not.toMatch(/Gradient|<image\b/u);
  });

  it('uses the Sun sign disc below constellation size, decoratively by default', () => {
    const html = render(<ChartMark source={known} size={28} />);
    expect(html).toContain('/assets/zodiac-icons/48/leo.webp');
    expect(html).toContain('aria-hidden="true"');
  });

  it('shows a quiet ring when the chart cannot settle a Sun sign', () => {
    const cusp: ChartMarkSource = { bodies: [{ body: 'Sun', lon: 120.4 }], asc: null, timeKnown: false };
    const html = render(<ChartMark source={cusp} size={28} />);
    expect(html).toContain('chart-mark--empty');
    expect(html).not.toContain('zodiac-icons');
    expect(render(<ChartMark source={null} size={112} />)).toContain('chart-mark--empty');
  });

  it('shows a photo only when one is chosen and it is a stored image', () => {
    expect(render(<ChartMark source={known} size={56} avatar="photo" photo={PHOTO} />)).toContain('src="data:image/jpeg;base64,');
    expect(render(<ChartMark source={known} size={56} avatar="photo" photo="https://example.com/x.jpg" />))
      .not.toContain('example.com');
    expect(render(<ChartMark source={known} size={56} avatar="mark" photo={PHOTO} />)).not.toContain('data:image');
  });

  it('can show the Sun sign disc at any size', () => {
    expect(render(<ChartMark source={known} size={112} avatar="sign" />)).toContain('/assets/zodiac-icons/128/leo.webp');
  });
});
