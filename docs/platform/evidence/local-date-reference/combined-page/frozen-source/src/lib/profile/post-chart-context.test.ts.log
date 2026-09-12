import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearPostChartContext, currentPostChartContext, publishPostChartContext } from './post-chart-context';

afterEach(() => vi.unstubAllGlobals());
describe('post-chart context ownership signal', () => {
  it('deletes context before a synchronous data-free clear notification', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    publishPostChartContext({ mode: 'full', contextId: 1, sunSign: 'cancer', chartId: null });
    let calls = 0;
    target.addEventListener('zodiacs:chart-context-cleared', event => {
      calls += 1;
      expect(currentPostChartContext()).toBeNull();
      expect('detail' in event).toBe(false);
      expect(event.type).toBe('zodiacs:chart-context-cleared');
    });
    clearPostChartContext();
    expect(calls).toBe(1);
  });

  it('invalidates cached consumers even when the global context is already absent', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    const cleared = vi.fn();
    target.addEventListener('zodiacs:chart-context-cleared', cleared);
    clearPostChartContext(); clearPostChartContext();
    expect(cleared).toHaveBeenCalledTimes(2);
  });

  it('preserves the explicit next published context and event', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    clearPostChartContext();
    const context = { mode: 'full' as const, contextId: 1, sunSign: null, chartId: null };
    const contexts: unknown[] = [];
    target.addEventListener('zodiacs:chart-context', event => contexts.push((event as CustomEvent).detail));
    publishPostChartContext(context);
    expect(contexts).toEqual([context]); expect(currentPostChartContext()).toBe(context);
  });

  it('remains callable without a browser', () => {
    vi.stubGlobal('window', undefined);
    expect(() => clearPostChartContext()).not.toThrow();
    expect(currentPostChartContext()).toBeNull();
  });
});
