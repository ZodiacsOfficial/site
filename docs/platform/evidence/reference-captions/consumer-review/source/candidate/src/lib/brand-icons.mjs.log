/**
 * Canonical, cache-busted brand icon paths.
 *
 * Files under /assets are served immutable in production. Never replace an
 * icon in place: bump BRAND_ICON_VERSION so browsers, launchers, and search
 * crawlers cannot keep showing an older crop.
 */
export const BRAND_ICON_VERSION = 'v3';
export const BRAND_ICON_BASE = `/assets/app-icons/${BRAND_ICON_VERSION}`;

export const BRAND_ICON_PATHS = Object.freeze({
  faviconSvg: `${BRAND_ICON_BASE}/favicon.svg`,
  favicon16: `${BRAND_ICON_BASE}/favicon-16.png`,
  favicon32: `${BRAND_ICON_BASE}/favicon-32.png`,
  favicon: `${BRAND_ICON_BASE}/favicon-96.png`,
  appleTouch: `${BRAND_ICON_BASE}/apple-touch-icon.png`,
  icon192: `${BRAND_ICON_BASE}/icon-192.png`,
  icon512: `${BRAND_ICON_BASE}/icon-512.png`,
  maskable512: `${BRAND_ICON_BASE}/maskable-512.png`,
});

export const absoluteBrandIconUrl = (path) => `https://zodiacs.org${path}`;

/** Shared head markup for the committed static pages outside Astro layouts. */
export const brandIconLinkMarkup = () => [
  `<link rel="icon" type="image/svg+xml" sizes="any" href="${BRAND_ICON_PATHS.faviconSvg}" />`,
  `<link rel="icon" type="image/png" sizes="16x16" href="${BRAND_ICON_PATHS.favicon16}" />`,
  `<link rel="icon" type="image/png" sizes="32x32" href="${BRAND_ICON_PATHS.favicon32}" />`,
  `<link rel="icon" type="image/png" sizes="96x96" href="${BRAND_ICON_PATHS.favicon}" />`,
  `<link rel="apple-touch-icon" sizes="180x180" href="${BRAND_ICON_PATHS.appleTouch}" />`,
  '<link rel="manifest" href="/site.webmanifest" />',
].join('\n  ');
