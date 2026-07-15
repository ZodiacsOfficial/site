import { describe, expect, it } from 'vitest';
import { injectLegacyAnalytics } from './configure-legacy-analytics.mjs';

const HTML = '<!doctype html><html><head><link rel="canonical" href="https://zodiacs.org/registry/"></head><body></body></html>';

describe('legacy analytics build injection', () => {
  it('leaves no provider script when configuration is absent', () => {
    const configured = injectLegacyAnalytics(HTML, {
      scriptUrl: 'https://analytics.example/script.js',
      domain: 'zodiacs.org',
    });
    const disabled = injectLegacyAnalytics(configured, {});
    expect(disabled).not.toContain('analytics.example');
    expect(disabled).not.toContain('zodiacs-analytics:start');
  });

  it('uses defer, a property allowlist, and an optional first-party endpoint', () => {
    const result = injectLegacyAnalytics(HTML, {
      scriptUrl: 'https://analytics.example/script.js',
      endpoint: '/api/event',
      domain: 'zodiacs.org',
    });
    expect(result).toContain('<script defer data-domain="zodiacs.org"');
    expect(result).toContain('chart_computed');
    expect(result).toContain('wallet_chart_computed');
    expect(result).toContain('/api/event');
  });

  it('is idempotent', () => {
    const config = { scriptUrl: 'https://analytics.example/script.js' };
    const once = injectLegacyAnalytics(HTML, config);
    expect(injectLegacyAnalytics(once, config)).toBe(once);
  });
});
