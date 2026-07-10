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
import { signForLongitude } from './signs';
import type { ShareChartInput } from './share';
import type { Chart } from './engine/types';

export type CardOutcome = 'shared' | 'downloaded' | 'cancelled';

export interface ShareCardOptions {
  /** Replace the birth receipt and dated filename with positions-only metadata. */
  hideBirthDetails?: boolean;
}

const W = 1080;
const H = 1350;
const BG = '#060709';
const INK_0 = '#EEF1F7';
const INK_2 = '#8E96AB';
const INK_3 = '#7A8397';
const HAIR = 'rgba(198, 204, 218, 0.12)';
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const WHEEL_SIZE = 780;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

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

function formatDateLine(input: ShareChartInput): string {
  const [y, m, d] = input.date.split('-').map(Number);
  const parts = [`${MONTHS[m - 1]} ${d}, ${y}`];
  if (input.timeKnown && input.time) parts.push(input.time);
  if (input.place) parts.push(input.place);
  return parts.join(' · ');
}

/** Receipt rendered below the wheel. Kept pure so privacy can be regression-tested. */
export function chartCardReceipt(
  chart: Pick<Chart, 'engineVersion'>,
  input: ShareChartInput,
  options: ShareCardOptions = {},
): string {
  return options.hideBirthDetails
    ? `Engine ${chart.engineVersion}`
    : formatDateLine(input);
}

/** Download/share-sheet filename. Positions-only cards must not leak the input date. */
export function chartCardFilename(
  input: ShareChartInput,
  options: ShareCardOptions = {},
): string {
  return options.hideBirthDetails
    ? 'zodiacs-chart-positions.png'
    : `zodiacs-chart-${input.date}.png`;
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

export async function drawCard(
  chart: Chart,
  input: ShareChartInput,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const sun = chart.bodies.find((b) => b.body === 'Sun');
  const moon = chart.bodies.find((b) => b.body === 'Moon');
  if (!sun || !moon) throw new Error('chart missing luminaries');
  const asc = chart.angles?.asc ?? null;

  const trio: { label: string; slug: string; name: string }[] = [
    { label: 'Sun', ...pick(sun.lon) },
    { label: 'Moon', ...pick(moon.lon) },
  ];
  if (asc !== null) trio.push({ label: 'Rising', ...pick(asc) });

  function pick(lon: number) {
    const s = signForLongitude(lon);
    return { slug: s.slug, name: s.name };
  }

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
  ctx.fillText('A birth chart', W / 2, 118);

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
  ctx.fillText(line, W / 2, 1152);

  // Receipt + footer.
  ctx.fillStyle = INK_2;
  ctx.font = `400 26px ${MONO}`;
  ctx.fillText(chartCardReceipt(chart, input, options), W / 2, 1218);

  // Wordmark — the display serif set as spaced small caps, an old-almanac /
  // inscriptional register rather than the techy monospace.
  ctx.fillStyle = INK_2;
  ctx.font = `500 34px ${SERIF}`;
  try { ctx.letterSpacing = '8px'; } catch { /* older canvases ignore it */ }
  // letterSpacing pads a trailing gap; nudge right by half a step to re-centre.
  ctx.fillText('ZODIACS · ORG', W / 2 + 4, 1294);
  try { ctx.letterSpacing = '0px'; } catch { /* no-op */ }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

export async function saveChartCard(
  chart: Chart,
  input: ShareChartInput,
  options: ShareCardOptions = {},
): Promise<CardOutcome> {
  const blob = await drawCard(chart, input, options);
  const file = new File([blob], chartCardFilename(input, options), { type: 'image/png' });

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
