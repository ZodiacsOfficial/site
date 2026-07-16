import { moonLongitude, sunLongitude } from '../engine/lite';
import { signBySlug, signForLongitude } from '../signs';
import {
  AURA_EVENT_WINDOW_MS,
  COMMITTED_AURA_EVENTS,
  compareAuraEvents,
  validateAuraEventCatalog,
} from './events';
import {
  AURA_SIGN_ORDER,
  type AuraActiveEvidence,
  type AuraComposition,
  type AuraCurrentSkyEvidence,
  type AuraEventCatalog,
  type AuraEventEvidence,
  type AuraFocalSelection,
  type AuraNatalBody,
  type AuraNatalEvidence,
  type AuraNextActivation,
  type AuraReading,
  type AuraSign,
  type AuraSignContext,
  type AuraTimedEvent,
  type AuraUncertainty,
  type ComposeAuraInput,
} from './types';
import {
  composeAuraReadingText,
  type AuraReadingNatalFact,
  type AuraReadingSkyFact,
} from './readings';
import { auraDateStamp } from './copy';
import { normalizeHeldSigns } from './normalize';

export { normalizeHeldSigns } from './normalize';

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);
const NATAL_BODY_ORDER: readonly AuraNatalBody[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
const NATAL_BODY_SET = new Set<string>(NATAL_BODY_ORDER);

export const AURA_METHOD_NOTE = 'The same selected chart, public wallet record, and dated sky produce the same words. This is a symbolic Zodiacs.org display convention — not a traditional astrological technique or proof that a person controls an address.';
const AURA_METHOD_NOTE_EXAMPLE = 'This illustrative chart and wallet record demonstrate how the dated sources are read side by side. No public address was checked.';

function isAuraSign(value: string): value is AuraSign {
  return SIGN_SET.has(value);
}

function displaySign(sign: AuraSign): string {
  return signBySlug(sign).name;
}

function normalizedLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function invalidHoldingUncertainties(signs: readonly string[]): AuraUncertainty[] {
  const invalid = new Set<string>();
  for (const value of signs) {
    const normalized = value.trim().toLowerCase();
    if (!isAuraSign(normalized)) invalid.add(value);
  }
  return [...invalid].sort().map((value) => ({
    code: 'invalid-held-sign',
    scope: 'holdings',
    value,
    message: `The holding value “${value}” is not a recognized zodiac sign and was omitted.`,
  }));
}

function natalEvidenceForChart(
  input: ComposeAuraInput['chart'],
): { evidence: AuraNatalEvidence[]; uncertainties: AuraUncertainty[] } {
  const evidence: AuraNatalEvidence[] = [];
  const uncertainties: AuraUncertainty[] = [];
  const seenBodies = new Set<AuraNatalBody>();

  for (const point of input.summary.bodies) {
    if (!NATAL_BODY_SET.has(point.body)) continue;
    const body = point.body as AuraNatalBody;
    if (seenBodies.has(body)) continue;
    seenBodies.add(body);

    if (!Number.isFinite(point.lon)) {
      uncertainties.push({
        code: 'invalid-chart-position',
        scope: 'chart',
        value: body,
        message: `${body}'s saved longitude is invalid and was omitted from the aura reading.`,
      });
      continue;
    }
    if (!input.birth.timeKnown && body === 'Moon') continue;

    const longitude = normalizedLongitude(point.lon);
    const sign = signForLongitude(longitude).slug;
    if (!isAuraSign(sign)) continue;
    if (input.birth.timeKnown) {
      evidence.push({
        id: `natal:${body.toLowerCase()}`,
        source: 'chart',
        kind: 'natal-body',
        sign,
        body,
        longitude,
        precision: 'exact-time',
        label: `${body} in ${displaySign(sign)}`,
      });
    } else {
      evidence.push({
        id: `natal:${body.toLowerCase()}`,
        source: 'chart',
        kind: 'natal-body',
        sign,
        body,
        precision: 'noon-estimate',
        label: `${body} in ${displaySign(sign)}`,
      });
    }
  }

  if (input.birth.timeKnown && input.summary.angles) {
    const angles = [
      ['Ascendant', input.summary.angles.asc],
      ['Midheaven', input.summary.angles.mc],
    ] as const;
    for (const [angle, rawLongitude] of angles) {
      if (!Number.isFinite(rawLongitude)) {
        uncertainties.push({
          code: 'invalid-chart-position',
          scope: 'chart',
          value: angle,
          message: `${angle}'s saved longitude is invalid and was omitted from the aura reading.`,
        });
        continue;
      }
      const longitude = normalizedLongitude(rawLongitude);
      const sign = signForLongitude(longitude).slug;
      if (!isAuraSign(sign)) continue;
      evidence.push({
        id: `natal:${angle.toLowerCase()}`,
        source: 'chart',
        kind: 'natal-angle',
        sign,
        angle,
        longitude,
        precision: 'exact-time',
        label: `${angle} in ${displaySign(sign)}`,
      });
    }
  }

  if (!input.birth.timeKnown) {
    uncertainties.push(
      {
        code: 'unknown-time-noon-estimate',
        scope: 'chart',
        message: 'Birth time is unknown. Sun, Mercury, Venus, and Mars echoes use the saved noon estimate.',
      },
      {
        code: 'unknown-time-moon-excluded',
        scope: 'chart',
        message: 'The natal Moon is excluded because its zodiac sign can change during an unknown-time birth date.',
      },
      {
        code: 'unknown-time-angles-excluded',
        scope: 'chart',
        message: 'Ascendant and Midheaven echoes are excluded because they require a known birth time.',
      },
    );
  }

  evidence.sort((a, b) => {
    const aOrder = a.kind === 'natal-body' ? NATAL_BODY_ORDER.indexOf(a.body) : 5 + (a.angle === 'Ascendant' ? 0 : 1);
    const bOrder = b.kind === 'natal-body' ? NATAL_BODY_ORDER.indexOf(b.body) : 5 + (b.angle === 'Ascendant' ? 0 : 1);
    return aOrder - bOrder || a.id.localeCompare(b.id);
  });
  return { evidence, uncertainties };
}

function currentSkyEvidence(
  body: 'Sun' | 'Moon',
  longitude: number,
  observedAt: string,
): AuraCurrentSkyEvidence {
  const sign = signForLongitude(longitude).slug;
  if (!isAuraSign(sign)) throw new Error(`Lightweight ${body} calculation returned an unknown sign.`);
  return {
    id: `sky:${body.toLowerCase()}:${observedAt}`,
    source: 'sky',
    kind: body === 'Sun' ? 'current-sun' : 'current-moon',
    sign,
    body,
    longitude,
    observedAt,
    calculation: body === 'Sun' ? 'lite-sun' : 'lite-moon',
    estimatedErrorDegrees: body === 'Sun' ? 0.01 : 0.3,
    label: `Current ${body} in ${displaySign(sign)}`,
  };
}

function timedEventEvidence(event: AuraTimedEvent): AuraEventEvidence {
  const exact = Date.parse(event.exactAt);
  return {
    id: `event:${event.id}`,
    source: 'event',
    kind: event.kind,
    sign: event.sign,
    eventId: event.id,
    exactAt: event.exactAt,
    activeFrom: new Date(exact - AURA_EVENT_WINDOW_MS).toISOString(),
    activeUntil: new Date(exact + AURA_EVENT_WINDOW_MS).toISOString(),
    body: event.body,
    eventType: event.eventType,
    label: event.label,
  };
}

function activeEvidenceCategory(evidence: AuraActiveEvidence): 1 | 2 | 3 {
  if (evidence.source === 'event') return 3;
  return evidence.kind === 'current-moon' ? 2 : 1;
}

function compareActiveEvidence(
  a: AuraActiveEvidence,
  b: AuraActiveEvidence,
  visitedAt: number,
): number {
  const categoryDifference = activeEvidenceCategory(b) - activeEvidenceCategory(a);
  if (categoryDifference !== 0) return categoryDifference;
  if (a.source === 'event' && b.source === 'event') {
    const distanceDifference = Math.abs(Date.parse(a.exactAt) - visitedAt)
      - Math.abs(Date.parse(b.exactAt) - visitedAt);
    if (distanceDifference !== 0) return distanceDifference;
  }
  return a.id.localeCompare(b.id);
}

function nextActivation(
  sign: AuraSign,
  catalog: AuraEventCatalog,
  visitedAt: number,
): AuraNextActivation | null {
  const event = catalog.events
    .filter((candidate) => (
      candidate.sign === sign
      && Date.parse(candidate.exactAt) - AURA_EVENT_WINDOW_MS > visitedAt
    ))
    .sort(compareAuraEvents)[0];
  const eventActivation: AuraNextActivation | null = event ? {
    sign,
    kind: event.kind,
    at: event.exactAt,
    source: 'event-catalog',
    beginsAt: new Date(Date.parse(event.exactAt) - AURA_EVENT_WINDOW_MS).toISOString(),
    exactAt: event.exactAt,
    label: event.label,
    eventId: event.id,
    body: event.body ?? null,
    eventType: event.eventType ?? null,
  } : null;
  const moonIngress = catalog.moonIngresses
    .find((candidate) => candidate.sign === sign && Date.parse(candidate.exactAt) > visitedAt);
  const moonActivation: AuraNextActivation | null = moonIngress ? {
    sign,
    kind: 'moon-ingress',
    at: moonIngress.exactAt,
    source: 'moon-ingress-catalog',
    beginsAt: moonIngress.exactAt,
    exactAt: moonIngress.exactAt,
    label: `Moon enters ${displaySign(sign)}`,
    eventId: `moon-ingress:${sign}:${moonIngress.exactAt}`,
    body: 'Moon',
    eventType: null,
  } : null;

  return [eventActivation, moonActivation]
    .filter((candidate): candidate is AuraNextActivation => candidate !== null)
    .sort((a, b) => a.beginsAt.localeCompare(b.beginsAt) || a.eventId.localeCompare(b.eventId))[0] ?? null;
}

type ReadingContext = Omit<AuraSignContext, 'reading'>;

function readingNatalFacts(context: ReadingContext): AuraReadingNatalFact[] {
  return context.natalEcho.map((evidence) =>
    evidence.kind === 'natal-body'
      ? { kind: 'body', body: evidence.body }
      : { kind: 'angle', angle: evidence.angle },
  );
}

function readingSkyFact(context: ReadingContext): AuraReadingSkyFact | null {
  const event = context.activeNow.find(
    (evidence) => evidence.source === 'event',
  );
  if (event && event.source === 'event') {
    return {
      kind: 'event',
      eventKind: event.kind,
      body: event.body ?? null,
      eventType: event.eventType ?? null,
    };
  }
  const hasMoon = context.activeNow.some((evidence) => evidence.kind === 'current-moon');
  const hasSun = context.activeNow.some((evidence) => evidence.kind === 'current-sun');
  if (hasMoon && hasSun) return { kind: 'sun-and-moon' };
  if (hasMoon) return { kind: 'moon' };
  if (hasSun) return { kind: 'sun' };
  return null;
}

/** Produces the evidence-braided, plain-language reading for one held sign. */
export function buildAuraReading(
  context: ReadingContext,
  illustrative = false,
): AuraReading {
  return composeAuraReadingText({
    sign: context.sign,
    natal: readingNatalFacts(context),
    sky: readingSkyFact(context),
    illustrative,
  });
}

/** The current Sun and Moon signs at an instant; lets restores name what changed. */
export function auraSkySigns(at: Date): { sun: AuraSign; moon: AuraSign } {
  const sun = signForLongitude(sunLongitude(at)).slug;
  const moon = signForLongitude(moonLongitude(at)).slug;
  if (!isAuraSign(sun) || !isAuraSign(moon)) {
    throw new Error('Lightweight sky calculation returned an unknown sign.');
  }
  return { sun, moon };
}

function focalCategory(context: AuraSignContext): 0 | 1 | 2 | 3 | 4 {
  if (context.activeNow.some((evidence) => evidence.source === 'event')) return 4;
  if (context.activeNow.some((evidence) => evidence.kind === 'current-moon')) return 3;
  if (context.activeNow.some((evidence) => evidence.kind === 'current-sun')) return 2;
  if (context.natalEcho.length > 0) return 1;
  return 0;
}

function nearestEventDistance(context: AuraSignContext, reference: number | null): number {
  const exactTimes = context.activeNow
    .filter((evidence): evidence is AuraEventEvidence => evidence.source === 'event')
    .map((evidence) => Date.parse(evidence.exactAt));
  if (exactTimes.length === 0) return Number.POSITIVE_INFINITY;
  if (reference === null) return Math.min(...exactTimes);
  return Math.min(...exactTimes.map((exact) => Math.abs(exact - reference)));
}

/**
 * Selects one presentation-only focal: exact event, Moon, Sun/season,
 * natal echo, then zodiac order. Counts never amplify a lower category.
 */
export function selectAuraFocal(
  contexts: readonly AuraSignContext[],
  visitedAt?: Date | string,
): AuraFocalSelection | null {
  if (contexts.length === 0) return null;
  const parsedReference = visitedAt instanceof Date
    ? visitedAt.getTime()
    : visitedAt === undefined ? Number.NaN : Date.parse(visitedAt);
  const reference = Number.isFinite(parsedReference) ? parsedReference : null;
  const context = [...contexts].sort((a, b) => {
    const categoryA = focalCategory(a);
    const categoryB = focalCategory(b);
    return categoryB - categoryA
      || (categoryA === 4 ? nearestEventDistance(a, reference) - nearestEventDistance(b, reference) : 0)
      || AURA_SIGN_ORDER.indexOf(a.sign) - AURA_SIGN_ORDER.indexOf(b.sign);
  })[0];
  const category = focalCategory(context);
  const evidenceIds = category === 4
    ? context.activeNow.filter((item) => item.source === 'event').map((item) => item.id)
    : category === 3
      ? context.activeNow.filter((item) => item.kind === 'current-moon').map((item) => item.id)
      : category === 2
        ? context.activeNow.filter((item) => item.kind === 'current-sun').map((item) => item.id)
        : category === 1 ? context.natalEcho.map((item) => item.id) : [];
  const explanation = category === 4
    ? `${displaySign(context.sign)} has the nearest exact event inside the ±24-hour window; event ties resolve by proximity, then zodiac order.`
    : category === 3
      ? `${displaySign(context.sign)} carries the dated Moon signal; ties resolve in zodiac order.`
      : category === 2
        ? `${displaySign(context.sign)} carries the dated Sun and season signal; ties resolve in zodiac order.`
        : category === 1
          ? `${displaySign(context.sign)} has a selected-chart echo; ties resolve in zodiac order.`
          : 'No dated sky or chart signal favors any held sign, so zodiac order chooses.';
  return { sign: context.sign, evidenceIds, explanation };
}

function auraSentence(
  contexts: readonly AuraSignContext[],
  focal: AuraFocalSelection | null,
  skyAt: string,
  illustrative: boolean,
): string {
  if (!focal) return 'No official Zodiac was found at this public wallet address, so no Aura is composed.';
  const signName = displaySign(focal.sign);
  const subject = illustrative
    ? `${signName} is included in the illustrative wallet record`
    : `${signName} is found at this public wallet address`;
  const chartName = illustrative ? 'the example chart' : 'the selected birth chart';
  const context = contexts.find((item) => item.sign === focal.sign);
  const inChart = (context?.natalEcho.length ?? 0) > 0;
  const inSky = (context?.activeNow.length ?? 0) > 0;
  if (inChart && inSky) {
    return `${subject}. It is also in ${chartName} and in the sky of ${auraDateStamp(skyAt)}.`;
  }
  if (inChart) return `${subject} and is also in ${chartName}.`;
  if (inSky) return `${subject} and is also in the sky of ${auraDateStamp(skyAt)}.`;
  return `${subject}. No dated sky or chart signal favors any held sign, so zodiac order chooses.`;
}

export function composeAura(input: ComposeAuraInput): AuraComposition {
  const visitedAt = input.visitedAt instanceof Date ? new Date(input.visitedAt) : new Date(input.visitedAt);
  if (!Number.isFinite(visitedAt.getTime())) throw new RangeError('visitedAt must be a valid date.');
  const asOf = visitedAt.toISOString();
  const heldSigns = normalizeHeldSigns(input.heldSigns);
  const holdingsUncertainties = invalidHoldingUncertainties(input.heldSigns);
  const natal = natalEvidenceForChart(input.chart);

  const sun = currentSkyEvidence('Sun', sunLongitude(visitedAt), asOf);
  const moon = currentSkyEvidence('Moon', moonLongitude(visitedAt), asOf);
  const catalog = input.eventCatalog ?? COMMITTED_AURA_EVENTS;
  const eventValidation = validateAuraEventCatalog(catalog, visitedAt, input.freshness);
  const uncertainties = [
    ...holdingsUncertainties,
    ...natal.uncertainties,
    ...eventValidation.uncertainties,
  ];

  const activeTimedEvents = eventValidation.usable
    ? catalog.events.filter((event) => (
      Math.abs(Date.parse(event.exactAt) - visitedAt.getTime()) <= AURA_EVENT_WINDOW_MS
    ))
    : [];

  const contextsWithoutReadings: ReadingContext[] = heldSigns.map((sign) => {
    const activeNow: AuraActiveEvidence[] = [sun, moon]
      .filter((evidence) => evidence.sign === sign);
    activeNow.push(...activeTimedEvents
      .filter((event) => event.sign === sign)
      .map(timedEventEvidence));
    activeNow.sort((a, b) => compareActiveEvidence(a, b, visitedAt.getTime()));

    return {
      sign,
      natalEcho: natal.evidence.filter((evidence) => evidence.sign === sign),
      activeNow,
      nextActivation: eventValidation.usable
        ? nextActivation(sign, catalog, visitedAt.getTime())
        : null,
      uncertainties: uncertainties.filter((item) => (
        item.scope !== 'holdings' && (!item.sign || item.sign === sign)
      )),
    };
  });

  const illustrative = input.illustrative === true;
  const contexts: AuraSignContext[] = contextsWithoutReadings.map((context) => ({
    ...context,
    reading: buildAuraReading(context, illustrative),
  }));
  const focal = selectAuraFocal(contexts, visitedAt);

  return {
    asOf,
    chart: { id: input.chart.id, name: input.chart.name, timeKnown: input.chart.birth.timeKnown },
    heldSigns,
    signs: contexts,
    currentSky: {
      observedAt: asOf,
      sun: { sign: sun.sign, longitude: sun.longitude },
      moon: { sign: moon.sign, longitude: moon.longitude },
    },
    focal,
    auraSentence: auraSentence(contexts, focal, asOf, illustrative),
    methodNote: illustrative ? AURA_METHOD_NOTE_EXAMPLE : AURA_METHOD_NOTE,
    uncertainties,
    eventData: {
      usable: eventValidation.usable,
      generatedAt: eventValidation.generatedAt,
      coverage: eventValidation.coverage,
      activeWindowHours: 24,
    },
  };
}
