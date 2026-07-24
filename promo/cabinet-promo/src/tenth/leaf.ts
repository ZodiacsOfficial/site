/**
 * The fifth edition's palette and the film's timing sheet.
 *
 * Every beat in "The Tenth" is named here rather than buried in the scenes,
 * so the cut can be re-timed in one place and the score can be written
 * against the same numbers.
 */

/** Gold leaf — brighter and more saturated than the brass filet of edition IV. */
export const LEAF = '#E8C46A';
export const LEAF_BRIGHT = '#FFF2C4';
export const LEAF_DEEP = '#7A5620';
export const LEAF_INK = '#2A1D07';

/** The cast bar that frames a gilded seat, mitred around the opening. */
export const LEAF_BAR =
  'linear-gradient(146deg, #FFF6D8 0%, #E6BD5C 22%, #8D6626 46%, #F6E3A8 68%, #C1913C 100%)';

/** The plate ground: leaf poured flat, lettering punched dark into it. */
export const LEAF_PLATE =
  'linear-gradient(102deg, #FFF2C4, #E8C46A 46%, #C99F47)';

export const FPS = 30;

/**
 * Scene boundaries, in frames. The film is built on one hard stop: the tally
 * reaches nine and everything holds, because the ceiling is the story and a
 * ceiling only reads if you are made to look up at it.
 */
export const T = {
  /** Open already lit — no title card. On a muted timeline the first frame is the ad. */
  hookIn: 0,
  /**
   * The nine strikes, accelerating. The first lands on frame zero: an X video
   * shows its opening frame as the poster, so frame zero has to be a finished
   * composition — sculpture, tally, count — not a layout waiting to fill.
   */
  strikes: [0, 18, 32, 44, 55, 65, 74, 82, 89],
  ruleIn: 26,
  /** Everything stops on nine. The pause is the product. */
  holdIn: 112,
  lineNine: 120,
  turnIn: 146,
  lineTenth: 156,
  /** The tenth lands. */
  gild: 180,
  dimOut: 190,
  gildSweepEnd: 210,
  plateIn: 204,
  numberIn: 234,
  flexIn: 276,
  flexLine: 298,
  ctaIn: 350,
  end: 394,
} as const;

/** Held in one sign to reach edition V. */
export const GILDED_AMOUNT = 10_000_000;
