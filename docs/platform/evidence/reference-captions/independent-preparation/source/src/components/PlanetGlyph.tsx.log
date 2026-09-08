/**
 * A crafted planet glyph — line-art on an optional pastel disc, the planet
 * counterpart to SignIcon. Preact so it renders static inside Astro pages
 * (no client directive needed) and live inside the calculator islands.
 * The wheel injects the raw PLANET_GLYPH markup into its own SVG instead.
 */
import { PLANET_GLYPH } from '../lib/glyphs/paths';

interface Props {
  body: string;
  size?: number;
  disc?: boolean;
  hue?: string;
  class?: string;
  title?: string;
}

export default function PlanetGlyph({ body, size = 18, disc = false, hue, class: cls = '', title }: Props) {
  const markup = PLANET_GLYPH[body];
  if (!markup) return null;
  const svg = (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
  const className = `pglyph${disc ? ' pglyph--disc' : ''}${cls ? ' ' + cls : ''}`;
  return (
    <span class={className} style={hue ? `--sign:${hue}` : undefined}>
      {svg}
    </span>
  );
}
