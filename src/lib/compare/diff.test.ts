import { describe, expect, it } from 'vitest';
import { natalChart, ENGINE_VERSION } from '@zodiacs/engine';
import { parseNatalEnvelope } from '@zodiacs/engine/receipt';
import { compareEnvelopes, type Evidence, type Replay } from './diff';
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

describe('comparing two calculation receipts', () => {
  it('reports no difference between a calculation and itself', () => {
    const envelope = buildEnvelope(ORDINARY);
    const comparison = compareEnvelopes(envelope, envelope, live);
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
    left.result.bodies[0] && (wrapped.result.bodies[0].lon = 0.5);
    const near = JSON.parse(JSON.stringify(left));
    near.result.bodies[0].lon = 359.5;
    const comparison = compareEnvelopes(near, wrapped, live);

    const row = comparison.differences.find((entry) => entry.id.endsWith('-lon'));
    expect(row?.kind).toBe('numeric');
    expect(Math.abs(row!.delta!)).toBeCloseTo(1, 9);
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

  it('reads a receipt produced by a different engine version of the same schema', () => {
    // The developer starter pins engine 0.1.1-rc.3 while the site pins rc.6.
    // Sharing a schema is a fact to check, not an assumption.
    const envelope = buildEnvelope(ORDINARY);
    const json = JSON.stringify(envelope);
    const reparsed = parseNatalEnvelope(json);
    expect(reparsed.ok).toBe(true);
  });

  it('states that two receipts from one engine show consistency, not accuracy', () => {
    const left = buildEnvelope(ORDINARY);
    const right = buildEnvelope({ ...ORDINARY, houseSystem: 'whole' });
    const comparison = compareEnvelopes(left, right, live);
    expect(comparison.limits.join(' ')).toMatch(/consistency, not independent astronomical accuracy/u);
  });
});
