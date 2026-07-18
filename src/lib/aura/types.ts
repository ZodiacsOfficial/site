import type { SavedChart } from '../profile/schema';

export const AURA_SIGN_ORDER = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export type AuraSign = (typeof AURA_SIGN_ORDER)[number];
export type AuraChain = 'solana' | 'base';
export type AuraPersistenceMode = 'session' | 'local';
export type AuraCabinetFinish = 'pastel' | 'bronze' | 'silver' | 'gold';
export type AuraCabinetRevealMode = 'animate' | 'settled';

interface AuraCabinetHoldingBase {
  sign: AuraSign;
}

export type AuraCabinetHolding =
  | (AuraCabinetHoldingBase & {
    finish: Exclude<AuraCabinetFinish, 'gold'>;
    goldCount?: never;
  })
  | (AuraCabinetHoldingBase & {
    finish: 'gold';
    /** Canonical positive decimal count of complete one-million-token Gold editions. */
    goldCount: string;
  });

export type AuraNatalBody = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars';
export type AuraNatalAngle = 'Ascendant' | 'Midheaven';
export type AuraEventKind = 'ingress' | 'lunation' | 'station' | 'eclipse';
export type AuraActivationKind = AuraEventKind | 'moon-ingress';

interface AuraEvidenceBase {
  id: string;
  sign: AuraSign;
  label: string;
}

interface AuraNatalBodyEvidenceBase extends AuraEvidenceBase {
  source: 'chart';
  kind: 'natal-body';
  body: AuraNatalBody;
}

export interface AuraExactNatalBodyEvidence extends AuraNatalBodyEvidenceBase {
  longitude: number;
  precision: 'exact-time';
}

export interface AuraNoonEstimateNatalBodyEvidence extends AuraNatalBodyEvidenceBase {
  precision: 'noon-estimate';
  longitude?: never;
}

export type AuraNatalBodyEvidence = AuraExactNatalBodyEvidence | AuraNoonEstimateNatalBodyEvidence;

export interface AuraNatalAngleEvidence extends AuraEvidenceBase {
  source: 'chart';
  kind: 'natal-angle';
  angle: AuraNatalAngle;
  longitude: number;
  precision: 'exact-time';
}

export interface AuraCurrentSkyEvidence extends AuraEvidenceBase {
  source: 'sky';
  kind: 'current-sun' | 'current-moon';
  body: 'Sun' | 'Moon';
  longitude: number;
  observedAt: string;
  calculation: 'lite-sun' | 'lite-moon';
  estimatedErrorDegrees: number;
}

export interface AuraEventEvidence extends AuraEvidenceBase {
  source: 'event';
  kind: AuraEventKind;
  eventId: string;
  exactAt: string;
  activeFrom: string;
  activeUntil: string;
  body?: string;
  eventType?: string;
}

export type AuraNatalEvidence = AuraNatalBodyEvidence | AuraNatalAngleEvidence;
export type AuraActiveEvidence = AuraCurrentSkyEvidence | AuraEventEvidence;
export type AuraEvidence = AuraNatalEvidence | AuraActiveEvidence;

export interface AuraTimedEvent {
  id: string;
  kind: AuraEventKind;
  sign: AuraSign;
  exactAt: string;
  label: string;
  body?: string;
  eventType?: string;
}

export interface AuraMoonIngress {
  sign: AuraSign;
  exactAt: string;
}

export interface AuraEventCatalogIssue {
  code: 'invalid-source-timestamp' | 'invalid-event' | 'missing-station-sign';
  message: string;
}

export interface AuraEventCatalog {
  generatedAt: string;
  sourceGeneratedAt: {
    ingresses: string;
    sky: string;
    eclipses: string;
    moonIngresses: string;
  };
  coverage: { from: string; to: string };
  events: AuraTimedEvent[];
  moonIngresses: AuraMoonIngress[];
  issues: AuraEventCatalogIssue[];
}

export type AuraUncertaintyCode =
  | 'unknown-time-noon-estimate'
  | 'unknown-time-moon-excluded'
  | 'unknown-time-angles-excluded'
  | 'invalid-held-sign'
  | 'invalid-chart-position'
  | 'event-data-invalid'
  | 'event-data-stale'
  | 'event-data-from-future'
  | 'event-data-out-of-range';

export interface AuraUncertainty {
  code: AuraUncertaintyCode;
  scope: 'chart' | 'holdings' | 'events';
  message: string;
  sign?: AuraSign;
  value?: string;
}

export interface AuraNextActivation {
  sign: AuraSign;
  kind: AuraActivationKind;
  at: string;
  source: 'event-catalog' | 'moon-ingress-catalog';
  beginsAt: string;
  exactAt: string;
  label: string;
  eventId: string;
  /** Catalog body ("Mercury", "Moon"); null when the source record omits it. */
  body: string | null;
  /** Catalog detail ("direct", "full", "total solar"); null when absent. */
  eventType: string | null;
}

export interface AuraReading {
  /** The sign's base line — display lead, and the card's only reflection. */
  lead: string;
  /** The braided evidence strands (sky, then chart; absence stated honestly). */
  detail: string;
  /** lead + detail, for surfaces that render the reading as one block. */
  text: string;
}

export interface AuraSignContext {
  sign: AuraSign;
  natalEcho: AuraNatalEvidence[];
  activeNow: AuraActiveEvidence[];
  nextActivation: AuraNextActivation | null;
  uncertainties: AuraUncertainty[];
  reading: AuraReading;
}

export interface AuraFocalSelection {
  sign: AuraSign;
  evidenceIds: string[];
  explanation: string;
}

export interface AuraEventDataStatus {
  usable: boolean;
  generatedAt: string;
  coverage: { from: string; to: string };
  activeWindowHours: 24;
}

export interface AuraCurrentSky {
  observedAt: string;
  sun: { sign: AuraSign; longitude: number };
  moon: { sign: AuraSign; longitude: number };
}

export interface AuraComposition {
  asOf: string;
  chart: (Pick<SavedChart, 'id' | 'name'> & { timeKnown: boolean }) | null;
  heldSigns: AuraSign[];
  /** Complete optional chart evidence, including signs not held in the collection. */
  chartEvidence: AuraNatalEvidence[];
  /** Complete dated sky evidence, including signs not held in the collection. */
  skyEvidence: AuraActiveEvidence[];
  signs: AuraSignContext[];
  currentSky: AuraCurrentSky;
  focal: AuraFocalSelection | null;
  auraSentence: string;
  methodNote: string;
  uncertainties: AuraUncertainty[];
  eventData: AuraEventDataStatus;
}

export interface AuraEventFreshnessOptions {
  maxAgeMs?: number;
  allowedFutureSkewMs?: number;
}

export interface AuraEventValidation {
  usable: boolean;
  uncertainties: AuraUncertainty[];
  generatedAt: string;
  coverage: { from: string; to: string };
}

export interface ComposeAuraInput {
  heldSigns: readonly string[];
  /** Optional personalization layer. Collection + dated sky remain complete without it. */
  chart?: SavedChart | null;
  visitedAt: Date | string;
  eventCatalog?: AuraEventCatalog;
  freshness?: AuraEventFreshnessOptions;
  /** True only for the built-in example; adjusts the factual sentence's subjects. */
  illustrative?: boolean;
}

export interface AuraPersistedLookup {
  address: string;
  chain: AuraChain;
  holdings: readonly AuraCabinetHolding[];
  checkedAt: string;
  chartId?: string;
}

export interface AuraPersistenceRecord extends AuraPersistedLookup {
  version: 3;
  savedAt: string;
  expiresAt: string;
}

export interface AuraPersistenceOptions {
  now?: Date;
  ttlMs?: number;
}

export interface AuraStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
