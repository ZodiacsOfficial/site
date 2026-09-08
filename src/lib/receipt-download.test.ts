import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCalculationReceipt } from './receipt-download';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function browser() {
  vi.useFakeTimers();
  const operations: string[] = [];
  const anchor = { href: '', download: '', hidden: false,
    click: vi.fn(() => operations.push('click')),
    remove: vi.fn(() => operations.push('remove')) };
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:synthetic-owned-receipt');
  const revokeObjectURL = vi.fn(() => operations.push('revoke'));
  const append = vi.fn(() => operations.push('append'));
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { append } });
  return { anchor, append, operations, createObjectURL, revokeObjectURL };
}

describe('intentional local receipt download', () => {
  it('uses exact bytes and a generic filename within the synchronous click, then cleans up', async () => {
    const state = browser();
    const json = '{"synthetic":"private"}\n';
    downloadCalculationReceipt(json);
    expect(state.operations).toEqual(['append', 'click', 'remove']);
    expect(state.anchor).toMatchObject({ href: 'blob:synthetic-owned-receipt',
      download: 'zodiacs-calculation-receipt.json', hidden: true });
    expect(state.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = state.createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8');
    expect(await blob.text()).toBe(json);
    vi.runAllTimers();
    expect(state.operations).toEqual(['append', 'click', 'remove', 'revoke']);
    expect(state.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-owned-receipt');
  });

  it.each(['append', 'click', 'remove'] as const)('cleans the object URL even if %s fails', (step) => {
    const state = browser();
    const failing = step === 'append' ? state.append : state.anchor[step];
    failing.mockImplementation(() => { throw new Error('Synthetic failure.'); });
    expect(() => downloadCalculationReceipt('{}')).toThrow('Synthetic failure.');
    expect(state.anchor.remove).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(state.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('does not create a link or schedule cleanup for a URL that was never allocated', () => {
    const state = browser();
    state.createObjectURL.mockImplementation(() => { throw new Error('Synthetic allocation failure.'); });
    expect(() => downloadCalculationReceipt('{}')).toThrow('Synthetic allocation failure.');
    expect(state.append).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
