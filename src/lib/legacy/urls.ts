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
  { path: '/astrofolio/', priority: 0.8 },
  { path: '/terminal/', priority: 0.78 },
  { path: '/registry/', priority: 0.8 },
  ...SIGN_SLUGS.map((slug) => ({ path: `/registry/${slug}/`, priority: 0.6 })),
  { path: '/thesis/', priority: 0.6 },
  { path: '/archive/', priority: 0.6 },
  { path: '/sdk/', priority: 0.7 },
  { path: '/sdk/examples/simastry-aura/', priority: 0.4 },
  { path: '/llms.txt', priority: 0.4 },
  { path: '/llms-full.txt', priority: 0.4 },
  { path: '/registry/zodiacs.registry.json', priority: 0.5 },
];
