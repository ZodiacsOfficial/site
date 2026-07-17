import { describe, expect, it } from 'vitest';
import {
  REGISTRY_AURA_ENTRY_COPY,
  REGISTRY_AURA_ENTRY_SLOT,
  REGISTRY_AURA_PATH,
  injectRegistryAuraLanding,
  registryAuraChartAnalytics,
  registryAuraChartLink,
  registryAuraEnabled,
  registryAuraSitemapEntry,
} from '../src/lib/registry-aura-entry.mjs';

const HERO = `<p class="cine__line">The official public record for the twelve Zodiacs—verify each sign and explore its story.</p>
<div class="cine__cta">
<a class="btn btn--primary" href="#official-twelve"><span>Browse the Twelve</span></a>
</div>`;

const HTML = `<!doctype html><html><head>
<meta name="zodiacs-registry-aura-enabled" content="0" />
</head><body>${HERO}<div>${REGISTRY_AURA_ENTRY_SLOT}</div></body></html>`;

describe('Registry Aura build flag', () => {
  it('enables only for the exact public flag value', () => {
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: '1' })).toBe(true);
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: 'true' })).toBe(false);
    expect(registryAuraEnabled({})).toBe(false);
  });

  it('adds and removes the no-JS landing entry idempotently', () => {
    const on = injectRegistryAuraLanding(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain('content="1"');
    // Aura discovery lives in one full-row Identity feature, never the hero.
    expect(on.match(new RegExp(`href="${REGISTRY_AURA_PATH}"`, 'g'))).toHaveLength(1);
    expect(on).toContain('class="static-site__card static-site__card--aura"');
    expect(on).toContain('Public collection');
    expect(on).toContain('Saved chart');
    expect(on).toContain('Today’s sky');
    expect(on).toContain(REGISTRY_AURA_ENTRY_COPY.description);
    expect(on).toContain('no wallet needed');
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toContain('content="0"');
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(off).not.toContain('no wallet needed');
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('leaves the single-purpose hero unchanged in both flag states', () => {
    const on = injectRegistryAuraLanding(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain(HERO);
    expect(on.match(/class="btn btn--primary"/g)).toHaveLength(1);
    expect(on).not.toContain('cine__why');
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toBe(HTML);
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('refuses to stamp a landing page missing its build markers', () => {
    const withoutMeta = HTML.replace('<meta name="zodiacs-registry-aura-enabled" content="0" />', '');
    expect(() => injectRegistryAuraLanding(withoutMeta, {})).toThrow(/marker/i);

    const withoutEntry = HTML.replace(REGISTRY_AURA_ENTRY_SLOT, '');
    expect(() => injectRegistryAuraLanding(withoutEntry, {})).toThrow(/entry slot/i);
  });

  it('allows only the named chart return context and always uses the fixed Aura path', () => {
    const enabled = { PUBLIC_REGISTRY_AURA_ENABLED: '1' };
    expect(registryAuraChartLink('?return=registry-aura', enabled)).toEqual({
      href: REGISTRY_AURA_PATH,
      context: 'return',
    });
    expect(registryAuraChartLink('?return=https://evil.example', enabled)).toEqual({
      href: REGISTRY_AURA_PATH,
      context: 'discover',
    });
    expect(registryAuraChartLink('?return=registry-aura', {})).toBeNull();
  });

  it('distinguishes a calculator return from a chart-side discovery click', () => {
    expect(registryAuraChartAnalytics('discover')).toEqual([
      { name: 'aura_entry', properties: { source: 'birth-chart' } },
    ]);
    expect(registryAuraChartAnalytics('return')).toEqual([
      { name: 'aura_calculator', properties: { direction: 'return' } },
      { name: 'aura_entry', properties: { source: 'birth-chart' } },
    ]);
  });

  it('emits exactly one sitemap entry only while enabled', () => {
    expect(registryAuraSitemapEntry({})).toBeNull();
    expect(registryAuraSitemapEntry({ PUBLIC_REGISTRY_AURA_ENABLED: '1' })).toEqual({
      loc: REGISTRY_AURA_PATH,
      priority: 0.6,
      lastmod: '2026-07-16',
    });
  });
});
