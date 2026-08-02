import { describe, expect, it } from 'vitest';
import {
  REGISTRY_AURA_ENTRY_COPY,
  REGISTRY_AURA_ENTRY_SLOT,
  REGISTRY_AURA_HERO_SLOT,
  REGISTRY_AURA_PATH,
  injectRegistryAuraLanding,
  registryAuraChartAnalytics,
  registryAuraChartLink,
  registryAuraEnabled,
  registryAuraSitemapEntry,
} from '../src/lib/registry-aura-entry.mjs';
import {
  REGISTRY_CONSUMER_ENTRY_COPY,
  consumerizeRegistryCollection,
} from './registry-consumer-entry.mjs';

const HERO = `<p class="cine__line">Explore the twelve signs and see the official digital record for each one.</p>
<div class="cine__cta">
<a class="btn btn--primary" href="#official-twelve"><span>Choose your sign</span></a>
<a class="btn btn--ghost" href="#verify"><span>Check an address</span></a>
${REGISTRY_AURA_HERO_SLOT}
</div>`;

const HTML = `<!doctype html><html><head>
<meta name="zodiacs-registry-collection-enabled" content="0" />
</head><body>${HERO}<div>${REGISTRY_AURA_ENTRY_SLOT}</div></body></html>`;

function configure(source, env = {}) {
  const injected = injectRegistryAuraLanding(source, env);
  return {
    ...injected,
    output: consumerizeRegistryCollection(injected.output, REGISTRY_AURA_ENTRY_COPY),
  };
}

describe('Registry Collection build flag', () => {
  it('pins the approved optional collection language', () => {
    expect(REGISTRY_CONSUMER_ENTRY_COPY).toEqual({
      title: 'See the signs in a public wallet',
      description: 'Open the Cabinet of Twelve to view the sign pattern held by a public address. No wallet connection is required.',
      link: 'Open the Cabinet of Twelve →',
    });
  });

  it('enables only for the exact public flag value', () => {
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_COLLECTION_ENABLED: '1' })).toBe(true);
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: '1' })).toBe(true);
    expect(registryAuraEnabled({ PUBLIC_REGISTRY_AURA_ENABLED: 'true' })).toBe(false);
    expect(registryAuraEnabled({})).toBe(false);
  });

  it('adds and removes the no-JS landing entry idempotently', () => {
    const on = configure(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain('content="1"');
    expect(on.match(new RegExp(`href="${REGISTRY_AURA_PATH}"`, 'g'))).toHaveLength(1);
    expect(on).toContain('class="static-site__card static-site__card--aura"');
    expect(on).toContain('Cabinet of Twelve');
    expect(on).toContain('Dated seal');
    expect(on).toContain('The record');
    expect(on).toContain(REGISTRY_CONSUMER_ENTRY_COPY.description);
    expect(on).toContain('Open the Cabinet of Twelve');
    expect(on).not.toContain('data-registry-collection-hero');
    expect(configure(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = configure(on, {}).output;
    expect(off).toContain('content="0"');
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(off).not.toContain('no wallet needed');
    expect(configure(off, {}).output).toBe(off);
  });

  it('keeps the optional collection out of the hero in every flag state', () => {
    const on = configure(HTML, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output;
    expect(on).toContain('href="#official-twelve"');
    expect(on.match(/class="btn btn--primary"/g)).toHaveLength(1);
    expect(on.match(/class="btn btn--ghost"/g)).toHaveLength(1);
    expect(on.indexOf(REGISTRY_AURA_PATH)).toBeGreaterThan(on.indexOf(REGISTRY_AURA_ENTRY_SLOT));
    expect(configure(on, { PUBLIC_REGISTRY_AURA_ENABLED: '1' }).output).toBe(on);

    const off = configure(on, {}).output;
    expect(off).toBe(HTML);
    expect(off).not.toContain(REGISTRY_AURA_PATH);
    expect(configure(off, {}).output).toBe(off);
  });

  it('refuses to stamp a landing page missing its build markers', () => {
    const withoutMeta = HTML.replace('<meta name="zodiacs-registry-collection-enabled" content="0" />', '');
    expect(() => injectRegistryAuraLanding(withoutMeta, {})).toThrow(/marker/i);

    const withoutEntry = HTML.replace(REGISTRY_AURA_ENTRY_SLOT, '');
    expect(() => injectRegistryAuraLanding(withoutEntry, {})).toThrow(/entry slot/i);

    const withoutHero = HTML.replace(REGISTRY_AURA_HERO_SLOT, '');
    expect(() => injectRegistryAuraLanding(withoutHero, {})).toThrow(/hero slot/i);
  });

  it('allows only the named chart return context and always uses the fixed Collection path', () => {
    const enabled = { PUBLIC_REGISTRY_AURA_ENABLED: '1' };
    expect(registryAuraChartLink('?return=registry-collection', enabled)).toEqual({
      href: REGISTRY_AURA_PATH,
      context: 'return',
    });
    expect(registryAuraChartLink('?return=https://evil.example', enabled)).toBeNull();
    expect(registryAuraChartLink('?return=registry-collection', {})).toBeNull();
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
      lastmod: '2026-07-24',
    });
  });
});
