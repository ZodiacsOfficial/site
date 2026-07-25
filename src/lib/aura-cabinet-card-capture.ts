/**
 * Rasterises the live Cabinet of Twelve exactly as the page renders it.
 *
 * A second canvas re-drawing of the cabinet would always be an approximation
 * that drifts the moment the page changes, so this captures the real element
 * instead: the actual DOM, under the actual stylesheet, with the site's own
 * fonts and artwork embedded. What the visitor sees is what they post.
 *
 * The technique is an SVG <foreignObject> wrapping a clone of the element.
 * Three details make it faithful rather than merely close:
 *
 *   · The real CSS is embedded, not per-element inline styles. The cabinet is
 *     built out of ::before/::after — the frame's corner marks, the struck
 *     rims, the gold pedestal, Crown Gold's cast bar — and pseudo-elements
 *     exist only if the rules that create them travel with the clone.
 *   · Fonts and images are inlined as data URIs. An <img src="/…"> inside a
 *     foreignObject never loads, and a missing @font-face silently reflows
 *     every label.
 *   · The export is laid out at one fixed width — the portrait three-column
 *     case — no matter what device captures it. Media conditions are decided
 *     here, in code, against that width, and viewport units are resolved to
 *     pixels, so neither the sharer's screen nor the SVG raster size can
 *     re-flow the clone.
 *
 * The capture clones the cabinet SECTION, because the section carries every
 * `--aura-cabinet-*` token, the `is-complete`/`is-crown` classes, and the
 * settled-stage attribute the state selectors read. The page header, placard,
 * and plaques are removed from the clone: the card draws its own chrome, and
 * the case — frame, seats, engraved plates — is the picture.
 *
 * Browser-only by construction (the pure helpers above `captureCabinet` are
 * unit-tested; the capture itself reads the document, so it is imported
 * lazily and never runs during SSR).
 */

/** Stylesheet rules the cabinet needs; everything else is dead weight. */
const RELEVANT = /aura-collection-cabinet|zodiac-medallion/;

/**
 * The one width every export uses, in CSS pixels. 486 sits inside the
 * ≤639px cascade, so the clone lays out as the portrait three-column case —
 * the cabinet as a phone shows it. The card pads it by round(486 × 0.055)
 * per side: (486 + 54) × 2 = a PNG exactly 1080 device pixels wide.
 */
export const CABINET_EXPORT_WIDTH = 486;

export const CABINET_CAPTURE_SCALE = 2;

/** The four faces the cabinet actually sets. */
const FONT_FACES: { family: string; weight: string; style: string; url: string }[] = [
  { family: 'EB Garamond', weight: '400', style: 'normal', url: '/fonts/eb-garamond-latin-400-normal.woff2' },
  { family: 'EB Garamond', weight: '500', style: 'normal', url: '/fonts/eb-garamond-latin-500-normal.woff2' },
  { family: 'Instrument Sans', weight: '100 900', style: 'normal', url: '/fonts/instrument-sans-latin-wght-normal.woff2' },
  { family: 'JetBrains Mono', weight: '100 800', style: 'normal', url: '/fonts/jetbrains-mono-latin-wght-normal.woff2' },
];

/** Splits at the top nesting level only, so `(a, b)` never splits inside. */
function splitTopLevel(text: string, separator: ',' | ' and '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(current);
      current = '';
      index += separator.length;
      continue;
    }
    current += char;
    index += 1;
  }
  parts.push(current);
  return parts;
}

function mediaLengthPx(value: string): number | null {
  const match = /^\s*(-?\d*\.?\d+)(px|em|rem)\s*$/.exec(value);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  return match[2] === 'px' ? amount : amount * 16;
}

function mediaTermMatches(term: string, width: number): boolean {
  const trimmed = term.trim();
  if (!trimmed) return false;
  if (/^(all|screen)$/i.test(trimmed)) return true;
  const feature = /^\(\s*([a-z-]+)\s*:\s*([^)]+)\)$/i.exec(trimmed);
  if (!feature) return false;
  const name = feature[1].toLowerCase();
  if (name === 'max-width') {
    const limit = mediaLengthPx(feature[2]);
    return limit !== null && width <= limit;
  }
  if (name === 'min-width') {
    const limit = mediaLengthPx(feature[2]);
    return limit !== null && width >= limit;
  }
  // Interaction, preference, orientation, and unknown features are decided
  // conservatively: a still export has no pointer, no motion preference, and
  // no orientation, so their conditional styling is simply not the page's
  // settled default and stays out.
  return false;
}

/**
 * Decides a media condition against the fixed export width. Pure, so the
 * decision is unit-testable and identical wherever the export runs.
 */
export function cabinetMediaMatches(condition: string, width: number): boolean {
  const text = condition.trim();
  if (!text) return true;
  return splitTopLevel(text, ',').some((query) => {
    let clause = query.trim();
    let negate = false;
    if (/^not\s/i.test(clause)) {
      negate = true;
      clause = clause.slice(4).trim();
    }
    if (/^only\s/i.test(clause)) clause = clause.slice(5).trim();
    const matched = splitTopLevel(clause, ' and ').every((term) => mediaTermMatches(term, width));
    return negate ? !matched : matched;
  });
}

/**
 * Keeps a rule when any of its selector parts is one the clone can match:
 * `:root` (the SVG root carries the token custom properties), a type-only
 * base reset (`*`, `html, body`, `button`, `img, svg, video` — the resets the
 * cabinet's layout silently depends on), or a cabinet/medallion class.
 */
export function cabinetSelectorKeeps(selectorText: string): boolean {
  return splitTopLevel(selectorText, ',').some((part) => {
    const trimmed = part.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith(':root')) return true;
    if (RELEVANT.test(trimmed)) return true;
    return !/[.#[]/.test(trimmed);
  });
}

/**
 * Re-targets document-level selectors at what actually exists inside the SVG:
 * there is no <html> or <body> element, so `html` becomes `:root` (the SVG
 * root) and `body` becomes the capture wrapper, which hosts the body-level
 * inheritance — font family, size, line height, ink colour.
 */
export function rewriteCabinetSelector(selectorText: string): string {
  return splitTopLevel(selectorText, ',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      return trimmed
        .replace(/^html(\.[\w-]+)*(?=$|[\s>+~:])/, ':root')
        .replace(/^body(?=$|[\s>+~:])/, '[data-aura-cabinet-capture-root]');
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolves viewport units against the fixed export width so the measurement
 * probe and the SVG raster cannot disagree: `vw` families become pixels, and
 * any declaration leaning on a viewport HEIGHT is dropped — the export's
 * height is decided by content, never by a viewport.
 */
export function rewriteViewportUnits(declarations: string, width: number): string {
  return splitDeclarations(declarations)
    .filter((declaration) => !/\d(vh|svh|lvh|dvh)\b/.test(declaration))
    .map((declaration) =>
      declaration.replace(
        /(\d*\.?\d+)(vw|svw|lvw|dvw)\b/g,
        (_, amount: string) => `${trimNumber((Number.parseFloat(amount) * width) / 100)}px`,
      ),
    )
    .join('; ');
}

function trimNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Splits a declaration block on top-level semicolons (url(data:…) is safe). */
function splitDeclarations(declarations: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of declarations) {
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ';' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

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
 * Flattens the stylesheet for the export: media conditions are decided at the
 * export width and unwrapped in document order (so the three-column rules win
 * their cascade ties exactly as they do on a phone), selectors are filtered
 * and re-targeted, and no `@media` survives — the raster viewport cannot
 * re-flow what has already been decided.
 */
function flattenCabinetRules(width: number): string {
  const collected: string[] = [];

  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        if (cabinetMediaMatches(rule.conditionText ?? '', width)) walk(rule.cssRules);
        continue;
      }
      if (rule instanceof CSSSupportsRule) {
        try {
          if (CSS.supports(rule.conditionText ?? '')) walk(rule.cssRules);
        } catch {
          // An unparseable condition is treated as unsupported.
        }
        continue;
      }
      if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText ?? '';
        if (!cabinetSelectorKeeps(selector)) continue;
        collected.push(
          `${rewriteCabinetSelector(selector)}{${rewriteViewportUnits(rule.style.cssText, width)}}`,
        );
        continue;
      }
      // Keyframes are deliberately dropped: the preamble stills every
      // animation, and the settled case is expressed by static rules.
      const nested = (rule as { cssRules?: CSSRuleList }).cssRules;
      if (nested && !(rule instanceof CSSKeyframesRule)) walk(nested);
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

/**
 * Drops the material layers a seat is not currently showing.
 *
 * Every seat stacks each material it has earned and reveals exactly one
 * (`.is-current`); the rest sit at zero opacity. Carrying their artwork into
 * the export is pure weight — a crowned case would embed twelve invisible
 * pastel discs — and weight is what an embedded raster can least afford on a
 * phone. Pruning only where a current layer exists keeps a mid-reveal or
 * unexpected state from being emptied out.
 */
function pruneHiddenMaterials(clone: HTMLElement): void {
  clone.querySelectorAll('.aura-collection-cabinet__object').forEach((object) => {
    const materials = Array.from(object.querySelectorAll('.aura-collection-cabinet__material'));
    if (!materials.some((material) => material.classList.contains('is-current'))) return;
    materials.forEach((material) => {
      if (!material.classList.contains('is-current')) material.remove();
    });
  });
}

/** Swaps every artwork reference in the clone for an inlined copy. */
async function inlineArtwork(clone: HTMLElement): Promise<void> {
  // <source> elements would win over the inlined <img src>, and their AVIF
  // candidates cannot be resolved inside a foreignObject at all.
  clone.querySelectorAll('source').forEach((node) => node.remove());

  await Promise.all(
    Array.from(clone.querySelectorAll('img')).map(async (image) => {
      const raw = image.getAttribute('src');
      if (!raw || raw.startsWith('data:')) return;
      const resolved = new URL(raw, document.baseURI).toString();
      // The pastel discs ship a 400px master beside the page's 128px asset;
      // the export is a 2× bitmap, so prefer the sharper file when it exists.
      const upgraded = resolved.includes('/assets/zodiac-icons/128/')
        ? resolved.replace('/assets/zodiac-icons/128/', '/assets/zodiac-icons/400/')
        : null;
      const uri = (upgraded ? await dataUri(upgraded) : null) ?? (await dataUri(resolved));
      if (uri) image.setAttribute('src', uri);
      // On failure the original reference stays: an unloadable image renders
      // an empty layer, while removing the node would collapse the seat.
    }),
  );
}

export interface CabinetCaptureOptions {
  /** Pixel density of the exported bitmap. Two keeps type crisp at feed size. */
  scale?: number;
}

export interface CabinetCaptureResult {
  image: HTMLImageElement;
  /** Laid-out size in CSS pixels; the bitmap is `scale` times larger. */
  width: number;
  height: number;
}

/**
 * Reads a coarse grid of an image and reports whether every sample is the same
 * colour — the signature of a raster that decoded but drew nothing.
 *
 * Pure so the verdict is testable: a rendered case is never one flat colour,
 * because the frame's filet, the seat borders, and the lettering all differ
 * from the ground.
 */
export function sampleLooksBlank(pixels: ArrayLike<number>, tolerance = 8): boolean {
  if (pixels.length < 4) return true;
  const [r, g, b, a] = [pixels[0], pixels[1], pixels[2], pixels[3]];
  for (let index = 4; index < pixels.length; index += 4) {
    if (
      Math.abs(pixels[index] - r) > tolerance
      || Math.abs(pixels[index + 1] - g) > tolerance
      || Math.abs(pixels[index + 2] - b) > tolerance
      || Math.abs(pixels[index + 3] - a) > tolerance
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Verdict on a decoded capture: `true` blank, `false` drew something, `null`
 * unverifiable. An engine that will not hand back pixels is not evidence of a
 * fault, so an unverifiable read must never block an otherwise fine export.
 */
function captureLooksBlank(image: HTMLImageElement): boolean | null {
  try {
    if (!image.naturalWidth || !image.naturalHeight) return true;
    const probe = document.createElement('canvas');
    probe.width = 48;
    probe.height = 96;
    const context = probe.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, probe.width, probe.height);
    return sampleLooksBlank(context.getImageData(0, 0, probe.width, probe.height).data);
  } catch {
    return null;
  }
}

function rasterise(svg: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('cabinet_capture_failed'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/**
 * Captures the cabinet to an image at the fixed export width, `scale` device
 * pixels per CSS pixel. Accepts the section or anything inside it.
 *
 * The bitmap is always 1:1 with the SVG's own width and height — the density
 * comes from laying the clone out larger (`zoom`), never from scaling a
 * `foreignObject` through a `viewBox`, which some engines rasterise as an
 * empty box. If the dense pass comes back blank anyway, the export falls back
 * to a plain unzoomed raster, and if that is blank too it fails loudly rather
 * than handing anyone an empty case.
 */
export async function captureCabinet(
  element: HTMLElement,
  { scale = CABINET_CAPTURE_SCALE }: CabinetCaptureOptions = {},
): Promise<CabinetCaptureResult> {
  const section = (element.closest('.aura-collection-cabinet') as HTMLElement | null) ?? element;
  const width = CABINET_EXPORT_WIDTH;
  const density = Math.max(1, Math.round(scale));

  const clone = section.cloneNode(true) as HTMLElement;
  // The card draws its own chrome; the case is the picture.
  clone
    .querySelectorAll(
      '.aura-collection-cabinet__header, .aura-collection-cabinet__placard, .aura-collection-cabinet__plaques',
    )
    .forEach((node) => node.remove());
  // The reveal sequence is irrelevant to a still: export the settled case.
  clone.setAttribute('data-aura-cabinet-stage', 'settled');
  clone.style.width = '100%';
  clone.style.margin = '0';
  pruneHiddenMaterials(clone);

  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.setAttribute('data-aura-cabinet-capture-root', '');
  const wrapperStyle = (zoom: number) =>
    `box-sizing:border-box;width:${width}px;background:transparent;`
    + (zoom > 1 ? `zoom:${zoom};` : '');
  wrapper.style.cssText = wrapperStyle(1);
  wrapper.appendChild(clone);

  // Metrics must be final before the probe measures text-bearing rows.
  if (typeof document.fonts !== 'undefined') {
    await document.fonts.ready;
    await Promise.all(
      ["400 1em 'EB Garamond'", "500 1em 'EB Garamond'", "500 1em 'Instrument Sans'", "500 1em 'JetBrains Mono'"].map(
        (face) => document.fonts.load(face).catch(() => []),
      ),
    );
  }

  const [fonts] = await Promise.all([embeddedFonts(), inlineArtwork(clone)]);
  const preamble =
    ':root{font-size:16px;}' +
    '*{-webkit-font-smoothing:antialiased;}' +
    '*,*::before,*::after{animation:none!important;transition:none!important;}';
  const flattened = flattenCabinetRules(width);

  // Measure the clone at the export width in the live document. This block is
  // fully synchronous — nothing can paint between append and remove. The
  // probe styles exclude the data-URI fonts on purpose: the page CSP forbids
  // them in-document, and the page's own identical faces are already active.
  let height = 0;
  const probe = document.createElement('div');
  probe.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;`;
  const probeStyle = document.createElement('style');
  probeStyle.textContent = `${preamble}\n${flattened}`;
  probe.appendChild(probeStyle);
  probe.appendChild(wrapper);
  try {
    document.body.appendChild(probe);
    height = Math.ceil(wrapper.getBoundingClientRect().height);
  } finally {
    probe.remove();
  }
  if (height <= 0) throw new Error('cabinet_capture_failed');

  const css = `${fonts}\n${preamble}\n${flattened}`;
  // One box, one raster: the SVG, its viewBox, and its foreignObject always
  // agree, so nothing is ever scaled during rasterisation.
  const build = (zoom: number): string => {
    wrapper.style.cssText = wrapperStyle(zoom);
    const boxW = width * zoom;
    const boxH = height * zoom;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${boxW}" height="${boxH}" viewBox="0 0 ${boxW} ${boxH}">`
      + `<defs><style type="text/css"><![CDATA[${css}]]></style></defs>`
      + `<foreignObject x="0" y="0" width="${boxW}" height="${boxH}">`
      + new XMLSerializer().serializeToString(wrapper)
      + `</foreignObject></svg>`
    );
  };

  const load = async (zoom: number): Promise<HTMLImageElement> => {
    const image = await rasterise(build(zoom));
    image.width = width * zoom;
    image.height = height * zoom;
    if (typeof image.decode === 'function') await image.decode().catch(() => {});
    return image;
  };

  let image = await load(density);
  if (density > 1 && captureLooksBlank(image) === true) {
    // Some engines rasterise a zoomed foreignObject as an empty box. A plain
    // one-to-one pass is softer at card size but it is the case, not a void.
    image = await load(1);
  }
  if (captureLooksBlank(image) === true) throw new Error('cabinet_capture_blank');

  // The card draws at CSS-pixel size inside a scaled context, so the bitmap
  // lands one-to-one on the canvas whichever pass produced it.
  return { image, width, height };
}
