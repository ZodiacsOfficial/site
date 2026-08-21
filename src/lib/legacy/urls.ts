/**
 * Human-facing legacy-wing URLs eligible for sitemap discovery. Machine
 * contracts such as llms.txt and the Registry JSON remain served from public/
 * but are deliberately absent here.
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
];
