import type { Chart } from '../../lib/engine/types';
import { houseOf } from '../../lib/engine/houses';
import { formatLongitude } from '../../lib/signs';
import type { LunarReturnResultData } from './compute';
import { LUNAR_HOUSE_COPY, LUNAR_RETURN_NOTE, lunarAspectReading } from './copy';

export interface LunarReturnExportModel {
  title: 'Lunar return';
  instantUtc: string;
  referenceUtc: string;
  engineVersion: string;
  wheel: Pick<Chart, 'bodies' | 'angles' | 'houses' | 'aspects'>;
  reading: Array<{ kind: 'moon-house' | 'moon-aspect' | 'asc'; text: string }>;
  readingBasis: string[];
  notes: string[];
}

/** Select completed facts explicitly; birth data, place, names and IDs never enter exports. */
export function lunarReturnExportModel(result: LunarReturnResultData): LunarReturnExportModel {
  const { chart } = result;
  const moon = chart.bodies.find((body) => body.body === 'Moon');
  const reference = new Date(result.referenceUtc);
  if (!moon || !Number.isFinite(moon.lon) || !chart.angles || !chart.houses
    || chart.input.timeKnown !== true || !Number.isFinite(reference.getTime())
    || chart.input.utc.getTime() <= reference.getTime()) throw new RangeError('A complete lunar return is needed to prepare this image.');
  const moonHouse = houseOf(moon.lon, chart.houses.cusps);
  const reading: LunarReturnExportModel['reading'] = [{ kind: 'moon-house', text: LUNAR_HOUSE_COPY[moonHouse] }];
  const readingBasis = [`Moon ${formatLongitude(moon.lon)} · house ${moonHouse}`];
  const aspect = chart.aspects.filter((row) => (row.a === 'Moon' || row.b === 'Moon')
    && !row.a.includes('Node') && !row.b.includes('Node'))
    .sort((a, b) => a.orb - b.orb || a.a.localeCompare(b.a) || a.b.localeCompare(b.b))[0];
  if (aspect) {
    reading.push({ kind: 'moon-aspect', text: lunarAspectReading(aspect) });
    readingBasis.push(`${aspect.a} ${aspect.type} ${aspect.b} · ${aspect.orb.toFixed(1)}° orb`);
  }
  return {
    title: 'Lunar return', instantUtc: chart.input.utc.toISOString(), referenceUtc: reference.toISOString(),
    engineVersion: chart.engineVersion,
    wheel: {
      bodies: chart.bodies.map((row) => ({ ...row })), aspects: chart.aspects.map((row) => ({ ...row })),
      angles: { ...chart.angles }, houses: { system: chart.houses.system, cusps: [...chart.houses.cusps] },
    }, reading, readingBasis,
    notes: [LUNAR_RETURN_NOTE, ...(chart.flags.includes('polar-fallback') ? ['Whole-sign houses are used because Placidus is unavailable at this location.'] : [])],
  };
}
