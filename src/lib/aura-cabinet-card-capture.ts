/**
 * Rasterises the live Cabinet of Twelve exactly as the page renders it.
 *
 * A second canvas re-drawing of the cabinet would always be an approximation
 * that drifts the moment the page changes, so this captures the real element
 * instead: the actual DOM, under the actual stylesheet, with the site's own
 * fonts and artwork embedded. What the visitor sees is what they post.
 *
 * The technique is an SVG <foreignObject> wrapping a clone of the element.
 * Two details make it faithful rather than merely close:
 *
 *   · The real CSS is embedded, not per-element inline styles. The cabinet is
 *     built out of ::before/::after — the frame's corner marks, the struck
 *     rims, the gold pedestal, Crown Gold's cast bar — and pseudo-elements
 *     exist only if the rules that create them travel with the clone.
 *   · Fonts and images are inlined as data URIs. An <img src="/…"> inside a
 *     foreignObject never loads, and a missing @font-face silently reflows
 *     every label.
 *
 * Browser-only by construction: it reads the document, so it is imported
 * lazily and never runs during SSR or in a unit test.
 */

/** Stylesheet rules the cabinet needs; everything else is dead weight. */
const RELEVANT = /aura-collection-cabinet|zodiac-medallion/;

/** The three faces the cabinet actually sets. */
const FONT_FACES: { family: string; weight: string; style: string; url: string }[] = [
  { family: 'EB Garamond', weight: '400', style: 'normal', url: '/fonts/eb-garamond-latin-400-normal.woff2' },
  { family: 'EB Garamond', weight: '500', style: 'normal', url: '/fonts/eb-garamond-latin-500-normal.woff2' },
  { family: 'Instrument Sans', weight: '100 900', style: 'normal', url: '/fonts/instrument-sans-latin-wght-normal.woff2' },
  { family: 'JetBrains Mono', weight: '100 800', style: 'normal', url: '/fonts/jetbrains-mono-latin-wght-normal.woff2' },
];

async function dataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function embeddedFonts(): Promise<string> {
  const faces = await Promise.all(
    FONT_FACES.map(async (face) => {
      const uri = await dataUri(face.url);
      if (!uri) return '';
      return `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:${face.weight};src:url(${uri}) format('woff2');font-display:block;}`;
    }),
  );
  return faces.join('');
}

/**
 * Collects the rules that style the cabinet, keeping media conditions intact.
 *
 * Reduced-motion and forced-colours blocks are dropped: the export is a still
 * of the settled case, so a rule that exists to stop animation or to strip
 * colour for accessibility would only flatten the artwork.
 */
function cabinetRules(): string {
  const collected: string[] = [];

  const walk = (rules: CSSRuleList, wrap?: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        const condition = rule.conditionText ?? '';
        if (/prefers-reduced-motion|forced-colors|prefers-contrast/.test(condition)) continue;
        // Narrow viewport rules would re-flow the grid at export size.
        if (/max-width/.test(condition)) continue;
        walk(rule.cssRules, condition);
        continue;
      }
      if (rule instanceof CSSSupportsRule) {
        walk(rule.cssRules, wrap);
        continue;
      }
      if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText ?? '';
        const isRoot = selector === ':root' || selector === 'html' || selector === ':root,html';
        if (!isRoot && !RELEVANT.test(selector)) continue;
        collected.push(wrap ? `@media ${wrap}{${rule.cssText}}` : rule.cssText);
        continue;
      }
      if (rule instanceof CSSKeyframesRule) {
        if (RELEVANT.test(rule.name) || /aura-cabinet/.test(rule.name)) collected.push(rule.cssText);
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // A cross-origin sheet cannot be read; the cabinet's own styles are local.
    }
  }
  return collected.join('\n');
}

/** Swaps every artwork reference in the clone for an inlined copy. */
async function inlineArtwork(clone: HTMLElement, source: HTMLElement): Promise<void> {
  const sourceImages = Array.from(source.querySelectorAll('img'));
  const cloneImages = Array.from(clone.querySelectorAll('img'));

  // <source> elements would win over the inlined <img src>, and their AVIF
  // candidates cannot be resolved inside a foreignObject at all.
  clone.querySelectorAll('source').forEach((node) => node.remove());

  await Promise.all(
    cloneImages.map(async (image, index) => {
      const original = sourceImages[index];
      const href = original?.currentSrc || original?.src || image.src;
      if (!href) return;
      const uri = await dataUri(href);
      if (uri) image.setAttribute('src', uri);
      else image.remove();
    }),
  );
}

export interface CabinetCaptureOptions {
  /** Pixel density of the exported bitmap. Two keeps type crisp at feed size. */
  scale?: number;
  /** Void padding drawn around the captured case, in CSS pixels. */
  padding?: number;
  background?: string;
}

/**
 * Captures one cabinet element to an image, at `scale` device pixels per CSS
 * pixel. Resolves to a decoded <img> the caller can compose onto a card.
 */
export async function captureCabinet(
  element: HTMLElement,
  { scale = 2, padding = 0, background = 'transparent' }: CabinetCaptureOptions = {},
): Promise<HTMLImageElement> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width) + padding * 2;
  const height = Math.ceil(rect.height) + padding * 2;

  const clone = element.cloneNode(true) as HTMLElement;
  // The reveal sequence is irrelevant to a still: export the settled case.
  clone.setAttribute('data-aura-cabinet-stage', 'settled');
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.margin = '0';

  const [fonts] = await Promise.all([embeddedFonts(), inlineArtwork(clone, element)]);
  const css = `${fonts}\n*{-webkit-font-smoothing:antialiased;}\n${cabinetRules()}`;

  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.style.cssText = `box-sizing:border-box;width:${width}px;padding:${padding}px;background:${background};`;
  wrapper.appendChild(clone);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><style type="text/css"><![CDATA[${css}]]></style></defs>` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">${new XMLSerializer().serializeToString(wrapper)}</foreignObject>` +
    `</svg>`;

  const image = new Image();
  image.width = width;
  image.height = height;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('cabinet_capture_failed'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  if (typeof image.decode === 'function') await image.decode().catch(() => {});
  return image;
}

export const CABINET_CAPTURE_SCALE = 2;
