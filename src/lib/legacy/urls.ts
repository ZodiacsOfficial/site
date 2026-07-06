/**
 * The legacy wing's URL inventory — every page served verbatim from
 * public/. Single source of truth for the sitemap endpoint (and any
 * future nav that lists the wing). Keep in sync with public/.
 */
import { SIGN_SLUGS } from '../signs';

export interface LegacyUrl {
  path: string;
  priority: number;
}

export const LEGACY_URLS: LegacyUrl[] = [
  { path: '/collect/', priority: 0.8 },
  ...SIGN_SLUGS.map((slug) => ({ path: `/collect/${slug}/`, priority: 0.6 })),
  { path: '/thesis/', priority: 0.6 },
  { path: '/archive/', priority: 0.6 },
  { path: '/sdk/', priority: 0.7 },
  { path: '/sdk/examples/simastry-aura/', priority: 0.4 },
  { path: '/astrofolio/', priority: 0.5 },
  { path: '/astrofolio-sdk/', priority: 0.4 },
  { path: '/astrology-sdk/', priority: 0.4 },
  { path: '/build-ai-astrology-app/', priority: 0.4 },
  { path: '/cosmic-receipt/', priority: 0.4 },
  { path: '/simastry-zodiacs-sdk/', priority: 0.4 },
  { path: '/tools-for-building-astrology-apps/', priority: 0.4 },
  { path: '/zodiac-ownership-api/', priority: 0.4 },
  { path: '/llms.txt', priority: 0.4 },
  { path: '/llms-full.txt', priority: 0.4 },
  { path: '/registry/zodiacs.registry.json', priority: 0.5 },
];
