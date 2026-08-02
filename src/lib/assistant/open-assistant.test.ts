import { describe, expect, it } from 'vitest';
import {
  consumeAssistantStream,
  parseAssistantSseFrame,
  parseGuideMeta,
  placementSummaryForChart,
  prepareChartForAssistant,
  savedChartsFromJson,
} from './open-assistant';
import { decodePositionsLink, POSITION_BODY_ORDER } from '../share-positions';

const longitudes = [15, 95.5, 355.25, 43, 81, 128, 191, 234, 278, 301, 19, 199];

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
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Older chart',
        updatedAt: '2026-01-01T00:00:00.000Z',
        birth: { date: '1980-01-01', time: '12:00', timeKnown: true, place: null },
        summary: {
          engineVersion: '0.1.0', houseSystem: 'whole',
          bodies: POSITION_BODY_ORDER.map((body, index) => ({ body, lon: longitudes[index], retrograde: false })),
          angles: { asc: 12, mc: 282 },
        },
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Secret Person',
        updatedAt: '2026-07-12T00:00:00.000Z',
        birth: {
          date: '1990-04-17', time: timeKnown ? '08:45' : null, timeKnown,
          place: { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' },
        },
        summary: {
          engineVersion: '0.1.0', houseSystem,
          bodies: POSITION_BODY_ORDER.map((body, index) => ({
            body, lon: longitudes[index], retrograde: body === 'Mercury' || body === 'Saturn',
          })),
          angles: { asc: 5, mc: 275 },
        },
      },
    ],
  });
}

describe('saved-chart assistant payload', () => {
  it('returns every chart for explicit selection and produces a strict v2 payload without PII', async () => {
    const charts = savedChartsFromJson(profileJson());
    expect(charts.map((chart) => chart.name)).toEqual(['Secret Person', 'Older chart']);
    const prepared = await prepareChartForAssistant(charts[0]!);
    expect(prepared).not.toBeNull();
    expect(prepared!.payload.retrogradeBodies).toEqual(['Mercury', 'Saturn']);
    expect(prepared!.payload.cusps).toBeUndefined();
    expect(decodePositionsLink(prepared!.payload.positionsToken)?.bodies).toHaveLength(12);
    expect(JSON.stringify(prepared!.payload)).not.toMatch(
      /Secret Person|22222222|1990-04-17|08:45|Bangkok|13\.7563|100\.5018|Asia\/Bangkok/,
    );
    expect(prepared!.placementPreview).toContain('Sun: 15°00′ Aries · house 1');
  });

  it('omits angles and houses when birth time is unknown', async () => {
    const chart = savedChartsFromJson(profileJson({ timeKnown: false }))[0]!;
    const prepared = await prepareChartForAssistant(chart);
    expect(prepared?.capabilities.houses).toBe(false);
    expect(decodePositionsLink(prepared!.payload.positionsToken)?.angles).toBeNull();
    expect(await placementSummaryForChart(chart)).not.toMatch(/house|ASC:|MC:/);
  });

  it('recomputes Placidus cusps locally and sends only the derived cusp longitudes', async () => {
    const chart = savedChartsFromJson(profileJson({ houseSystem: 'placidus' }))[0]!;
    const prepared = await prepareChartForAssistant(chart);
    expect(prepared?.payload.cusps).toHaveLength(12);
    expect(prepared?.capabilities.houses).toBe(true);
    expect(JSON.stringify(prepared?.payload)).not.toMatch(/1990|Bangkok|06:20|08:45|Asia\/Bangkok/);
  });
});

const meta = {
  capabilities: { chart: true, houses: false, transits: true },
  receipts: [{
    label: 'Moon square Saturn',
    factIds: ['chart:aspect:moon-square-saturn'],
    sourceIds: ['learn-aspects-square'],
    sources: [{ id: 'learn-aspects-square', path: '/learn/aspects/', title: 'The aspects', heading: 'Square' }],
  }],
  followUps: [
    { question: 'How can I work with this?', requires: 'chart', factIds: [], sourceIds: [] },
    { question: 'Which house is involved?', requires: 'houses', factIds: [], sourceIds: [] },
  ],
};

describe('assistant SSE v2', () => {
  it('parses named status, delta, validated metadata, errors, and completion', () => {
    expect(parseAssistantSseFrame('event: status\ndata: {"stage":"thinking"}')).toEqual({ status: 'thinking' });
    expect(parseAssistantSseFrame('event: status\ndata: {"stage":"no_coverage"}')).toEqual({ status: 'no_coverage' });
    expect(parseAssistantSseFrame('event: answer.delta\ndata: {"text":"hello"}')).toEqual({ delta: 'hello' });
    expect(parseAssistantSseFrame(`event: guide.meta\ndata: ${JSON.stringify(meta)}`).meta?.receipts[0]?.sources[0]?.path)
      .toBe('/learn/aspects/');
    expect(parseAssistantSseFrame('event: error\ndata: {"code":"service_budget","retryable":false}'))
      .toEqual({ error: 'service_budget', retryable: false });
    expect(parseAssistantSseFrame('event: done\ndata: {}')).toEqual({ done: true });
  });

  it('keeps v1 text and completion frames during the compatibility window', () => {
    expect(parseAssistantSseFrame('data: {"t":"hello"}')).toEqual({ delta: 'hello' });
    expect(parseAssistantSseFrame('data: [DONE]')).toEqual({ done: true });
  });

  it('filters invented sources and capability-incompatible follow-ups', () => {
    const parsed = parseGuideMeta({
      ...meta,
      receipts: [{ ...meta.receipts[0], sources: [
        ...meta.receipts[0].sources,
        { id: 'invented', path: 'https://example.com/', title: 'Invented' },
      ] }],
    });
    expect(parsed?.receipts[0]?.sources).toHaveLength(1);
    expect(parsed?.followUps.map((followUp) => followUp.requires)).toEqual(['chart']);
  });

  it('consumes a complete named stream and rejects a truncated stream', async () => {
    const stream = [
      'event: status\ndata: {"stage":"thinking"}',
      'event: answer.delta\ndata: {"text":"A grounded answer."}',
      `event: guide.meta\ndata: ${JSON.stringify(meta)}`,
      'event: done\ndata: {}',
    ].join('\n\n') + '\n\n';
    const deltas: string[] = [];
    const seenMeta = await consumeAssistantStream(new Response(stream), (delta) => deltas.push(delta));
    expect(deltas).toEqual(['A grounded answer.']);
    expect(seenMeta?.followUps).toHaveLength(1);

    await expect(consumeAssistantStream(
      new Response('event: answer.delta\ndata: {"text":"partial"}\n\n'),
      () => {},
    )).rejects.toThrow('provider_unavailable');
  });
});
