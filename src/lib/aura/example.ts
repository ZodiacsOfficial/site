import type { SavedChart } from '../profile/schema';
import type { AuraCabinetHolding, AuraSign } from './types';

/** The curator's sample shows one seat at each of the five editions. */
export const AURA_EXAMPLE_HOLDINGS: AuraCabinetHolding[] = [
  { sign: 'aries', finish: 'gold', goldCount: '12' },
  { sign: 'cancer', finish: 'pastel' },
  { sign: 'leo', finish: 'bronze' },
  { sign: 'scorpio', finish: 'silver' },
  { sign: 'aquarius', finish: 'gold', goldCount: '3' },
];

export const AURA_EXAMPLE_HELD_SIGNS: AuraSign[] = AURA_EXAMPLE_HOLDINGS.map(
  ({ sign }) => sign,
);

export const AURA_EXAMPLE_CHART: SavedChart = {
  id: 'registry-aura-example',
  name: 'Example chart',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  birth: {
    date: '1994-05-02',
    time: '12:00',
    timeKnown: true,
    place: null,
  },
  summary: {
    engineVersion: 'aura-example-v1',
    utcISO: '1994-05-02T12:00:00.000Z',
    houseSystem: 'whole',
    bodies: [
      { body: 'Sun', lon: 42, retrograde: false },
      { body: 'Moon', lon: 105, retrograde: false },
      { body: 'Mercury', lon: 70, retrograde: false },
      { body: 'Venus', lon: 15, retrograde: false },
      { body: 'Mars', lon: 132, retrograde: false },
      { body: 'Jupiter', lon: 218, retrograde: true },
      { body: 'Saturn', lon: 337, retrograde: false },
      { body: 'Uranus', lon: 295, retrograde: true },
      { body: 'Neptune', lon: 294, retrograde: true },
      { body: 'Pluto', lon: 237, retrograde: true },
    ],
    angles: { asc: 190, mc: 100 },
    flags: [],
  },
};
