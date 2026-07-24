import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_EVENT_PROPS, sanitizeAnalyticsProperties, trackAnalytics } from './analytics';

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
  'aura_view',
  'aura_compose',
  'aura_share',
  'aura_refresh',
  'aura_calculator',
  'aura_entry',
  'aura_return',
  'aura_response',
  'aura_cabinet_select',
  'aura_cabinet_reveal',
  'aura_talisman_personalize',
  'invite_created',
  'invite_opened',
  'invite_completed',
  'invite_returned',
  'invite_converted',
  'invite_revoked',
  'context_help_opened',
  'first_reading_prompt',
  'first_reading_step',
  'first_reading_completed',
  'next_action_clicked',
  'email_capture_viewed',
] as const;

describe('analytics event contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('contains every directive event', () => {
    for (const name of REQUIRED_EVENTS) expect(ANALYTICS_EVENT_PROPS).toHaveProperty(name);
  });

  it('never permits identity or exact-sign properties on Aura events', () => {
    expect(sanitizeAnalyticsProperties('aura_compose', {
      outcome: 'success',
      held_bucket: '2-5',
      address: '0x1111111111111111111111111111111111111111',
      chart_id: 'private',
      held_signs: 'aries,leo',
      clicked_sign: 'leo',
    })).toEqual({ outcome: 'success', held_bucket: '2-5' });
    expect(sanitizeAnalyticsProperties('aura_cabinet_reveal', {
      outcome: 'played',
      sign: 'aries',
      finish: 'gold',
      amount: '1000000',
    })).toEqual({ outcome: 'played' });
  });

  it('sanitizes the payload at the actual browser emission boundary', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { zodiacsAnalytics: { track } });
    trackAnalytics('aura_compose', {
      outcome: 'success',
      held_bucket: '6-12',
      address: '0x1111111111111111111111111111111111111111',
      chart_id: 'private',
    });
    expect(track).toHaveBeenCalledWith('aura_compose', {
      outcome: 'success',
      held_bucket: '6-12',
    });
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

  it('keeps beginner-guidance events useful without accepting chart data', () => {
    expect(sanitizeAnalyticsProperties('context_help_opened', {
      term: 'whole-sign-houses',
      surface: 'chart-form',
      birthDate: '1990-01-01',
    })).toEqual({ term: 'whole-sign-houses', surface: 'chart-form' });
    expect(sanitizeAnalyticsProperties('next_action_clicked', {
      state: 'saved',
      action: 'today',
      chartId: 'private',
    })).toEqual({ state: 'saved', action: 'today' });
  });

  it('keeps sharing-loop analytics inside fixed, non-identifying enums', () => {
    expect(sanitizeAnalyticsProperties('invite_created', {
      notify: true,
      token: 'never',
      label: 'never',
    })).toEqual({ notify: true });
    expect(sanitizeAnalyticsProperties('invite_opened', {
      state: 'ready',
      sign: 'cancer',
    })).toEqual({ state: 'ready' });
    expect(sanitizeAnalyticsProperties('invite_opened', {
      state: 'owner@example.com',
    })).toEqual({});
    expect(sanitizeAnalyticsProperties('invite_returned', {
      method: 'copy',
      url: 'never',
    })).toEqual({ method: 'copy' });
  });
});
