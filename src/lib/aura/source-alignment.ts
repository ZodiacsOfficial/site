import { signBySlug } from '../signs';
import { normalizeHeldSigns } from './normalize';
import { AURA_SIGN_ORDER, type AuraSign } from './types';

export type AuraSourceCount = 0 | 1 | 2 | 3;
export type AuraAlignmentTier = 'In focus' | 'Connected' | 'Present' | 'Quiet';
export type AuraSignKeywords = readonly [string, string, string];

/** Minimal shared shape accepted from natal and current-sky evidence. */
export interface AuraSignEvidenceInput {
  sign: string;
  label?: string;
}

export interface AuraSourceAlignmentInput {
  /** Registry-listed signs found in the checked public collection. */
  heldSigns: readonly string[];
  /** Sign-level facts from the selected saved chart; absent means no chart source. */
  chartEvidence?: readonly AuraSignEvidenceInput[] | null;
  /** Sign-level facts from the dated current sky. */
  skyEvidence: readonly AuraSignEvidenceInput[];
}

export interface AuraSourceState {
  present: boolean;
  /** Plain source facts; never empty when `present` is true. */
  evidence: readonly string[];
}

export interface AuraSignAlignment {
  sign: AuraSign;
  name: string;
  keywords: AuraSignKeywords;
  sources: {
    /** True only when this Registry sign is held in the checked collection. */
    registry: AuraSourceState;
    chart: AuraSourceState;
    sky: AuraSourceState;
  };
  sourceCount: AuraSourceCount;
  tier: AuraAlignmentTier;
  /** Count-based definition of the tier, suitable for visible or screen-reader text. */
  tierDescription: string;
  /** Complete non-visual explanation; does not depend on color or bar length. */
  explanation: string;
}

export const AURA_SIGN_KEYWORDS: Readonly<Record<AuraSign, AuraSignKeywords>> = {
  aries: ['Courage', 'Action', 'Heat'],
  taurus: ['Stability', 'Value', 'Beauty'],
  gemini: ['Curiosity', 'Language', 'Movement'],
  cancer: ['Care', 'Memory', 'Protection'],
  leo: ['Presence', 'Creativity', 'Radiance'],
  virgo: ['Craft', 'Order', 'Refinement'],
  libra: ['Harmony', 'Beauty', 'Attraction'],
  scorpio: ['Depth', 'Trust', 'Transformation'],
  sagittarius: ['Freedom', 'Truth', 'Exploration'],
  capricorn: ['Ambition', 'Structure', 'Mastery'],
  aquarius: ['Innovation', 'Community', 'Future'],
  pisces: ['Imagination', 'Empathy', 'Flow'],
};

const TIER_BY_COUNT: Readonly<Record<AuraSourceCount, AuraAlignmentTier>> = {
  0: 'Quiet',
  1: 'Present',
  2: 'Connected',
  3: 'In focus',
};

const TIER_DESCRIPTION_BY_COUNT: Readonly<Record<AuraSourceCount, string>> = {
  0: 'None of the three sources contains this sign.',
  1: 'One of the three sources contains this sign.',
  2: 'Two of the three sources contain this sign.',
  3: 'All three sources contain this sign.',
};

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);

function isAuraSign(value: string): value is AuraSign {
  return SIGN_SET.has(value);
}

function normalizeSign(value: string): AuraSign | null {
  const normalized = value.trim().toLowerCase();
  return isAuraSign(normalized) ? normalized : null;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function evidenceBySign(
  evidence: readonly AuraSignEvidenceInput[] | null | undefined,
  source: 'chart' | 'sky',
): ReadonlyMap<AuraSign, readonly string[]> {
  const grouped = new Map<AuraSign, Set<string>>();
  for (const item of evidence ?? []) {
    const sign = normalizeSign(item.sign);
    if (!sign) continue;
    const fallback = source === 'chart'
      ? `${signBySlug(sign).name} appears in the saved chart.`
      : `${signBySlug(sign).name} appears in the current sky.`;
    const label = item.label?.trim() || fallback;
    const labels = grouped.get(sign) ?? new Set<string>();
    labels.add(label.endsWith('.') ? label : `${label}.`);
    grouped.set(sign, labels);
  }

  return new Map(
    [...grouped].map(([sign, labels]) => [sign, [...labels].sort(compareText)] as const),
  );
}

function sourceState(evidence: readonly string[]): AuraSourceState {
  return { present: evidence.length > 0, evidence };
}

function sourceCount(sources: AuraSignAlignment['sources']): AuraSourceCount {
  return (
    Number(sources.registry.present)
    + Number(sources.chart.present)
    + Number(sources.sky.present)
  ) as AuraSourceCount;
}

function joinEvidence(evidence: readonly string[]): string {
  return evidence.join(' ');
}

function alignmentExplanation(
  name: string,
  sources: AuraSignAlignment['sources'],
  count: AuraSourceCount,
  tier: AuraAlignmentTier,
  chartAvailable: boolean,
): string {
  if (count === 0) {
    const chartFact = chartAvailable
      ? `${name} does not appear in the saved chart. `
      : 'No saved chart was added. ';
    return `${name} does not appear in the public collection or current sky. ${chartFact}The resulting tier is Quiet.`;
  }

  const facts = [
    sources.registry.present ? joinEvidence(sources.registry.evidence) : '',
    sources.chart.present ? `Saved chart: ${joinEvidence(sources.chart.evidence)}` : '',
    !chartAvailable ? 'Saved chart: Not added.' : '',
    sources.sky.present ? `Current sky: ${joinEvidence(sources.sky.evidence)}` : '',
  ].filter(Boolean).join(' ');
  return `${facts} ${TIER_DESCRIPTION_BY_COUNT[count]} The resulting tier is ${tier}.`;
}

/**
 * Builds the twelve deterministic rows behind Registry Aura's source bars.
 * Invalid sign values are ignored, duplicate evidence is collapsed, and the
 * result always follows canonical zodiac order.
 */
export function auraSourceAlignment(input: AuraSourceAlignmentInput): AuraSignAlignment[] {
  const held = new Set(normalizeHeldSigns(input.heldSigns));
  const chartAvailable = input.chartEvidence != null;
  const chart = evidenceBySign(input.chartEvidence, 'chart');
  const sky = evidenceBySign(input.skyEvidence, 'sky');

  return AURA_SIGN_ORDER.map((sign) => {
    const name = signBySlug(sign).name;
    const registryEvidence = held.has(sign)
      ? [`${name} is in the checked public collection.`]
      : [];
    const sources: AuraSignAlignment['sources'] = {
      registry: sourceState(registryEvidence),
      chart: sourceState(chart.get(sign) ?? []),
      sky: sourceState(sky.get(sign) ?? []),
    };
    const count = sourceCount(sources);
    const tier = TIER_BY_COUNT[count];
    return {
      sign,
      name,
      keywords: AURA_SIGN_KEYWORDS[sign],
      sources,
      sourceCount: count,
      tier,
      tierDescription: TIER_DESCRIPTION_BY_COUNT[count],
      explanation: alignmentExplanation(name, sources, count, tier, chartAvailable),
    };
  });
}
