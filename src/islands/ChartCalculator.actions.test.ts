import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Chart result action contract', () => {
  it('keeps the ephemeris out of the idle page load and warms it on form focus', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain('onFocusCapture={() => { void loadEngine(); }}');
    expect(calculator).not.toContain('requestIdleCallback');
    expect(calculator).not.toContain('onWarm={loadEngine}');
  });

  it('keeps a confirmed, disabled save state in the dock after a chart is saved', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const dock = await readFile(new URL('./ChartActionDock.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain("saveLabel={saved === 'saved'\n                            ? t(locale, 'chartSavedDevice')");
    expect(calculator).toContain("if (subjectMode === 'self')");
    expect(calculator).toContain("void commitSave(undefined, 'skip')");
    expect(calculator).toContain('data-primary-action="today"');
    expect(dock).toContain('!tourOpen && saveLabel && onSave');
    expect(dock).toContain('onClick={saveDisabled ? undefined : onSave}');
    expect(dock).toContain('aria-disabled={saveDisabled}');
    expect(dock).toContain("{saveDisabled ? '\u2713' : '+'}");
  });

  it('mounts an optional naming prompt inside the chart action dock', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const dock = await readFile(new URL('./ChartActionDock.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain('savePrompt={savePromptOpen ? renderSavePrompt() : null}');
    expect(dock).toContain('{savePrompt || (');
  });
});
