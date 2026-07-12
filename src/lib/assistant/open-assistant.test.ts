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
