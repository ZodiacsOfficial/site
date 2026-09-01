/**
 * Vercel Web Analytics, pageviews only, behind one build-time flag.
 *
 * Plausible stays the site's directive analytics (allowlisted events through
 * `zodiacsAnalytics.track`). This second, cookieless pageview counter is off
 * until the owner both enables Web Analytics on the Vercel project and sets
 * PUBLIC_VERCEL_WEB_ANALYTICS=1, so the privacy pages, which describe it only
 * when this returns true, never describe a processor that is not running.
 * The loader in src/layouts/Base.astro applies the same surface exclusions as
 * Plausible (noindex, private surfaces, the encrypted-sync preview, a private
 * Guide session) and strips query strings and fragments from every pageview
 * URL before it leaves the browser.
 */
export function webAnalyticsEnabled(env = {}) {
  return String(env.PUBLIC_VERCEL_WEB_ANALYTICS ?? '').trim() === '1';
}
