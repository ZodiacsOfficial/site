/**
 * What differs between two calculation receipts, and how well each difference
 * is explained.
 *
 * Two rules shape everything here. Differences are facts read out of the two
 * files and are listed before any prose. Explanations are ranked by the
 * evidence that actually supports them, and the strongest rank — "reproduced" —
 * is only ever reached by recalculating locally with the same engine version
 * that produced the receipt. A newer engine recomputing an older receipt is a
 * different calculation, not the original one, and is never presented as one.
 */
import type { NatalEnvelope } from '@zodiacs/engine/receipt';
import {
  circularDelta, compareAngles, compareScalars, displayed, formatDelta, type NumericVerdict,
} from './angles';

/** How strongly a proposed cause is supported. */
export type Evidence = 'reproduced' | 'reported' | 'hypothesis' | 'unresolved';

export type DifferenceKind = 'metadata' | 'numeric' | 'display';

export interface Difference {
  readonly id: string;
  readonly area: string;
  readonly label: string;
  readonly left: string;
  readonly right: string;
  /** Signed degrees, for angular rows only. */
  readonly delta: number | null;
  readonly kind: DifferenceKind;
}

export interface Explanation {
  readonly id: string;
  readonly evidence: Evidence;
  readonly statement: string;
  /** Difference ids this claims to account for. */
  readonly covers: readonly string[];
  readonly detail: string | null;
}

export interface Comparison {
  readonly identical: boolean;
  readonly differences: readonly Difference[];
  readonly explanations: readonly Explanation[];
  /** What this comparison could not determine, stated rather than omitted. */
  readonly limits: readonly string[];
}

/** A local recalculation, injected so this module never imports an engine. */
export interface ReplayRequest {
  readonly utc: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly houseSystem: string;
  readonly timeKnown: boolean;
}
export interface ReplayResult {
  readonly angles: Record<string, number> | null;
  readonly bodies: readonly { readonly body: string; readonly lon: number }[];
  /** House cusps: for whole-sign versus Placidus these move while the angles do not. */
  readonly cusps: readonly number[] | null;
}
export type Replay = (request: ReplayRequest) => ReplayResult | null;

/** One body row as receipts carry it. Read defensively: this is imported data. */
interface BodyRow {
  readonly body: string;
  readonly lon?: unknown;
  readonly lat?: unknown;
  readonly speed?: unknown;
  readonly degree?: unknown;
  readonly sign?: unknown;
  readonly retrograde?: unknown;
}

/** One aspect as receipts carry it. */
interface AspectRow {
  readonly a?: unknown;
  readonly b?: unknown;
  readonly type?: unknown;
  readonly orb?: unknown;
  readonly applying?: unknown;
}

export interface CompareOptions {
  /** The engine version available to recalculate with, if any. */
  readonly engineVersion?: string | null;
  readonly replay?: Replay | null;
}

const ANGLE_LABELS: Record<string, string> = { asc: 'Ascendant', mc: 'Midheaven', dsc: 'Descendant', ic: 'Imum coeli' };

function verdictKind(verdict: NumericVerdict): DifferenceKind | null {
  if (verdict === 'identical') return null;
  return verdict === 'display-only' ? 'display' : 'numeric';
}

function num(value: number): string {
  return Number.isFinite(value) ? displayed(value) : '—';
}

function engineVersionOf(envelope: NatalEnvelope): string | null {
  const engine = (envelope.receipt as { engine?: { version?: unknown } }).engine;
  return typeof engine?.version === 'string' ? engine.version : null;
}

/**
 * The part of a version that decides precedence. SemVer §10 ignores build
 * metadata, so `0.1.1-rc.6+abc` and `0.1.1-rc.6` are the same engine and must
 * not be reported as different ones — or be refused a replay as if they were.
 */
function enginePrecedence(version: string | null): string | null {
  return version === null ? null : version.split('+')[0];
}

function replayInputOf(envelope: NatalEnvelope): ReplayRequest | null {
  const receipt = envelope.receipt as {
    instant?: unknown; timeKnown?: unknown;
    coordinates?: { latitude?: unknown; longitude?: unknown } | null;
    houses?: { requested?: unknown } | null;
  };
  const { latitude, longitude } = receipt.coordinates ?? {};
  if (typeof receipt.instant !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number'
    || typeof receipt.houses?.requested !== 'string') return null;
  return { utc: receipt.instant, latitude, longitude, houseSystem: receipt.houses.requested, timeKnown: receipt.timeKnown === true };
}

/** Rows: every fact that differs, read from the two files and nothing else. */
function collectDifferences(left: NatalEnvelope, right: NatalEnvelope): Difference[] {
  const rows: Difference[] = [];
  const add = (id: string, area: string, label: string, a: string, b: string, kind: DifferenceKind, delta: number | null = null) => {
    rows.push({ id, area, label, left: a, right: b, delta, kind });
  };
  const text = (id: string, area: string, label: string, a: unknown, b: unknown) => {
    const x = a === null || a === undefined ? '—' : String(a);
    const y = b === null || b === undefined ? '—' : String(b);
    if (x !== y) rows.push({ id, area, label, left: x, right: y, delta: null, kind: 'metadata' });
  };
  // Values arrive from imported files, so they are unknown until checked here:
  // anything that is not a pair of numbers falls back to a stated-value row.
  const scalar = (id: string, area: string, label: string, a: unknown, b: unknown) => {
    if (typeof a !== 'number' || typeof b !== 'number') return text(id, area, label, a, b);
    const kind = verdictKind(compareScalars(a, b));
    if (kind) add(id, area, label, num(a), num(b), kind, b - a);
  };
  const angle = (id: string, area: string, label: string, a: unknown, b: unknown) => {
    if (typeof a !== 'number' || typeof b !== 'number') return text(id, area, label, a, b);
    const kind = verdictKind(compareAngles(a, b));
    if (kind) add(id, area, label, num(a), num(b), kind, circularDelta(a, b));
  };

  const lr = left.receipt as Record<string, any>;
  const rr = right.receipt as Record<string, any>;

  text('instant', 'Inputs', 'Resolved instant (UTC)', lr.instant, rr.instant);
  text('source-instant', 'Inputs', 'Instant as supplied', lr.sourceInstant, rr.sourceInstant);
  text('reference', 'Inputs', 'How the instant was reached', lr.reference, rr.reference);
  text('time-known', 'Inputs', 'Birth time known', lr.timeKnown, rr.timeKnown);
  text('zone', 'Inputs', 'Supplied time zone', lr.localResolution?.timeZone ?? null, rr.localResolution?.timeZone ?? null);
  scalar('latitude', 'Inputs', 'Latitude', lr.coordinates?.latitude, rr.coordinates?.latitude);
  scalar('longitude', 'Inputs', 'Longitude', lr.coordinates?.longitude, rr.coordinates?.longitude);

  text('houses-requested', 'Houses', 'House system requested', lr.houses?.requested, rr.houses?.requested);
  text('houses-actual', 'Houses', 'House system actually used', lr.houses?.actual, rr.houses?.actual);
  text('houses-absence', 'Houses', 'Why houses are absent', lr.houses?.absenceReason, rr.houses?.absenceReason);

  const conventionKeys = [...new Set([...Object.keys(lr.conventions ?? {}), ...Object.keys(rr.conventions ?? {})])].sort();
  for (const key of conventionKeys) {
    const own = (source: Record<string, unknown> | undefined | null) =>
      (source && Object.hasOwn(source, key) ? source[key] : null);
    text(`convention-${key}`, 'Conventions', key, own(lr.conventions), own(rr.conventions));
  }

  text('engine-version', 'Provenance', 'Engine version', engineVersionOf(left), engineVersionOf(right));
  // Reported above whatever the difference is; `explain` decides separately
  // whether it is a difference in the engine or only in its build metadata.
  text('schema', 'Provenance', 'Receipt schema', left.schema, right.schema);
  text('result-flags', 'Provenance', 'Result flags', JSON.stringify(lr.resultFlags ?? []), JSON.stringify(rr.resultFlags ?? []));
  text('input-flags', 'Provenance', 'Input flags', JSON.stringify(lr.inputFlags ?? []), JSON.stringify(rr.inputFlags ?? []));

  const la = (left.result as any).angles as Record<string, number> | null;
  const ra = (right.result as any).angles as Record<string, number> | null;
  if (la && ra) {
    for (const key of [...new Set([...Object.keys(la), ...Object.keys(ra)])].sort()) {
      const label = Object.hasOwn(ANGLE_LABELS, key) ? ANGLE_LABELS[key] : key;
      angle(`angle-${key}`, 'Angles', label, la[key], ra[key]);
    }
  } else if (Boolean(la) !== Boolean(ra)) {
    text('angles-presence', 'Angles', 'Angles available', Boolean(la), Boolean(ra));
  }

  const byBody = (result: unknown): Map<string, BodyRow> =>
    new Map((((result as { bodies?: readonly BodyRow[] }).bodies ?? []) as readonly BodyRow[])
      .map((entry) => [entry.body, entry] as const));
  const lb = byBody(left.result);
  const rb = byBody(right.result);
  for (const body of [...new Set([...lb.keys(), ...rb.keys()])]) {
    const a = lb.get(body);
    const b = rb.get(body);
    if (!a || !b) { text(`body-${body}`, 'Positions', `${body} present`, Boolean(a), Boolean(b)); continue; }
    // Every field a body row carries, not only the longitude: two receipts that
    // agree on longitude can still disagree on ecliptic latitude or on speed,
    // and calling those two files the same calculation would be false.
    angle(`body-${body}-lon`, 'Positions', `${body} longitude`, a.lon, b.lon);
    scalar(`body-${body}-lat`, 'Positions', `${body} ecliptic latitude`, a.lat, b.lat);
    scalar(`body-${body}-speed`, 'Positions', `${body} speed`, a.speed, b.speed);
    scalar(`body-${body}-degree`, 'Positions', `${body} degree in sign`, a.degree, b.degree);
    text(`body-${body}-sign`, 'Positions', `${body} sign`, a.sign, b.sign);
    text(`body-${body}-retrograde`, 'Positions', `${body} retrograde`, a.retrograde, b.retrograde);
  }

  // Aspects are keyed by the pair and the type, so a list in a different order
  // is not a difference and a genuinely missing aspect is.
  const byAspect = (result: unknown): Map<string, AspectRow> => new Map(
    (((result as { aspects?: readonly AspectRow[] }).aspects ?? []) as readonly AspectRow[])
      .map((entry) => [`${String(entry.a)}|${String(entry.b)}|${String(entry.type)}`, entry] as const),
  );
  const lasp = byAspect(left.result);
  const rasp = byAspect(right.result);
  for (const key of [...new Set([...lasp.keys(), ...rasp.keys()])].sort()) {
    const a = lasp.get(key);
    const b = rasp.get(key);
    const label = key.split('|').join(' ');
    if (!a || !b) { text(`aspect-${key}`, 'Aspects', `${label} present`, Boolean(a), Boolean(b)); continue; }
    scalar(`aspect-${key}-orb`, 'Aspects', `${label} orb`, a.orb, b.orb);
    text(`aspect-${key}-applying`, 'Aspects', `${label} applying`, a.applying, b.applying);
  }

  text('houses-system', 'Houses', 'House system in the result',
    (left.result as any).houses?.system ?? null, (right.result as any).houses?.system ?? null);
  const lc = (left.result as any).houses?.cusps as number[] | undefined;
  const rc = (right.result as any).houses?.cusps as number[] | undefined;
  if (Array.isArray(lc) && Array.isArray(rc) && lc.length === rc.length) {
    for (let index = 0; index < lc.length; index += 1) {
      angle(`cusp-${index + 1}`, 'Houses', `House ${index + 1} cusp`, lc[index], rc[index]);
    }
  } else if (Array.isArray(lc) !== Array.isArray(rc) || (lc?.length ?? 0) !== (rc?.length ?? 0)) {
    text('cusps-shape', 'Houses', 'House cusps present', lc?.length ?? '—', rc?.length ?? '—');
  }

  return rows;
}

/**
 * Try to account for the differences, one varied setting at a time, and say how
 * strong the evidence is. Every claim here is either read from the files
 * ("reported"), demonstrated by a local recalculation on a matching engine
 * ("reproduced"), offered as a candidate ("hypothesis"), or refused
 * ("unresolved").
 */
function explain(left: NatalEnvelope, right: NatalEnvelope, differences: Difference[], options: CompareOptions): {
  explanations: Explanation[]; limits: string[];
} {
  const explanations: Explanation[] = [];
  const limits: string[] = [];
  const has = (id: string) => differences.some((row) => row.id === id && row.kind !== 'display');
  const idsIn = (area: string) => differences.filter((row) => row.area === area && row.kind === 'numeric').map((row) => row.id);
  const computed = [...idsIn('Positions'), ...idsIn('Angles'), ...idsIn('Houses'), ...idsIn('Aspects')];

  /**
   * Everything a cause upstream of the calculation can move, of any kind: a
   * different moment changes signs and which aspects exist, not only numbers.
   *
   * Two families are held back. Rows recording that a whole section is missing
   * follow from an absent birth time, and rows recording which house system was
   * asked for or used are a setting, not a result — a different moment or place
   * cannot change either, and letting one claim them is the same error as
   * letting a house system absorb a moved body, only pointing the other way.
   */
  const NOT_DOWNSTREAM = new Set([
    'angles-presence', 'houses-absence', 'cusps-shape',
    'houses-requested', 'houses-actual', 'houses-system',
  ]);
  const downstream = (areas: readonly string[]) => differences
    .filter((row) => areas.includes(row.area) && row.kind !== 'display' && !NOT_DOWNSTREAM.has(row.id))
    .map((row) => row.id);

  const leftEngine = engineVersionOf(left);
  const rightEngine = engineVersionOf(right);
  const available = options.engineVersion ?? null;
  const replay = options.replay ?? null;
  const leftPrecedence = enginePrecedence(leftEngine);
  const sameEngine = leftPrecedence !== null && leftPrecedence === enginePrecedence(rightEngine);
  const canReplayLeft = Boolean(replay) && Boolean(available)
    && leftPrecedence !== null && leftPrecedence === enginePrecedence(available);
  const engineDiffers = leftPrecedence !== enginePrecedence(rightEngine);

  if (has('source-instant') && !has('instant')) {
    explanations.push({
      id: 'equivalent-instants', evidence: 'reported',
      statement: computed.length === 0
        ? 'These differ only in how the instant is written. Every computed value agrees.'
        : 'The same moment was written two different ways.',
      covers: ['source-instant', 'zone', 'reference'].filter(has),
      detail: 'Both files resolve to the same UTC instant, so nothing downstream can differ because of this.',
    });
  }

  // House system: a metadata difference that can be promoted to a demonstrated
  // cause by recalculating one side with the other's system and nothing else.
  if (has('houses-requested') || has('houses-actual') || has('houses-system')) {
    const requested = (right.receipt as any).houses?.requested;
    const input = replayInputOf(left);
    // Only the rows that actually moved are up for explanation. A pair whose
    // angles and cusps are identical — two polar charts that both fell back to
    // whole sign, say — has nothing here for a house system to account for, and
    // a replay that "matches" values that never moved demonstrates nothing.
    const movedAngles = idsIn('Angles').filter((id) => id.startsWith('angle-'));
    const movedCusps = idsIn('Houses').filter((id) => id.startsWith('cusp-'));
    let promoted = false;
    if (canReplayLeft && input && typeof requested === 'string' && movedAngles.length + movedCusps.length > 0) {
      const replayed = replay!({ ...input, houseSystem: requested });
      const targetAngles = (right.result as any).angles as Record<string, number> | null;
      const targetCusps = (right.result as any).houses?.cusps as number[] | undefined;
      if (replayed) {
        // Every moved row must be reproduced, and the replay must have returned
        // the values that moved: a null cusp list cannot demonstrate a cusp
        // difference, and matching untouched angles is not evidence.
        const anglesReproduced = movedAngles.length === 0 || Boolean(
          replayed.angles && targetAngles
          && movedAngles.every((id) => {
            const key = id.slice('angle-'.length);
            return compareAngles(replayed.angles![key], targetAngles[key]) !== 'different';
          }),
        );
        const cuspsReproduced = movedCusps.length === 0 || Boolean(
          Array.isArray(replayed.cusps) && Array.isArray(targetCusps)
          && replayed.cusps.length === targetCusps.length
          && movedCusps.every((id) => {
            const index = Number(id.slice('cusp-'.length)) - 1;
            return compareAngles(replayed.cusps![index], targetCusps[index]) !== 'different';
          }),
        );
        if (anglesReproduced && cuspsReproduced) {
          promoted = true;
          const moved = movedCusps.length > 0 && movedAngles.length > 0 ? 'angles and cusps'
            : movedCusps.length > 0 ? 'house cusps' : 'angles';
          explanations.push({
            id: 'house-system', evidence: 'reproduced',
            statement: `The different house system accounts for the ${moved}.`,
            covers: [...movedAngles, ...movedCusps,
              ...['houses-requested', 'houses-actual', 'houses-system'].filter(has)],
            detail: `Recalculating the first chart's own inputs with ${requested} houses, changing nothing else, reproduces the second chart's ${moved} on engine ${available}.`,
          });
        }
      }
    }
    if (!promoted) {
      const unexplainedAngles = movedAngles.length + movedCusps.length > 0;
      explanations.push({
        id: 'house-system', evidence: unexplainedAngles ? 'hypothesis' : 'reported',
        statement: has('houses-actual') && !has('houses-requested')
          ? 'The same house system was requested, but a different one was actually used.'
          : 'The two charts asked for different house systems.',
        covers: [
          ...['houses-requested', 'houses-actual', 'houses-system', 'houses-absence'].filter(has),
          ...(unexplainedAngles ? [...movedAngles, ...movedCusps] : []),
        ],
        detail: unexplainedAngles
          ? 'This is the obvious candidate for the angle and cusp differences, but it was not reproduced here, so it stays a hypothesis.'
          : 'The angles and cusps are the same in both files, so this difference changed nothing that was computed.',
      });
    }
  }

  if (has('instant') && computed.length > 0) {
    explanations.push({
      id: 'instant', evidence: 'hypothesis',
      statement: 'The two charts are for different moments, which moves every position.',
      covers: [
        ...['instant', 'source-instant', 'reference', 'zone'].filter(has),
        ...downstream(['Positions', 'Angles', 'Houses', 'Aspects']),
      ],
      detail: 'Positions change continuously with time, so a different instant is expected to change all of them.',
    });
  }

  if ((has('latitude') || has('longitude')) && (idsIn('Angles').length > 0 || idsIn('Houses').length > 0)) {
    explanations.push({
      id: 'location', evidence: 'hypothesis',
      statement: 'The two charts are for different places, which moves the angles and houses.',
      covers: [...['latitude', 'longitude'].filter(has), ...downstream(['Angles', 'Houses'])],
      detail: 'Body longitudes are geocentric and barely move with location; the angles and house cusps depend on it directly.',
    });
  }

  if (has('time-known')) {
    explanations.push({
      id: 'time-known', evidence: 'reported',
      statement: 'One chart has a known birth time and the other does not.',
      covers: ['time-known', 'angles-presence', 'houses-absence'].filter(has),
      detail: 'Without a time there is no ascendant and no houses, and the positions use a stated convention rather than a real moment.',
    });
  }

  const conventionRows = differences.filter((row) => row.area === 'Conventions').map((row) => row.id);
  if (conventionRows.length > 0) {
    explanations.push({
      id: 'conventions', evidence: 'reported',
      statement: 'The two charts were computed under different stated conventions.',
      covers: conventionRows,
      detail: 'Different conventions can make values incomparable rather than merely different.',
    });
  }

  if (has('engine-version') && !engineDiffers) {
    explanations.push({
      id: 'engine-build', evidence: 'reported',
      statement: 'The two files name the same engine version with different build metadata.',
      covers: ['engine-version'],
      detail: 'Build metadata does not change which version a receipt was produced by.',
    });
  }

  if (has('result-flags') || has('input-flags')) {
    explanations.push({
      id: 'flags', evidence: 'reported',
      statement: 'The two files record different flags about how the calculation went.',
      covers: ['result-flags', 'input-flags'].filter(has),
      detail: 'A flag records something the engine had to do — a fallback, or a missing input — rather than a result.',
    });
  }

  if (has('schema')) {
    explanations.push({
      id: 'schema', evidence: 'reported',
      statement: 'The two files use different receipt schemas.',
      covers: ['schema'],
      detail: 'A schema difference can change what a field means, so values across the two are not necessarily comparable.',
    });
  }

  // Engine difference with no input difference: candidate cause, but this tool
  // holds exactly one engine build and cannot rerun the other one.
  if (has('engine-version') && engineDiffers && computed.length > 0) {
    explanations.push({
      id: 'engine', evidence: 'hypothesis',
      statement: 'The two charts were produced by different engine versions.',
      covers: ['engine-version', ...computed],
      detail: 'A change between engine versions can move computed values. It cannot be demonstrated here.',
    });
    limits.push(`Reproducing the difference would need engine ${leftEngine} and ${rightEngine} side by side. `
      + `This page has ${available ?? 'no engine'} only, so no recalculation can decide it.`);
  }

  // Whatever no explanation above claimed is unresolved, and it is named. An
  // unrelated difference — one house system, one latitude — must never absorb a
  // position difference it cannot cause, which a "does any input differ?" test
  // would let it do.
  const covered = new Set(explanations.flatMap((item) => item.covers));
  const uncovered = differences
    .filter((row) => row.kind !== 'display' && !covered.has(row.id))
    .map((row) => row.id);
  if (uncovered.length > 0) {
    const anyComputed = uncovered.some((id) => computed.includes(id));
    explanations.push({
      id: 'unexplained', evidence: 'unresolved',
      statement: anyComputed
        ? 'Some computed values differ and nothing in either file accounts for them.'
        : 'Some differences are not accounted for by anything in either file.',
      covers: uncovered,
      detail: anyComputed
        ? 'Treat those values as unverified until the difference is understood.'
        : null,
    });
  }

  if (has('instant') && (has('latitude') || has('longitude')) && computed.length > 0) {
    limits.push('The moment and the place both differ, so what each one contributed cannot be '
      + 'separated from these two files.');
  }
  if (computed.length > 0) {
    limits.push('Only the house system is re-run here. A different moment or place is never '
      + 'promoted past a hypothesis, even when both records name the same engine.');
  }
  if (sameEngine && computed.length > 0) {
    limits.push('Both receipts name the same engine, so agreement between them would show consistency, not independent astronomical accuracy.');
  }
  if (!canReplayLeft && computed.length > 0) {
    limits.push(available === null
      ? 'No local engine was available, so nothing was reproduced by recalculation.'
      : `Local recalculation uses engine ${available}; the first receipt names ${leftEngine ?? 'no engine'}, so replaying it would be a different calculation, not the original.`);
  }
  return { explanations, limits };
}

export function compareEnvelopes(left: NatalEnvelope, right: NatalEnvelope, options: CompareOptions = {}): Comparison {
  const differences = collectDifferences(left, right);
  const substantive = differences.filter((row) => row.kind !== 'display');
  const { explanations, limits } = explain(left, right, differences, options);
  return {
    identical: differences.length === 0,
    differences,
    explanations: substantive.length === 0 ? [] : explanations,
    limits,
  };
}

export { formatDelta };
