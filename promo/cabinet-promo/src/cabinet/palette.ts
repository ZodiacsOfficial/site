/**
 * The cabinet's materials, and the film's timing sheet.
 *
 * Every beat lives here rather than inside the scenes, so the cut can be
 * re-timed in one place and the score can be written against the same numbers.
 */
import type { SeatEdition } from './Seat';

/** Gold leaf — the fifth edition's metal, brighter than the brass filet. */
export const LEAF = '#E8C46A';
export const LEAF_BRIGHT = '#FFF2C4';
export const LEAF_INK = '#2A1D07';

/** The cast bar that frames a gilded seat, mitred around the opening. */
export const LEAF_BAR =
  'linear-gradient(146deg, #FFF6D8 0%, #E6BD5C 22%, #8D6626 46%, #F6E3A8 68%, #C1913C 100%)';

/** The plate ground: leaf poured flat, lettering punched dark into it. */
export const LEAF_PLATE = 'linear-gradient(102deg, #FFF2C4, #E8C46A 46%, #C99F47)';

export const FPS = 30;

/**
 * One address's standing, in zodiac order.
 *
 * Eight of the Twelve, every edition represented, four seats still reserved.
 * A cabinet that fills completely would be a nicer picture and a worse
 * advertisement: the empty niches are the product's engine, and the film has
 * to show a case a viewer would want to keep working on.
 */
export const STANDING: { edition: SeatEdition; tally?: number }[] = [
  { edition: 'gilded', tally: 12 }, // Aries — stands as Gold until the last rung
  { edition: 'reserved' }, //          Taurus
  { edition: 'pastel' }, //            Gemini
  { edition: 'bronze' }, //            Cancer
  { edition: 'silver' }, //            Leo
  { edition: 'reserved' }, //          Virgo
  { edition: 'pastel' }, //            Libra
  { edition: 'gold', tally: 3 }, //    Scorpio
  { edition: 'bronze' }, //            Sagittarius
  { edition: 'reserved' }, //          Capricorn
  { edition: 'silver' }, //            Aquarius
  { edition: 'reserved' }, //          Pisces
];

export const HELD_COUNT = STANDING.filter((seat) => seat.edition !== 'reserved').length;

/** The ladder, read across the filled case rather than on cutaway cards. */
export const RUNGS: {
  edition: Exclude<SeatEdition, 'reserved'>;
  numeral: string;
  name: string;
  range: string;
}[] = [
  { edition: 'pastel', numeral: 'I', name: 'Pastel Disc', range: 'Under 10,000 held' },
  { edition: 'bronze', numeral: 'II', name: 'Bronze Edition', range: 'From 10,000 held' },
  { edition: 'silver', numeral: 'III', name: 'Silver Edition', range: 'From 100,000 held' },
  { edition: 'gold', numeral: 'IV', name: 'Gold Sculpture', range: 'From 1,000,000 held' },
  { edition: 'gilded', numeral: 'V', name: 'The Gilded Case', range: 'From 10,000,000 held' },
];

/** Frames per ladder beat. Long enough to read a numeral, a name, and a figure. */
export const RUNG_BEAT = 24;

export const T = {
  /** The case wakes before the works: a light comes up on twelve empty niches. */
  wake: 0,
  /** The first seat lands here; the rest follow in zodiac order. */
  fillIn: 14,
  fillStep: 9,
  /** The last held seat lands on 104; nothing is said until the case is full. */
  countIn: 112,
  lineTwelve: 118,
  /** The ladder, one rung at a time, in place on the filled case. */
  ladderIn: 146,
  /** Rung V runs long: the gilding is the payoff, not the plot. */
  gild: 242,
  gildSweepEnd: 274,
  plateIn: 264,
  lineRecord: 300,
  lineUnfinished: 330,
  ctaIn: 356,
  end: 410,
} as const;

/** When a given seat lands, in frames. */
export function seatLandsAt(index: number): number {
  return T.fillIn + index * T.fillStep;
}
