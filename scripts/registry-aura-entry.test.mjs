import { describe, expect, it } from 'vitest';
import {
  REGISTRY_AURA_ENTRY_COPY,
  REGISTRY_AURA_ENTRY_SLOT,
  REGISTRY_AURA_HERO_COPY,
  REGISTRY_AURA_PATH,
  injectRegistryAuraLanding,
  registryAuraChartAnalytics,
  registryAuraChartLink,
  registryAuraEnabled,
  registryAuraSitemapEntry,
} from '../src/lib/registry-aura-entry.mjs';

const THESIS_CTA = '<a class="btn" href="/thesis/"><span>Why this exists</span></a>';
const HERO = `<div class="cine__cta">
<a class="btn btn--primary" href="#official-twelve"><span>Browse the Twelve</span></a>
<!-- registry-aura-hero:cta -->${THESIS_CTA}<!-- /registry-aura-hero:cta -->
</div><!-- registry-aura-hero:why -->`;

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
    // Exactly two sanctioned Aura links while enabled: the hero CTA swap and
    // the no-JS entry card. Anything else is a duplicate injection.
    expect(on.match(new RegExp(`href="${REGISTRY_AURA_PATH}"`, 'g'))).toHaveLength(2);
    expect(on).toContain(REGISTRY_AURA_ENTRY_COPY.description);
    expect(on).toContain('no wallet needed');
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toContain('content="0"');
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(off).not.toContain('no wallet needed');
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('hands the hero secondary CTA to Aura while enabled and demotes the thesis to a text link', () => {
    const on = injectRegistryAuraLanding(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain(
      `<!-- registry-aura-hero:cta --><a class="btn" href="${REGISTRY_AURA_PATH}"><span>${REGISTRY_AURA_HERO_COPY.cta}</span></a><!-- /registry-aura-hero:cta -->`,
    );
    expect(on).toContain(
      `<!-- registry-aura-hero:why --><a class="cine__why" href="/thesis/">${REGISTRY_AURA_HERO_COPY.why}</a>`,
    );
    expect(on).not.toContain(THESIS_CTA);
    expect(injectRegistryAuraLanding(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = injectRegistryAuraLanding(on, {}).output;
    expect(off).toBe(HTML);
    expect(injectRegistryAuraLanding(off, {}).output).toBe(off);
  });

  it('refuses to stamp a landing page missing the hero markers', () => {
    const withoutCta = HTML.replace('<!-- registry-aura-hero:cta -->', '');
    expect(() => injectRegistryAuraLanding(withoutCta, {})).toThrow(/hero/i);

    const withoutWhy = HTML.replace('<!-- registry-aura-hero:why -->', '');
    expect(() => injectRegistryAuraLanding(withoutWhy, {})).toThrow(/hero/i);
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
