import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENT_PROPS, sanitizeAnalyticsProperties } from './analytics';

const REQUIRED_EVENTS = [
  'chart_computed',
  'chart_saved',
  'compat_computed',
  'email_subscribed',
  'share_card_downloaded',
  'widget_embed_copied',
  'registry_visit',
  'verifier_used',
  'sdk_click',
  'wallet_chart_computed',
] as const;

describe('analytics event contract', () => {
  it('contains every directive event', () => {
    for (const name of REQUIRED_EVENTS) expect(ANALYTICS_EVENT_PROPS).toHaveProperty(name);
  });

  it('drops unknown events rather than forwarding them', () => {
    expect(sanitizeAnalyticsProperties('birth_details', { date: '1990-01-01' })).toBeNull();
  });

  it('keeps only short, explicitly allowed scalar properties', () => {
    expect(sanitizeAnalyticsProperties('verifier_used', {
      chain: 'solana',
      outcome: 'not_found',
      address: 'never-forward-an-address',
      chainObject: { name: 'solana' },
    })).toEqual({ chain: 'solana', outcome: 'not_found' });
    expect(sanitizeAnalyticsProperties('sdk_click', {
      source: 'registry',
      destination: 'x'.repeat(33),
    })).toEqual({ source: 'registry' });
  });
});
