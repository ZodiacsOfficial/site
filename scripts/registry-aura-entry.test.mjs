import { describe, expect, it } from 'vitest';
import {
  REGISTRY_AURA_ENTRY_COPY,
  REGISTRY_AURA_ENTRY_SLOT,
  REGISTRY_AURA_HERO_COPY,
  REGISTRY_AURA_HERO_SLOT,
  REGISTRY_AURA_PATH,
  injectRegistryAuraLanding,
  registryAuraChartAnalytics,
  registryAuraChartLink,
  registryAuraEnabled,
  registryAuraSitemapEntry,
} from '../src/lib/registry-aura-entry.mjs';

const HERO = `<p class="cine__line">Meet the twelve signs through their symbols, stories, and living traditions.</p>
<div class="cine__cta">
<a class="btn btn--primary" href="/registry/aries/"><span>Browse the Twelve</span></a>
${REGISTRY_AURA_HERO_SLOT}
</div>`;

const HTML = `<!doctype html><html><head>
<meta name="zodiacs-registry-aura-enabled" content="0" />
</head><body>${HERO}<div>${REGISTRY_AURA_ENTRY_SLOT}</div></body></html>`;

describe('Registry Aura build flag', () => {
  it('pins the approved Cabinet hero language', () => {
    expect(REGISTRY_AURA_HERO_COPY).toEqual({
      cta: 'Open the Cabinet',
      ariaLabel: 'Open your Zodiac collection in the Cabinet of Twelve',
    });
  });

  it('enables only for the exact public flag value', () => {
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: '1' })).toBe(true);
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: 'true' })).toBe(false);
    expect(registryAuraEnabled({})).toBe(false);
  });

  it('adds and removes the no-JS landing entry idempotently', () => {
    const on = injectRegistryAuraLanding(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain('content="1"');
    expect(on.match(new RegExp(`href="${REGISTRY_AURA_PATH}"`, 'g'))).toHaveLength(2);
    expect(on).toContain(`aria-label="${REGISTRY_AURA_HERO_COPY.ariaLabel}"`);
    expect(on).toContain(`<span>${REGISTRY_AURA_HERO_COPY.cta}</span>`);
    expect(on).toContain('<span class="cta-arr" aria-hidden="true">→</span>');
    expect(on).toContain('class="btn btn--ghost"');
    expect(on).toContain('class="static-site__card static-site__card--aura"');
    expect(on).toContain('Cabinet of Twelve');
    expect(on).toContain('Dated seal');
    expect(on).toContain('The record');
    expect(on).toContain(REGISTRY_AURA_ENTRY_COPY.description);
    expect(on).toContain('Explore the finished sample');
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toContain('content="0"');
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(off).not.toContain('no wallet needed');
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('adds the Cabinet hero action only while enabled and preserves the Aries fallback', () => {
    const on = injectRegistryAuraLanding(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain('href="/registry/aries/"');
    expect(on.match(/class="btn btn--primary"/g)).toHaveLength(1);
    expect(on.match(/class="btn btn--ghost"/g)).toHaveLength(1);
    expect(on).toContain(REGISTRY_AURA_HERO_COPY.cta);
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toBe(HTML);
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(off).not.toContain(REGISTRY_AURA_HERO_COPY.cta);
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('refuses to stamp a landing page missing its build markers', () => {
    const withoutMeta = HTML.replace('<meta name="zodiacs-registry-aura-enabled" content="0" />', '');
    expect(() => injectRegistryAuraLanding(withoutMeta, {})).toThrow(/marker/i);

    const withoutEntry = HTML.replace(REGISTRY_AURA_ENTRY_SLOT, '');
    expect(() => injectRegistryAuraLanding(withoutEntry, {})).toThrow(/entry slot/i);

    const withoutHero = HTML.replace(REGISTRY_AURA_HERO_SLOT, '');
    expect(() => injectRegistryAuraLanding(withoutHero, {})).toThrow(/hero slot/i);
  });

  it('allows only the named chart return context and always uses the fixed Aura path', () => {
    const enabled = { PUBLIC_REGISTRY_AURA_ENABLED: '1' };
    expect(registryAuraChartLink('?return=registry-aura', enabled)).toEqual({
      href: REGISTRY_AURA_PATH,
      context: 'return',
    });
    expect(registryAuraChartLink('?return=https://evil.example', enabled)).toBeNull();
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
