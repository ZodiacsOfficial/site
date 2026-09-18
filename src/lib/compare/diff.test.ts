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

  it('does not call an absent house table two different house systems', () => {
    // Both sides requested placidus; the right has no time, so it has no houses
    // at all. An AI review found this reported as "a different one was actually
    // used", which a reader can only take to mean the systems disagreed.
    const comparison = compareEnvelopes(
      buildEnvelope(ORDINARY), buildEnvelope({ ...ORDINARY, timeKnown: false }), live,
    );
    const houseSystem = comparison.explanations.find((item) => item.id === 'house-system');
    expect(houseSystem?.statement).toBe('One chart has no house table at all, so there is no house system to compare.');
    expect(houseSystem?.statement).not.toMatch(/different one was actually used|asked for different/);
    // …and the rows it was claiming are still claimed, so nothing slid into the
    // unresolved bucket in exchange for a better sentence.
    expect(houseSystem?.covers).toContain('houses-actual');
    expect(evidenceFor(comparison, 'unexplained')).toBeNull();
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

    // SemVer orders these two version strings equally, so this tool does not
    // treat the second as a different engine and does not offer it as a
    // candidate cause for a moved position. That is a rule about how this tool
    // reads a version string, not a finding that the two builds run the same
    // code — nothing here can establish that.
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
    // A house system moves the cusps and nothing else. Bodies are geocentric,
    // and the angles come from the time and the place — every system in this
    // engine derives from the same ascendant and midheaven, so a pair differing
    // only in house system has identical angles. Claiming an angle row is a
    // hypothesis a recalculation refutes, which is what this pattern forbids.
    'house-system': /^(body-|angle-|aspect-)/u,
    // Writing the same instant two ways changes nothing computed at all.
    'equivalent-instants': /^(body-|angle-|cusp-|aspect-)/u,
  };

  // A synthetic input with no coordinates at all: the engine accepts it and
  // returns no angles and no house table.
  const { latitude: _lat, longitude: _lon, ...PLACELESS } = ORDINARY;
  const NO_PLACE = PLACELESS as unknown as typeof ORDINARY;

  const cases = [
    { name: 'different place and different house system',
      left: ORDINARY,
      right: { utc: ORDINARY.utc, latitude: 40.7128, longitude: -74.006, houseSystem: 'whole' } as const },
    { name: 'different moment and different house system',
      left: ORDINARY,
      right: { ...ORDINARY, utc: '1990-06-15T18:45:00Z', houseSystem: 'whole' } as const },
    // One hour apart and a different house system. The angles move, but not
    // because of the house system — an AI review found the comparison naming it
    // as "the obvious candidate for the angle differences" here.
    { name: 'one hour apart and a different house system',
      left: ORDINARY,
      right: { ...ORDINARY, utc: '1990-06-15T14:30:00Z', houseSystem: 'whole' } as const },
    { name: 'different moment, place and house system at once',
      left: ORDINARY,
      right: { utc: '1990-06-15T18:45:00Z', latitude: 40.7128, longitude: -74.006, houseSystem: 'whole' } as const },
    // The synthetic MCP benchmark found `cusps-shape` reported as accounted for
    // by nothing here, with its cause — an absent birth time — printed two rows
    // above it. The suite above had every pair with a known time on both sides,
    // which is how the gap survived, so the unknown-time pairs join it.
    { name: 'a known birth time against an unknown one',
      left: ORDINARY,
      right: { ...ORDINARY, timeKnown: false } as const },
    { name: 'an unknown birth time and a different house system at once',
      left: ORDINARY,
      right: { ...ORDINARY, houseSystem: 'whole', timeKnown: false } as const },
    // The same defect through the other absence reason. An AI review pointed
    // out that every unknown-time pair above keeps its coordinates, so a
    // receipt with no place at all — which also has no ascendant and no house
    // table — still left `angles-presence` and `cusps-shape` claimed by
    // nobody, with the cause printed above them. `idsIn` sees only numeric
    // rows, and a missing place leaves none.
    { name: 'a chart with a place against one without',
      left: ORDINARY,
      right: NO_PLACE },
    { name: 'a missing place and a different house system at once',
      left: ORDINARY,
      right: { ...NO_PLACE, houseSystem: 'whole' } as const },
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
      // And every substantive row is still accounted for by a real cause.
      //
      // The unresolved bucket is excluded from `covered` on purpose. It is
      // pushed with whatever no other explanation claimed, so counting it made
      // this loop unfalsifiable: no row could ever be claimed by nobody, and
      // the assertion passed while rows were being reported as explained by
      // nothing. The synthetic MCP benchmark found the first such row.
      const real = comparison.explanations.filter((item) => item.evidence !== 'unresolved');
      const covered = new Set(real.flatMap((item) => item.covers));
      for (const row of comparison.differences) {
        if (row.kind === 'display') continue;
        expect(covered.has(row.id), `${row.id} is claimed by nobody`).toBe(true);
      }
      expect(evidenceFor(comparison, 'unexplained'), 'fell back to unresolved').toBeNull();
    });
  }
});

/**
 * An audit asked whether "reproduced" can be reached without establishing that
 * the recalculation is entitled to speak for both files. It can, in four ways,
 * and each one is a case here. Every fixture goes through the engine's own
 * parser first: a record the parser refuses can never reach the comparison, so
 * a counterexample built out of one would prove nothing.
 */
describe('what a local recalculation has to establish before it is a cause', () => {
  const T1 = '1990-06-15T13:30:00Z';
  const T2 = '1990-06-15T14:30:00Z';
  const at = (utc: string, houseSystem: 'placidus' | 'whole') =>
    buildEnvelope({ ...ORDINARY, utc, houseSystem });

  /** Parser-accepted, or the fixture is not an input this tool can receive. */
  const accepted = (raw: unknown, label: string): NatalEnvelope => {
    const parsed = parseNatalEnvelope(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(`${label} is not a record the parser accepts: ${parsed.code}`);
    return parsed.envelope;
  };
  const edited = (envelope: NatalEnvelope, change: (copy: any) => void): any => {
    const copy = JSON.parse(JSON.stringify(envelope));
    change(copy);
    return copy;
  };
  const houseSystemEvidence = (left: NatalEnvelope, right: NatalEnvelope) =>
    compareEnvelopes(left, right, live).explanations.find((item) => item.id === 'house-system')?.evidence ?? null;

  it('reproduces an ordinary house-system difference, which is the case that must keep working', () => {
    const comparison = compareEnvelopes(at(T1, 'placidus'), at(T1, 'whole'), live);
    const houseSystem = comparison.explanations.find((item) => item.id === 'house-system');
    expect(houseSystem?.evidence).toBe('reproduced');
    expect(houseSystem?.detail).toMatch(/its own declared inputs/);
    expect(comparison.differences.filter((row) => /^cusp-\d+$/.test(row.id))).toHaveLength(12);
  });

  it('withholds it when the other receipt names an engine this installation does not have', () => {
    // The values are genuine — they are exactly what the installed engine
    // produces — but the receipt says they came from somewhere else. Matching
    // them demonstrates nothing about why these two files differ.
    const foreign = accepted(edited(at(T1, 'whole'), (o) => { o.receipt.engine.version = '99.0.0'; }), 'foreign');
    expect(houseSystemEvidence(at(T1, 'placidus'), foreign)).toBe('hypothesis');
  });

  it('gives the same verdict whichever file is passed first', () => {
    const foreign = accepted(edited(at(T1, 'whole'), (o) => { o.receipt.engine.version = '99.0.0'; }), 'foreign');
    const genuine = at(T1, 'placidus');
    expect(houseSystemEvidence(genuine, foreign)).toBe(houseSystemEvidence(foreign, genuine));

    const drifted = accepted(edited(at(T2, 'placidus'), (o) => {
      o.receipt.instant = new Date(T1).toISOString();
      o.receipt.sourceInstant = T1;
    }), 'drifted');
    expect(houseSystemEvidence(drifted, at(T1, 'whole'))).toBe(houseSystemEvidence(at(T1, 'whole'), drifted));
  });

  /**
   * This expectation was reversed, deliberately, and the reason is worth more
   * than the assertion.
   *
   * The first attempt at this audit made a differing build claim refuse the
   * replay outright. A review showed that contradicted two things at once: the
   * rule stated a few hundred lines above it in `diff.ts` — build metadata does
   * not make a different engine, and such a pair must not "be refused a replay
   * as if they were" — and the response itself, which printed "build metadata
   * does not change which version a receipt was produced by" beside a limit
   * saying the two claims made the replay unusable. Both sentences in one
   * answer, saying opposite things.
   *
   * What actually establishes that a recalculation may speak for a receipt is
   * the baseline below: the receipt's own values, checked against the receipt's
   * own declared inputs. A claim printed inside the file establishes nothing
   * either way — which is the audit's own instruction. So the claim is recorded
   * in `limits`, where an unauthenticated assertion belongs, and the verdict
   * rests on the arithmetic.
   */
  it('records a differing build claim as a limit rather than refusing the replay', () => {
    const label = (envelope: NatalEnvelope, meta: string) => accepted(
      edited(envelope, (o) => { o.receipt.engine.version = `${ENGINE_VERSION}+${meta}`; }), meta,
    );
    const different = compareEnvelopes(label(at(T1, 'placidus'), 'build.a'), label(at(T1, 'whole'), 'build.b'), live);
    expect(evidenceFor(different, 'house-system')).toBe('reproduced');
    expect(different.limits.join(' ')).toMatch(/each claims a different build of it/);
    // Both naming the same build says nothing either, and is not remarked on.
    const same = compareEnvelopes(label(at(T1, 'placidus'), 'build.a'), label(at(T1, 'whole'), 'build.a'), live);
    expect(evidenceFor(same, 'house-system')).toBe('reproduced');
    expect(same.limits.join(' ')).not.toMatch(/claims a different build/);
  });

  it('does not treat a receipt that claims no build as claiming a different one', () => {
    // One file carrying build metadata and the other carrying none is not a
    // disagreement: the second has not said anything to disagree with. An
    // earlier version of this gate compared the two as strings and refused the
    // replay, then described the pair in a sentence that was simply false.
    const labelled = accepted(
      edited(at(T1, 'whole'), (o) => { o.receipt.engine.version = `${ENGINE_VERSION}+2000377`; }), 'labelled',
    );
    const comparison = compareEnvelopes(at(T1, 'placidus'), labelled, live);
    expect(evidenceFor(comparison, 'house-system')).toBe('reproduced');
    expect(comparison.limits.join(' ')).not.toMatch(/claims a different build/);
    // The difference is still reported, by the cause that owns it.
    expect(evidenceFor(comparison, 'engine-build')).toBe('reported');
  });

  /**
   * The counterexample that forced the baseline to widen.
   *
   * Whole-sign cusps are quantised to sign boundaries, so they survive an hour
   * of drift in the declared instant without moving. A baseline that checks the
   * cusps alone therefore passes trivially on a record whose instant was
   * rewritten, and the pair reached "reproduced" while sixty-five rows sat in
   * the unresolved bucket. The angles and the body longitudes move continuously
   * and are what discriminate, so the baseline checks every value the replay
   * also produces.
   */
  it('withholds it when only the quantised cusps survive a rewritten instant', () => {
    const whole = (utc: string) => buildEnvelope({ ...ORDINARY, utc, houseSystem: 'whole' });
    // The premise, stated rather than assumed: these cusps really are identical.
    expect(replay({ ...ORDINARY, utc: T1, houseSystem: 'whole', timeKnown: true })?.cusps)
      .toEqual(replay({ ...ORDINARY, utc: T2, houseSystem: 'whole', timeKnown: true })?.cusps);
    const drifted = accepted(edited(whole(T2), (o) => {
      o.receipt.instant = new Date(T1).toISOString();
      o.receipt.sourceInstant = T1;
    }), 'drifted-whole');
    for (const comparison of [
      compareEnvelopes(drifted, at(T1, 'placidus'), live),
      compareEnvelopes(at(T1, 'placidus'), drifted, live),
    ]) {
      expect(evidenceFor(comparison, 'house-system')).toBe('hypothesis');
      expect(comparison.limits.join(' ')).toMatch(/could not be reproduced from the inputs it declares/);
    }
  });

  it('withholds it when the declared place is not the one the values came from', () => {
    // The same hole reached through the coordinates instead of the instant.
    const drifted = accepted(
      edited(buildEnvelope({ ...ORDINARY, utc: T1, houseSystem: 'whole', longitude: 2.8722 }),
        (o) => { o.receipt.coordinates.longitude = ORDINARY.longitude; }), 'drifted-place',
    );
    expect(houseSystemEvidence(drifted, at(T1, 'placidus'))).toBe('hypothesis');
  });

  it('does not deny a house-system difference it is claiming in the same breath', () => {
    // When one side has no house table the cause says so. An AI review found it
    // saying so over a pair that ALSO requested different systems, adding "the
    // house system is not" the difference on top of a row recording exactly
    // that difference.
    const { latitude: _lat, longitude: _lon, ...placeless } = ORDINARY;
    const noPlace = buildEnvelope({ ...placeless, houseSystem: 'whole' } as unknown as typeof ORDINARY);
    const houseSystem = compareEnvelopes(buildEnvelope({ ...ORDINARY, houseSystem: 'placidus' }), noPlace, live)
      .explanations.find((item) => item.id === 'house-system');
    expect(houseSystem?.statement).toBe('The two charts asked for different house systems.');
    expect(houseSystem?.detail).not.toMatch(/the house system is not/);
    // …and it still does not claim the cusps are equal when one side has none.
    expect(houseSystem?.detail).toMatch(/no house table/);
  });

  it('names every foreign engine, not whichever one it met first', () => {
    const foreign = (envelope: NatalEnvelope, version: string) => accepted(
      edited(envelope, (o) => { o.receipt.engine.version = version; }), version,
    );
    const comparison = compareEnvelopes(
      foreign(at(T1, 'placidus'), '98.0.0'), foreign(at(T1, 'whole'), '99.0.0'), live,
    );
    const limit = comparison.limits.find((line) => line.includes('Local recalculation runs engine')) ?? '';
    expect(limit).toMatch(/98\.0\.0/);
    expect(limit).toMatch(/99\.0\.0/);
  });

  it('withholds it when a receipt’s own values do not follow from the inputs it declares', () => {
    // The parser accepts a record whose declared instant is not the one its
    // values came from: it checks internal coherence, not that the result
    // follows from the inputs. Without a baseline the comparison called this
    // pair reproduced, while the house system explained none of it.
    const drifted = accepted(edited(at(T2, 'placidus'), (o) => {
      o.receipt.instant = new Date(T1).toISOString();
      o.receipt.sourceInstant = T1;
    }), 'drifted');
    const comparison = compareEnvelopes(drifted, at(T1, 'whole'), live);
    expect(comparison.explanations.find((item) => item.id === 'house-system')?.evidence).toBe('hypothesis');
    expect(comparison.limits.join(' ')).toMatch(/could not be reproduced from the inputs it declares/);
  });

  it('still says what the installed engine does, when only the identity is unestablished', () => {
    // Withholding the word "reproduced" must not throw away the useful part.
    // The arithmetic did work; what could not be established is whose engine it
    // speaks for, and the two statements are kept apart.
    const foreign = accepted(edited(at(T1, 'whole'), (o) => { o.receipt.engine.version = '99.0.0'; }), 'foreign');
    const houseSystem = compareEnvelopes(at(T1, 'placidus'), foreign, live)
      .explanations.find((item) => item.id === 'house-system');
    expect(houseSystem?.evidence).toBe('hypothesis');
    expect(houseSystem?.detail).toMatch(/fact about this engine, not a demonstration about these two files/);
  });

  it('cannot be given two records that disagree about conventions', () => {
    // The audit asked for a differing-conventions case. It cannot be built:
    // this draft implements exactly one convention set, so a record declaring
    // any other is refused before the comparison sees it. Recorded as a
    // refutation rather than left as an untested worry.
    for (const change of [
      (o: any) => { o.receipt.conventions.angles = 'other-convention'; },
      (o: any) => { o.receipt.conventions.zodiac = 'sidereal'; },
      (o: any) => { o.receipt.coverage.broadDateRange = 'certified'; },
    ]) {
      const parsed = parseNatalEnvelope(JSON.stringify(edited(at(T1, 'placidus'), change)));
      expect(parsed.ok ? 'accepted' : parsed.code).toBe('unsupported_feature');
    }
  });
});
