import { SIGNS, signBySlug } from '../signs';
import { isCrownGoldCount } from './cabinet-finish';
import {
  AURA_SIGN_ORDER,
  type AuraCabinetEdition,
  type AuraCabinetFinish,
  type AuraCabinetHolding,
  type AuraComposition,
  type AuraNatalEvidence,
  type AuraSign,
} from './types';

const CENTER = 0.5;
const OUTER_RADIUS = 0.42;
const SKY_RADIUS = 0.255;
const CHART_RADIUS = 0.16;
const EDITION_LABEL: Record<AuraCabinetEdition, string> = {
  pastel: 'Pastel Disc',
  bronze: 'Bronze Edition',
  silver: 'Silver Edition',
  gold: 'Gold Edition',
  crown: 'Crown Gold',
};

export type AuraTalismanCollectionMode = 'empty' | 'point' | 'chord' | 'polygon';

export interface AuraTalismanPoint {
  x: number;
  y: number;
}

export interface AuraTalismanOuterNode extends AuraTalismanPoint {
  sign: AuraSign;
  index: number;
  name: string;
  glyph: string;
  hue: string;
  represented: boolean;
  finish: AuraCabinetFinish | null;
  goldCount: string | null;
  goldCountLabel: string | null;
  goldTallyArcs: 0 | 1 | 2;
}

export interface AuraTalismanSegment {
  fromSign: AuraSign;
  toSign: AuraSign;
  from: AuraTalismanPoint;
  to: AuraTalismanPoint;
}

/**
 * Public-only geometry shared by the page SVG and the privacy-restricted
 * share-card renderer. All coordinates are normalized to the 0..1 square.
 */
export interface AuraTalismanGeometry {
  outerNodes: readonly AuraTalismanOuterNode[];
  collectionPoints: readonly AuraTalismanOuterNode[];
  collectionSegments: readonly AuraTalismanSegment[];
  collectionMode: AuraTalismanCollectionMode;
  closed: boolean;
  fullTwelve: boolean;
}

export interface AuraTalismanSkyMark extends AuraTalismanPoint {
  body: 'Sun' | 'Moon';
  sign: AuraSign;
  glyph: '☉' | '☾';
  longitude: number;
}

export interface AuraTalismanChartEcho extends AuraTalismanPoint {
  id: string;
  sign: AuraSign;
  label: string;
  estimated: boolean;
}

export interface AuraTalismanOptions {
  includeChart?: boolean;
  selectedSign?: AuraSign | null;
  holdings?: readonly AuraCabinetHolding[];
}

export interface AuraTalismanModel extends AuraTalismanGeometry {
  skyMarks: readonly [AuraTalismanSkyMark, AuraTalismanSkyMark];
  chartEchoNodes: readonly AuraTalismanChartEcho[];
  selectedSign: AuraSign | null;
  editionDate: string;
}

type HoldingWithGoldCount = AuraCabinetHolding & { readonly goldCount?: string };

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

/** Zero degrees (the beginning of Aries) sits at twelve o'clock. */
function pointForLongitude(longitude: number, radius: number): AuraTalismanPoint {
  const normalized = ((longitude % 360) + 360) % 360;
  const radians = (normalized - 90) * (Math.PI / 180);
  return {
    x: roundCoordinate(CENTER + Math.cos(radians) * radius),
    y: roundCoordinate(CENTER + Math.sin(radians) * radius),
  };
}

function canonicalHeldSigns(heldSigns: readonly AuraSign[]): AuraSign[] {
  const held = new Set<AuraSign>(heldSigns);
  return AURA_SIGN_ORDER.filter((sign) => held.has(sign));
}

function normalizedGoldCount(holding: AuraCabinetHolding | undefined): bigint {
  if (!holding || holding.finish !== 'gold') return 0n;
  const raw = (holding as HoldingWithGoldCount).goldCount;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return 1n;
  try {
    return BigInt(raw);
  } catch {
    return 1n;
  }
}

/**
 * Exact for one through ninety-nine Gold editions, capped thereafter. The
 * tenth sculpture is Crown Gold, so the tally has to read past it.
 */
export function talismanGoldCountLabel(value: string | bigint | null): string | null {
  if (value === null) return null;
  let count: bigint;
  try {
    count = typeof value === 'bigint' ? value : BigInt(value);
  } catch {
    return null;
  }
  if (count < 1n) return null;
  return count > 99n ? '×99+' : `×${count.toString()}`;
}

function segment(
  from: AuraTalismanOuterNode,
  to: AuraTalismanOuterNode,
): AuraTalismanSegment {
  return {
    fromSign: from.sign,
    toSign: to.sign,
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
  };
}

/**
 * Builds the deterministic public-collection seal without chart or address
 * input. Duplicates are ignored and represented signs stay in zodiac order.
 */
export function talismanGeometry(
  heldSigns: readonly AuraSign[],
  holdings: readonly AuraCabinetHolding[] = [],
): AuraTalismanGeometry {
  const canonical = canonicalHeldSigns(heldSigns);
  const represented = new Set(canonical);
  const holdingBySign = new Map(holdings.map((holding) => [holding.sign, holding]));
  const outerNodes: AuraTalismanOuterNode[] = SIGNS.map((sign, index) => {
    const slug = sign.slug as AuraSign;
    const isRepresented = represented.has(slug);
    const holding = holdingBySign.get(slug);
    const finish = isRepresented ? (holding?.finish ?? 'pastel') : null;
    const goldCount = finish === 'gold' ? normalizedGoldCount(holding) : 0n;
    return {
      ...pointForLongitude(index * 30, OUTER_RADIUS),
      sign: slug,
      index,
      name: sign.name,
      glyph: sign.glyph,
      hue: sign.hue,
      represented: isRepresented,
      finish,
      goldCount: goldCount > 0n ? goldCount.toString() : null,
      goldCountLabel: talismanGoldCountLabel(goldCount > 0n ? goldCount : null),
      goldTallyArcs: goldCount >= 3n ? 2 : goldCount >= 2n ? 1 : 0,
    };
  });
  const collectionPoints = outerNodes.filter((node) => node.represented);
  const collectionMode: AuraTalismanCollectionMode = collectionPoints.length === 0
    ? 'empty'
    : collectionPoints.length === 1
      ? 'point'
      : collectionPoints.length === 2
        ? 'chord'
        : 'polygon';
  const collectionSegments: AuraTalismanSegment[] = [];

  if (collectionPoints.length === 2) {
    collectionSegments.push(segment(collectionPoints[0], collectionPoints[1]));
  } else if (collectionPoints.length >= 3) {
    collectionPoints.forEach((point, index) => {
      collectionSegments.push(
        segment(point, collectionPoints[(index + 1) % collectionPoints.length]),
      );
    });
  }

  return {
    outerNodes,
    collectionPoints,
    collectionSegments,
    collectionMode,
    closed: collectionMode === 'polygon',
    fullTwelve: collectionPoints.length === AURA_SIGN_ORDER.length,
  };
}

function chartLongitude(evidence: AuraNatalEvidence): { longitude: number; estimated: boolean } {
  if ('longitude' in evidence && Number.isFinite(evidence.longitude)) {
    return { longitude: evidence.longitude as number, estimated: false };
  }
  const signIndex = AURA_SIGN_ORDER.indexOf(evidence.sign);
  return { longitude: signIndex * 30 + 15, estimated: true };
}

function chartEcho(evidence: AuraNatalEvidence): AuraTalismanChartEcho {
  const position = chartLongitude(evidence);
  return {
    id: evidence.id,
    sign: evidence.sign,
    label: evidence.label,
    estimated: position.estimated,
    ...pointForLongitude(position.longitude, CHART_RADIUS),
  };
}

function skyMark(
  body: 'Sun' | 'Moon',
  sign: AuraSign,
  longitude: number,
): AuraTalismanSkyMark {
  return {
    body,
    sign,
    glyph: body === 'Sun' ? '☉' : '☾',
    longitude,
    ...pointForLongitude(longitude, SKY_RADIUS),
  };
}

/**
 * Adds the dated sky and optional local chart layer to public seal geometry.
 * The optional chart never changes collection points or segments.
 */
export function buildAuraTalisman(
  composition: AuraComposition,
  options: AuraTalismanOptions = {},
): AuraTalismanModel {
  const geometry = talismanGeometry(composition.heldSigns, options.holdings);
  const selectedSign = options.selectedSign ?? null;
  return {
    ...geometry,
    skyMarks: [
      skyMark(
        'Sun',
        composition.currentSky.sun.sign,
        composition.currentSky.sun.longitude,
      ),
      skyMark(
        'Moon',
        composition.currentSky.moon.sign,
        composition.currentSky.moon.longitude,
      ),
    ],
    chartEchoNodes: options.includeChart
      ? composition.chartEvidence.map(chartEcho)
      : [],
    selectedSign,
    editionDate: composition.currentSky.observedAt,
  };
}

/** The edition a represented node displays, Gold multiplicity included. */
export function talismanEdition(
  node: Pick<AuraTalismanOuterNode, 'finish' | 'goldCount'>,
): AuraCabinetEdition {
  if (node.finish !== 'gold') return node.finish ?? 'pastel';
  return isCrownGoldCount(node.goldCount) ? 'crown' : 'gold';
}

/** A concise factual label for accessible and exported surfaces. */
export function auraTalismanSummary(model: AuraTalismanModel): string {
  const names = model.collectionPoints.map((point) => point.name);
  const represented = names.length === 0
    ? 'No Registry-listed Zodiacs are represented.'
    : `${names.length} of the Twelve represented: ${names.join(', ')}.`;
  const materials = model.collectionPoints.length === 0
    ? ''
    : ` Editions: ${model.collectionPoints.map((point) => (
      `${point.name} ${EDITION_LABEL[talismanEdition(point)]}${point.goldCountLabel ? ` ${point.goldCountLabel}` : ''}`
    )).join('; ')}.`;
  const sun = signBySlug(model.skyMarks[0].sign).name;
  const moon = signBySlug(model.skyMarks[1].sign).name;
  const chart = model.chartEchoNodes.length > 0
    ? ` ${model.chartEchoNodes.length} private chart echoes are shown.`
    : '';
  return `${represented}${materials} Dated sky: Sun in ${sun}; Moon in ${moon}.${chart}`;
}
