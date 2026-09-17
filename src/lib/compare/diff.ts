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
import { compareAngles, compareScalars, circularDelta, formatDelta, type NumericVerdict } from './angles';

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
  readonly sign?: unknown;
  readonly retrograde?: unknown;
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
  return Number.isFinite(value) ? value.toFixed(6) : '—';
}

function engineVersionOf(envelope: NatalEnvelope): string | null {
  const engine = (envelope.receipt as { engine?: { version?: unknown } }).engine;
  return typeof engine?.version === 'string' ? engine.version : null;
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
    text(`convention-${key}`, 'Conventions', key, lr.conventions?.[key], rr.conventions?.[key]);
  }

  text('engine-version', 'Provenance', 'Engine version', engineVersionOf(left), engineVersionOf(right));
  text('schema', 'Provenance', 'Receipt schema', left.schema, right.schema);
  text('result-flags', 'Provenance', 'Result flags', JSON.stringify(lr.resultFlags ?? []), JSON.stringify(rr.resultFlags ?? []));
  text('input-flags', 'Provenance', 'Input flags', JSON.stringify(lr.inputFlags ?? []), JSON.stringify(rr.inputFlags ?? []));

  const la = (left.result as any).angles as Record<string, number> | null;
  const ra = (right.result as any).angles as Record<string, number> | null;
  if (la && ra) {
    for (const key of [...new Set([...Object.keys(la), ...Object.keys(ra)])].sort()) {
      angle(`angle-${key}`, 'Angles', ANGLE_LABELS[key] ?? key, la[key], ra[key]);
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
    angle(`body-${body}-lon`, 'Positions', `${body} longitude`, a.lon, b.lon);
    text(`body-${body}-sign`, 'Positions', `${body} sign`, a.sign, b.sign);
    text(`body-${body}-retrograde`, 'Positions', `${body} retrograde`, a.retrograde, b.retrograde);
  }

  const lc = (left.result as any).houses?.cusps as number[] | undefined;
  const rc = (right.result as any).houses?.cusps as number[] | undefined;
  if (Array.isArray(lc) && Array.isArray(rc) && lc.length === rc.length) {
    for (let index = 0; index < lc.length; index += 1) {
      angle(`cusp-${index + 1}`, 'Houses', `House ${index + 1} cusp`, lc[index], rc[index]);
    }
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
  const has = (id: string) => differences.some((row) => row.id === id);
  const idsIn = (area: string) => differences.filter((row) => row.area === area && row.kind === 'numeric').map((row) => row.id);
  const computed = [...idsIn('Positions'), ...idsIn('Angles'), ...idsIn('Houses')];

  const leftEngine = engineVersionOf(left);
  const rightEngine = engineVersionOf(right);
  const available = options.engineVersion ?? null;
  const replay = options.replay ?? null;
  const sameEngine = leftEngine !== null && leftEngine === rightEngine;
  const canReplayLeft = Boolean(replay) && available !== null && leftEngine === available;

  if (has('source-instant') && !has('instant')) {
    explanations.push({
      id: 'equivalent-instants', evidence: 'reported',
      statement: 'The same moment was written two different ways.',
      covers: ['source-instant'],
      detail: 'Both files resolve to the same UTC instant, so nothing downstream can differ because of this.',
    });
  }

  // House system: a metadata difference that can be promoted to a demonstrated
  // cause by recalculating one side with the other's system and nothing else.
  if (has('houses-requested') || has('houses-actual')) {
    const requested = (right.receipt as any).houses?.requested;
    const input = replayInputOf(left);
    let promoted = false;
    if (canReplayLeft && input && typeof requested === 'string' && computed.length > 0) {
      const replayed = replay!({ ...input, houseSystem: requested });
      const targetAngles = (right.result as any).angles as Record<string, number> | null;
      const targetCusps = (right.result as any).houses?.cusps as number[] | undefined;
      if (replayed) {
        // Compare whatever actually moved. Between Placidus and whole sign the
        // angles are unchanged and every cusp shifts, so checking the angles
        // alone would "demonstrate" the cause without testing anything.
        const anglesMatch = !targetAngles || !replayed.angles
          || Object.keys(targetAngles).every((key) => compareAngles(replayed.angles![key], targetAngles[key]) !== 'different');
        const cuspsMatch = !Array.isArray(targetCusps) || !Array.isArray(replayed.cusps)
          || (replayed.cusps.length === targetCusps.length
            && targetCusps.every((value, index) => compareAngles(replayed.cusps![index], value) !== 'different'));
        const compared = Boolean(replayed.angles && targetAngles) || Boolean(Array.isArray(replayed.cusps) && Array.isArray(targetCusps));
        if (compared && anglesMatch && cuspsMatch) {
          promoted = true;
          explanations.push({
            id: 'house-system', evidence: 'reproduced',
            statement: 'The different house system accounts for the angles and cusps.',
            covers: [...idsIn('Angles'), ...idsIn('Houses'), 'houses-requested', 'houses-actual'].filter((id) => has(id) || id.startsWith('angle') || id.startsWith('cusp')),
            detail: `Recalculating the first chart's own inputs with ${requested} houses, changing nothing else, reproduces the second chart's angles on engine ${available}.`,
          });
        }
      }
    }
    if (!promoted) {
      explanations.push({
        id: 'house-system', evidence: computed.length > 0 ? 'hypothesis' : 'reported',
        statement: has('houses-actual') && !has('houses-requested')
          ? 'The same house system was requested, but a different one was actually used.'
          : 'The two charts asked for different house systems.',
        covers: ['houses-requested', 'houses-actual', 'houses-absence'].filter(has),
        detail: computed.length > 0
          ? 'This is the obvious candidate for the angle and cusp differences, but it was not reproduced here, so it stays a hypothesis.'
          : null,
      });
    }
  }

  if (has('instant') && computed.length > 0) {
    explanations.push({
      id: 'instant', evidence: 'hypothesis',
      statement: 'The two charts are for different moments, which moves every position.',
      covers: ['instant', ...computed],
      detail: 'Positions change continuously with time, so a different instant is expected to change all of them.',
    });
  }

  if ((has('latitude') || has('longitude')) && (idsIn('Angles').length > 0 || idsIn('Houses').length > 0)) {
    explanations.push({
      id: 'location', evidence: 'hypothesis',
      statement: 'The two charts are for different places, which moves the angles and houses.',
      covers: ['latitude', 'longitude', ...idsIn('Angles'), ...idsIn('Houses')].filter((id) => has(id)),
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

  // Engine difference with no input difference: candidate cause, but this tool
  // holds exactly one engine build and cannot rerun the other one.
  if (has('engine-version') && computed.length > 0) {
    explanations.push({
      id: 'engine', evidence: 'hypothesis',
      statement: 'The two charts were produced by different engine versions.',
      covers: ['engine-version', ...computed],
      detail: 'A change between engine versions can move computed values. It cannot be demonstrated here.',
    });
    limits.push(`Reproducing the difference would need engine ${leftEngine} and ${rightEngine} side by side. `
      + `This page has ${available ?? 'no engine'} only, so no recalculation can decide it.`);
  }

  const inputDifference = ['instant', 'latitude', 'longitude', 'time-known', 'houses-requested', 'houses-actual'].some(has);
  if (computed.length > 0 && !inputDifference && !has('engine-version') && conventionRows.length === 0) {
    explanations.push({
      id: 'unexplained', evidence: 'unresolved',
      statement: 'The computed values differ although every stated input, convention and engine version matches.',
      covers: computed,
      detail: 'Nothing in either file accounts for this. Treat both results as unverified until it is understood.',
    });
  }

  if (sameEngine && computed.length > 0) {
    limits.push('Both receipts name the same engine, so agreement between them would show consistency, not independent astronomical accuracy.');
  }
  if (!canReplayLeft && computed.length > 0) {
    limits.push(available === null
      ? 'No local engine was available, so nothing was reproduced by recalculation.'
      : `Local recalculation uses engine ${available}; the first receipt names ${leftEngine ?? 'no engine'}, so replaying it would be a different calculation, not the original.`);
  }
  if (explanations.length === 0 && differences.length > 0) {
    explanations.push({
      id: 'no-candidate', evidence: 'unresolved',
      statement: 'The files differ, but nothing in them suggests a cause.',
      covers: differences.map((row) => row.id), detail: null,
    });
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
