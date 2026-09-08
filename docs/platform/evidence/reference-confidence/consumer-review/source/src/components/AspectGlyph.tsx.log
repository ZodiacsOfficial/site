/**
 * A crafted aspect glyph (conjunction / sextile / square / trine /
 * opposition) as line-art. Preact so it renders static inside Astro pages
 * (learn/aspects) and live inside the calculator islands' aspect lists.
 */
import { ASPECT_GLYPH } from '../lib/glyphs/paths';

interface Props {
  type: string;
  size?: number;
  class?: string;
  title?: string;
}

export default function AspectGlyph({ type, size = 18, class: cls = '', title }: Props) {
  const markup = ASPECT_GLYPH[type];
  if (!markup) return null;
  return (
    <span class={`aglyph${cls ? ' ' + cls : ''}`}>
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
    </span>
  );
}
