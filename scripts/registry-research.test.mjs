import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REGISTRY_RESEARCH_FEED_SCHEMA,
  buildRegistryResearchLedger,
  immutableRegistryResearchItem,
  publishRegistryResearch,
  registryResearchRss,
  validateRegistryResearchItem,
} from './registry-research-lib.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function json(relativePath) {
  return JSON.parse(await readFile(resolve(repositoryRoot, relativePath), 'utf8'));
}

async function committedInputs() {
  const [daily, outlook, marketHistory, approvals] = await Promise.all([
    json('src/data/daily.json'),
    json('public/assets/registry-outlook.json'),
    json('public/assets/data/registry-market-history.v1.json'),
    json('src/data/registry-research/approval-manifest.json'),
  ]);
  const start = new Date(`${daily.date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + (8 * 86_400_000));
  const monthKeys = new Set([start.toISOString().slice(0, 7), end.toISOString().slice(0, 7)]);
  const transitMonths = await Promise.all([...monthKeys].map((month) => json(`src/data/transits-${month}.json`)));
  return { daily, outlook, marketHistory, approvalManifest: approvals, transitMonths };
}

function deepClone(value) {
  return structuredClone(value);
}

const DAY_MS = 86_400_000;

// The committed eight-day window can hold no sky event at all (2026-09-02 to
// 2026-09-09 had none), so the tests that need an event brief plant one
// deterministic ingress on the edition's second day instead of trusting the
// calendar. Everything else in the ledger stays the committed evidence.
function withFixtureEvent(inputs) {
  const cloned = deepClone(inputs);
  const at = new Date(Date.parse(`${inputs.daily.date}T00:00:00.000Z`) + DAY_MS + (12 * 60 * 60 * 1000)).toISOString();
  cloned.transitMonths[0].ingresses.push({ planet: 'Mercury', at, sign: 'libra', retrograde: false });
  return { inputs: cloned, at };
}

// Pilot-window fixtures. The approval manifest's pilot has a fixed calendar
// window (2026-08-10 to 2026-09-08); the publication rule under test is a
// function of whether an item's day falls inside it, so the tests set the
// window explicitly relative to the committed edition rather than trusting
// the date the suite happens to run on.
function withPilotCovering(inputs) {
  const cloned = deepClone(inputs);
  cloned.approvalManifest.pilot.endsOn = '2099-12-31';
  return cloned;
}

function withPilotEndedBefore(inputs) {
  const cloned = deepClone(inputs);
  const dayBefore = new Date(Date.parse(`${inputs.daily.date}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
  cloned.approvalManifest.pilot.startsOn = '2026-08-10';
  cloned.approvalManifest.pilot.endsOn = dayBefore < '2026-08-10' ? '2026-08-10' : dayBefore;
  return cloned;
}

function approvalFor(item, overrides = {}) {
  return {
    itemId: item.id,
    artifactSha256: item.artifactHash,
    reviewer: 'Registry editorial reviewer',
    reviewedAt: '2026-08-10T13:00:00.000Z',
    ...overrides,
  };
}

describe('Registry Research deterministic publication', () => {
  it('builds deterministic daily, market, scheduled weekly, and event drafts from committed evidence', async () => {
    const inputs = await committedInputs();
    const first = buildRegistryResearchLedger(inputs);
    const second = buildRegistryResearchLedger(inputs);

    expect(first).toEqual(second);
    expect(first.items.some((item) => item.kind === 'daily-market-brief')).toBe(true);
    expect(first.items.find((item) => item.kind === 'daily-market-brief').title).toContain('daily market brief');
    expect(first.items.some((item) => item.kind === 'market-check')).toBe(true);
    const expectsWeekly = new Date(`${inputs.daily.date}T00:00:00.000Z`).getUTCDay() === 1;
    expect(first.items.some((item) => item.kind === 'weekly-outlook')).toBe(expectsWeekly);
    const fixture = withFixtureEvent(inputs);
    const withEvent = buildRegistryResearchLedger(fixture.inputs);
    const committedBriefs = first.items.filter((item) => item.kind === 'event-brief');
    const fixtureBriefs = withEvent.items.filter((item) => item.kind === 'event-brief');
    expect(fixtureBriefs).toHaveLength(committedBriefs.length + 1);
    expect(fixtureBriefs.some((item) => item.visibleAt === fixture.at && item.slug.startsWith('event-brief-ingress-'))).toBe(true);
    expect(first.items.every((item) => item.method.modelAuthoredProse === false)).toBe(true);
    expect(first.items.every((item) => item.riskStatement.includes('not investment advice'))).toBe(true);
  });

  it('proves that market fixture changes cannot alter sky scores or sky/traditional copy', async () => {
    const inputs = await committedInputs();
    const changed = deepClone(inputs);
    for (const snapshot of changed.marketHistory.snapshots) {
      for (const asset of snapshot.assets) {
        asset.priceUsd = asset.priceUsd ? asset.priceUsd * 12 : asset.priceUsd;
        asset.marketCapUsd = asset.marketCapUsd ? asset.marketCapUsd * 12 : asset.marketCapUsd;
        asset.liquidityUsd = asset.liquidityUsd ? asset.liquidityUsd / 12 : asset.liquidityUsd;
      }
    }
    const originalLedger = buildRegistryResearchLedger(inputs);
    const changedLedger = buildRegistryResearchLedger(changed);
    const original = originalLedger.items.find((item) => item.kind === 'daily-market-brief');
    const mutated = changedLedger.items.find((item) => item.kind === 'daily-market-brief');

    expect(mutated.symbolicScore).toEqual(original.symbolicScore);
    expect(mutated.sections.skyFact).toEqual(original.sections.skyFact);
    expect(mutated.sections.traditionalReading).toEqual(original.sections.traditionalReading);
    expect(mutated.sections.marketObservation.body).not.toBe(original.sections.marketObservation.body);
  });

  it('keeps the sky brief intact when paired market data is missing and rejects misdated market evidence', async () => {
    const inputs = await committedInputs();
    const missing = deepClone(inputs);
    missing.marketHistory.snapshots = missing.marketHistory.snapshots.filter((snapshot) => snapshot.date !== inputs.daily.date);
    const ledger = buildRegistryResearchLedger(missing);
    const daily = ledger.items.find((item) => item.kind === 'daily-market-brief');
    const market = ledger.items.find((item) => item.kind === 'market-check');
    expect(daily.symbolicScore).not.toBeNull();
    expect(daily.market.available).toBe(false);
    expect(market.market.available).toBe(false);
    expect(market.sections.marketObservation.body).toContain('market comparison is delayed');

    const stale = deepClone(inputs);
    stale.marketHistory.snapshots.at(-1).source.readAt = '2026-08-09T23:59:59.000Z';
    expect(() => buildRegistryResearchLedger(stale)).toThrow('read instant must match its UTC date');
  });

  it('keeps pilot drafts out of public feeds until their exact artifact hashes are reviewed', async () => {
    // The committed manifest's pilot ended on 2026-09-08. Pin the pilot over
    // the committed edition so this rule is tested on every calendar day
    // instead of only during the pilot window itself.
    const inputs = withPilotCovering(await committedInputs());
    const ledger = buildRegistryResearchLedger(inputs);
    const draftOnly = publishRegistryResearch({ ledger, approvalManifest: inputs.approvalManifest });
    expect(draftOnly.feed.items).toEqual([]);

    const item = ledger.items.find((candidate) => candidate.kind === 'daily-market-brief');
    const approvedManifest = deepClone(inputs.approvalManifest);
    approvedManifest.approvals.push(approvalFor(item, {
      reviewedAt: new Date(Date.parse(item.visibleAt) + 60_000).toISOString(),
    }));
    const approved = publishRegistryResearch({ ledger, approvalManifest: approvedManifest });

    expect(approved.feed.items).toHaveLength(1);
    expect(approved.feed.items[0]).toMatchObject({
      id: item.id,
      kind: 'daily-market-brief',
      sourceType: 'zodiacs-research',
      publisher: 'Zodiacs.org Research System',
      status: 'published',
    });
    expect(approved.publication.items[0].publication).toMatchObject({
      mode: 'human-approved-pilot',
      reviewer: 'Registry editorial reviewer',
      artifactSha256: item.artifactHash,
    });
  });

  it('publishes only allowlisted deterministic templates once the pilot has ended', async () => {
    const inputs = withPilotEndedBefore(await committedInputs());
    const ledger = buildRegistryResearchLedger(inputs);
    const { allowlist, published } = (() => {
      const result = publishRegistryResearch({ ledger, approvalManifest: inputs.approvalManifest });
      return { allowlist: inputs.approvalManifest.postPilot.automaticTemplateIds, published: result };
    })();
    const draftsById = new Map(ledger.items.map((item) => [item.id, item]));

    expect(published.feed.items.length).toBeGreaterThan(0);
    for (const item of published.publication.items) {
      const draft = draftsById.get(item.id);
      expect(draft).toBeDefined();
      expect(allowlist).toContain(draft.templateId);
      expect(item.publication).toMatchObject({
        mode: 'post-pilot-deterministic-allowlist',
        reviewer: null,
        artifactSha256: draft.artifactHash,
      });
      expect(item.publication.publishedAt).toBe(draft.issuedAt);
    }
    const unlisted = ledger.items.filter((item) => !allowlist.includes(item.templateId)).map((item) => item.id);
    for (const id of unlisted) {
      expect(published.publication.items.some((item) => item.id === id)).toBe(false);
    }

    // A pilot-era manifest over the same edition publishes nothing without approvals.
    const pilot = publishRegistryResearch({ ledger, approvalManifest: withPilotCovering(inputs).approvalManifest });
    expect(pilot.feed.items).toEqual([]);
  });

  it('freezes automatically published items so a later same-day observation cannot rewrite them', async () => {
    const inputs = withPilotEndedBefore(await committedInputs());
    const first = buildRegistryResearchLedger(inputs);
    const firstBrief = first.items.find((item) => item.kind === 'daily-market-brief');
    expect(firstBrief).toBeDefined();
    expect(publishRegistryResearch({ ledger: first, approvalManifest: inputs.approvalManifest }).publication.items
      .some((item) => item.id === firstBrief.id)).toBe(true);

    // A second observation the same day: a later read with different numbers.
    const later = deepClone(inputs);
    const snapshot = later.marketHistory.snapshots.at(-1);
    snapshot.source.readAt = new Date(Date.parse(snapshot.source.readAt) + (60 * 60 * 1000)).toISOString();
    for (const asset of snapshot.assets) {
      if (Number.isFinite(asset.priceUsd)) asset.priceUsd *= 1.5;
      if (Number.isFinite(asset.marketCapUsd)) asset.marketCapUsd *= 1.5;
    }
    const second = buildRegistryResearchLedger({ ...later, existingLedger: first });
    expect(second.generatedAt).toBe(snapshot.source.readAt);
    expect(second.items.find((item) => item.id === firstBrief.id)).toEqual(firstBrief);
    expect(() => publishRegistryResearch({ ledger: second, approvalManifest: later.approvalManifest })).not.toThrow();

    // The same second observation during the pilot, with nothing approved,
    // still regenerates the unpublished draft.
    const pilotFirst = buildRegistryResearchLedger(withPilotCovering(inputs));
    const pilotBrief = pilotFirst.items.find((item) => item.kind === 'daily-market-brief');
    const pilotSecond = buildRegistryResearchLedger({ ...withPilotCovering(later), existingLedger: pilotFirst });
    expect(pilotSecond.items.find((item) => item.id === pilotBrief.id).artifactHash).not.toBe(pilotBrief.artifactHash);
  });

  it('reveals an approved event at its exact time without mutating the immutable item payload', async () => {
    const fixture = withFixtureEvent(await committedInputs());
    const inputs = fixture.inputs;
    const ledger = buildRegistryResearchLedger(inputs);
    // The ledger clock is the latest market snapshot's read time, which can
    // fall after every event in the window (a snapshot archived late in the
    // day did exactly that on 2026-09-01), and the window can hold no event at
    // all. Use the planted event and anchor both phases on its exact time so
    // the reveal is tested at its boundary whatever the calendar holds.
    const event = ledger.items.find((item) => item.kind === 'event-brief' && item.visibleAt === fixture.at);
    expect(event).toBeDefined();
    const justBefore = new Date(Date.parse(event.visibleAt) - 1).toISOString();
    const manifest = deepClone(inputs.approvalManifest);
    manifest.approvals.push(approvalFor(event, { reviewedAt: justBefore }));

    const earlierLedger = deepClone(ledger);
    earlierLedger.generatedAt = justBefore;
    const before = publishRegistryResearch({ ledger: earlierLedger, approvalManifest: manifest });
    const scheduled = before.publication.items.find((item) => item.id === event.id);
    expect(scheduled.status).toBe('scheduled');

    const laterLedger = deepClone(ledger);
    laterLedger.generatedAt = new Date(Date.parse(event.visibleAt) + 1).toISOString();
    const after = publishRegistryResearch({ ledger: laterLedger, approvalManifest: manifest });
    const visible = after.publication.items.find((item) => item.id === event.id);
    expect(visible.status).toBe('published');
    expect(immutableRegistryResearchItem(visible)).toEqual(immutableRegistryResearchItem(scheduled));
  });

  it('rejects stale approval hashes and preserves an already approved immutable item during replay', async () => {
    const inputs = await committedInputs();
    const first = buildRegistryResearchLedger(inputs);
    const item = first.items.find((candidate) => candidate.kind === 'daily-market-brief');
    const approvedManifest = deepClone(inputs.approvalManifest);
    approvedManifest.approvals.push(approvalFor(item));

    const changed = deepClone(inputs);
    changed.marketHistory.snapshots.at(-1).assets[0].priceUsd *= 5;
    changed.existingLedger = first;
    changed.approvalManifest = approvedManifest;
    const replay = buildRegistryResearchLedger(changed);
    expect(replay.items.find((candidate) => candidate.id === item.id).artifactHash).toBe(item.artifactHash);

    const staleManifest = deepClone(approvedManifest);
    staleManifest.approvals[0].artifactSha256 = '0'.repeat(64);
    expect(() => publishRegistryResearch({ ledger: first, approvalManifest: staleManifest }))
      .toThrow(`Approval hash for ${item.id} does not match`);
  });

  it('appends observations using the first qualifying archive snapshot and reports actual elapsed time', async () => {
    const inputs = await committedInputs();
    const first = buildRegistryResearchLedger(inputs);
    const futureInputs = deepClone(inputs);
    const latest = deepClone(futureInputs.marketHistory.snapshots.at(-1));
    const baseMs = new Date(latest.source.readAt).getTime();
    latest.source.readAt = new Date(baseMs + (25 * 3_600_000)).toISOString();
    latest.date = latest.source.readAt.slice(0, 10);
    const sign = strongestMarketCheck(first).market.sign;
    const changedAsset = latest.assets.find((asset) => asset.sign === sign);
    changedAsset.priceUsd *= 1.1;
    changedAsset.liquidityUsd *= 0.9;
    futureInputs.marketHistory.snapshots.push(latest);
    futureInputs.existingLedger = first;

    const replay = buildRegistryResearchLedger(futureInputs);
    const observation = replay.items.find((item) => item.kind === 'observation-update' && item.market.requestedElapsedHours === 24);
    expect(observation.market.actualElapsedHours).toBe(25);
    expect(observation.market.priceChangePct).toBe(10);
    expect(observation.market.liquidityChangePct).toBe(-10);
    expect(observation.sections.marketObservation.body).toContain('does not establish causation');
    expect(observation.revisions).toEqual([{ kind: 'append-only-follow-up', parentId: observation.parentId }]);
  });

  it('allows only disclosed deterministic templates after the pilot', async () => {
    const inputs = await committedInputs();
    const postPilot = deepClone(inputs.approvalManifest);
    postPilot.pilot.startsOn = '2026-01-01';
    postPilot.pilot.endsOn = '2026-01-30';
    const ledger = buildRegistryResearchLedger({ ...inputs, approvalManifest: postPilot });
    const published = publishRegistryResearch({ ledger, approvalManifest: postPilot });
    expect(published.feed.items.length).toBeGreaterThan(0);
    expect(published.publication.items.every((item) => item.publication.mode === 'post-pilot-deterministic-allowlist')).toBe(true);

    postPilot.postPilot.automaticTemplateIds = ['event-brief.v1'];
    const eventsOnly = publishRegistryResearch({ ledger, approvalManifest: postPilot });
    expect(eventsOnly.publication.items.every((item) => item.kind === 'event-brief')).toBe(true);
  });

  it('rejects directional claims and XML-escapes published summaries', async () => {
    const inputs = await committedInputs();
    const ledger = buildRegistryResearchLedger(inputs);
    const item = ledger.items[0];
    expect(() => validateRegistryResearchItem({ ...item, title: 'A bullish price target' }, { requireHash: false }))
      .toThrow('prohibited directional or causal language');

    const xml = registryResearchRss({
      schema: REGISTRY_RESEARCH_FEED_SCHEMA,
      generatedAt: '2026-08-10T14:00:00.000Z',
      items: [{
        id: 'zrx-test',
        kind: 'daily-market-brief',
        publishedAt: '2026-08-10T13:00:00.000Z',
        visibleAt: '2026-08-10T12:00:00.000Z',
        title: 'Sky & market <check>',
        summary: 'Observed, not "predicted".',
        url: '/terminal/research/test/',
        status: 'published',
      }],
    });
    expect(xml).toContain('Sky &amp; market &lt;check&gt;');
    expect(xml).not.toContain('<check>');
  });
});

function strongestMarketCheck(ledger) {
  return ledger.items.find((item) => item.kind === 'market-check');
}
