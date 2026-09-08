import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const calculatorUrl = new URL('./ChartCalculator.tsx', import.meta.url);

describe('ChartCalculator Registry bridge contract', () => {
  it('commits a record only after exact-time or full-local-date certainty', async () => {
    const source = await readFile(calculatorUrl, 'utf8');

    expect(source).toContain('setRegistryRecordSlug(null);');
    expect(source).toContain('localDateEndpointsUtc(input.date, input.city.tz)');
    expect(source).toContain("stableBodySignSlug('Sun', startBodies, endBodies)");
    expect(source).toContain('stableSunSlug === computedSunSlug');
    expect(source).toContain('setRegistryRecordSlug(nextRegistryRecordSlug);');
    expect(source).not.toContain("resolveLocalToUtc(input.date, '23:59'");
  });

  it('places one measured bridge after the Big Three prompt and before the explorer', async () => {
    const source = await readFile(calculatorUrl, 'utf8');
    const prompt = source.indexOf('{firstReadingPromptVisible && (');
    const bridge = source.indexOf('data-registry-bridge-surface="birth_chart"');
    const explorer = source.indexOf('{/* Moon-mode extra: phase at birth */}');

    expect(prompt).toBeGreaterThan(-1);
    expect(bridge).toBeGreaterThan(prompt);
    expect(explorer).toBeGreaterThan(bridge);
    expect(source).toContain("trackAnalytics('registry_bridge_impression'");
    expect(source).toContain("trackAnalytics('registry_bridge_click'");
    expect(source).toContain("tf(locale, 'recordChartSun'");
    expect(source).toContain("tf(locale, 'recordChartBody'");
    expect(source).toContain("tf(locale, 'recordChartLink'");
  });
});
