import { ENGINE_VERSION } from '../engine/types';
import type { SavedChart } from './schema';

/** The package receipt predates the site's 2026-08-24 polar-axis correction. */
const LEGACY_ENGINE_VERSION = '0.1.0';
export const POLAR_REPAIR_VERSION = '0.1.0+polar-asc.1';

/** Both receipts use the same planet calculation; the latter records an axis repair. */
export function currentSavedCalculation(version: string): boolean {
  return version === ENGINE_VERSION
    || (ENGINE_VERSION === LEGACY_ENGINE_VERSION && version === POLAR_REPAIR_VERSION);
}

/**
 * Repair only the identified legacy polar defect, without loading an ephemeris.
 * The old package chose the setting ecliptic–horizon intersection for part of
 * the polar day. Its opposite is the rising intersection; MC and planets are
 * unaffected. This is the same axis swap as engine/houses.correctRisingIntersection.
 *
 * Birth records and timestamps are not rewritten. Positions-only records have
 * no independently retained place/time, so they are never inferred or repaired.
 * The distinct receipt also invalidates year-ahead scans made with the old ASC.
 */
export function repairLegacyPolarChart(chart: SavedChart): SavedChart {
  if (!chart || typeof chart !== 'object') return chart;
  const { birth, summary } = chart;
  const latitude = birth?.place?.lat;
  const angles = summary?.angles;
  if (summary?.engineVersion !== LEGACY_ENGINE_VERSION
    || birth?.timeKnown !== true || typeof birth.time !== 'string'
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birth.time)
    || !Array.isArray(summary.flags)
    || (summary.houseSystem !== 'whole' && summary.houseSystem !== 'placidus')
    || typeof latitude !== 'number' || !Number.isFinite(latitude)
    || Math.abs(latitude) <= 66 || Math.abs(latitude) > 90
    || !angles || !Number.isFinite(angles.asc) || !Number.isFinite(angles.mc)
    || angles.asc < 0 || angles.asc >= 360 || angles.mc < 0 || angles.mc >= 360) return chart;

  const separation = (angles.asc - angles.mc + 360) % 360;
  if (separation < 180) return chart;

  return {
    ...chart,
    summary: {
      ...summary,
      engineVersion: POLAR_REPAIR_VERSION,
      angles: { ...angles, asc: (angles.asc + 180) % 360 },
      houseSystem: 'whole',
      flags: summary.houseSystem === 'placidus' && !summary.flags.includes('polar-fallback')
        ? [...summary.flags, 'polar-fallback']
        : summary.flags,
    },
  };
}
