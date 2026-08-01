/**
 * Small, closed client contract for chart-grounded Ask handoffs. The server
 * keeps an independent copy because the Vercel endpoint must stay isolated
 * from `src`; both sides fail closed on anything outside this vocabulary.
 */
export const ASSISTANT_EVIDENCE_BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'North Node',
  'South Node',
] as const;

export const ASSISTANT_EVIDENCE_ASPECTS = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
] as const;

export type AssistantEvidenceBody = typeof ASSISTANT_EVIDENCE_BODIES[number];
export type AssistantEvidenceAspect = typeof ASSISTANT_EVIDENCE_ASPECTS[number];
export type AssistantEvidenceNatalPoint = AssistantEvidenceBody | 'Ascendant' | 'Midheaven';

export interface AssistantEvidence {
  kind: 'transit';
  date: string;
  transitingBody: AssistantEvidenceBody;
  aspect: AssistantEvidenceAspect;
  natalPoint: AssistantEvidenceNatalPoint;
  orb: number;
}

const BODY_SET: ReadonlySet<string> = new Set(ASSISTANT_EVIDENCE_BODIES);
const NATAL_POINT_SET: ReadonlySet<string> = new Set([
  ...ASSISTANT_EVIDENCE_BODIES,
  'Ascendant',
  'Midheaven',
]);
const ASPECT_SET: ReadonlySet<string> = new Set(ASSISTANT_EVIDENCE_ASPECTS);

function validUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Copy and validate an evidence receipt before it is shown or transmitted. */
export function normalizeAssistantEvidence(value: unknown): AssistantEvidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (
    raw.kind !== 'transit'
    || typeof raw.date !== 'string'
    || !validUtcDate(raw.date)
    || typeof raw.transitingBody !== 'string'
    || !BODY_SET.has(raw.transitingBody)
    || typeof raw.aspect !== 'string'
    || !ASPECT_SET.has(raw.aspect)
    || typeof raw.natalPoint !== 'string'
    || !NATAL_POINT_SET.has(raw.natalPoint)
    || typeof raw.orb !== 'number'
    || !Number.isFinite(raw.orb)
    || raw.orb < 0
    || raw.orb > 3
  ) return null;

  return {
    kind: 'transit',
    date: raw.date,
    transitingBody: raw.transitingBody as AssistantEvidenceBody,
    aspect: raw.aspect as AssistantEvidenceAspect,
    natalPoint: raw.natalPoint as AssistantEvidenceNatalPoint,
    orb: raw.orb,
  };
}

/** Exact, human-readable receipt used in the visible assistant context chip. */
export function assistantEvidenceLabel(evidence: AssistantEvidence): string {
  return `${evidence.transitingBody} ${evidence.aspect} natal ${evidence.natalPoint}`
    + ` · ${evidence.orb.toFixed(1)}° orb · ${evidence.date}`;
}

/** Chart Explorer selection that best explains the natal half of a transit. */
export function assistantEvidenceSelection(evidence: AssistantEvidence): string {
  if (evidence.natalPoint === 'Ascendant') return 'angle:asc';
  if (evidence.natalPoint === 'Midheaven') return 'angle:mc';
  return `body:${evidence.natalPoint}`;
}
