import { describe, expect, it } from 'vitest';
import { natalChart, ENGINE_VERSION } from '@zodiacs/engine';
import { parseNatalEnvelope } from '@zodiacs/engine/receipt';
import type { NatalEnvelope } from '@zodiacs/engine/receipt';
import { compareEnvelopes, type Evidence, type Replay } from './diff';
import { replay as pageReplay } from './replay';
import { buildEnvelope, ORDINARY, PRESETS, presetEnvelopes } from './fixtures';

/** The real engine, wired in the way the page wires it. */
const replay: Replay = (request) => {
  const chart = natalChart({
    utc: request.utc, latitude: request.latitude, longitude: request.longitude, houseSystem: request.houseSystem,
  } as Parameters<typeof natalChart>[0]) as {
    angles: Record<string, number> | null;
    bodies: { body: string; lon: number }[];
    houses: { cusps?: number[] } | null;
  };
  return { angles: chart.angles, bodies: chart.bodies, cusps: chart.houses?.cusps ?? null };
};
const live = { engineVersion: ENGINE_VERSION, replay };

const evidenceFor = (comparison: ReturnType<typeof compareEnvelopes>, id: string): Evidence | null =>
  comparison.explanations.find((item) => item.id === id)?.evidence ?? null;

const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

/**
 * Move one body and keep the receipt internally consistent, so what the test
 * feeds the comparison is a file the engine's own parser accepts. The Moon
 * nodes take no aspects under the stated conventions, which is why they are the
 * body a test can move without rewriting the aspect list too.
 */
function withMovedNode(envelope: NatalEnvelope, lon: number): NatalEnvelope {
  const copy = JSON.parse(JSON.stringify(envelope));
  const body = copy.result.bodies.find((entry: { body: string }) => entry.body === 'North Node');
  const wrapped = ((lon % 360) + 360) % 360;
  body.lon = wrapped;
  body.sign = SIGNS[Math.floor(wrapped / 30)];
  body.degree = wrapped - Math.floor(wrapped / 30) * 30;
  const parsed = parseNatalEnvelope(JSON.stringify(copy));
  if (!parsed.ok) throw new Error(`the parser rejected a fixture this test needs: ${JSON.stringify(parsed)}`);
  return parsed.envelope;
}

const nodeLon = (envelope: NatalEnvelope): number =>
  (envelope.result.bodies.find((entry) => entry.body === 'North Node') as { lon: number }).lon;

describe('comparing two calculation receipts', () => {
  it('reports no difference between two runs of the same calculation', () => {
    // Two separately built envelopes, not one object passed twice: the same
    // object would pass even on an implementation with an identity shortcut.
    const comparison = compareEnvelopes(buildEnvelope(ORDINARY), buildEnvelope(ORDINARY), live);
    expect(comparison.identical).toBe(true);
    expect(comparison.differences).toEqual([]);
    // Nothing to explain, so nothing is offered.
    expect(comparison.explanations).toEqual([]);
  });

  it('demonstrates the house system as a cause instead of guessing it', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, right, live);

    expect(evidenceFor(comparison, 'house-system')).toBe('reproduced');
    // The bodies are geocentric: a house system cannot move them.
    const movedBodies = comparison.differences.filter((row) => row.area === 'Positions' && row.kind === 'numeric');
    expect(movedBodies).toEqual([]);
    expect(comparison.differences.some((row) => row.id === 'houses-requested')).toBe(true);
    // Whole sign keeps the ascendant and moves every cusp to a sign boundary,
    // so the cusps are where the difference actually shows.
    expect(comparison.differences.some((row) => row.id.startsWith('cusp-') && row.kind === 'numeric')).toBe(true);
  });

  it('will not call the house system reproduced without an engine to reproduce it with', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, right, { engineVersion: null, replay: null });

    expect(evidenceFor(comparison, 'house-system')).toBe('hypothesis');
    expect(comparison.limits.join(' ')).toMatch(/No local engine was available/u);
  });

  it('refuses to reproduce with an engine that did not produce the receipt', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    // Same engine build, but the page believes it holds a different version.
    const comparison = compareEnvelopes(left, right, { engineVersion: '9.9.9-rc.1', replay });

    expect(evidenceFor(comparison, 'house-system')).toBe('hypothesis');
    expect(comparison.limits.join(' ')).toMatch(/would be a different calculation, not the original/u);
  });

  it('recognises the same instant written with a different offset, and says nothing follows from it', () => {
    const { left, right } = presetEnvelopes(PRESETS.find((preset) => preset.id === 'equivalent-instants')!);
    const comparison = compareEnvelopes(left, right, live);

    expect(comparison.differences.some((row) => row.id === 'source-instant')).toBe(true);
    expect(comparison.differences.some((row) => row.id === 'instant')).toBe(false);
    expect(evidenceFor(comparison, 'equivalent-instants')).toBe('reported');
    // Nothing computed may differ when the resolved instant is identical.
    expect(comparison.differences.filter((row) => row.kind === 'numeric')).toEqual([]);
  });

  it('offers more than one candidate when more than one fits', () => {
    const { left, right } = presetEnvelopes(PRESETS.find((preset) => preset.id === 'ambiguous')!);
    const comparison = compareEnvelopes(left, right, live);

    const ids = comparison.explanations.map((item) => item.id);
    expect(ids).toContain('instant');
    expect(ids).toContain('location');
    // Both are candidates; neither is asserted as the demonstrated cause.
    for (const item of comparison.explanations) expect(item.evidence).not.toBe('reproduced');
  });

  it('says so plainly when nothing in either file explains the difference', () => {
    const left = buildEnvelope(ORDINARY);
    // Same stated inputs, conventions and engine, but a moved position.
    const tampered = JSON.parse(JSON.stringify(left));
    tampered.result.bodies[0].lon = (tampered.result.bodies[0].lon + 3) % 360;
    const comparison = compareEnvelopes(left, tampered, live);

    expect(evidenceFor(comparison, 'unexplained')).toBe('unresolved');
    expect(comparison.explanations.every((item) => item.evidence !== 'reproduced')).toBe(true);
  });

  it('separates a rounding difference from a different calculation', () => {
    const left = buildEnvelope(ORDINARY);
    const rounded = JSON.parse(JSON.stringify(left));
    rounded.result.bodies[0].lon = Number(rounded.result.bodies[0].lon.toFixed(6));
    const comparison = compareEnvelopes(left, rounded, live);

    const row = comparison.differences.find((entry) => entry.id.endsWith('-lon'));
    expect(row?.kind).toBe('display');
    // A display-only difference is not a substantive one, so no cause is claimed.
    expect(comparison.explanations).toEqual([]);
  });

  it('handles a longitude pair that straddles zero without inventing a huge difference', () => {
    const left = buildEnvelope(ORDINARY);
    const wrapped = JSON.parse(JSON.stringify(left));
    wrapped.result.bodies[0].lon = 0.5;
    const near = JSON.parse(JSON.stringify(left));
    near.result.bodies[0].lon = 359.5;

    const forward = compareEnvelopes(near, wrapped, live);
    const forwardRow = forward.differences.find((entry) => entry.id.endsWith('-lon'));
    expect(forwardRow?.kind).toBe('numeric');
    // Signed, and in the direction of the column order: 359.5 -> 0.5 is +1.
    expect(forwardRow!.delta).toBeCloseTo(1, 9);

    const back = compareEnvelopes(wrapped, near, live);
    expect(back.differences.find((entry) => entry.id.endsWith('-lon'))!.delta).toBeCloseTo(-1, 9);
  });

  it('names the engine difference as a candidate it cannot decide', () => {
    const left = buildEnvelope(ORDINARY);
    const older = JSON.parse(JSON.stringify(left));
    older.receipt.engine.version = '0.1.1-rc.3';
    older.result.bodies[0].lon = (older.result.bodies[0].lon + 0.01) % 360;
    const comparison = compareEnvelopes(older, left, live);

    expect(evidenceFor(comparison, 'engine')).toBe('hypothesis');
    expect(comparison.limits.join(' ')).toMatch(/side by side/u);
  });

  it('reads a receipt naming a different engine version of the same schema', () => {
    // The developer starter pins engine 0.1.1-rc.3 while the site pins rc.6.
    // Only rc.6 is vendored here, so this checks what can be checked offline:
    // a receipt naming rc.3 parses, and the version difference is reported
    // rather than quietly ignored.
    const envelope = JSON.parse(JSON.stringify(buildEnvelope(ORDINARY)));
    envelope.receipt.engine.version = '0.1.1-rc.3';
    const reparsed = parseNatalEnvelope(JSON.stringify(envelope));
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect((reparsed.envelope.receipt as { engine: { version: string } }).engine.version)
      .toBe('0.1.1-rc.3');
    const comparison = compareEnvelopes(reparsed.envelope, buildEnvelope(ORDINARY), live);
    expect(comparison.differences.some((row) => row.id === 'engine-version')).toBe(true);
  });

  it('states that two receipts from one engine show consistency, not accuracy', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, right, live);
    expect(comparison.limits.join(' ')).toMatch(/consistency, not independent astronomical accuracy/u);
  });
});

/**
 * One test per defect an AI review reproduced against the first candidate
 * (fef5f9bf). Each of these failed on that code and passes on this one.
 */
describe('regressions an adversarial review found', () => {
  const accept = (value: unknown): NatalEnvelope => {
    const parsed = parseNatalEnvelope(JSON.stringify(value));
    if (!parsed.ok) throw new Error(`the parser rejected a fixture this test needs: ${JSON.stringify(parsed)}`);
    return parsed.envelope;
  };

  it('does not call two records the same calculation when a body latitude differs', () => {
    const left = buildEnvelope(ORDINARY);
    const tampered = JSON.parse(JSON.stringify(left));
    for (const body of tampered.result.bodies) body.lat = 7.5;
    const comparison = compareEnvelopes(left, accept(tampered), live);

    expect(comparison.identical).toBe(false);
    expect(comparison.differences.filter((row) => row.id.endsWith('-lat')).length).toBeGreaterThan(0);
  });

  it('does not call two records the same calculation when a body speed differs', () => {
    const left = buildEnvelope(ORDINARY);
    const tampered = JSON.parse(JSON.stringify(left));
    for (const body of tampered.result.bodies) body.speed = body.speed < 0 ? -99 : 99;
    const comparison = compareEnvelopes(left, accept(tampered), live);

    expect(comparison.identical).toBe(false);
    expect(comparison.differences.filter((row) => row.id.endsWith('-speed')).length).toBeGreaterThan(0);
  });

  it('notices that one record is missing aspects the other has', () => {
    const left = buildEnvelope(ORDINARY);
    expect(left.result.aspects.length).toBeGreaterThan(0);
    const tampered = JSON.parse(JSON.stringify(left));
    tampered.result.aspects = [];
    const comparison = compareEnvelopes(left, accept(tampered), live);

    expect(comparison.identical).toBe(false);
    expect(comparison.differences.some((row) => row.area === 'Aspects')).toBe(true);
  });

  it('reads an aspect list in a different order as no difference', () => {
    const left = buildEnvelope(ORDINARY);
    const shuffled = JSON.parse(JSON.stringify(left));
    shuffled.result.aspects.reverse();
    expect(compareEnvelopes(left, accept(shuffled), live).identical).toBe(true);
  });

  it('classifies two real charts a millisecond apart by what they print, not by how far apart they are', () => {
    // Nothing is edited here: two ordinary calculations at instants a few
    // milliseconds apart, which is the realistic shape of "two programs
    // disagree slightly". One millisecond moves every body by less than the
    // sixth decimal, so every row prints the same and every row is rounding.
    const base = buildEnvelope({ ...ORDINARY, utc: '1990-06-15T13:30:00.000Z' });
    const oneMs = compareEnvelopes(base, buildEnvelope({ ...ORDINARY, utc: '1990-06-15T13:30:00.001Z' }), live);
    const oneMsRows = oneMs.differences.filter((row) => row.id.endsWith('-lon'));
    expect(oneMsRows.length).toBeGreaterThan(0);
    for (const row of oneMsRows) {
      expect(row.kind, `${row.id} ${row.left} vs ${row.right}`).toBe('display');
      expect(row.left).toBe(row.right);
    }
    // The instants themselves differ, and that is what accounts for the angles,
    // which do move a visible amount in a millisecond. Nothing is unresolved.
    expect(evidenceFor(oneMs, 'instant')).toBe('hypothesis');
    expect(evidenceFor(oneMs, 'unexplained')).toBeNull();

    // Ten milliseconds moves the faster bodies across a rounding boundary while
    // the slower ones stay put, so one comparison carries both kinds at once —
    // and the distance between the two is not what separates them. Mars moves
    // 8e-8 and prints differently; the Sun moves further and prints the same.
    const tenMs = compareEnvelopes(base, buildEnvelope({ ...ORDINARY, utc: '1990-06-15T13:30:00.010Z' }), live);
    const moved = tenMs.differences.filter((row) => row.id.endsWith('-lon') && row.kind === 'numeric');
    const still = tenMs.differences.filter((row) => row.id.endsWith('-lon') && row.kind === 'display');
    expect(moved.length).toBeGreaterThan(0);
    expect(still.length).toBeGreaterThan(0);
    for (const row of moved) expect(row.left, row.id).not.toBe(row.right);
    for (const row of still) expect(row.left, row.id).toBe(row.right);
    // The smallest real difference is smaller than the largest rounding one:
    // no threshold on distance could have separated these two sets.
    const smallestMoved = Math.min(...moved.map((row) => Math.abs(row.delta!)));
    const largestStill = Math.max(...still.map((row) => Math.abs(row.delta!)));
    expect(smallestMoved).toBeLessThan(largestStill);
  });

  it('calls two values that print the same a rounding difference, not a different calculation', () => {
    const base = buildEnvelope(ORDINARY);
    const comparison = compareEnvelopes(
      withMovedNode(base, 308.1223466), withMovedNode(base, 308.1223474), live,
    );

    const row = comparison.differences.find((entry) => entry.id.endsWith('-lon'));
    expect(row?.kind).toBe('display');
    expect(row?.left).toBe(row?.right);
    // A rounding difference is not something to declare unverified.
    expect(comparison.explanations).toEqual([]);
  });

  it('calls two values that print differently a difference, however small', () => {
    const base = buildEnvelope(ORDINARY);
    const comparison = compareEnvelopes(
      withMovedNode(base, 308.12234749), withMovedNode(base, 308.12234751), live,
    );

    const row = comparison.differences.find((entry) => entry.id.endsWith('-lon'));
    expect(row?.kind).toBe('numeric');
    expect(row?.left).not.toBe(row?.right);
  });

  it('will not call the house system reproduced when the angles and cusps did not move', () => {
    // Above 66° Placidus is not computable, so both charts fall back to whole
    // sign and end up with identical cusps. The requested system differs; that
    // difference explains nothing computed, and nothing was demonstrated.
    const polar = { utc: '1990-06-15T13:30:00Z', latitude: 78, longitude: 15, houseSystem: 'placidus' } as const;
    const left = buildEnvelope(polar);
    const right = buildEnvelope({ ...polar, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, withMovedNode(right, nodeLon(right) + 3), live);

    expect(comparison.differences.some((row) => row.id.startsWith('cusp-'))).toBe(false);
    expect(evidenceFor(comparison, 'house-system')).toBe('reported');
  });

  it('will not build evidence about a time-unknown receipt out of a time-known replay', () => {
    const left = buildEnvelope({ ...ORDINARY, utc: '1990-06-15T12:00:00Z', timeKnown: false });
    expect(left.result.angles).toBeNull();
    const right = buildEnvelope({ ...ORDINARY, utc: '1990-06-15T12:00:00Z' });
    const comparison = compareEnvelopes(left, withMovedNode(right, nodeLon(right) + 3), live);

    expect(comparison.explanations.every((item) => item.evidence !== 'reproduced')).toBe(true);
  });

  it('the page replay honours whether the birth time was known', () => {
    const request = { utc: '1990-06-15T12:00:00Z', latitude: 51.5, longitude: 0, houseSystem: 'placidus' };
    expect(pageReplay({ ...request, timeKnown: true })?.angles).not.toBeNull();
    expect(pageReplay({ ...request, timeKnown: false })?.angles).toBeNull();
  });

  it('does not let an unrelated difference absorb a position difference it cannot cause', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, withMovedNode(right, nodeLon(right) + 3), live);

    // A house system cannot move a geocentric body. That 3° is unaccounted for
    // and must be said so, whatever else in the two files differs.
    const unresolved = comparison.explanations.find((item) => item.evidence === 'unresolved');
    expect(unresolved).toBeDefined();
    expect(unresolved!.covers.some((id) => id.endsWith('-lon'))).toBe(true);
  });

  it('accounts for every substantive difference in every preset, without falling back', () => {
    for (const preset of PRESETS) {
      const { left, right } = presetEnvelopes(preset);
      const comparison = compareEnvelopes(left, right, live);
      const covered = new Set(comparison.explanations.flatMap((item) => item.covers));
      const uncovered = comparison.differences
        .filter((row) => row.kind !== 'display' && !covered.has(row.id))
        .map((row) => row.id);
      expect(uncovered, `${preset.id} leaves rows unexplained and unmentioned`).toEqual([]);
      // Coverage alone would be satisfied by sweeping everything into the
      // unresolved bucket. Each preset has real causes, so that bucket must be
      // empty — a preset falling back to "unresolved" is a defect in the rules.
      expect(evidenceFor(comparison, 'unexplained'), `${preset.id} fell back to unresolved`).toBeNull();
    }
  });

  it('treats build metadata as the same engine version', () => {
    const base = buildEnvelope(ORDINARY);
    const withMetadata = JSON.parse(JSON.stringify(base));
    withMetadata.receipt.engine.version = `${ENGINE_VERSION}+deadbeef`;
    const comparison = compareEnvelopes(
      accept(withMetadata), withMovedNode(base, nodeLon(base) + 0.01), live,
    );

    // SemVer ignores build metadata, so this is not a different engine and must
    // not be offered as a candidate cause for a moved position.
    expect(evidenceFor(comparison, 'engine')).toBeNull();
    expect(evidenceFor(comparison, 'engine-build')).toBe('reported');
    expect(evidenceFor(comparison, 'unexplained')).toBe('unresolved');
  });
});

describe('a cause never claims a row it could not have caused', () => {
  /** Which rows each explanation is physically capable of accounting for. */
  const CANNOT: Record<string, RegExp> = {
    // A different moment or place moves computed values; neither can change
    // which house system the calculation was asked for.
    instant: /^houses-(requested|actual|system)$/u,
    location: /^houses-(requested|actual|system)$/u,
    // A house system moves angles and cusps. Bodies are geocentric.
    'house-system': /^(body-.*-(lon|lat|speed|degree|sign|retrograde)|aspect-)/u,
    // Writing the same instant two ways changes nothing computed at all.
    'equivalent-instants': /^(body-|angle-|cusp-|aspect-)/u,
  };

  const cases = [
    { name: 'different place and different house system',
      left: ORDINARY,
      right: { utc: ORDINARY.utc, latitude: 40.7128, longitude: -74.006, houseSystem: 'whole' } as const },
    { name: 'different moment and different house system',
      left: ORDINARY,
      right: { ...ORDINARY, utc: '1990-06-15T18:45:00Z', houseSystem: 'whole' } as const },
    { name: 'different moment, place and house system at once',
      left: ORDINARY,
      right: { utc: '1990-06-15T18:45:00Z', latitude: 40.7128, longitude: -74.006, houseSystem: 'whole' } as const },
  ];

  for (const scenario of cases) {
    it(`holds for ${scenario.name}`, () => {
      const comparison = compareEnvelopes(
        buildEnvelope(scenario.left), buildEnvelope(scenario.right), live,
      );
      for (const item of comparison.explanations) {
        const forbidden = CANNOT[item.id];
        if (!forbidden) continue;
        const overreach = item.covers.filter((id) => forbidden.test(id));
        expect(overreach, `${item.id} claims rows it cannot cause`).toEqual([]);
      }
      // And the house-system rows are still accounted for by something.
      const covered = new Set(comparison.explanations.flatMap((item) => item.covers));
      for (const row of comparison.differences) {
        if (row.kind === 'display') continue;
        expect(covered.has(row.id), `${row.id} is claimed by nobody`).toBe(true);
      }
    });
  }
});
