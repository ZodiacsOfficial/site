import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  consumeAssistantStream,
  latestSavedChartFromJson,
  parseAssistantSseFrame,
  placementSummaryForChart,
} from './open-assistant';

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
        id: 'older',
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
        id: 'newer',
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

describe('saved-chart assistant context', () => {
  it('selects the newest chart and serializes Whole Sign placements without PII', async () => {
    const chart = latestSavedChartFromJson(profileJson());
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

  it('omits angles and houses when birth time is unknown', async () => {
    const chart = latestSavedChartFromJson(profileJson({ timeKnown: false }));
    const summary = await placementSummaryForChart(chart!);
    expect(summary).toContain('Sun: 15°00′ Aries');
    expect(summary).not.toMatch(/house|ASC:|MC:/);
  });

  it('recomputes Placidus houses locally and still returns placements only', async () => {
    const chart = latestSavedChartFromJson(profileJson({ houseSystem: 'placidus' }));
    const summary = await placementSummaryForChart(chart!);
    expect(summary).toMatch(/Sun: \d+°\d{2}′ [A-Z][a-z]+ · house \d+/);
    expect(summary).toMatch(/ASC: .* · house 1/);
    expect(summary).not.toMatch(/Secret Person|1990-04-17|08:45|Bangkok|13\.7563|100\.5018|Asia\/Bangkok/);
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
    expect(parseAssistantSseFrame('data: <b>not json</b>')).toEqual({ error: 'unavailable' });
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
      'dismissPendingConsent = null;',
      'savedChart = null;',
      'chartSummaryPromise = null;',
      'chartConsented = false;',
      'chartEnabled = false;',
      'messages = [];',
      'transcript?.replaceChildren();',
      "textarea.value = '';",
      'setBusy(false);',
    ]) {
      expect(clear, requiredScrub).toContain(requiredScrub);
    }
    expect(source).toContain(
      "window.addEventListener('zodiacs:profile-access', onProfileAccessChange);",
    );
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
    expect(consent).toContain('resolve(current && granted);');

    expect(submit).toContain('const expectedGeneration = profileAccessGeneration;');
    expect(submit).toContain('activeRequest === request');
    expect(submit).toContain('requestChartConsent(expectedGeneration)');
    expect(submit.indexOf('if (!requestIsCurrent()) return;'))
      .toBeLessThan(submit.indexOf("const response = await fetch('/api/assistant'"));
    expect(submit).toContain('signal: request.signal');
    expect(submit).toContain('await response.body?.cancel().catch(() => {});');
    expect(submit).toContain('await consumeAssistantStream(response, (delta) => {\n      if (!requestIsCurrent()) return;');
    expect(submit).toContain('if (!requestIsCurrent()) return;\n    assistantMessage.article.removeAttribute');
    expect(submit).toContain('if (activeRequest === request) setBusy(false);');

    const chartButton = source.slice(
      source.indexOf("chartButton.addEventListener('click'"),
      source.indexOf("transcript = document.createElement('div')"),
    );
    expect(chartButton).toContain('requestChartConsent(expectedGeneration).then((granted) => {');
    expect(chartButton).toContain('if (!currentProfileAccessGeneration(expectedGeneration)) return;');
  });
});
