import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  consumeAssistantStream,
  guideDayAnchorMatches,
  parseAssistantSseFrame,
  placementSummaryForChart,
  selectedSelfChartFromJson,
} from './open-assistant';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OLDER_ID = '22222222-2222-4222-8222-222222222222';
const NEWER_ID = '33333333-3333-4333-8333-333333333333';

function profileJson({
  houseSystem = 'whole',
  timeKnown = true,
}: {
  houseSystem?: 'whole' | 'placidus';
  timeKnown?: boolean;
} = {}) {
  return JSON.stringify({
    version: 1,
    charts: [
      {
        id: OLDER_ID,
        name: 'Someone else',
        updatedAt: '2026-01-01T00:00:00.000Z',
        birth: { date: '1980-01-01', time: '12:00', timeKnown: true, place: null },
        summary: {
          houseSystem: 'whole',
          bodies: [{ body: 'Sun', lon: 280, retrograde: false }],
          angles: { asc: 12, mc: 282 },
        },
      },
      {
        id: NEWER_ID,
        name: 'Secret Person',
        updatedAt: '2026-07-12T00:00:00.000Z',
        birth: {
          date: '1990-04-17',
          time: timeKnown ? '08:45' : null,
          timeKnown,
          place: {
            name: 'Bangkok',
            country: 'TH',
            lat: 13.7563,
            lon: 100.5018,
            tz: 'Asia/Bangkok',
          },
        },
        summary: {
          houseSystem,
          bodies: [
            { body: 'Sun', lon: 15, retrograde: false },
            { body: 'Moon', lon: 95.5, retrograde: false },
            { body: 'Mercury', lon: 355.25, retrograde: true },
          ],
          angles: { asc: 5, mc: 275 },
        },
      },
    ],
  });
}

const ownerJson = () => JSON.stringify({ version: 1, accountId: ACCOUNT_ID });
const metadataJson = (selectedIds = [NEWER_ID]) => JSON.stringify({
  version: 1,
  accountId: ACCOUNT_ID,
  deviceId: '44444444-4444-4444-8444-444444444444',
  serverCursor: null,
  pendingConsentOperation: null,
  charts: [OLDER_ID, NEWER_ID].map((chartId) => ({
    chartId,
    selectedForSync: selectedIds.includes(chartId),
    serverRevision: 1,
    pendingOperation: null,
  })),
});

const selfChart = (profile = profileJson()) => (
  selectedSelfChartFromJson(profile, ownerJson(), metadataJson())
);

describe('saved-chart assistant context', () => {
  it('uses only the explicitly selected account-v2 self chart and serializes placements without PII', async () => {
    const chart = selfChart();
    expect(chart?.updatedAt).toBe('2026-07-12T00:00:00.000Z');

    const summary = await placementSummaryForChart(chart!);
    expect(summary).toBe([
      'Tropical chart placements:',
      'Sun: 15°00′ Aries · house 1',
      'Moon: 5°30′ Cancer · house 4',
      'Mercury: 25°15′ Pisces · house 12 · retrograde',
      'ASC: 5°00′ Aries · house 1',
      'MC: 5°00′ Capricorn · house 10',
    ].join('\n'));
    expect(summary).not.toMatch(/Secret Person|1990-04-17|08:45|Bangkok|13\.7563|100\.5018|Asia\/Bangkok/);
  });

  it('does not infer self ownership from chart order, name, or an ambiguous selection', () => {
    expect(selectedSelfChartFromJson(profileJson(), ownerJson(), null)).toBeNull();
    expect(selectedSelfChartFromJson(profileJson(), ownerJson(), metadataJson([]))).toBeNull();
    expect(selectedSelfChartFromJson(
      profileJson(),
      ownerJson(),
      metadataJson([OLDER_ID, NEWER_ID]),
    )).toBeNull();
    expect(selectedSelfChartFromJson(
      profileJson(),
      JSON.stringify({ version: 1, accountId: '55555555-5555-4555-8555-555555555555' }),
      metadataJson(),
    )).toBeNull();
  });

  it('omits angles and houses when birth time is unknown', async () => {
    const chart = selfChart(profileJson({ timeKnown: false }));
    const summary = await placementSummaryForChart(chart!);
    expect(summary).toContain('Sun: 15°00′ Aries');
    expect(summary).not.toMatch(/house|ASC:|MC:/);
  });

  it('recomputes Placidus houses locally and still returns placements only', async () => {
    const chart = selfChart(profileJson({ houseSystem: 'placidus' }));
    const summary = await placementSummaryForChart(chart!);
    expect(summary).toMatch(/Sun: \d+°\d{2}′ [A-Z][a-z]+ · house \d+/);
    expect(summary).toMatch(/ASC: .* · house 1/);
    expect(summary).not.toMatch(/Secret Person|1990-04-17|08:45|Bangkok|13\.7563|100\.5018|Asia\/Bangkok/);
  });
});

describe('Guide day and retry boundaries', () => {
  it('rotates on either local-date or time-zone change', () => {
    expect(guideDayAnchorMatches('2026-08-13', 'Asia/Bangkok', '2026-08-13', 'Asia/Bangkok'))
      .toBe(true);
    expect(guideDayAnchorMatches('2026-08-13', 'Asia/Bangkok', '2026-08-14', 'Asia/Bangkok'))
      .toBe(false);
    expect(guideDayAnchorMatches('2026-08-13', 'Asia/Bangkok', '2026-08-13', 'Europe/Rome'))
      .toBe(false);
  });

  it('rechecks the day after consent awaits and rejects stale context retries', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const submit = source.slice(
      source.indexOf('async function submitQuestion()'),
      source.indexOf('async function retryTurn()'),
    );
    const retry = source.slice(
      source.indexOf('async function retryTurn()'),
      source.indexOf('function focusableControls()'),
    );
    const run = source.slice(
      source.indexOf('async function runTurn('),
      source.indexOf('async function submitQuestion()'),
    );
    expect(submit).toContain('if (!await requestCloudConsent()) return;\n    if (rotateGuideDayIfNeeded()) return;');
    expect(submit).toContain('await requestChartConsent(expectedGeneration);\n    }\n    if (rotateGuideDayIfNeeded()) return;');
    expect(run).toContain('if (rotateGuideDayIfNeeded())');
    expect(retry).toContain('prior.body.contextEpoch !== state.contextEpoch');
    expect(retry).toContain('prior.body.baseRevision !== state.revision');
  });
});

describe('assistant SSE frames', () => {
  it('parses text, completion, and error frames', () => {
    expect(parseAssistantSseFrame('data: {"t":"hello"}')).toEqual({ delta: 'hello' });
    expect(parseAssistantSseFrame('data: [DONE]')).toEqual({ done: true });
    expect(parseAssistantSseFrame('event: message\ndata: {"error":"unavailable"}'))
      .toEqual({ error: 'unavailable' });
  });

  it('fails closed on malformed model data', () => {
    expect(parseAssistantSseFrame('data: <b>not json</b>'))
      .toEqual({ error: 'temporarily_unavailable' });
    expect(parseAssistantSseFrame(': keepalive')).toEqual({});
  });

  it('rejects a truncated stream that ends without DONE', async () => {
    const deltas: string[] = [];
    await expect(consumeAssistantStream(
      new Response('data: {"t":"partial"}\n\n'),
      (delta) => deltas.push(delta),
    )).rejects.toThrow('unavailable');
    expect(deltas).toEqual(['partial']);
  });
});

describe('Guide response links', () => {
  it('links only exact server-approved catalog paths', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const allowlist = source.slice(
      source.indexOf('const GUIDE_LINK_PATHS'),
      source.indexOf('let stylesheetPromise'),
    );
    const renderer = source.slice(
      source.indexOf('export function renderAssistantText'),
      source.indexOf('function scrollTranscript'),
    );
    expect(allowlist).toContain("'/sdk/#astrofolio'");
    expect(allowlist).not.toContain("'/private/'");
    expect(renderer).toContain('GUIDE_LINK_PATHS.has(`${url.pathname}${url.hash}`)');
    expect(renderer).toContain("url.search === ''");
  });
});

describe('Guide avatar identity', () => {
  it('ships one bounded local derivative and uses it accessibly across Guide surfaces', async () => {
    const root = new URL('../../../', import.meta.url);
    const avatar = await readFile(new URL('public/assets/guide-avatar.webp', root));
    const metadata = await sharp(avatar).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 256, height: 256 });
    expect(avatar.byteLength).toBeLessThan(20_000);
    expect(createHash('sha256').update(avatar).digest('hex'))
      .toBe('9970c7c5d7d20343e20a7f59422f3647c2ff3bf38a0565ac145d5bed0f96bb11');

    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const css = await readFile(new URL('./assistant.css', import.meta.url), 'utf8');
    const build = await readFile(new URL('../../../scripts/build-assistant-ui.mjs', import.meta.url), 'utf8');
    expect(source).toContain("const GUIDE_AVATAR_SRC = '/assets/guide-avatar.webp';");
    expect(source).toContain("image.alt = '';");
    expect(source).toContain("image.loading = 'lazy';");
    expect(source).toContain("image.decoding = 'async';");
    expect(source).toContain("image.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("image.setAttribute('fetchpriority', 'low');");
    for (const surface of [
      "createGuideAvatar('zguide-launcher__avatar', 32)",
      "createGuideAvatar('zguide-invite__avatar', 44)",
      "createGuideAvatar('zassistant__avatar', 38)",
      "createGuideAvatar('zassistant__message-avatar', 20)",
    ]) expect(source).toContain(surface);
    expect(css).toContain('.zguide-avatar {');
    expect(css).toContain('.zguide-launcher__avatar { width: 32px; height: 32px; }');
    expect(build).toContain("const avatarSource = resolve(repo, 'public/assets/guide-avatar.webp');");
    expect(build).toContain('await copyFile(avatarSource, avatar);');
    expect(build).toContain('if (avatarSize > 20_000)');
  });
});

describe('assistant profile-access privacy fence', () => {
  it('invalidates first, then scrubs every account-derived assistant surface on denial', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const clearStart = source.indexOf('function clearAssistantForProfileRevocation()');
    const handlerStart = source.indexOf('function onProfileAccessChange()');
    const consentStart = source.indexOf('async function requestChartConsent(');
    const clear = source.slice(clearStart, handlerStart);
    const handler = source.slice(handlerStart, consentStart);

    expect(clearStart).toBeGreaterThan(-1);
    expect(handler).toContain('profileAccessGeneration += 1;');
    expect(handler.indexOf('profileAccessGeneration += 1;'))
      .toBeLessThan(handler.indexOf('profileAccessAllowed()'));
    expect(handler).toContain('refreshSavedChart();');
    expect(handler).toContain('clearAssistantForProfileRevocation();');

    for (const requiredScrub of [
      'abortRequest();',
      'dismissPendingConsent?.();',
      'dismissPendingCloudConsent?.();',
      'dismissPendingConsent = null;',
      'dismissPendingCloudConsent = null;',
      'savedChart = null;',
      'chartSummaryPromise = null;',
      'chartConsented = false;',
      'chartEnabled = false;',
      'chartSourceId = null;',
      'pendingRetry = null;',
      'replaceWithFreshSession();',
      'transcript?.replaceChildren();',
      "textarea.value = '';",
      'setBusy(false);',
    ]) {
      expect(clear, requiredScrub).toContain(requiredScrub);
    }
    expect(source).toContain(
      "window.addEventListener('zodiacs:profile-access', onProfileAccessChange);",
    );
    expect(source).toContain("window.addEventListener('zodiacs:profile', onProfileDataChange);");
    expect(source).toContain("window.addEventListener('storage', onGuideStorageChange);");
    expect(source).toContain('if (event.key === null || event.key === PROFILE_KEY');
    expect(source).toContain('getSession().authBoundary !== `account:${ownerId}`');
  });

  it('scrubs private DOM before BFCache and requires a fresh auth snapshot after restore', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const suspend = source.slice(
      source.indexOf('function suspendGuideForPageCache()'),
      source.indexOf('function restoreGuideAfterPageCache('),
    );
    const restore = source.slice(
      source.indexOf('function restoreGuideAfterPageCache('),
      source.indexOf('function onProfileAccessChange()'),
    );
    expect(suspend).toContain('profileAccessGeneration += 1;');
    expect(suspend).toContain('authFenceCleanup?.();');
    expect(suspend).toContain('authFencePromise = null;');
    expect(suspend).toContain('transcript?.replaceChildren();');
    expect(suspend).toContain('if (root) root.hidden = true;');
    expect(restore).toContain('if (!event.persisted) return;');
    expect(restore).toContain('void ensureGuideAuthFence();');
    expect(source).toContain("window.addEventListener('pagehide', suspendGuideForPageCache);");
    expect(source).toContain("window.addEventListener('pageshow', restoreGuideAfterPageCache);");
  });

  it('fences consent, network send, stream paint, and completion state to one access generation', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const consentStart = source.indexOf('async function requestChartConsent(');
    const submitStart = source.indexOf('async function submitQuestion()');
    const focusStart = source.indexOf('function focusableControls()');
    const consent = source.slice(consentStart, submitStart);
    const submit = source.slice(submitStart, focusStart);

    expect(consent).toContain('expectedGeneration = profileAccessGeneration');
    expect(consent).toContain('!currentProfileAccessGeneration(expectedGeneration)');
    expect(consent.indexOf('const summary = await chartSummaryPromise;'))
      .toBeLessThan(consent.indexOf('savedChart !== chart'));
    expect(consent).toContain('return current && granted;');

    expect(submit).toContain('const expectedGeneration = profileAccessGeneration;');
    expect(submit).toContain('await requestCloudConsent()');
    expect(submit).toContain('requestChartConsent(expectedGeneration)');
    expect(submit).toContain('!currentProfileAccessGeneration(expectedGeneration)');

    const runStart = source.indexOf('async function runTurn(');
    const submitEnd = source.indexOf('async function submitQuestion()');
    const run = source.slice(runStart, submitEnd);
    expect(run).toContain('activeRequest === request');
    expect(run).toContain("const response = await fetch('/v1/guide/turn'");
    expect(run).toContain('signal: request.signal');
    expect(run).toContain('await response.body?.cancel().catch(() => {});');
    expect(run).toContain('if (!requestIsCurrent()) return;');
    expect(run).toContain('if (activeRequest === request) setBusy(false);');
    expect(run).toContain('sameSelfChartAuthority');
    expect(run).toContain('window.setInterval');
    expect(run).toContain('onProfileDataChange();');

    const toggleStart = source.indexOf('function toggleChart()');
    const buildStart = source.indexOf('function build()');
    const toggle = source.slice(toggleStart, buildStart);
    expect(toggle).toContain('requestChartConsent(expectedGeneration)');
    expect(toggle).toContain('invalidateContext(true);');
  });

  it('limits page context to a fixed public catalog and never reads private URL surfaces', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const pageStart = source.indexOf('const PAGE_CATALOG =');
    const contextStart = source.indexOf('function invalidateContext(');
    const pageBoundary = source.slice(pageStart, contextStart);

    expect(pageBoundary).toContain("sourceId: `page:${id}`");
    expect(pageBoundary).toContain('approvedPageId(location.pathname)');
    expect(pageBoundary).not.toMatch(/location\.(?:search|href|hash)|document\.referrer|document\.title/);
    expect(pageBoundary).toContain("if (!id) return null;");
  });

  it('bootstraps a quiet launcher without reading a chart or calling Guide', async () => {
    const source = await readFile(new URL('./open-assistant.ts', import.meta.url), 'utf8');
    const bootstrapStart = source.indexOf('export async function bootstrapGuide(');
    const openStart = source.indexOf('export async function openAssistant(');
    const bootstrap = source.slice(bootstrapStart, openStart);

    expect(bootstrap).toContain('window.setTimeout(showInvite, 2_000);');
    expect(bootstrap).not.toContain('readSelectedSelfChart');
    expect(bootstrap).not.toContain('fetch(');
    expect(bootstrap).not.toContain('.focus()');
  });

  it('keeps remote analytics out of every surface that hosts Guide state', async () => {
    const root = new URL('../../../', import.meta.url);
    const base = await readFile(new URL('src/layouts/Base.astro', root), 'utf8');
    expect(base).toContain('const guideRuntimeEnabled = true;');
    expect(base).toContain('&& !accountSyncV2Enabled && !guideRuntimeEnabled');
    for (const path of [
      'public/archive/index.html',
      'public/registry/aries/index.html',
      'public/registry/technical/index.html',
      'public/sdk/index.html',
      'public/terminal/index.html',
      'public/terminal/markets/index.html',
      'public/thesis/index.html',
    ]) {
      const html = await readFile(new URL(path, root), 'utf8');
      expect(html, path).not.toContain('plausible.io/js');
      expect(html, path).toContain("mod.bootstrapGuide('en')");
    }
  });
});
