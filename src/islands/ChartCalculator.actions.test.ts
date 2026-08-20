import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Chart result action contract', () => {
  it('keeps the ephemeris out of the idle page load and warms it on form focus', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain('onFocusCapture={() => { void loadEngine(); }}');
    expect(calculator).not.toContain('requestIdleCallback');
    expect(calculator).not.toContain('onWarm={loadEngine}');
  });

  it('removes the dock save action after a chart is saved so Today is the sole primary action', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const dock = await readFile(new URL('./ChartActionDock.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain("saveLabel={saved === 'saved'\n                            ? undefined");
    expect(calculator).toContain('data-primary-action="today"');
    expect(dock).toContain('!tourOpen && saveLabel && onSave');
    expect(dock).not.toContain('saveDisabled');
  });
});
