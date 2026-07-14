import { describe, expect, it } from 'vitest';
import {
  i18nAdditionSections,
  i18nManifestIsCurrent,
  renderI18nAdditions,
} from './build-i18n-additions.mjs';

describe('additive locale handoff manifest', () => {
  it('lists every catalogued key exactly once and stays generated', async () => {
    const sections = i18nAdditionSections();
    const keys = sections.flatMap(([, values]) => values);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(300);
    expect(renderI18nAdditions()).toContain('TODO(i18n)');
    expect(await i18nManifestIsCurrent()).toBe(true);
  });
});
