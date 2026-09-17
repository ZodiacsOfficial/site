/**
 * The presets, as data. Deliberately free of any engine import: the page needs
 * these four titles to render its buttons, and pulling the ephemeris in to read
 * four strings would load ~73KB before anyone has asked for a comparison.
 * `fixtures.ts` turns these into real receipts, and is imported only when one
 * is actually run.
 */
export interface SyntheticInput {
  readonly utc: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly houseSystem: 'placidus' | 'whole';
  readonly sourceInstant?: string;
  readonly timeKnown?: boolean;
}

/** London, an ordinary non-polar place, on a date with nothing special about it. */
export const ORDINARY: SyntheticInput = {
  utc: '1990-06-15T13:30:00Z', latitude: 51.5074, longitude: -0.1278, houseSystem: 'placidus',
};

export interface Preset {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly left: SyntheticInput;
  readonly right: SyntheticInput;
}

/**
 * Four presets, each chosen because it produces a different kind of answer:
 * nothing, a reproducible cause, a reported cause with no numerical
 * consequence, and a case the tool refuses to call.
 */
export const PRESETS: readonly Preset[] = Object.freeze([
  {
    id: 'identical',
    title: 'The same calculation twice',
    summary: 'Nothing differs.',
    left: ORDINARY,
    right: ORDINARY,
  },
  {
    id: 'house-system',
    title: 'Same birth details, different house system',
    summary: 'The bodies sit where they sat; every cusp moves. The cause is reproduced by recalculation.',
    left: ORDINARY,
    right: { ...ORDINARY, houseSystem: 'whole' },
  },
  {
    id: 'equivalent-instants',
    title: 'The same moment, written two ways',
    summary: 'One file says 13:30 UTC and the other 19:00+05:30. Same instant, so nothing computed differs.',
    left: ORDINARY,
    right: { ...ORDINARY, sourceInstant: '1990-06-15T19:00:00+05:30' },
  },
  {
    id: 'ambiguous',
    title: 'Not enough information to say',
    summary: 'Two different places and two different moments at once. Several causes fit.',
    left: ORDINARY,
    right: { utc: '1990-06-15T18:45:00Z', latitude: 40.7128, longitude: -74.006, houseSystem: 'placidus' },
  },
]);
