/**
 * Authored interpretation for event pages — written editorial copy, keyed
 * by event ID. Every factual claim in these passages must agree with the
 * committed catalogs; interpretations.test.ts pins the ones that name
 * signs, dates, or degrees. Events without an entry render facts, context,
 * and navigation only, and stay ineligible for indexing.
 *
 * Register: plain, warm, specific, calm. Astrology is a tradition being
 * read, not a mechanism being claimed. No predictions about health, money,
 * relationships, or outcomes — territories and questions, not verdicts.
 */
import type { EventInterpretation } from './types';

const INTERPRETATIONS: Record<string, EventInterpretation> = {
  'full-moon-2026-07-29': {
    lead: 'The Buck Moon peaks in Aquarius on July 29 while the Sun runs hot through Leo — the year\'s clearest look at the line between what you love doing and who it is actually for. Full moons bring things to light; this one lights the room, not the stage.',
    body: [
      'The Leo–Aquarius axis is personal warmth against the wider circle: your name on the work versus the group that makes the work possible. With the Moon at 6° Aquarius, the tradition reads a culmination in the collective part of life — friendships, teams, audiences, the future you are pointing at — while the Leo Sun keeps the question personal. Something you have been building since the quiet Cancer new moon of July 14 is now visible to other people, and their reaction is information.',
      'The timing has texture. Mercury finished its retrograde on July 23, so conversations that stalled through mid-July have started moving again; Saturn turned retrograde in Aries on July 26, opening a slower, half-year review of commitments made since February. A full moon three days into that turn tends to feel like a checkpoint rather than a finale — see what is finished, and let what is not finished be openly unfinished.',
    ],
    reflections: [
      'Name one thing that became public this month — a project, a decision, a change of company. Is it landing the way you intended?',
      'Where does the group need more of you, and where has the group been getting the part of you that your own work needed?',
    ],
    signNotes: [
      { sign: 'aries', house: 11, note: 'Something a group has been building — a team, a cause, a circle of friends — reaches its visible moment. Your part in it is the thing to name.' },
      { sign: 'taurus', house: 10, note: 'Work done in private shows up on the public ledger. A title, a review, a reputation question comes to a head.' },
      { sign: 'gemini', house: 9, note: 'A long-distance thread — study, travel, a belief you have been testing — asks for a verdict rather than more research.' },
      { sign: 'cancer', house: 8, note: 'A shared account comes due: a debt, a deposit, something merged. The clean number matters more than the story around it.' },
      { sign: 'leo', house: 7, note: 'The other person\'s turn. A partnership, romantic or working, shows you exactly where it stands.' },
      { sign: 'virgo', house: 6, note: 'The routine you have been running shows its results, in the body and the calendar alike. Adjust the load, not the goal.' },
      { sign: 'libra', house: 5, note: 'Something made for joy — a project, a romance, time with a child — reaches full size. Enjoy it in company.' },
      { sign: 'scorpio', house: 4, note: 'Home gets loud for a night: family news, a housing question, the private floor of your life lit up.' },
      { sign: 'sagittarius', house: 3, note: 'A message lands. Paperwork, a sibling, a neighborhood matter — the small print of the week peaks now.' },
      { sign: 'capricorn', house: 2, note: 'A money question rounds toward its answer — what something is worth, what you are owed, what steadies you.' },
      { sign: 'aquarius', house: 1, note: 'This one is yours. The Moon peaks in your own sign, and how you have been coming across gets mirrored back plainly.' },
      { sign: 'pisces', house: 12, note: 'The quietest version: something running under the surface — rest, a private worry, an ending — asks to be seen and set down.' },
    ],
  },

  'new-moon-2026-08-12': {
    lead: 'The Leo new moon of August 12 is not an ordinary monthly reset — it is a total solar eclipse, the Moon crossing the Sun\'s face at 20° Leo. The tradition treats an eclipsed new moon as a beginning with unusual reach: less a fresh page, more a new chapter heading.',
    body: [
      'Ordinary new moons are for quiet starts; astrologers tend to read eclipse new moons as doors that open on their own schedule. At 20° Leo the register is creative and personal — authorship, romance, performance, the parts of life where you are most yourself in public. Whatever begins near this date, the tradition suggests holding plans loosely: eclipse beginnings often look different a season later.',
      'This is also the middle of an eclipse pair. A partial lunar eclipse follows at the Pisces full moon on August 28, closing the season two weeks later. Reading the two dates as one story — a Leo opening, a Pisces release — is the older way to work with them.',
    ],
    reflections: [
      'If a door opened for you this week without your pushing on it, what would you want to be true about how you walk through it?',
      'What Leo-flavored thing — creative, romantic, personal — have you been postponing for a more sensible season?',
    ],
    limitations: [
      'Whether the eclipse itself is visible from your location depends on geography this page does not compute; the eclipse page carries the timing details.',
    ],
  },

  'eclipse-2026-08-12': {
    lead: 'On August 12, 2026 the Moon covers the Sun completely — a total solar eclipse at 20° Leo, peaking at 17:45 universal time. Along the narrow track where totality falls, day turns briefly to dusk; everywhere else, and in the astrology, it is the year\'s most emphatic new moon.',
    body: [
      'A solar eclipse is a new moon with exact aim: the Moon always passes between Earth and Sun at a new moon, but only when the line-up crosses the Moon\'s orbital nodes does it actually block the light. The tradition has read these interruptions for millennia as markers — endings and beginnings compressed into a single afternoon. Modern astrologers keep the reading but soften the fatalism: an eclipse in Leo asks where your creative and personal authority is headed, and tends to answer the question faster than you would have.',
      'Eclipses arrive in pairs. This one opens the season; the partial lunar eclipse at the Pisces full moon on August 28 closes it. The two weeks between them have a reputation for being eventful — a reputation worth neither fearing nor engineering. The practical advice the tradition gives is old and simple: watch what leaves, welcome what arrives, and avoid forcing major launches onto the exact day.',
    ],
    reflections: [
      'What role have you outgrown that an outside event would mercifully end?',
      'If the next six months rearranged themselves around one Leo theme — being seen, making something, leading — which would you want it to be?',
    ],
    limitations: [
      'Totality is visible only along a narrow ground track, and this page does not compute where that track falls. The peak time and zodiac position above are geometry, true from everywhere; the view from your location is not.',
    ],
  },

  'mercury-retrograde-2026-06-29': {
    lead: 'Mercury is retrograde from June 29 to July 23, 2026, backing from 26° to 16° of Cancer — the whole cycle inside one sign. Three or four times a year the messenger planet appears to reverse; this is the summer edition, and it runs entirely through the sign of home and family.',
    body: [
      'Retrograde motion is perspective, not reversal — Earth overtaking a slower line of sight — but the tradition\'s advice for these three weeks has stayed consistent for centuries: review instead of launch. Reread before sending. Confirm the booking. Expect the person from earlier in the summer to resurface. With the whole retrograde in Cancer, the classic themes tilt homeward: plans involving family, houses, and who-hosts-what are the likeliest places to find a crossed wire.',
      'The turnaround days deserve the most patience. Mercury stationed retrograde on June 29 and stations direct on July 23, and the standstill days on either end are when devices, schedules, and inboxes have their folklore moments. By the July 29 full moon the fog has usually burned off.',
    ],
    reflections: [
      'What summer plan deserves one confirming message rather than one more assumption?',
      'Something from June is likely to come back around — a person, an offer, an unfinished conversation. What would you do with it on a second pass?',
    ],
    limitations: [
      'Shadow periods — the dates when Mercury first and last crosses the degrees it retraces — are not listed here yet; the station dates above are the cycle\'s firm edges.',
    ],
  },

  'saturn-enters-aries-2026-02-14': {
    lead: 'On February 14, 2026, Saturn leaves Pisces and enters Aries, where it stays through the years ahead — the planet of structure moving into the sign of the first move. Saturn changes sign roughly every two and a half years, and each shift moves its slow work to a new part of everyone\'s chart.',
    body: [
      'Saturn in Aries is discipline applied to beginnings: the tradition reads it as a multi-year test of initiative, where starting things — and owning what you start — carries more weight and more scrutiny. What was diffuse during the Pisces years gets asked for its concrete form. The classic caution is impatience wearing the costume of decisiveness; the classic reward is self-reliance that has actually been earned.',
      'Saturn does not arrive alone. Neptune crossed into Aries three weeks earlier, on January 26, which is why astrologers talk about early 2026 as a genuine change of scenery: two of the slowest-moving planets stepping onto the zodiac\'s starting line within a month of each other. Saturn will spend late July to mid-December retrograde in Aries — the first review period of the new chapter.',
    ],
    reflections: [
      'What have you been meaning to start that would survive being taken seriously?',
      'Where in your life does "first" — going first, deciding first, being first — cost you the most, and what would structure change about that?',
    ],
  },

  'uranus-trine-pluto-2026-07-18': {
    lead: 'On July 18, 2026, Uranus in Gemini and Pluto in Aquarius reach an exact trine at 4° of the air signs — two of the slowest planets in the sky agreeing with each other. Aspects like this one are measured in generations, not weeks; the exact date is simply when the agreement is sharpest.',
    body: [
      'Uranus is the tradition\'s circuit breaker, Pluto its deep renovation, and a trine is the easy angle — 120°, signs of the same element, effort flowing rather than grinding. In air signs the shared project is ideas, language, networks, and how people organize themselves. Read collectively, it describes a stretch when structural change and technical change stop fighting each other. Read personally, it rewards whichever experiment you have been running quietly since the decade turned.',
      'The date sits inside a remarkable week: within seven days the sky also produces Jupiter\'s exact opposition to Pluto and its trine to Neptune, all near the same early degrees. Mid-July 2026 is the kind of sky astrologers mark years in advance — not because a single day changes anything, but because so many slow cycles pass their exact marks at once. Pluto is retrograde through it all, which the tradition reads as the renovation running on its internal schedule.',
    ],
    reflections: [
      'What small experiment in how you work, learn, or connect deserves to be made permanent?',
      'If the way your field organizes itself is genuinely changing, what position do you want to be standing in when it settles?',
    ],
  },

  'jupiter-trine-saturn-2026-08-31': {
    lead: 'On August 31, 2026, Jupiter in Leo and Saturn in Aries form an exact trine at 13° of the fire signs — growth and structure, for once, pulling in the same direction. The tradition reads the fire-sign version of this pairing as expansion that is willing to do the reps.',
    body: [
      'Jupiter is appetite and reach; Saturn is limit and load-bearing wall. Square or opposed, they argue. In trine, the argument becomes a division of labor: ambition gets a schedule, and discipline gets a reason. With Jupiter in Leo the growth is creative and personal — visibility, authorship, heart — while Saturn in Aries supplies the independent spine. Plans made near this date tend to be the durable kind, sized to what you can actually build.',
      'Saturn is retrograde at the exactitude, mid-way through its first Aries review, which softens the moment from a green light into an honest drafting table: the trine favors committing to the structure of the thing rather than its launch party. The angle stays within a workable orb for weeks on either side of the exact hit.',
    ],
    reflections: [
      'What ambition of yours deserves a load-bearing plan instead of another surge of enthusiasm?',
      'Which limit in your life is actually infrastructure — and which one is just a habit wearing a hard hat?',
    ],
  },
};

/** Authored interpretation for an event, when one exists. */
export function interpretationFor(id: string): EventInterpretation | undefined {
  return INTERPRETATIONS[id];
}

/** IDs with authored interpretation (exported for tests and the handoff). */
export const INTERPRETED_IDS = Object.keys(INTERPRETATIONS);
