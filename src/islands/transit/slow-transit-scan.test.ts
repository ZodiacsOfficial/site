import { describe, expect, it, vi } from 'vitest';
import { startSlowTransitScan, type SlowTransitScan } from './slow-transit-scan';
import { ModuleLoadError } from '../../lib/module-load';
import type { TransitContact } from '../../lib/engine/transit-scan';

type Scanner = typeof import('../../lib/engine/transit-scan');
const chart = { bodies: [{ body: 'Sun' as const, lon: 120 }], angles: null };
const from = new Date('2026-01-01T00:00:00Z');
const to = new Date('2027-01-01T00:00:00Z');
const breathe = () => Promise.resolve();
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const scanner = (scan = vi.fn().mockReturnValue([])) => ({
  SLOW_TRANSIT_BODIES: ['Jupiter', 'Saturn'], scanTransitContacts: scan,
}) as unknown as Scanner;

describe('exact slow-transit scan lifecycle', () => {
  it('reports successful emptiness distinctly from a failed scan', async () => {
    const settle = vi.fn();
    startSlowTransitScan(chart, from, to, settle, async () => scanner(), breathe);
    await flush();
    expect(settle).toHaveBeenCalledWith({ status: 'ready', events: [] });
    settle.mockClear();
    startSlowTransitScan(chart, from, to, settle, async () => { throw new ModuleLoadError('offline'); }, breathe);
    await flush();
    expect(settle).toHaveBeenCalledWith({ status: 'error', moduleFailed: true });
    expect(settle).not.toHaveBeenCalledWith({ status: 'ready', events: [] });
  });

  it('can retry after failure and returns sorted complete contacts', async () => {
    const contacts = [{ exactUtc: '2026-08-01T00:00:00Z' }, { exactUtc: '2026-02-01T00:00:00Z' }] as TransitContact[];
    const scan = vi.fn().mockReturnValueOnce([contacts[0]]).mockReturnValueOnce([contacts[1]]);
    const load = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(scanner(scan));
    const settle = vi.fn();
    startSlowTransitScan(chart, from, to, settle, load, breathe);
    await flush();
    expect(settle).toHaveBeenLastCalledWith({ status: 'error', moduleFailed: false });
    startSlowTransitScan(chart, from, to, settle, load, breathe);
    await flush();
    expect(settle).toHaveBeenLastCalledWith({ status: 'ready', events: [contacts[1], contacts[0]] });
    expect(scan).toHaveBeenNthCalledWith(1, chart, from, to, { transitBodies: ['Jupiter'] });
    expect(scan).toHaveBeenNthCalledWith(2, chart, from, to, { transitBodies: ['Saturn'] });
  });

  it('does not publish a partial list when a later body fails', async () => {
    const scan = vi.fn().mockReturnValueOnce([{ exactUtc: '2026-08-01T00:00:00Z' }]).mockImplementationOnce(() => { throw new Error('failed'); });
    const settle = vi.fn();
    startSlowTransitScan(chart, from, to, settle, async () => scanner(scan), breathe);
    await flush();
    expect(settle).toHaveBeenCalledOnce();
    expect(settle).toHaveBeenCalledWith({ status: 'error', moduleFailed: false });
  });

  it('ignores a late module load after unmount', async () => {
    let resolve!: (value: Scanner) => void;
    const load = () => new Promise<Scanner>((done) => { resolve = done; });
    const scan = vi.fn().mockReturnValue([]);
    const settle = vi.fn();
    const cancel = startSlowTransitScan(chart, from, to, settle, load, breathe);
    cancel();
    resolve(scanner(scan));
    await flush();
    expect(scan).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  });

  it('cancels between bodies and suppresses an old chart’s completion', async () => {
    let resume!: () => void;
    const scan = vi.fn().mockReturnValue([]);
    const oldSettle = vi.fn();
    const cancel = startSlowTransitScan(chart, from, to, oldSettle, async () => scanner(scan),
      () => new Promise<void>((done) => { resume = done; }));
    await flush();
    expect(scan).toHaveBeenCalledOnce();
    cancel();
    const current: SlowTransitScan[] = [];
    startSlowTransitScan({ ...chart, bodies: [{ body: 'Sun', lon: 240 }] }, from, to,
      (state) => current.push(state), async () => scanner(), breathe);
    resume();
    await flush();
    expect(scan).toHaveBeenCalledOnce();
    expect(oldSettle).not.toHaveBeenCalled();
    expect(current).toEqual([{ status: 'ready', events: [] }]);
  });

  it('suppresses a rejected old request after cleanup', async () => {
    let reject!: (reason: unknown) => void;
    const settle = vi.fn();
    const cancel = startSlowTransitScan(chart, from, to, settle,
      () => new Promise<Scanner>((_, fail) => { reject = fail; }), breathe);
    cancel();
    reject(new ModuleLoadError('offline'));
    await flush();
    expect(settle).not.toHaveBeenCalled();
  });
});
