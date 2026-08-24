import { aspectLabel, planetLabel } from '../i18n/astrology';
import { degreeInSign, signForLongitude } from '../signs';
import { savePngBlob, type CardOutcome } from '../share-card';
import {
  PORTRAIT_SHARE_CARD_BRAND_LAYOUT,
  drawShareBrandLockup,
  withShareBrandIcon,
} from '../share-card-brand';
import type { MinimalBody, PairSummary } from '../engine/synastry';
import { truncateWalletAddress } from './address';
import type { WalletChain } from './types';
import { walletText } from '../../strings/wallet-chart';

export interface WalletShareCardInput {
  chain: WalletChain;
  address: string;
  birthTimestamp: string;
  bodies: MinimalBody[];
  ownerSummary?: PairSummary | null;
}

const W = 1080;
const H = 1350;
const BG = '#060709';
const INK = '#EEF1F7';
const MUTED = '#8E96AB';
const HAIR = 'rgba(198, 204, 218, 0.12)';
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
export const WALLET_SHARE_CARD_BRAND_LAYOUT = PORTRAIT_SHARE_CARD_BRAND_LAYOUT;

export function walletCardPlacements(bodies: MinimalBody[]) {
  return ['Sun', 'Moon', 'Mercury'].flatMap((bodyName) => {
    const body = bodies.find((candidate) => candidate.body === bodyName);
    if (!body) return [];
    const sign = signForLongitude(body.lon);
    return [{ body: bodyName, slug: sign.slug, sign: sign.name, degree: degreeInSign(body.lon) }];
  });
}

export function walletCardAddress(address: string): string {
  return truncateWalletAddress(address);
}

function formatUtc(timestamp: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }).format(new Date(timestamp));
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
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  initial: number,
  minimum: number,
  family = SERIF,
): number {
  let size = initial;
  while (size > minimum) {
    context.font = `500 ${size}px ${family}`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export async function drawWalletShareCard(input: WalletShareCardInput): Promise<Blob> {
  const placements = walletCardPlacements(input.bodies);
  const icons = await Promise.all(placements.map((placement) => loadIcon(placement.slug)));
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 62px ${SERIF}`),
    document.fonts.load(`400 24px ${MONO}`),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  context.fillStyle = BG;
  context.fillRect(0, 0, W, H);
  if (typeof context.roundRect === 'function') {
    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(28.5, 28.5, W - 57, H - 57, 26);
    context.stroke();
  }

  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillStyle = MUTED;
  context.font = `italic 400 34px ${SERIF}`;
  context.fillText(walletText('cardTitle'), 78, 105);

  const address = walletCardAddress(input.address);
  context.fillStyle = INK;
  context.font = `500 ${fitText(context, address, 920, 68, 42)}px ${SERIF}`;
  context.fillText(address, 78, 190);
  context.fillStyle = MUTED;
  context.font = `400 22px ${MONO}`;
  context.fillText(input.chain === 'solana' ? walletText('solana') : walletText('base'), 80, 248);
  context.fillText(walletText('cardBorn', { time: formatUtc(input.birthTimestamp) }), 80, 286);
  context.fillText(walletText('cardNoBirthplace'), 80, 322);

  placements.forEach((placement, index) => {
    const x = 95 + index * 325;
    const y = 418;
    const icon = icons[index];
    if (icon) context.drawImage(icon, x, y, 170, 170);
    context.fillStyle = MUTED;
    context.font = `400 22px ${MONO}`;
    context.fillText(planetLabel('en', placement.body), x, y + 212);
    context.fillStyle = INK;
    context.font = `500 36px ${SERIF}`;
    context.fillText(`${placement.sign} · ${placement.degree.toFixed(1)}°`, x, y + 260);
  });

  const contact = input.ownerSummary?.top[0];
  if (contact) {
    context.strokeStyle = HAIR;
    context.beginPath();
    context.moveTo(78, 810);
    context.lineTo(W - 78, 810);
    context.stroke();
    const highlight = walletText('cardOwnerHighlight', {
      ownerBody: planetLabel('en', contact.b),
      aspect: aspectLabel('en', contact.type),
      walletBody: planetLabel('en', contact.a),
      orb: contact.orb.toFixed(1),
    });
    context.fillStyle = MUTED;
    context.font = `400 22px ${MONO}`;
    context.fillText(walletText('synastryTitle'), 78, 875);
    context.fillStyle = INK;
    context.font = `500 ${fitText(context, highlight, 920, 38, 25)}px ${SERIF}`;
    context.fillText(highlight, 78, 935);
  }

  context.fillStyle = MUTED;
  context.font = `400 21px ${MONO}`;
  context.fillText(walletText('cardSymbolic'), 78, 1208);
  await withShareBrandIcon((brandIcon) => {
    drawShareBrandLockup(context, brandIcon, {
      ...WALLET_SHARE_CARD_BRAND_LAYOUT,
      serif: SERIF,
    });
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png encode failed');
  return blob;
}

export async function saveWalletShareCard(input: WalletShareCardInput): Promise<CardOutcome> {
  const blob = await drawWalletShareCard(input);
  return savePngBlob(blob, 'zodiacs-wallet-chart.png');
}
