/**
 * Privacy-bounded product analytics.
 *
 * Only event names and properties declared here may leave the browser. The
 * allowlist deliberately excludes URLs, addresses, email values, chart data,
 * birth details, free text, and persistent identifiers.
 */
import { ANALYTICS_EVENT_PROPS as EVENT_PROPS } from './analytics-config.mjs';

export const ANALYTICS_EVENT_PROPS = EVENT_PROPS as Readonly<Record<string, readonly string[]>>;

export type AnalyticsEventName =
  | 'chart_computed'
  | 'chart_saved'
  | 'compat_computed'
  | 'email_subscribed'
  | 'share_card_downloaded'
  | 'widget_embed_copied'
  | 'registry_visit'
  | 'verifier_used'
  | 'sdk_click'
  | 'wallet_chart_computed'
  | 'result_rendered'
  | 'explorer_interaction'
  | 'tour_start'
  | 'tour_complete'
  | 'tour_step'
  | 'search_open'
  | 'search_go'
  | 'assistant_open'
  | 'assistant_reply'
  | 'push_prompt'
  | 'push_subscribe'
  | 'today_view'
  | 'calendar_subscribe'
  | 'chart_save'
  | 'chart_share'
  | 'wing_entry'
  | 'lens_change'
  | 'transit_search'
  | 'srchart_view'
  | 'composite_view'
  | 'grid_select'
  | 'chiron_toggle'
  | 'detail_toggle'
  | 'chart_name_set'
  | 'comm_read_view';
export type AnalyticsPropertyValue = string | number | boolean;
export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

export function sanitizeAnalyticsProperties(
  name: string,
  properties: Record<string, unknown> = {},
): AnalyticsProperties | null {
  const allowed = (ANALYTICS_EVENT_PROPS as Record<string, readonly string[]>)[name];
  if (!allowed) return null;

  const safe: AnalyticsProperties = {};
  for (const key of allowed) {
    const value = properties[key];
    if (typeof value === 'number' || typeof value === 'boolean') safe[key] = value;
    if (typeof value === 'string' && value.length <= 32) safe[key] = value;
  }
  return safe;
}

export function trackAnalytics(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {},
): void {
  if (typeof window === 'undefined') return;
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (event: string, props: AnalyticsProperties) => void };
  }).zodiacsAnalytics;
  analytics?.track?.(name, properties);
}
