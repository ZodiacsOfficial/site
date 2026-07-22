import type { PairSummary, MinimalBody } from './engine/synastry';
import type { CatalogLocale as Locale } from './i18n';
import { aspectLabel, planetLabel } from './i18n/astrology';
import { degreeInSign, signForLongitude, signName } from './signs';
import { shareCardText } from './share-card-copy';
import { SHARE_CARD_WORDMARK, savePngBlob, type CardOutcome } from './share-card';

export interface CompatibilityCardPerson {
  /** The display label the user chose; no birth input is accepted here. */
  label: string;
  bodies: MinimalBody[];
  asc: number | null;
}

const W = 1080;
const H = 1350;
const BG = '#060709';
const INK = '#EEF1F7';
const MUTED = '#8E96AB';
const HAIR = 'rgba(198, 204, 218, 0.12)';
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

function placementRows(person: CompatibilityCardPerson, locale: Locale) {
  const rows = [
    { key: 'sun' as const, lon: person.bodies.find((body) => body.body === 'Sun')?.lon },
    { key: 'moon' as const, lon: person.bodies.find((body) => body.body === 'Moon')?.lon },
    { key: 'rising' as const, lon: person.asc ?? undefined },
  ];
  return rows.flatMap(({ key, lon }) => {
    if (lon === undefined) return [];
    const sign = signForLongitude(lon);
    return [{
      key,
      label: shareCardText(locale, key),
      sign: signName(sign, locale),
      slug: sign.slug,
      degree: degreeInSign(lon),
    }];
  });
}

export function compatibilityHeadline(summary: Pick<PairSummary, 'easeful' | 'charged'>, locale: Locale = 'en'): string {
  if (summary.easeful > summary.charged) return shareCardText(locale, 'compatibilityFlow');
  if (summary.charged > summary.easeful) return shareCardText(locale, 'compatibilityCharge');
  return shareCardText(locale, 'compatibilityBalance');
}

async function loadIcon(slug: string): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(`/assets/zodiac-icons/128/${slug}.webp`);
    if (!response.ok) return null;
    return createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  initial: number,
  minimum: number,
  family = SERIF,
): number {
  let size = initial;
  while (size > minimum) {
    ctx.font = `500 ${size}px ${family}`;
    if (ctx.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export async function drawCompatibilityCard(
  a: CompatibilityCardPerson,
  b: CompatibilityCardPerson,
  summary: PairSummary,
  locale: Locale = 'en',
): Promise<Blob> {
  const people = [a, b];
  const rows = people.map((person) => placementRows(person, locale));
  const icons = await Promise.all(rows.map((placements) => Promise.all(placements.map((row) => loadIcon(row.slug)))));
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 54px ${SERIF}`),
    document.fonts.load(`400 24px ${MONO}`),
  ]).catch(() => {});

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
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(shareCardText(locale, 'compatibilityTitle'), W / 2, 105);

  people.forEach((person, personIndex) => {
    const center = personIndex === 0 ? 285 : 795;
    const nameSize = fitText(ctx, person.label, 400, 54, 34);
    ctx.fillStyle = INK;
    ctx.font = `500 ${nameSize}px ${SERIF}`;
    ctx.fillText(person.label, center, 190);
    rows[personIndex].forEach((row, rowIndex) => {
      const y = 305 + rowIndex * 190;
      const icon = icons[personIndex][rowIndex];
      if (icon) ctx.drawImage(icon, center - 58, y, 116, 116);
      ctx.fillStyle = MUTED;
      ctx.font = `400 22px ${MONO}`;
      ctx.fillText(`${row.label} · ${row.degree.toFixed(1)}°`, center, y + 140);
      ctx.fillStyle = INK;
      ctx.font = `500 34px ${SERIF}`;
      ctx.fillText(row.sign, center, y + 176);
    });
  });

  ctx.strokeStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(540, 170);
  ctx.lineTo(540, 870);
  ctx.stroke();

  const headline = compatibilityHeadline(summary, locale);
  const headlineSize = fitText(ctx, headline, W - 150, 54, 36);
  ctx.fillStyle = INK;
  ctx.font = `500 ${headlineSize}px ${SERIF}`;
  ctx.fillText(headline, W / 2, 945);

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(shareCardText(locale, 'tightestContacts'), W / 2, 1020);
  summary.top.slice(0, 3).forEach((aspect, index) => {
    const contact = `${planetLabel(locale, aspect.a)} ${aspectLabel(locale, aspect.type)} ${planetLabel(locale, aspect.b)} · ${aspect.orb.toFixed(1)}°`;
    const size = fitText(ctx, contact, W - 180, 32, 24, SERIF);
    ctx.fillStyle = index === 0 ? INK : MUTED;
    ctx.font = `500 ${size}px ${SERIF}`;
    ctx.fillText(contact, W / 2, 1080 + index * 48);
  });

  ctx.fillStyle = MUTED;
  ctx.font = `500 34px ${SERIF}`;
  ctx.textAlign = SHARE_CARD_WORDMARK.align;
  try { ctx.letterSpacing = '8px'; } catch {}
  ctx.fillText('ZODIACS · ORG', SHARE_CARD_WORDMARK.x, SHARE_CARD_WORDMARK.y);
  try { ctx.letterSpacing = '0px'; } catch {}

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

export async function saveCompatibilityCard(
  a: CompatibilityCardPerson,
  b: CompatibilityCardPerson,
  summary: PairSummary,
  locale: Locale = 'en',
): Promise<CardOutcome> {
  const blob = await drawCompatibilityCard(a, b, summary, locale);
  return savePngBlob(blob, 'zodiacs-compatibility.png');
}
