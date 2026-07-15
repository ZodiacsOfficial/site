/**
 * Chart card renderer — a 1080×1350 PNG drawn entirely on-device: the
 * wheel SVG rasterized onto canvas, big three set in the site's own
 * loaded fonts, pastel discs from the icon set. Lazy-loaded by the
 * calculator only when someone asks for a card.
 *
 * One honest limitation: an SVG rasterized through <img> cannot reach
 * webfonts, so the tiny in-wheel labels (ASC, house numbers, Rx) fall
 * back to the system mono. Everything outside the wheel uses the real
 * faces via ctx.fillText after document.fonts is ready.
 */
import { h, render } from 'preact';
import Wheel from './wheel/Wheel';
import {
  degreeInSign,
  elementLabel,
  modalityLabel,
  signForLongitude,
  signName,
  type Element,
  type Modality,
} from './signs';
import type { Chart } from './engine/types';
import type { Locale } from './i18n';
import { shareCardFormat, shareCardText } from './share-card-copy';

export type CardOutcome = 'shared' | 'downloaded' | 'cancelled';
export type ChartCardVariant = 'full' | 'big-three';

export interface ShareCardOptions {
  /** The full wheel is the backwards-compatible default. */
  variant?: ChartCardVariant;
  locale?: Locale;
}

export const SHARE_CARD_SCALE = 2;
const W = 540 * SHARE_CARD_SCALE;
const H = 675 * SHARE_CARD_SCALE;
const BG = '#060709';
const INK_0 = '#EEF1F7';
const INK_2 = '#8E96AB';
const HAIR = 'rgba(198, 204, 218, 0.12)';
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const WHEEL_SIZE = 780;
const PROFILE_BODIES = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
export const SHARE_CARD_WORDMARK = Object.freeze({
  x: W - 64,
  y: H - 46,
  align: 'right' as const,
});

/** Read a same-origin asset as a data: URI (null on any failure). */
function fetchAsDataUri(url: string): Promise<string | null> {
  return fetch(url)
    .then((res) => (res.ok ? res.blob() : null))
    .then((blob) => (blob ? new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    }) : null))
    .catch(() => null);
}

async function wheelSvgString(chart: Chart): Promise<string> {
  const host = document.createElement('div');
  render(h(Wheel, {
    bodies: chart.bodies.filter((b) => b.body !== 'South Node'),
    asc: chart.angles?.asc ?? null,
    mc: chart.angles?.mc ?? null,
    cusps: chart.houses?.cusps ?? null,
    aspects: chart.aspects.filter((a) => a.orb < 6),
  }), host);
  const svg = host.querySelector('svg');
  if (!svg) throw new Error('wheel render failed');
  svg.setAttribute('width', String(WHEEL_SIZE));
  svg.setAttribute('height', String(WHEEL_SIZE));
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // CSS vars don't exist inside an SVG-as-image document.
  svg.querySelectorAll('text').forEach((t) => {
    t.setAttribute('font-family', 'ui-monospace, Menlo, Consolas, monospace');
  });
  // An SVG rasterized through <img> can't fetch external subresources, so the
  // sign-disc <image> hrefs must be inlined as data URIs. Drop any that fail
  // rather than let a broken ref abort the raster.
  await Promise.all(Array.from(svg.querySelectorAll('image')).map(async (img) => {
    const href = img.getAttribute('href') ?? img.getAttribute('xlink:href');
    if (!href || href.startsWith('data:')) return;
    const uri = await fetchAsDataUri(href);
    if (uri) img.setAttribute('href', uri);
    else img.remove();
  }));
  const xml = new XMLSerializer().serializeToString(svg);
  render(null, host);
  return xml;
}

function loadSvg(xml: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('wheel raster failed')); };
    img.src = url;
  });
}

async function loadDisc(slug: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(`/assets/zodiac-icons/128/${slug}.webp`);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

export interface BigThreePlacement {
  kind: 'sun' | 'moon' | 'rising';
  lon: number;
  slug: string;
  sign: string;
  degree: number;
}

export function bigThreePlacements(chart: Pick<Chart, 'bodies' | 'angles'>, locale: Locale = 'en'): BigThreePlacement[] {
  const sun = chart.bodies.find((body) => body.body === 'Sun');
  const moon = chart.bodies.find((body) => body.body === 'Moon');
  if (!sun || !moon) throw new Error('chart missing luminaries');
  const rows: { kind: BigThreePlacement['kind']; lon: number }[] = [
    { kind: 'sun', lon: sun.lon },
    { kind: 'moon', lon: moon.lon },
  ];
  if (chart.angles) rows.push({ kind: 'rising', lon: chart.angles.asc });
  return rows.map(({ kind, lon }) => {
    const sign = signForLongitude(lon);
    return { kind, lon, slug: sign.slug, sign: signName(sign, locale), degree: degreeInSign(lon) };
  });
}

export function dominantProfile(chart: Pick<Chart, 'bodies'>): { element: Element | null; modality: Modality | null } {
  const elementCounts: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const body of chart.bodies) {
    if (!PROFILE_BODIES.has(body.body)) continue;
    const sign = signForLongitude(body.lon);
    elementCounts[sign.element] += 1;
    modalityCounts[sign.modality] += 1;
  }
  const uniqueMax = <T extends string>(counts: Record<T, number>): T | null => {
    const entries = Object.entries(counts) as [T, number][];
    const max = Math.max(...entries.map(([, count]) => count));
    const winners = entries.filter(([, count]) => count === max);
    return winners.length === 1 ? winners[0][0] : null;
  };
  return { element: uniqueMax(elementCounts), modality: uniqueMax(modalityCounts) };
}

/** Cards accept computed positions, never the private birth input. */
export function chartCardReceipt(
  chart: Pick<Chart, 'engineVersion'>,
  locale: Locale = 'en',
): string {
  return shareCardFormat(locale, 'engineReceipt', { version: chart.engineVersion });
}

/** Download/share-sheet filename contains no input-derived data. */
export function chartCardFilename(options: ShareCardOptions = {}): string {
  if (options.variant === 'big-three') return 'zodiacs-big-three.png';
  return 'zodiacs-chart.png';
}

/** Shrink until the line fits — twelve-letter signs three times over is real. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, minPx: number, weight: number, family: string): number {
  let px = startPx;
  while (px > minPx) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

async function drawFullChartCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const placements = bigThreePlacements(chart, locale);
  const trio = placements.map((placement) => ({
    label: shareCardText(locale, placement.kind),
    slug: placement.slug,
    name: placement.sign,
  }));

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 52px ${SERIF}`),
    document.fonts.load(`italic 400 34px ${SERIF}`),
    document.fonts.load(`400 26px ${MONO}`),
  ]).catch(() => { /* system fallbacks still draw */ });

  const [wheelImg, discs] = await Promise.all([
    wheelSvgString(chart).then(loadSvg),
    Promise.all(trio.map((t) => loadDisc(t.slug))),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Hairline frame, same register as the site's card bezels.
  if (typeof ctx.roundRect === 'function') {
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(28.5, 28.5, W - 57, H - 57, 26);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Kicker — sentence-case serif italic, the house register.
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(shareCardText(locale, 'fullChartTitle'), W / 2, 118);

  ctx.drawImage(wheelImg, (W - WHEEL_SIZE) / 2, 158, WHEEL_SIZE, WHEEL_SIZE);

  // Pastel discs for the big three.
  const DISC = 84;
  const GAP = 40;
  const rowW = trio.length * DISC + (trio.length - 1) * GAP;
  let x = (W - rowW) / 2;
  const discY = 992;
  for (const bitmap of discs) {
    if (bitmap) ctx.drawImage(bitmap, x, discY, DISC, DISC);
    x += DISC + GAP;
  }

  // Big three line.
  const line = trio.map((t) => `${t.name} ${t.label}`).join(' · ');
  const px = fitText(ctx, line, W - 140, 52, 34, 500, SERIF);
  ctx.fillStyle = INK_0;
  ctx.font = `500 ${px}px ${SERIF}`;
  ctx.fillText(line, W / 2, 1138);

  const profile = dominantProfile(chart);
  const element = profile.element ? elementLabel(profile.element, locale) : shareCardText(locale, 'balanced');
  const modality = profile.modality ? modalityLabel(profile.modality, locale) : shareCardText(locale, 'balanced');
  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText(shareCardFormat(locale, 'dominant', { element, modality }), W / 2, 1192);

  // Receipt + footer.
  ctx.fillStyle = INK_2;
  ctx.font = `400 26px ${MONO}`;
  ctx.fillText(chartCardReceipt(chart, locale), W / 2, 1240);

  // Wordmark — the display serif set as spaced small caps, an old-almanac /
  // inscriptional register rather than the techy monospace.
  ctx.fillStyle = INK_2;
  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch { /* older canvases ignore it */ }
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch { /* no-op */ }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

async function drawBigThreeCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const placements = bigThreePlacements(chart, locale);

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 58px ${SERIF}`),
    document.fonts.load(`400 30px ${MONO}`),
  ]).catch(() => {});
  const discs = await Promise.all(placements.map((placement) => loadDisc(placement.slug)));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (typeof ctx.roundRect === 'function') {
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(28.5, 28.5, W - 57, H - 57, 26);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(shareCardText(locale, 'bigThreeTitle'), W / 2, 112);

  const gap = placements.length === 3 ? 292 : 370;
  const firstY = placements.length === 3 ? 245 : 305;
  placements.forEach((placement, index) => {
    const y = firstY + index * gap;
    const icon = discs[index];
    if (icon) ctx.drawImage(icon, 98, y, 178, 178);

    const label = shareCardText(locale, placement.kind);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK_2;
    ctx.font = `400 26px ${MONO}`;
    ctx.fillText(`${label} · ${placement.degree.toFixed(1)}°`, 334, y + 25);
    ctx.fillStyle = INK_0;
    ctx.font = `500 58px ${SERIF}`;
    ctx.fillText(placement.sign, 334, y + 84);
    const descriptorKey = `${placement.kind}Descriptor` as 'sunDescriptor' | 'moonDescriptor' | 'risingDescriptor';
    ctx.fillStyle = INK_2;
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillText(shareCardText(locale, descriptorKey), 334, y + 137);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText(shareCardFormat(locale, 'engineReceipt', { version: chart.engineVersion }), W / 2, 1238);
  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch {}
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch {}

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

export async function drawCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  return options.variant === 'big-three'
    ? drawBigThreeCard(chart, options)
    : drawFullChartCard(chart, options);
}

export async function saveChartCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<CardOutcome> {
  const blob = await drawCard(chart, options);
  return savePngBlob(blob, chartCardFilename(options));
}

export async function savePngBlob(blob: Blob, filename: string): Promise<CardOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Share sheet refused the file — fall through to a plain download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
