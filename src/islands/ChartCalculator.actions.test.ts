import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Chart result action contract', () => {
  it('keeps the ephemeris out of the idle page load and warms it on form focus', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain('onFocusCapture={() => { void loadEngine(); }}');
    expect(calculator).not.toContain('requestIdleCallback');
    expect(calculator).not.toContain('onWarm={loadEngine}');
  });

  it('keeps an announced, inactive save confirmation in the dock', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const dock = await readFile(new URL('./ChartActionDock.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain("saveLabel={saved === 'saved'\n                              ? t(locale, 'chartSavedDevice')");
    expect(calculator).toContain("if (subjectMode === 'self')");
    expect(calculator).toContain("void commitSave(undefined, 'skip')");
    expect(calculator).toContain("const saveError = saved === 'full'");
    expect(calculator).toContain("mode !== 'full' && saveError");
    expect(calculator).toContain('data-primary-action="today"');
    expect(dock).toContain('!tourOpen && saveLabel');
    expect(dock).toContain('aria-disabled={!onSave}');
    expect(dock).toContain('aria-live="polite"');
    expect(dock).toContain("{onSave ? '+' : '✓'}");
    expect(dock).not.toContain('saveDisabled');
  });

  it('mounts the naming prompt immediately beside the chart action dock', async () => {
    const calculator = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const dock = await readFile(new URL('./ChartActionDock.tsx', import.meta.url), 'utf8');

    expect(calculator).toContain('class="chart-action-dock calc__actions"');
    expect(calculator).toContain("void import('./ChartActionDock').then(setChartActionDockModule");
    expect(calculator).toContain('{renderSavePrompt()}');
    expect(calculator).toContain("function isConnectedSaveControl(candidate: EventTarget | null | undefined)");
    expect(calculator).toContain("candidate.hasAttribute('data-save-chart')");
    expect(calculator).toContain('function saveFocusFallback(): HTMLElement | null');
    expect(calculator).toContain("?.querySelector<HTMLElement>('[data-chart-action-dock] [data-save-chart]')");
    expect(calculator).toContain('trigger?: EventTarget | null');
    expect(calculator).toContain("openSavePrompt('free', trigger)");
    expect(calculator).toContain("openSavePrompt('free', event.currentTarget)");
    expect(calculator).toContain('saveReturnRef.current = null;');
    expect(dock).toContain('onSave?.(event.currentTarget)');
    expect(dock).not.toContain('savePrompt');
  });
});
