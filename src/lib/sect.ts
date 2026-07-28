/**
 * Sect — whether a chart belongs to the day or to the night.
 *
 * It is the oldest division in the tradition and one the wheel cannot show,
 * because it needs a horizon: the Sun above it at birth makes a diurnal
 * chart, below it a nocturnal one. Everything after that follows by table.
 * The Sun, Jupiter and Saturn are the diurnal planets; the Moon, Venus and
 * Mars the nocturnal ones. Whichever half matches the chart is said to be
 * in sect, and the chart's own luminary — Sun by day, Moon by night — is
 * its sect light.
 *
 * Mercury takes no side of its own. It goes with the half it rises in:
 * with the day when it comes up ahead of the Sun as a morning star, with
 * the night when it trails behind as an evening star.
 *
 * Uranus, Neptune and Pluto have no place in the scheme — it was settled
 * long before anyone saw them — so they appear on neither list.
 *
 * The altitude that decides all this is geometry, computed from the birth
 * minute and place. Only the reading that follows is a matter of doctrine.
 */
export type Sect = 'day' | 'night';

/** Whether a body rises ahead of the Sun (oriental) or behind it. */
export type Orientality = 'oriental' | 'occidental';

export const DIURNAL_PLANETS = ['Sun', 'Jupiter', 'Saturn'] as const;
export const NOCTURNAL_PLANETS = ['Moon', 'Venus', 'Mars'] as const;

export interface SectReading {
  sect: Sect;
  /** Degrees of the Sun above the horizon; negative is below. */
  sunAltitude: number;
  /** The luminary of the chart's own half. */
  light: 'Sun' | 'Moon';
  /** Null when Mercury's longitude was not supplied. */
  mercury: Orientality | null;
  /** Planets whose own half matches the chart's, Mercury included. */
  inSect: string[];
  outOfSect: string[];
}

/** Signed shortest angle from one longitude to another, in (−180, 180]. */
function signedDelta(from: number, to: number): number {
  const raw = ((to - from) % 360 + 360) % 360;
  return raw > 180 ? raw - 360 : raw;
}

/**
 * Whether a body rises before the Sun or after it.
 *
 * The ascendant sweeps the zodiac in increasing longitude, so a body
 * standing earlier in zodiacal order than the Sun reaches the horizon
 * first — the morning star the tradition calls oriental. A body exactly on
 * the Sun rises with it and is counted occidental.
 */
export function orientality(bodyLon: number, sunLon: number): Orientality {
  return signedDelta(bodyLon, sunLon) > 0 ? 'oriental' : 'occidental';
}

export function sectOf(input: {
  /** Degrees of the Sun above the horizon; negative is below. */
  sunAltitude: number;
  sunLon: number;
  mercuryLon?: number | null;
}): SectReading {
  // The Sun exactly on the horizon counts to the day, the way sunrise
  // starts one rather than ending the night.
  const sect: Sect = input.sunAltitude >= 0 ? 'day' : 'night';

  const mercury = typeof input.mercuryLon === 'number'
    ? orientality(input.mercuryLon, input.sunLon)
    : null;

  const inSect: string[] = [...(sect === 'day' ? DIURNAL_PLANETS : NOCTURNAL_PLANETS)];
  const outOfSect: string[] = [...(sect === 'day' ? NOCTURNAL_PLANETS : DIURNAL_PLANETS)];

  if (mercury) {
    const mercurySect: Sect = mercury === 'oriental' ? 'day' : 'night';
    (mercurySect === sect ? inSect : outOfSect).push('Mercury');
  }

  return {
    sect,
    sunAltitude: input.sunAltitude,
    light: sect === 'day' ? 'Sun' : 'Moon',
    mercury,
    inSect,
    outOfSect,
  };
}
