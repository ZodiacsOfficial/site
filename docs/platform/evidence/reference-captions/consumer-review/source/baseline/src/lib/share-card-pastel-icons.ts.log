import { SIGNS } from './signs';

const ICON_PATH_RE = /\/assets\/zodiac-icons\/128\/([a-z-]+)\.webp(?:[?#].*)?$/u;
const EXPECTED_SLUGS = new Set(SIGNS.map((sign) => sign.slug));
const iconDataUris = new Map<string, string>();

let ready: Promise<void> | null = null;
let installed = false;

async function blobToDataUri(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${blob.type || 'image/webp'};base64,${btoa(binary)}`;
}

async function loadIcon(slug: string): Promise<[string, string]> {
  const response = await fetch(`/assets/zodiac-icons/128/${slug}.webp`, {
    credentials: 'same-origin',
    cache: 'force-cache',
  });
  if (!response.ok) throw new Error(`Pastel zodiac icon unavailable: ${slug}`);
  return [slug, await blobToDataUri(await response.blob())];
}

function installEmbeddingHook(): void {
  if (installed) return;
  if (typeof Element === 'undefined' || typeof SVGElement === 'undefined') {
    throw new Error('Pastel zodiac icon embedding requires a browser DOM.');
  }

  const originalReplaceWith = Element.prototype.replaceWith;
  Element.prototype.replaceWith = function replaceWithPastelZodiacIcon(
    this: Element,
    ...nodes: (Node | string)[]
  ): void {
    const href = this.tagName.toLowerCase() === 'image'
      ? this.getAttribute('href') ?? this.getAttribute('xlink:href')
      : null;
    const slug = href?.match(ICON_PATH_RE)?.[1];
    const replacement = nodes.length === 1 ? nodes[0] : null;
    const isGlyphReplacement = replacement instanceof SVGElement
      && replacement.tagName.toLowerCase() === 'text';
    const dataUri = slug && EXPECTED_SLUGS.has(slug) ? iconDataUris.get(slug) : null;

    if (dataUri && isGlyphReplacement) {
      // share-card.ts normally swaps these external <image> nodes for text
      // before rasterizing its detached SVG. Keep the real pastel artwork,
      // but embed it as a data URI so the exported sheet is self-contained.
      this.setAttribute('href', dataUri);
      this.removeAttribute('xlink:href');
      this.setAttribute('data-pastel-zodiac-icon', slug!);
      return;
    }

    originalReplaceWith.call(this, ...nodes);
  };
  installed = true;
}

/**
 * Preload and embed the site's canonical pastel zodiac discs before a chart
 * sheet is rendered. A missing asset fails the image preparation rather than
 * silently falling back to platform-dependent emoji glyphs.
 */
export function ensurePastelZodiacIconEmbedding(): Promise<void> {
  if (ready) return ready;
  ready = Promise.all(SIGNS.map((sign) => loadIcon(sign.slug)))
    .then((entries) => {
      iconDataUris.clear();
      for (const [slug, dataUri] of entries) iconDataUris.set(slug, dataUri);
      installEmbeddingHook();
    })
    .catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}
