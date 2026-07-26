import { z } from 'astro/zod';
import rawPeople from '../data/people.json';

const SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
const BODY_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

const signSlugSchema = z.enum(SIGN_SLUGS);
const bodySchema = z.enum(BODY_NAMES);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const isoInstantSchema = z.string().datetime({ offset: true });
const httpsUrlSchema = z.string().url().refine((value) => value.startsWith('https://'));

const sourceSchema = z.object({
  wikidata: z.object({
    entityUrl: httpsUrlSchema,
    propertiesUsed: z.array(z.string()).min(1),
    lastrevid: z.number().int().positive(),
  }).strict(),
  wikipedia: z.object({
    language: z.literal('en'),
    title: z.string().min(1),
    articleUrl: httpsUrlSchema,
    pageId: z.number().int().positive(),
    revisionId: z.number().int().positive(),
    revisionTimestamp: isoInstantSchema,
  }).strict(),
  retrievedAtUtc: isoInstantSchema,
}).strict();

const portraitSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    file: z.string().startsWith('File:'),
    filePage: httpsUrlSchema,
    creator: z.string().min(1),
    licence: z.string().min(1),
    licenceUrl: httpsUrlSchema.nullable(),
    attributionRequired: z.boolean(),
    renderedAttribution: z.string().min(1),
    renderedAttributionLinks: z.object({
      creator: httpsUrlSchema,
      licence: httpsUrlSchema.nullable(),
      source: httpsUrlSchema,
    }).strict(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    assetPath: z.string().regex(/^\/assets\/people\/[a-z0-9-]+\.webp$/u),
  }).strict(),
  z.object({
    available: z.literal(false),
    reason: z.string().min(1),
    file: z.string().startsWith('File:').optional(),
  }).strict(),
]);

const placementSchema = z.object({
  body: bodySchema,
  sign: signSlugSchema,
  signName: z.string().min(1),
  degree: z.number().min(0).lt(30),
  retrograde: z.boolean(),
  speedPerDay: z.number(),
  dignity: z.enum(['domicile', 'exaltation', 'detriment', 'fall']).nullable(),
  stableAcrossDay: z.boolean(),
  retrogradeStableAcrossDay: z.boolean(),
  longitude: z.number().min(0).lt(360),
}).strict();

const aspectSchema = z.object({
  a: bodySchema,
  b: bodySchema,
  type: z.enum(['conjunction', 'sextile', 'square', 'trine', 'opposition']),
  orb: z.number().min(0),
  applying: z.boolean(),
}).strict();

const positiveCount = z.number().int().positive();
const elementCountsSchema = z.object({
  fire: positiveCount.optional(),
  earth: positiveCount.optional(),
  air: positiveCount.optional(),
  water: positiveCount.optional(),
}).strict().refine((counts) => Object.keys(counts).length > 0, {
  message: 'At least one settled element count is required',
});
const modalityCountsSchema = z.object({
  cardinal: positiveCount.optional(),
  fixed: positiveCount.optional(),
  mutable: positiveCount.optional(),
}).strict().refine((counts) => Object.keys(counts).length > 0, {
  message: 'At least one settled modality count is required',
});

const readingBlockSchema = z.object({
  key: z.enum(['sun', 'geometry', 'dignity', 'shape', 'moon']),
  title: z.string().min(1),
  facts: z.array(z.string()).min(1),
  text: z.string().min(1),
  uncertain: z.boolean().optional(),
}).strict();

const personSchema = z.object({
  qid: z.string().regex(/^Q\d+$/u),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  displayName: z.string().min(1),
  shortDescription: z.string().min(1),
  disciplines: z.array(z.string().min(1)).min(1),
  birthDate: z.object({
    storedValue: isoDateSchema,
    precision: z.literal('day'),
    calendarModel: z.literal('proleptic-gregorian'),
    calendarConversion: z.string().min(1),
    displayedDate: isoDateSchema,
    computedGregorianDate: isoDateSchema,
    birthdayCrossLinkKey: isoDateSchema,
    birthdayRoute: z.string().regex(/^\/birthday\/[a-z]+-\d{1,2}\/$/u),
  }).strict(),
  birthTime: z.null(),
  timeQuality: z.literal('unknown'),
  birthTimeEvidence: z.string().min(1),
  birthPlace: z.object({
    entity: z.string().regex(/^Q\d+$/u),
    entityLabel: z.string().min(1),
    normalisedLabel: z.string().min(1),
    country: z.object({
      entity: z.string().regex(/^Q\d+$/u),
      label: z.string().min(1),
    }).strict().nullable(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      sourceEntity: z.string().regex(/^Q\d+$/u),
      sourceEntityLabel: z.string().min(1),
      wikidataPrecision: z.number().nullable(),
      escalationSteps: z.number().int().min(0).max(1),
      precisionDowngrade: z.string().nullable(),
    }).strict(),
    timeZone: z.string().min(1),
  }).strict(),
  computation: z.object({
    convention: z.string().min(1),
    timeZone: z.string().min(1),
    civilTime: z.literal('12:00'),
    utcInstant: isoInstantSchema,
    utcOffsetMinutesAtBirth: z.number(),
    civilDayStartUtc: isoInstantSchema,
    civilDayEndUtc: isoInstantSchema,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    coordinateEscalationSteps: z.number().int().min(0).max(1),
    coordinateSourceEntity: z.string().regex(/^Q\d+$/u),
    ephemeris: z.string().min(1),
    aspectTable: z.string().min(1),
    anglesComputed: z.literal(false),
    housesComputed: z.literal(false),
    sectComputed: z.literal(false),
    meridianResidualMinutes: z.number(),
    meridianResidualMoonDegrees: z.number().min(0),
  }).strict(),
  sunSign: z.object({
    slug: signSlugSchema,
    name: z.string().min(1),
    degree: z.number().min(0).lt(30),
    determinable: z.literal(true),
    cuspCheck: z.object({
      ambiguous: z.literal(false),
      boundaryUtc: z.null(),
      degreesInsideAtWindowStart: z.number().min(0),
      degreesToNextBoundaryAtWindowEnd: z.number().min(0),
    }).strict(),
  }).strict(),
  moon: z.object({
    sign: signSlugSchema,
    signName: z.string().min(1),
    degree: z.number().min(0).lt(30),
    uncertain: z.boolean(),
    signAtCivilDayStart: signSlugSchema,
    signAtCivilDayEnd: signSlugSchema,
  }).strict(),
  unknownTimeErrorBandDegrees: z.record(bodySchema, z.number().min(0)),
  dataQualityLabel: z.string().min(1),
  sources: sourceSchema,
  portrait: portraitSchema,
  living: z.boolean(),
  reviewedAtUtc: isoInstantSchema,
  computationInputVersion: z.object({
    ephemeris: z.string().min(1),
    aspectTable: z.string().min(1),
    pilotTools: z.string().min(1),
  }).strict(),
  contentDepth: z.object({
    originalWords: z.number().int().min(250),
    substantiveStatements: z.number().int().min(8),
    highestPairwiseSimilarity: z.number().min(0).max(0.32),
  }).strict(),
  indexEligibility: z.object({
    eligible: z.literal(false),
    blockedBy: z.array(z.string().min(1)).min(1),
    contentChecksPassed: z.literal(true),
    contentCheckFailures: z.array(z.string()).length(0),
  }).strict(),
  suppression: z.object({
    status: z.literal('active'),
    requestedBy: z.null(),
    decidedAtUtc: z.null(),
    note: z.null(),
  }).strict(),
  placements: z.array(placementSchema).length(10),
  aspectsStableAcrossCivilDay: z.array(aspectSchema),
  patterns: z.object({
    settledBodyCount: z.number().int().min(1).max(10),
    stelliums: z.array(z.object({
      sign: signSlugSchema,
      count: z.number().int().min(3).max(10),
    }).strict()),
    elements: elementCountsSchema,
    modalities: modalityCountsSchema,
    retrograde: z.array(bodySchema),
    directionUncertain: z.array(bodySchema),
  }).strict(),
  copy: z.object({
    title: z.string().min(1),
    metaDescription: z.string().min(1).max(180),
    lede: z.string().min(1),
    ledeFact: z.string().min(1),
    blocks: z.array(readingBlockSchema).min(4).max(5),
    birthdayLink: z.object({
      href: z.string().regex(/^\/birthday\/[a-z]+-\d{1,2}\/$/u),
      label: z.string().min(1),
    }).strict(),
    signLink: z.object({
      href: z.string().regex(/^\/[a-z]+\/$/u),
      label: z.string().min(1),
    }).strict(),
    measurements: z.object({
      originalWords: z.number().int().min(250),
      substantiveStatements: z.number().int().min(8),
      blocks: z.number().int().min(4).max(5),
    }).strict(),
  }).strict(),
}).strict();

const peoplePilotSchema = z.object({
  schema: z.literal('zodiacs.phase5.people.v1'),
  status: z.literal('Phase 5B noindex pilot — 20 reviewed records'),
  reviewedAtUtc: isoInstantSchema,
  sourceManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  people: z.array(personSchema).length(20),
}).strict();

export const PEOPLE_PILOT = peoplePilotSchema.parse(rawPeople);
export type PersonRecord = z.infer<typeof personSchema>;
export const PEOPLE = PEOPLE_PILOT.people;
export const PEOPLE_BY_SLUG = new Map(PEOPLE.map((person) => [person.slug, person] as const));

export const PEOPLE_DISCIPLINE_FILTERS = [
  { slug: 'science', name: 'Science' },
  { slug: 'writing', name: 'Writing' },
  { slug: 'music', name: 'Music' },
  { slug: 'art', name: 'Art' },
  { slug: 'architecture', name: 'Architecture' },
  { slug: 'sport', name: 'Sport' },
  { slug: 'public-life', name: 'Public life' },
] as const;
export type PeopleDisciplineGroup = typeof PEOPLE_DISCIPLINE_FILTERS[number]['slug'];

const DISCIPLINE_GROUP_BY_SOURCE: Readonly<Record<string, PeopleDisciplineGroup>> = {
  architect: 'architecture',
  barrister: 'public-life',
  biologist: 'science',
  chemist: 'science',
  composer: 'music',
  crystallographer: 'science',
  draftsperson: 'art',
  environmentalist: 'public-life',
  essayist: 'writing',
  'human rights defender': 'public-life',
  'jazz musician': 'music',
  journalist: 'writing',
  mathematician: 'science',
  novelist: 'writing',
  'nuclear physicist': 'science',
  painter: 'art',
  pianist: 'music',
  poet: 'writing',
  'political philosopher': 'writing',
  'political writer': 'writing',
  'singer-songwriter': 'music',
  sociologist: 'science',
  'tennis player': 'sport',
  'theoretical physicist': 'science',
};

export function peopleDisciplineGroups(person: PersonRecord): PeopleDisciplineGroup[] {
  return [...new Set(person.disciplines.map((discipline) => {
    const group = DISCIPLINE_GROUP_BY_SOURCE[discipline];
    if (!group) throw new Error(`Unmapped People discipline: ${discipline}`);
    return group;
  }))];
}

export function peopleForBirthday(route: string) {
  return PEOPLE.filter((person) => (
    person.suppression.status === 'active' && person.birthDate.birthdayRoute === route
  )).slice(0, 3);
}
