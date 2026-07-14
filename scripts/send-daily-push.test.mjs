import { describe, expect, it, vi } from 'vitest';
import { buildSkyLine, sendDailyPush, skyEvents } from './send-daily-push.mjs';

const SKY = {
  moons: [
    { type: 'new', at: '2026-07-14T09:44:04.307Z' },
    { type: 'full', at: '2026-07-29T14:36:19.011Z' },
  ],
  retrogrades: [
    { planet: 'Neptune', from: '2026-07-07T11:21:05.184Z', to: '2026-12-12T22:13:35.184Z' },
  ],
};

describe('daily push', () => {
  it('builds a deterministic generic line from sky.json events', () => {
    expect(skyEvents(SKY).map((event) => event.at)).toEqual([
      '2026-07-07T11:21:05.184Z',
      '2026-07-14T09:44:04.307Z',
      '2026-07-29T14:36:19.011Z',
      '2026-12-12T22:13:35.184Z',
    ]);
    expect(buildSkyLine(SKY, new Date('2026-07-13T12:00:00Z'), 'en'))
      .toBe('Next: New Moon is exact 14 Jul at 09:44 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-14T20:00:00Z'), 'es'))
      .toBe('Luna nueva, exacta hoy a las 09:44 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-13T12:00:00Z'), 'pt'))
      .toBe('Próximo: Lua nova, exata em 14 jul às 09:44 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-07T20:00:00Z'), 'pt'))
      .toBe('Netuno estaciona retrógrado hoje às 11:21 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-13T12:00:00Z'), 'fr'))
      .toBe('À venir : Nouvelle Lune, exacte le 14 juil. à 09:44 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-07T20:00:00Z'), 'fr'))
      .toBe('Neptune devient rétrograde aujourd’hui à 11:21 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-30T12:00:00Z'), 'fr'))
      .toBe('À venir : Neptune redevient direct le 12 déc. à 22:13 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-13T12:00:00Z'), 'it'))
      .toBe('Prossimo evento: Luna nuova, esatta il 14 lug alle 09:44 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-07T20:00:00Z'), 'it'))
      .toBe('Nettuno staziona in moto retrogrado oggi alle 11:21 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-30T12:00:00Z'), 'it'))
      .toBe('Prossimo evento: Nettuno staziona in moto diretto il 12 dic alle 22:13 UTC.');
    expect(buildSkyLine(SKY, new Date('2026-07-13T12:00:00Z'), 'de'))
      .toBe('Next: New Moon is exact 14 Jul at 09:44 UTC.');
  });

  it('keeps an Italian subscription in Italian during a dry run', async () => {
    const sendNotification = vi.fn();
    const log = vi.fn();
    const report = await sendDailyPush({
      subscriptions: [{ endpoint: 'https://push.test/it', p256dh: 'p', auth: 'a', lang: 'it' }],
      sky: SKY,
      date: new Date('2026-07-13T12:00:00Z'),
      dryRun: true,
      sendNotification,
      fetchImpl: vi.fn(),
      supabaseUrl: '',
      serviceKey: '',
      log,
    });

    expect(report).toEqual({ sent: 0, pruned: 0, failed: 0, dryRun: true, count: 1 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'daily-push: dry-run it {"title":"Oggi su Zodiacs.org","body":"Prossimo evento: Luna nuova, esatta il 14 lug alle 09:44 UTC.","url":"/today/"}',
    );
  });

  it('keeps a French subscription in French during a dry run', async () => {
    const sendNotification = vi.fn();
    const log = vi.fn();
    const report = await sendDailyPush({
      subscriptions: [{ endpoint: 'https://push.test/fr', p256dh: 'p', auth: 'a', lang: 'fr' }],
      sky: SKY,
      date: new Date('2026-07-13T12:00:00Z'),
      dryRun: true,
      sendNotification,
      fetchImpl: vi.fn(),
      supabaseUrl: '',
      serviceKey: '',
      log,
    });

    expect(report).toEqual({ sent: 0, pruned: 0, failed: 0, dryRun: true, count: 1 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'daily-push: dry-run fr {"title":"Aujourd’hui sur Zodiacs.org","body":"À venir : Nouvelle Lune, exacte le 14 juil. à 09:44 UTC.","url":"/today/"}',
    );
  });

  it('prints a dry run without contacting a push service', async () => {
    const sendNotification = vi.fn();
    const log = vi.fn();
    const report = await sendDailyPush({
      subscriptions: [{ endpoint: 'https://push.test/one', p256dh: 'p', auth: 'a', lang: 'en' }],
      sky: SKY,
      date: new Date('2026-07-13T12:00:00Z'),
      dryRun: true,
      sendNotification,
      fetchImpl: vi.fn(),
      supabaseUrl: '',
      serviceKey: '',
      log,
    });
    expect(report).toEqual({ sent: 0, pruned: 0, failed: 0, dryRun: true, count: 1 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toContain('"url":"/today/"');
  });

  it('prunes an expired endpoint after a simulated 410', async () => {
    const sendNotification = vi.fn().mockRejectedValue({ statusCode: 410 });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const report = await sendDailyPush({
      subscriptions: [{ endpoint: 'https://push.test/expired', p256dh: 'p', auth: 'a', lang: 'en' }],
      sky: SKY,
      date: new Date('2026-07-13T12:00:00Z'),
      sendNotification,
      fetchImpl,
      supabaseUrl: 'https://project.supabase.co',
      serviceKey: 'service-key',
      log: vi.fn(),
    });
    expect(report).toEqual({ sent: 0, pruned: 1, failed: 0, dryRun: false, count: 1 });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('endpoint=eq.https%3A%2F%2Fpush.test%2Fexpired'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
