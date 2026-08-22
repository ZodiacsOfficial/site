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
  SIGNS,
  signBySlug,
  signForLongitude,
  signName,
  type Element,
  type Modality,
} from './signs';
import type { Angles, AspectType, BodyName, BodyPosition, Chart } from './engine/types';
import { houseOf } from './engine/houses';
import type { CatalogLocale as Locale } from './i18n';
import { shareCardFormat, shareCardText } from './share-card-copy';
import { communicationRead } from './communication';
import { approachRead } from './approach';
import { chartSignature, type ChartSignature } from './chart-signature';

export type CardOutcome = 'shared' | 'downloaded' | 'cancelled';
export type ChartCardVariant = 'full' | 'big-three' | 'communication' | 'signature' | 'approach' | 'sheet';
export type PrimaryShareCardVariant = Extract<ChartCardVariant, 'signature' | 'big-three' | 'full'>;

export interface ShareCardOptions {
  /** The full wheel is the backwards-compatible default. */
  variant?: ChartCardVariant;
  locale?: Locale;
  /** Forwarded to audience-facing Moon advice for no-time boundary days. */
  moonAmbiguous?: boolean;
  /** True when displayed positions use the calculator's 12:00 no-time reference. */
  referenceTime?: boolean;
  /** Sheet-only: keep placements while replacing the birth receipt with settings. */
  hideBirthDetails?: boolean;
  /** Already-formatted, human-readable receipt. Never coordinates or a share payload. */
  birthReceipt?: string;
}

/**
 * D9 keeps authored interpretation English-only. Translated chart pages still
 * get a useful, fully localized primary share surface without rendering an
 * English interpretation: Big Three when angles are available, otherwise the
 * full chart.
 */
export function primaryShareCardVariant(locale: Locale, hasAngles: boolean): PrimaryShareCardVariant {
  if (locale === 'en') return 'signature';
  return hasAngles ? 'big-three' : 'full';
}

/** The authored chart-signature corpus is deliberately unavailable off EN. */
export function authoredSignatureForLocale(
  chart: Pick<Chart, 'bodies' | 'angles' | 'aspects'>,
  locale: Locale,
): ChartSignature | null {
  return locale === 'en' ? chartSignature(chart, locale) : null;
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
  // An SVG rasterized through <img> cannot fetch external subresources. Use
  // the wheel's canonical sign glyphs and pastel hues in the exported copy;
  // this keeps eager share-sheet preparation self-contained and network-free.
  Array.from(svg.querySelectorAll('image')).forEach((img) => {
    const href = img.getAttribute('href') ?? img.getAttribute('xlink:href');
    const slug = href?.match(/\/([^/]+)\.webp$/)?.[1];
    const sign = slug ? signBySlug(slug) : null;
    if (!sign) { img.remove(); return; }
    const size = Number(img.getAttribute('width'));
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(Number(img.getAttribute('x')) + size / 2));
    text.setAttribute('y', String(Number(img.getAttribute('y')) + size / 2));
    text.setAttribute('fill', sign.hue);
    text.setAttribute('font-size', String(size * 0.72));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.textContent = sign.glyph;
    img.replaceWith(text);
  });
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

/** Shared by every card builder; the 128px discs are the canonical card art. */
export async function loadDisc(slug: string): Promise<ImageBitmap | null> {
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

export function bigThreePlacements(
  chart: Pick<BigThreeCardChart, 'bodies' | 'angles'>,
  locale: Locale = 'en',
): BigThreePlacement[] {
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
  if (options.variant === 'sheet') return 'zodiacs-chart-sheet.png';
  if (options.variant === 'big-three') return 'zodiacs-big-three.png';
  if (options.variant === 'communication') return 'zodiacs-communication.png';
  if (options.variant === 'signature') return 'zodiacs-chart-signature.png';
  if (options.variant === 'approach') return 'zodiacs-how-to-approach-me.png';
  return 'zodiacs-chart.png';
}

/** Small, bounded receipts used anywhere a no-time Moon is exported. */
export function shareCardTimeNotes(
  locale: Locale,
  options: Pick<ShareCardOptions, 'referenceTime' | 'moonAmbiguous'> = {},
): string[] {
  const notes: string[] = [];
  if (options.referenceTime) notes.push(shareCardText(locale, 'referenceTimeNote'));
  if (options.moonAmbiguous) notes.push(shareCardText(locale, 'approachMoonTimeNote'));
  return notes;
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

const COMMUNICATION_ROLES = {
  Mercury: 'How you phrase things',
  Moon: 'What helps you feel heard',
  Mars: 'How you handle friction',
} as const;

export interface CommunicationCardRow {
  body: keyof typeof COMMUNICATION_ROLES;
  role: string;
  slug: string;
  sign: string;
  reading: string;
}

export interface CommunicationCardContent {
  title: 'How I communicate';
  rows: CommunicationCardRow[];
  aspect: string | null;
  receipt: string;
}

/** Keep social-card copy concise without ever consulting private chart input. */
export function firstSentence(text: string): string {
  const match = /[.!?](?:[”"']?)(?=\s|$)/.exec(text);
  return match ? text.slice(0, match.index + match[0].length).trim() : text.trim();
}

export function communicationCardContent(
  chart: Chart,
  locale: Locale = 'en',
): CommunicationCardContent {
  const read = communicationRead(chart);
  const placements = [
    { body: 'Mercury' as const, slug: read.mercurySign, reading: read.mercury },
    { body: 'Moon' as const, slug: read.moonSign, reading: read.moon },
    { body: 'Mars' as const, slug: read.marsSign, reading: read.mars },
  ];
  const rows = placements.flatMap((placement) => {
    if (!placement.slug || !placement.reading) return [];
    const sign = signBySlug(placement.slug);
    return [{
      body: placement.body,
      role: COMMUNICATION_ROLES[placement.body],
      slug: placement.slug,
      sign: signName(sign, locale),
      reading: firstSentence(placement.reading),
    }];
  });
  const tightest = read.aspects[0];
  const aspect = tightest
    ? `Mercury ${tightest.type} ${tightest.target} · ${firstSentence(tightest.text)}`
    : null;
  return {
    title: 'How I communicate',
    rows,
    aspect,
    receipt: chartCardReceipt(chart, locale),
  };
}

export interface SignatureCardContent {
  title: string;
  kicker: string;
  signature: ChartSignature | null;
  bigThree: BigThreePlacement[];
  notes: string[];
  receipt: string;
}

/** A positive chart-specific claim backed only by computed positions. */
export function signatureCardContent(
  chart: Chart,
  locale: Locale = 'en',
  moonAmbiguous = false,
): SignatureCardContent {
  return {
    title: shareCardText(locale, 'signatureTitle'),
    kicker: shareCardText(locale, 'signatureKicker'),
    signature: authoredSignatureForLocale(chart, locale),
    bigThree: bigThreePlacements(chart, locale),
    notes: shareCardTimeNotes(locale, {
      referenceTime: !chart.input.timeKnown,
      moonAmbiguous,
    }),
    receipt: chartCardReceipt(chart, locale),
  };
}

export interface ApproachCardRow {
  body: 'Rising' | 'Mercury' | 'Moon';
  role: string;
  slug: string;
  sign: string;
  reading: string;
}

export interface ApproachCardContent {
  title: string;
  kicker: string;
  rows: ApproachCardRow[];
  avoid: {
    body: 'Mars';
    role: string;
    slug: string;
    sign: string;
    reading: string;
  } | null;
  notes: string[];
  receipt: string;
}

/** Audience-facing card content; birth input is never consulted or returned. */
export function approachCardContent(
  chart: Chart,
  options: Pick<ShareCardOptions, 'locale' | 'moonAmbiguous'> = {},
): ApproachCardContent {
  const locale = options.locale ?? 'en';
  const read = approachRead(chart, { moonAmbiguous: options.moonAmbiguous });
  const rows = [read.rising, read.mercury, read.moon].flatMap((part) => {
    if (!part || part.body === 'Mars') return [];
    const sign = signBySlug(part.sign);
    return [{
      body: part.body,
      role: part.role,
      slug: part.sign,
      sign: signName(sign, locale),
      reading: firstSentence(part.reading),
    }];
  });
  const avoid = read.avoid
    ? {
      body: 'Mars' as const,
      role: read.avoid.role,
      slug: read.avoid.sign,
      sign: signName(signBySlug(read.avoid.sign), locale),
      reading: firstSentence(read.avoid.reading),
    }
    : null;
  const notes: string[] = [];
  if (!read.rising) notes.push(shareCardText(locale, 'approachBirthTimeNote'));
  if (read.moonAmbiguous) notes.push(shareCardText(locale, 'approachMoonTimeNote'));
  return {
    title: shareCardText(locale, 'approachTitle'),
    kicker: shareCardText(locale, 'approachKicker'),
    rows,
    avoid,
    notes,
    receipt: chartCardReceipt(chart, locale),
  };
}

function wrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) {
    const consumed = lines.join(' ').split(/\s+/).filter(Boolean).length;
    const remaining = words.slice(consumed).join(' ');
    let finalLine = remaining || line;
    while (ctx.measureText(finalLine).width > maxWidth && finalLine.length > 1) {
      finalLine = finalLine.slice(0, -1).trimEnd();
    }
    if (finalLine !== remaining) finalLine = `${finalLine.replace(/[.,;:!?\s]+$/, '')}…`;
    lines.push(finalLine);
  }
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  wrappedLines(ctx, text, maxWidth, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

async function drawFullChartCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const timeNotes = shareCardTimeNotes(locale, {
    referenceTime: options.referenceTime ?? !chart.input.timeKnown,
    moonAmbiguous: options.moonAmbiguous,
  });
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

  ctx.fillStyle = INK_2;
  ctx.font = `400 19px ${MONO}`;
  timeNotes.forEach((note, index) => ctx.fillText(note, W / 2, 1195 + index * 31));

  // Receipt + footer.
  ctx.fillStyle = INK_2;
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(chartCardReceipt(chart, locale), W / 2, 1272);

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
  chart: BigThreeCardChart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const placements = bigThreePlacements(chart, locale);
  const timeNotes = shareCardTimeNotes(locale, options);

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
  ctx.font = `400 20px ${MONO}`;
  timeNotes.forEach((note, index) => ctx.fillText(note, W / 2, 1150 + index * 34));
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

async function drawCommunicationCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const content = communicationCardContent(chart, locale);

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 68px ${SERIF}`),
    document.fonts.load(`500 48px ${SERIF}`),
    document.fonts.load(`400 28px ${SERIF}`),
    document.fonts.load(`400 24px ${MONO}`),
  ]).catch(() => {});
  const discs = await Promise.all(content.rows.map((row) => loadDisc(row.slug)));

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

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText('MERCURY · MOON · MARS', 72, 92);
  ctx.fillStyle = INK_0;
  ctx.font = `500 68px ${SERIF}`;
  ctx.fillText(content.title, 72, 156);

  const rowTop = 255;
  const rowGap = 292;
  content.rows.forEach((row, index) => {
    const top = rowTop + index * rowGap;
    const icon = discs[index];
    if (icon) ctx.drawImage(icon, 72, top, 126, 126);

    ctx.fillStyle = INK_2;
    ctx.font = `400 23px ${MONO}`;
    ctx.fillText(`${row.body.toUpperCase()} · ${row.role.toUpperCase()}`, 236, top + 16);
    ctx.fillStyle = INK_0;
    ctx.font = `500 48px ${SERIF}`;
    ctx.fillText(row.sign, 236, top + 69);
    ctx.fillStyle = INK_2;
    ctx.font = `400 28px ${SERIF}`;
    drawWrappedText(ctx, row.reading, 236, top + 126, W - 308, 35, 3);

    if (index < content.rows.length - 1) {
      ctx.strokeStyle = HAIR;
      ctx.beginPath();
      ctx.moveTo(72, top + 250.5);
      ctx.lineTo(W - 72, top + 250.5);
      ctx.stroke();
    }
  });

  if (content.aspect) {
    ctx.fillStyle = INK_2;
    ctx.font = `400 23px ${MONO}`;
    ctx.fillText('A STRONG MERCURY CONNECTION', 72, 1138);
    ctx.font = `400 27px ${SERIF}`;
    drawWrappedText(ctx, content.aspect, 72, 1183, W - 144, 33, 2);
  }

  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(content.receipt, 72, 1260);

  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch {}
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch {}

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

async function drawSignatureCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const content = signatureCardContent(chart, locale, Boolean(options.moonAmbiguous));
  if (!content.signature) {
    return drawBigThreeCard(chart, { ...options, variant: 'big-three' });
  }

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 68px ${SERIF}`),
    document.fonts.load(`500 56px ${SERIF}`),
    document.fonts.load(`400 30px ${SERIF}`),
    document.fonts.load(`400 24px ${MONO}`),
  ]).catch(() => {});
  const [signatureDiscs, bigThreeDiscs] = await Promise.all([
    Promise.all(content.signature.signSlugs.slice(0, 3).map(loadDisc)),
    Promise.all(content.bigThree.map((placement) => loadDisc(placement.slug))),
  ]);

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

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText(content.kicker, 72, 92);
  ctx.fillStyle = INK_0;
  ctx.font = `500 68px ${SERIF}`;
  ctx.fillText(content.title, 72, 158);

  if (typeof ctx.roundRect === 'function') {
    ctx.fillStyle = 'rgba(198, 204, 218, 0.035)';
    ctx.strokeStyle = HAIR;
    ctx.beginPath();
    ctx.roundRect(72.5, 220.5, W - 145, 570, 22);
    ctx.fill();
    ctx.stroke();
  }

  const shownDiscs = signatureDiscs.filter((disc): disc is ImageBitmap => disc != null);
  const signatureDiscSize = 154;
  const signatureGap = 24;
  const discRowWidth = shownDiscs.length * signatureDiscSize
    + Math.max(0, shownDiscs.length - 1) * signatureGap;
  let signatureX = (W - discRowWidth) / 2;
  for (const disc of shownDiscs) {
    ctx.drawImage(disc, signatureX, 260, signatureDiscSize, signatureDiscSize);
    signatureX += signatureDiscSize + signatureGap;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 28px ${SERIF}`;
  ctx.fillText(content.signature.eyebrow, W / 2, 465);
  const titlePx = fitText(ctx, content.signature.title, W - 220, 56, 38, 500, SERIF);
  ctx.fillStyle = INK_0;
  ctx.font = `500 ${titlePx}px ${SERIF}`;
  ctx.fillText(content.signature.title, W / 2, 528);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 30px ${SERIF}`;
  drawWrappedText(ctx, content.signature.summary, 140, 602, W - 280, 39, 4);
  if (content.signature.detail) {
    ctx.textAlign = 'center';
    ctx.fillStyle = INK_2;
    const detailPx = fitText(ctx, content.signature.detail.toUpperCase(), W - 240, 22, 16, 400, MONO);
    ctx.font = `400 ${detailPx}px ${MONO}`;
    ctx.fillText(content.signature.detail.toUpperCase(), W / 2, 748);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 22px ${MONO}`;
  ctx.font = `italic 400 28px ${SERIF}`;
  ctx.fillText('Chart fingerprint', 72, 856);
  const bigThreeCount = content.bigThree.length;
  const columnWidth = (W - 144) / Math.max(1, bigThreeCount);
  content.bigThree.forEach((placement, index) => {
    const center = 72 + columnWidth * index + columnWidth / 2;
    const disc = bigThreeDiscs[index];
    if (disc) ctx.drawImage(disc, center - 46, 900, 92, 92);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK_0;
    ctx.font = `500 34px ${SERIF}`;
    ctx.fillText(placement.sign, center, 1024);
    ctx.fillStyle = INK_2;
    ctx.font = `400 20px ${MONO}`;
    ctx.fillText(shareCardText(locale, placement.kind).toUpperCase(), center, 1067);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 20px ${MONO}`;
  content.notes.forEach((note, index) => ctx.fillText(note, 72, 1132 + index * 34));

  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText(content.receipt, 72, 1260);
  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch {}
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch {}

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

async function drawApproachCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  const content = approachCardContent(chart, options);

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 68px ${SERIF}`),
    document.fonts.load(`500 44px ${SERIF}`),
    document.fonts.load(`400 28px ${SERIF}`),
    document.fonts.load(`400 23px ${MONO}`),
  ]).catch(() => {});
  const rowDiscs = await Promise.all(content.rows.map((row) => loadDisc(row.slug)));
  const avoidDisc = content.avoid ? await loadDisc(content.avoid.slug) : null;

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

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 23px ${MONO}`;
  ctx.fillText(content.kicker, 72, 92);
  ctx.fillStyle = INK_0;
  ctx.font = `500 68px ${SERIF}`;
  ctx.fillText(content.title, 72, 158);

  const rowTop = 242;
  const rowGap = 248;
  content.rows.forEach((row, index) => {
    const top = rowTop + index * rowGap;
    const icon = rowDiscs[index];
    if (icon) ctx.drawImage(icon, 72, top, 112, 112);
    ctx.fillStyle = INK_2;
    ctx.font = `400 22px ${MONO}`;
    ctx.fillText(`${row.body.toUpperCase()} · ${row.role.toUpperCase()}`, 220, top + 13);
    ctx.fillStyle = INK_0;
    ctx.font = `500 44px ${SERIF}`;
    ctx.fillText(row.sign, 220, top + 64);
    ctx.fillStyle = INK_2;
    ctx.font = `400 28px ${SERIF}`;
    drawWrappedText(ctx, row.reading, 220, top + 116, W - 292, 35, 2);
    ctx.strokeStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(72, top + 214.5);
    ctx.lineTo(W - 72, top + 214.5);
    ctx.stroke();
  });

  let cursor = rowTop + content.rows.length * rowGap;
  if (content.avoid) {
    const avoid = content.avoid;
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = 'rgba(198, 204, 218, 0.035)';
      ctx.strokeStyle = HAIR;
      ctx.beginPath();
      ctx.roundRect(72.5, cursor - 8.5, W - 145, 158, 18);
      ctx.fill();
      ctx.stroke();
    }
    if (avoidDisc) ctx.drawImage(avoidDisc, 92, cursor + 17, 92, 92);
    ctx.fillStyle = INK_2;
    ctx.font = `400 21px ${MONO}`;
    ctx.fillText(`${avoid.body.toUpperCase()} · ${avoid.role.toUpperCase()} · ${avoid.sign.toUpperCase()}`, 218, cursor + 18);
    ctx.font = `400 27px ${SERIF}`;
    drawWrappedText(ctx, avoid.reading, 218, cursor + 65, W - 306, 33, 2);
    cursor += 174;
  }

  ctx.fillStyle = INK_2;
  ctx.font = `400 20px ${MONO}`;
  content.notes.forEach((note, index) => {
    ctx.fillText(note, 72, cursor + index * 29);
  });

  ctx.fillStyle = INK_2;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText(content.receipt, 72, 1260);
  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch {}
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch {}

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

const SHEET_W = 1800;
const SHEET_H = 2400;
const SHEET_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly BodyName[];
const BODY_GLYPH: Record<BodyName, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};
const BODY_SHORT: Record<BodyName, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Merc', Venus: 'Venus', Mars: 'Mars',
  Jupiter: 'Jup', Saturn: 'Sat', Uranus: 'Ura', Neptune: 'Nep', Pluto: 'Plu',
  'North Node': 'Node', 'South Node': 'S.Node',
};
const ASPECT_GLYPH: Record<AspectType, string> = {
  conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍',
};

export interface ChartPreviewPlacement {
  longitude: number;
  signIndex: number;
  signSlug: string;
  signGlyph: string;
  degree: number;
  minute: number;
}

/** Round to the displayed arcminute, carrying cleanly into the next sign. */
export function chartPreviewPlacement(longitude: number): ChartPreviewPlacement {
  const normalized = ((longitude % 360) + 360) % 360;
  const totalMinutes = Math.round(normalized * 60) % (360 * 60);
  const signIndex = Math.floor(totalMinutes / (30 * 60));
  const withinSign = totalMinutes % (30 * 60);
  return {
    longitude: totalMinutes / 60,
    signIndex,
    signSlug: SIGNS[signIndex].slug,
    signGlyph: SIGNS[signIndex].glyph,
    degree: Math.floor(withinSign / 60),
    minute: withinSign % 60,
  };
}

export function chartSheetSettings(
  chart: Pick<Chart, 'houses'> & { input?: Pick<Chart['input'], 'timeKnown'> },
): string {
  if (!chart.houses) {
    return chart.input?.timeKnown === false
      ? '12:00 reference · No houses · Tropical'
      : 'No houses · Tropical';
  }
  return `${chart.houses.system === 'whole' ? 'Whole sign' : 'Placidus'} · Tropical`;
}

function sheetPositionText(longitude: number, locale: Locale): string {
  const value = chartPreviewPlacement(longitude);
  return `${signName(SIGNS[value.signIndex], locale)} ${String(value.degree).padStart(2, '0')}°${String(value.minute).padStart(2, '0')}′`;
}

function drawSheetLabel(
  ctx: CanvasRenderingContext2D,
  body: BodyName | 'ASC' | 'MC',
  x: number,
  y: number,
): void {
  const glyph = body === 'ASC' ? 'A' : body === 'MC' ? 'M' : BODY_GLYPH[body];
  const short = body === 'ASC' || body === 'MC' ? body : BODY_SHORT[body];
  ctx.fillStyle = INK_0;
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillText(glyph, x, y);
  ctx.fillStyle = INK_2;
  ctx.font = `400 25px ${MONO}`;
  ctx.fillText(short, x + 44, y);
}

async function drawChartSheet(chart: Chart, options: ShareCardOptions = {}): Promise<Blob> {
  const locale = options.locale ?? 'en';
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 34px ${SERIF}`),
    document.fonts.load(`italic 400 30px ${SERIF}`),
    document.fonts.load(`400 30px ${MONO}`),
  ]).catch(() => {});
  const wheel = await wheelSvgString(chart).then(loadSvg);
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 2;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(38, 38, SHEET_W - 76, SHEET_H - 76, 30);
    ctx.stroke();
  }
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_2;
  ctx.textAlign = 'right';
  ctx.font = `500 31px ${SERIF}`;
  ctx.fillText('zodiacs.org', SHEET_W - 92, 92);

  ctx.drawImage(wheel, 420, 135, 960, 960);

  const rows: Array<{ body: BodyName | 'ASC' | 'MC'; lon: number }> = chart.bodies
    .map((body) => ({ body: body.body, lon: body.lon }));
  if (chart.angles) {
    rows.push({ body: 'ASC', lon: chart.angles.asc }, { body: 'MC', lon: chart.angles.mc });
  }
  const tableX = 92;
  const tableTop = 1180;
  const rowHeight = 66;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText('Positions', tableX, tableTop - 54);
  rows.forEach((row, index) => {
    const y = tableTop + index * rowHeight;
    drawSheetLabel(ctx, row.body, tableX, y);
    ctx.fillStyle = INK_0;
    ctx.font = `400 30px ${MONO}`;
    ctx.fillText(sheetPositionText(row.lon, locale), tableX + 190, y);
    if (chart.houses) {
      ctx.fillStyle = INK_2;
      ctx.font = `400 28px ${MONO}`;
      ctx.fillText(`H${houseOf(row.lon, chart.houses.cusps)}`, tableX + 650, y);
    }
    ctx.strokeStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(tableX, y + 31);
    ctx.lineTo(890, y + 31);
    ctx.stroke();
  });

  const gridX = 1010;
  const gridY = 1260;
  const cell = 64;
  const byPair = new Map(chart.aspects.map((aspect) => {
    const key = [aspect.a, aspect.b].sort().join('|');
    return [key, aspect.type] as const;
  }));
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText('Aspect grid', gridX, gridY - 138);
  SHEET_BODIES.forEach((body, index) => {
    ctx.save();
    ctx.translate(gridX + index * cell + 35, gridY - 22);
    ctx.rotate(-Math.PI / 2);
    drawSheetLabel(ctx, body, 0, 0);
    ctx.restore();
    drawSheetLabel(ctx, body, gridX - 112, gridY + index * cell + 30);
  });
  for (let row = 0; row < SHEET_BODIES.length; row += 1) {
    for (let column = 0; column < SHEET_BODIES.length; column += 1) {
      const x = gridX + column * cell;
      const y = gridY + row * cell;
      ctx.strokeStyle = HAIR;
      ctx.strokeRect(x, y, cell, cell);
      if (column >= row) continue;
      const type = byPair.get([SHEET_BODIES[row], SHEET_BODIES[column]].sort().join('|'));
      if (!type) continue;
      ctx.textAlign = 'center';
      ctx.fillStyle = INK_0;
      ctx.font = `400 30px ${SERIF}`;
      ctx.fillText(ASPECT_GLYPH[type], x + cell / 2, y + cell / 2 + 2);
    }
  }

  const receipt = [
    ...(options.hideBirthDetails === false ? [options.birthReceipt?.trim()] : []),
    chartSheetSettings(chart),
    ...(options.moonAmbiguous ? [shareCardText(locale, 'approachMoonTimeNote')] : []),
  ].filter(Boolean).join(' · ');
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `400 27px ${MONO}`;
  wrappedLines(ctx, receipt, SHEET_W - 184, 2).forEach((line, index) => {
    ctx.fillText(line, 92, 2260 + index * 38);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

async function drawPlacementCard(
  chart: BigThreeCardChart,
  placement: 'moon' | 'rising',
  options: ShareCardOptions = {},
): Promise<Blob> {
  const locale = options.locale ?? 'en';
  const timeNotes = shareCardTimeNotes(locale, options);
  const source = placement === 'moon'
    ? chart.bodies.find((body) => body.body === 'Moon')?.lon
    : chart.angles?.asc;
  if (source == null) throw new Error(`chart missing ${placement}`);
  const sign = signForLongitude(source);
  // A dedicated one-placement composition keeps the existing Big Three card stable.
  await document.fonts.ready;
  const disc = await loadDisc(sign.slug);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (typeof ctx.roundRect === 'function') {
    ctx.strokeStyle = HAIR;
    ctx.beginPath();
    ctx.roundRect(28.5, 28.5, W - 57, H - 57, 26);
    ctx.stroke();
  }
  if (disc) ctx.drawImage(disc, (W - 300) / 2, 270, 300, 300);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_2;
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(shareCardText(locale, placement), W / 2, 150);
  ctx.fillStyle = INK_0;
  ctx.font = `500 76px ${SERIF}`;
  ctx.fillText(signName(sign, locale), W / 2, 690);
  ctx.fillStyle = INK_2;
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText(`${degreeInSign(source).toFixed(1)}°`, W / 2, 770);
  ctx.font = `400 28px ${SERIF}`;
  ctx.fillText(shareCardText(locale, placement === 'moon' ? 'moonDescriptor' : 'risingDescriptor'), W / 2, 850);
  ctx.font = `400 20px ${MONO}`;
  timeNotes.forEach((note, index) => ctx.fillText(note, W / 2, 1090 + index * 34));
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText(shareCardFormat(locale, 'engineReceipt', { version: chart.engineVersion }), W / 2, 1238);
  ctx.textAlign = 'right';
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillText('zodiacs.org', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

export async function drawCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<Blob> {
  if (options.variant === 'sheet') return drawChartSheet(chart, options);
  if (options.variant === 'big-three') return drawBigThreeCard(chart, options);
  if (options.variant === 'communication') return drawCommunicationCard(chart, options);
  if (options.variant === 'signature') return drawSignatureCard(chart, options);
  if (options.variant === 'approach') return drawApproachCard(chart, options);
  return drawFullChartCard(chart, options);
}

export async function saveChartCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<CardOutcome> {
  return savePreparedChartCard(await prepareChartCard(chart, options));
}

export interface PreparedChartCard {
  blob: Blob;
  filename: string;
}

export interface BigThreeCardChart {
  bodies: readonly Pick<BodyPosition, 'body' | 'lon'>[];
  angles: Pick<Angles, 'asc' | 'mc'> | null;
  engineVersion: string;
}

/**
 * Prepare the privacy-light Big Three card directly from a positions-only
 * chart. This keeps the invitation completion path from inventing or
 * reconstructing any birth input merely to satisfy the full Chart type.
 */
export async function prepareBigThreeCard(
  chart: BigThreeCardChart,
  locale: Locale = 'en',
  options: Pick<ShareCardOptions, 'referenceTime' | 'moonAmbiguous'> = {},
): Promise<PreparedChartCard> {
  return {
    blob: await drawBigThreeCard(chart, { ...options, variant: 'big-three', locale }),
    filename: chartCardFilename({ variant: 'big-three', locale }),
  };
}

export async function preparePlacementCard(
  chart: BigThreeCardChart,
  placement: 'moon' | 'rising',
  locale: Locale = 'en',
  options: Pick<ShareCardOptions, 'referenceTime' | 'moonAmbiguous'> = {},
): Promise<PreparedChartCard> {
  return {
    blob: await drawPlacementCard(chart, placement, { ...options, locale }),
    filename: placement === 'moon' ? 'zodiacs-moon-sign.png' : 'zodiacs-rising-sign.png',
  };
}

export async function prepareChartSheet(
  chart: Chart,
  options: Omit<ShareCardOptions, 'variant'> = {},
): Promise<PreparedChartCard> {
  const sheetOptions: ShareCardOptions = { ...options, variant: 'sheet' };
  return {
    blob: await drawChartSheet(chart, sheetOptions),
    filename: chartCardFilename(sheetOptions),
  };
}

/**
 * Render before the final share tap. Calling savePreparedChartCard from that
 * later tap reaches navigator.share synchronously, preserving iOS activation.
 */
export async function prepareChartCard(
  chart: Chart,
  options: ShareCardOptions = {},
): Promise<PreparedChartCard> {
  return {
    blob: await drawCard(chart, options),
    filename: chartCardFilename(options),
  };
}

export function savePreparedChartCard(prepared: PreparedChartCard): Promise<CardOutcome> {
  return savePngBlob(prepared.blob, prepared.filename);
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
