/**
 * Source-data shapes the sky data API reads. These mirror the committed
 * files under src/data exactly; nothing here is computed.
 */

export interface DailyBody {
  body: string;
  lon: number;
  sign: string;
  degree: number;
  retrograde: boolean;
}

export interface DailyEvent {
  kind: string;
  at: string;
  [key: string]: unknown;
}

export interface DailyFacts {
  schema: string;
  date: string;
  snapshotAt: string;
  bodies: DailyBody[];
  moon: { phase: string; illumination: number };
  eventsCoverage: string;
  eventsSource?: string;
  events: DailyEvent[];
}

export interface RetrogradeWindowSource {
  planet: string;
  from: string;
  to: string;
  preShadowStart: string | null;
  postShadowEnd: string | null;
}

export interface LunationInstant {
  type: 'full' | 'new';
  at: string;
}

export interface SkyData {
  generatedAt: string;
  from: string;
  to: string;
  stationBoundaryScanTo: string;
  shadowBoundaryScanDays: number;
  retrogrades: RetrogradeWindowSource[];
  moons: LunationInstant[];
}

export interface IngressSource {
  planet: string;
  at: string;
  sign: string;
  retrograde: boolean;
}

export interface MonthLunation {
  type: 'full' | 'new';
  at: string;
  sign: string;
  degree: number;
}

export interface StationSource {
  planet: string;
  at: string;
  type: 'direct' | 'retrograde';
  sign: string;
  degree: number;
}

export interface AspectSource {
  a: string;
  b: string;
  type: string;
  orb: number;
  at: string;
  aSign: string;
  aDegree: number;
  bSign: string;
  bDegree: number;
}

export interface TransitMonth {
  month: string;
  ingresses: IngressSource[];
  lunations: MonthLunation[];
  stations: StationSource[];
  aspects: AspectSource[];
}

export interface EclipseSource {
  type: 'solar' | 'lunar';
  kind: string;
  peak: string;
  sign: string;
  lon: number;
  degree: number;
  obscuration: number;
  totalMinutes?: number;
}

export interface EclipseData {
  generatedAt: string;
  from: string;
  to: string;
  eclipses: EclipseSource[];
}

export interface SkyApiSources {
  daily: DailyFacts;
  sky: SkyData;
  eclipses: EclipseData;
  months: TransitMonth[];
}
