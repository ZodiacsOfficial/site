/**
 * Editorial copy for the twelve Life Path pages at /numerology/life-path/{n}/.
 *
 * One entry per core number. Prose only, consumer register (see CLAUDE.md
 * voice rules); every computed fact on the page comes from src/lib/numerology
 * at build time, never from this file.
 */
import type { CoreNumber } from './numerology-meanings';

export interface LifePathSection {
  /** Sentence-case heading, e.g. "How it shows up". */
  heading: string;
  paragraphs: readonly string[];
}

export interface LifePathFaq {
  q: string;
  a: string;
}

export interface LifePathPage {
  number: CoreNumber;
  /** Meta title, ends with " | Zodiacs.org". */
  title: string;
  /** Meta description, 170 characters or fewer. */
  description: string;
  /** Two paragraphs: what the number is, and how the birth date arrives at it. */
  intro: readonly [string, string];
  sections: readonly LifePathSection[];
  faq: readonly LifePathFaq[];
  published: string;
  updated: string;
}

export const LIFE_PATH_NUMBERS: readonly CoreNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

export const LIFE_PATH_PAGES: readonly LifePathPage[] = [
  {
    number: 1,
    title: "Life Path 1 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 1 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 1, and how to check yours in seconds.",
    intro: [
      "Life Path 1 is the number of the person who goes first. In Pythagorean numerology the Life Path is the birth date reduced: month, day, and year each brought down to a single digit or a master number, then added and reduced once more. When that final total lands on 1, the tradition reads a life organised around independence, initiative, and the plain wish to be the one who decides.",
      "Six different totals reduce to 1 — 10, 19, 28, 37, 46, and 55 — so it is one of the more common life paths. One of those routes, 19, is a karmic debt number in the tradition and gets its own note below.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number start things the way other people consider them. The decision is made in the first minute and defended in the second. They work best with a clear goal and room to reach it their own way, and they get visibly restless under supervision that adds steps without adding sense. Praise lands, but not as much as being left alone to get on with it.",
          "The independence is real, and it is not the same as coldness. A 1 will show up for people, often decisively, but on their own initiative rather than by request. Being needed is welcome; being managed is not.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are founder, lead, first hire, or the specialist who owns a problem end to end. Long chains of approval are where a 1 does its worst work. Given a target and a deadline, it tends to arrive early, sometimes having quietly redefined the target on the way.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 1 chooses, and wants to be chosen back for the right reasons. It is loyal once decided and impatient before. Partners who want to be consulted on everything will find the pace hard; partners with a direction of their own find a 1 easy to travel beside. The tradition pairs it comfortably with the cooperative 2 and the sociable 3, and warns that two 1s need separate lanes.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "Every strength here has a shadow with the same name. Initiative becomes impatience; self-reliance becomes an inability to ask; leadership becomes a habit of deciding for people who would have preferred a vote. The work of a 1 is learning that going first does not require going alone, and that the second-fastest route with company in it is often the better one.",
        ],
      },
      {
        heading: "The 19/1 karmic debt",
        paragraphs: [
          "When the birth-date total is 19 rather than 10, 28, 37, 46, or 55, the tradition writes the number 19/1 and calls it a karmic debt. The reading is the same 1 with a sharper lesson: independence has already been overdone somewhere, and the correction is to lead without isolating and to accept help without treating it as defeat. The calculator shows the full total, so you can see which route your 1 took.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 1 mean?",
        a: "In Pythagorean numerology, 1 is the number of beginnings. A Life Path 1 is read as a life built around independence, initiative, and leadership, with impatience and isolation as the risks. It comes from the birth date alone; the name gives the other core numbers.",
      },
      {
        q: "Which birth dates give Life Path 1?",
        a: "Any date whose reduced month, day, and year add to 10, 19, 28, 37, 46, or 55. Reduce each part first: a twelfth month becomes 3, a 29th day becomes 11 and stays 11, a year like 1990 becomes 1. Add the three, then reduce the total. The calculator on this page does it and shows every step.",
      },
      {
        q: "Is Life Path 1 a good number?",
        a: "There are no good or bad life paths in the tradition, only tendencies. A 1's strengths are drive and originality; its difficulties are impatience and going it alone. Most readings care more about what a person does with the tendency than about the number itself.",
      },
      {
        q: "Which life paths are compatible with 1?",
        a: "The tradition pairs 1 most easily with 2, 3, and 5, finds 4 and 6 steady but slower, and treats a second 1 as workable only with separate territory. These are conventions, not measurements; a full comparison uses both people's core numbers, and the compatibility tool on this site compares two people's birth charts rather than their numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 2,
    title: "Life Path 2 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 2 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 2, and how to check yours in seconds.",
    intro: [
      "Life Path 2 is the number of the person who makes a pair work. In Pythagorean numerology the Life Path comes from the birth date alone: month, day, and year are each reduced to one digit or a master number, added together, and reduced a last time. When that final total lands on 2, the tradition reads a life organised around cooperation, diplomacy, and the quiet work of keeping people together.",
      "Only one total reduces to 2 — 20 — so it is one of the less common life paths. It accounts for 5.0 per cent of birth dates from 1900 to 2099. Four other totals would reduce to 2 but stop at 11, the first master number, and have their own page. None of the karmic debt numbers, 13, 14, 16, and 19, reduces to 2, so there is no debt note here.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number read a room before they have crossed it. They hear the thing that was not said, keep track of who is uneasy, and adjust before anyone has to ask. They work best beside someone, with a shared aim and a clear division of labour. They go quiet under a manager who confuses volume with authority. Being thanked matters; being consulted matters more.",
          "The patience is easy to mistake for passivity. A 2 will hold a position for years if the position is fair, and will move a whole group by degrees rather than by decree. It likes to be needed; what it cannot bear is being overlooked.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are second-in-command, mediator, editor, or the quieter half of a partnership whose judgement the louder half relies on. Open competition is where a 2 does its worst work. Given a problem that needs several people to agree, it tends to find the arrangement everyone can live with, often before the meeting ends.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 2 wants to be chosen, and chooses carefully in return. It is attentive from the first week and loyal long past the point where loyalty is convenient. Partners who need a lot of room will find the attentiveness heavy; partners who like company in their decisions find a 2 easy to live with. The tradition pairs it comfortably with the decisive 1, the caretaking 6, and the capable 8. It warns that the restless 5 and the private 7 leave a 2 waiting.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "Each of these strengths has a matching fault. Sensitivity becomes a habit of taking things personally; tact becomes silence when the truth is needed; cooperation becomes going along with a plan nobody actually wanted. The work of a 2 is learning that the difficult thing said kindly is still kind, and that agreeing with everyone is a way of disappearing.",
        ],
      },
      {
        heading: "Where the number comes from",
        paragraphs: [
          "A birth date can only reach 2 through a total of 20. A plain total of 2 never happens, because month, day, and year each reduce to at least 1 before they are added. The totals 11, 29, 38, and 47 would each come down to 2 by ordinary addition. The tradition treats 11 as a master number and stops there, so those dates are read as 11/2. That leaves 20, whose digits add to 2. Enter a date below and the calculator prints the unreduced total, so you can see whether yours is a plain 2 or an 11 that lives as a 2.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 2 mean?",
        a: "In Pythagorean numerology, 2 is the number of the pair. A Life Path 2 is read as a life built around cooperation, diplomacy, and sensitivity to other people, with over-accommodation and hurt feelings as the risks. Only the birth date goes into it; the other core numbers come from the name.",
      },
      {
        q: "Which birth dates give Life Path 2?",
        a: "Any date whose reduced month, day, and year add to exactly 20. Reduce each part first: a twelfth month becomes 3, an 8th day stays 8, a year like 1980 becomes 9. Add the three: 3, 8, and 9 make 20, which becomes 2. Totals of 11, 29, 38, and 47 stop at 11 instead. The calculator on this page runs the sum and lists each reduction.",
      },
      {
        q: "Is Life Path 2 a good number?",
        a: "The tradition does not rank life paths as good or bad; it describes leanings. A 2's strengths are tact, loyalty, and an eye for what a partnership needs; its difficulties are taking things to heart and keeping quiet when it should speak. What a reading weighs is what someone does with the leaning, not the number on its own.",
      },
      {
        q: "Which life paths are compatible with 2?",
        a: "The tradition pairs 2 most easily with 1, 6, 8, and 9, and finds 3 and 4 workable with some patience. It treats 5 and 7 as the ones most likely to leave a 2 waiting. Treat these as the tradition's conventions rather than measurements; a fuller comparison looks at both people's core numbers, and the compatibility tool on this site works from birth charts, not from numerology.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 3,
    title: "Life Path 3 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 3 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 3, and how to check yours in seconds.",
    intro: [
      "Life Path 3 is the number of the person who says it out loud. The Life Path in Pythagorean numerology is worked from the birth date: month, day, and year are each reduced to a digit or a master number, then the three are added and reduced again. When that final total lands on 3, the tradition reads a life organised around expression, sociability, and the plain pleasure of being heard.",
      "Six different totals reduce to 3 — 3, 12, 21, 30, 39, and 48 — so it is one of the more common life paths. About 11.1% of birth dates between 1900 and 2099 arrive at it. None of those routes is a karmic debt number. The four debts, 13, 14, 16, and 19, all reduce to other digits.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number talk the way other people think. The idea arrives already phrased, often with a joke attached, and the room tends to turn towards it. A 3 works best with someone to tell, and goes visibly flat in silence, paperwork, or a task with no audience. Praise lands well; laughter lands better, and a 3 will work for it.",
          "Lightness is not the same thing as shallowness, though a 3 is often taken for the second. A 3 notices a great deal and says only the parts that will land; what it feels privately runs deeper than the delivery suggests. Being enjoyed is welcome; being taken lightly is not.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are writer, presenter, teacher, host, or the one on a team who can explain the thing to whoever has to approve it. Solitary detail work is where a 3 does its weakest work. Given a brief, a deadline, and someone to show it to, it tends to deliver more than was asked, often in a form nobody specified.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 3 wants company that answers back. It is generous, quick to forgive, and more hurt by indifference than by criticism. Partners who need long quiet evenings will find the pace tiring; partners who like being talked to find a 3 easy to love. The tradition pairs it comfortably with the driving 1 and the restless 5, and allows the private 7 as an unlikely good match. It warns that the methodical 4 and the exacting 8 will keep asking the 3 to be serious.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The faults here are the strengths, overplayed. Expression becomes noise; optimism becomes a refusal to look at the hard thing; charm becomes a performance that outlasts the audience. The work of a 3 is finishing the things it began so eagerly, and learning that a silence is not always a gap to be filled.",
        ],
      },
      {
        heading: "Where the number comes from",
        paragraphs: [
          "A total of 3 needs month, day, and year each to reduce to 1: January or October, a day such as the 1st or 10th, and a year such as 1900. Totals of 12 and 21 can come from ordinary single digits: March, the 4th, and a year that reduces to 5 make 12; September, the 7th, and that year make 21. Totals of 30, 39, and 48 need a master number in the date, since three single digits add to 27 at most. The master can be the 11th, 22nd, or 29th, November, or a year whose digits add to 11 or 22. The calculator keeps the unreduced total on screen, so you can see which of the six routes your 3 took.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 3 mean?",
        a: "In Pythagorean numerology, 3 is the number of expression. A Life Path 3 is read as a life built around communication, sociability, and creative work, with scattering and a habit of not finishing as the risks. The birth date alone produces it; the name supplies the rest of the core numbers.",
      },
      {
        q: "Which birth dates give Life Path 3?",
        a: "Any date whose reduced month, day, and year add to 3, 12, 21, 30, 39, or 48. Reduce each part first: a twelfth month becomes 3, a 22nd day stays 22, a year like 1994 becomes 5. Then add the three and reduce the sum. The calculator here works the same steps and lists them.",
      },
      {
        q: "Is Life Path 3 a good number?",
        a: "No life path is good or bad in the tradition; each is a set of tendencies. A 3's strengths are warmth, wit, and the ability to put a thing into words; its difficulties are scattering, avoidance, and starting more than it finishes. What matters in most readings is how a person handles the tendency, not the number.",
      },
      {
        q: "Which life paths are compatible with 3?",
        a: "The tradition pairs 3 most easily with 1, 5, and 7, finds 6 and 9 warm but demanding, and treats 4 and 8 as the pairings that take the most work. These pairings are conventions rather than measurements, and a fuller reading takes both people's core numbers; the compatibility tool here compares birth charts, not numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 4,
    title: "Life Path 4 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 4 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 4, and how to check yours in seconds.",
    intro: [
      "Life Path 4 is the number of the person who builds. Pythagorean numerology takes the Life Path from the birth date: month, day, and year are each cut down to one digit or a master number, added, and reduced a final time. When that final total lands on 4, the tradition reads a life organised around structure, reliability, and the plain satisfaction of work that holds.",
      "Five different totals land on 4 — 4 itself, 13, 31, 40, and 49 — covering 7.7 per cent of birth dates from 1900 to 2099. A total of 22 stays 22, a master number, rather than coming down to 4. One of the five routes, 13, is a karmic debt number in the tradition and gets its own note below.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number would rather have a plan than a hunch. They make lists, keep them, and finish the last item on time. They work best with a clear brief, a fixed scope, and enough time to do a thing once rather than twice. A change to the schedule lands badly, less from stubbornness than from having already built the week around the old one. Praise is welcome, but being handed the next job says more.",
          "The steadiness is real, and it is not the same as dullness. A 4 has firm opinions about how things ought to be made and a long memory for who kept their word. Loyalty here is practical: it arrives early, brings the right tools, and stays until the work is done. Being relied on is the point; being rushed is the complaint.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are engineer, planner, project manager, builder, or the keeper of records everyone else lets slide. Vague direction and weekly changes of priority are where a 4 does its worst work. Given a specification and a deadline, it tends to deliver exactly what was asked, on time, with the notes nobody requested and everyone later needs.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 4 commits slowly and then completely. It shows affection in deeds rather than speeches: the shelf that finally went up, the date remembered without a reminder, the early lift to the station. Partners who want surprises will find the routine confining; partners who want someone they can count on find a 4 restful. The tradition pairs it comfortably with the cooperative 2, the home-minded 6, and the organised 8, and warns that the restless 5 and the scattered 3 wear on its patience.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The difficulties of a 4 are its strengths held too tightly. Method becomes rigidity; thoroughness becomes an inability to call anything finished; dependability becomes a habit of taking on the work nobody else will and resenting it in silence. A 4 grows by accepting that a revised plan is still a plan, and that method is there to carry the job, not to be kept for its own sake.",
        ],
      },
      {
        heading: "The 13/4 karmic debt",
        paragraphs: [
          "When the birth-date total is 13 rather than 4, 31, 40, or 49, the tradition writes the number 13/4 and calls it a karmic debt. The reading is the same 4 with a harder lesson: work that has to be done twice, because a shortcut was taken somewhere and the structure did not hold. The correction is honest, patient effort until it does. The calculator prints the total before reducing it, so you can see whether your 4 came by way of 13.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 4 mean?",
        a: "In Pythagorean numerology, 4 is the number of foundations. A Life Path 4 is read as a life built around structure, reliability, and steady work, with rigidity and overwork as the risks. It uses nothing but the birth date; the name is where the other core numbers come from.",
      },
      {
        q: "Which birth dates give Life Path 4?",
        a: "Any date whose reduced month, day, and year add to 4, 13, 31, 40, or 49. Reduce each part first: a tenth month becomes 1, a 13th day becomes 4, a year like 1975 becomes 22 and stays 22. Then add the three and reduce the sum; a final 22 stays 22. The calculator on this page walks through each step.",
      },
      {
        q: "Is Life Path 4 a good number?",
        a: "The tradition ranks no life path above another; each describes a tendency. A 4's strengths are steadiness, thoroughness, and follow-through; its difficulties are rigidity and a habit of overworking. Most readings put more weight on what a person does with the tendency than on the number.",
      },
      {
        q: "Which life paths are compatible with 4?",
        a: "The tradition pairs 4 most easily with 2, 6, and 8, finds 1 and 7 workable with patience, and treats 3 and 5 as the matches that take the most adjustment. None of this is measured; it is convention. A fuller reading compares both people's core numbers, and the compatibility tool on this site compares birth charts rather than numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 5,
    title: "Life Path 5 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 5 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 5, and how to check yours in seconds.",
    intro: [
      "Life Path 5 is the number of the person who keeps moving. In Pythagorean numerology the Life Path is worked out from the birth date: each of month, day, and year is reduced to a single digit or a master number, and the three are added and reduced once more. When that final total lands on 5, the tradition reads a life organised around freedom, change, and a curiosity that would rather see for itself than be told.",
      "Six different totals reduce to 5 — 5, 14, 23, 32, 41, and 50 — so it is one of the more common life paths. Between them they account for 11.1 percent of birth dates from 1900 to 2099. One of those routes, 14, is a karmic debt number in the tradition and gets its own note below.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number treat a settled routine as a problem to be solved. They learn by doing, pick up a new place or a new skill quickly, and get visibly bored once the novelty has worn off and the maintenance begins. They are good company, quick to talk to strangers, and honest about wanting the exit within reach. Variety is not a treat for a 5; it is closer to a working condition.",
          "Restless is not the same as unreliable. A 5 will keep its word, often at speed, but it needs to feel that the choice was its own. Being invited is welcome; being fenced in is not.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The roles that fit are the ones with a lot of moving parts: reporting, teaching, field work, consulting, anything that puts a different problem on the desk each week. A fixed desk and a fixed script are where a 5 does its worst work. Given a brief and room to improvise, it tends to find the shortcut nobody had noticed, and to explain it persuasively afterwards.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 5 chooses freely, and wants the choice to stay a choice. It is warm, curious, and easy to be with, and it is candid about needing room. Partners who want every weekend planned in advance will find the changes of direction tiring; partners with a life of their own find a 5 an easy travelling companion. The tradition pairs it comfortably with the independent 1 and the expressive 3. It warns that the steady 4 and the home-minded 6 will want more permanence than a 5 gives without being asked.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "Each of the 5's strengths has a shadow that answers to the same name. Adaptability becomes a habit of leaving before things get hard; curiosity becomes appetite; freedom becomes a way of never being pinned to anything, including a promise. The work of a 5 is learning to tell restlessness from a real reason to move, and to stay long enough for something to deepen. That is where most of the interesting parts turn out to be.",
        ],
      },
      {
        heading: "The 14/5 karmic debt",
        paragraphs: [
          "When the birth-date total is 14 rather than 5, 23, 32, 41, or 50, the tradition writes the number 14/5 and calls it a karmic debt. The reading is the same 5 with a sharper lesson: freedom has already been overdone somewhere, through excess or through leaving too soon, and the correction is to enjoy things in proportion and to see a commitment through. The calculator prints the total before it reduces it, so you can see whether your 5 came by way of 14.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 5 mean?",
        a: "In Pythagorean numerology, 5 is the number of motion. A Life Path 5 is read as a life built around freedom, change, and curiosity, with restlessness and excess as the risks. Only the birth date is used; the other core numbers come from the name.",
      },
      {
        q: "Which birth dates give Life Path 5?",
        a: "Any date whose reduced month, day, and year add to 5, 14, 23, 32, 41, or 50. Reduce the parts one at a time: a fifth month stays 5, a 13th day becomes 4, a year like 1994 becomes 5. Then add the three and reduce the sum: here 14, which becomes 5. The calculator on this page runs the sum and shows each reduction as it goes.",
      },
      {
        q: "Is Life Path 5 a good number?",
        a: "The tradition does not sort life paths into good and bad; each is a set of tendencies. A 5's strengths are versatility and curiosity; its difficulties are restlessness and a taste for the exit. In most readings the number matters less than what a person does with the tendency.",
      },
      {
        q: "Which life paths are compatible with 5?",
        a: "The tradition pairs 5 most easily with 1, 3, and 7, finds 4 and 6 steady but confining, and treats a second 5 as lively but hard to anchor. Treat these as conventions rather than measurements; a proper comparison reads both people's core numbers, and the compatibility tool here works from two birth charts, not from the numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 6,
    title: "Life Path 6 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 6 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 6, and how to check yours in seconds.",
    intro: [
      "Life Path 6 is the number of the person other people lean on. The Life Path in Pythagorean numerology is the birth date collapsed to one figure: month, day, and year are each reduced to a digit or a master number, and the three are added and reduced again. When that final total lands on 6, the tradition reads a life organised around responsibility, home, and the people who count on you.",
      "Five different totals reduce to 6 — 6, 15, 24, 42, and 51. None of them is a karmic debt number, so there is no debt note on this page. Across the birth dates from 1900 to 2099, 10.6% reduce to 6, a little over one date in ten.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number notice what someone needs before they are asked. They keep the house running, remember the appointment, and take the extra shift without making much of it. They work best where the effort is plainly for someone, and get uneasy in a room where nobody is looking after anybody. Standards are high, first for themselves and then, more quietly, for everyone else.",
          "The care is real, and it is not the same as softness. A 6 will say the hard thing to a friend who is drifting, and hold a line a more agreeable number would let slide. It is fair-minded in an argument and reliable in a crisis, often the calmest person in the room once the plan has failed.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are teacher, nurse, head of a small team, or whoever in the office ends up minding the new starters. A 6 does its best work where the responsibility is clear and the results show up in other people's lives. It struggles under a lead who cuts corners, and will carry a colleague's load rather than watch the job go badly, which is generous and, over a year, exhausting.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 6 commits early and means it. Home matters in the concrete sense of a table people gather at, and a partner who treats the shared life as an afterthought will be noticed. The tradition pairs it comfortably with the cooperative 2, the sociable 3, and the generous 9, and finds 4 and 8 steady company. It warns about the restless 5 and the private 7, who can read all that attention as a fence.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The strengths of a 6 carry their own faults inside them. Care becomes hovering; responsibility becomes taking over; high standards become a running commentary on how other people fall short. The work of a 6 is standing back while someone does a job worse than it would have, and catching the point at which looking after a person has become running them. The people a 6 looks after are usually more capable than it fears.",
        ],
      },
      {
        heading: "Where the number comes from",
        paragraphs: [
          "A Life Path 6 arrives by five routes. Reduce the month, the day, and the year each to a single digit, keeping a master number whole, and add the three. A total of 6 needs no further step; 15, 24, 42, and 51 each reduce to 6 in one. A total of 33 would reduce to 6 as well, but the tradition keeps it as the master number 33 and gives it its own page. None of these routes is a karmic debt number. The calculator prints the unreduced total, so you can see which of the five your date took.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 6 mean?",
        a: "In Pythagorean numerology, 6 is the number of responsibility. A Life Path 6 is read as a life built around care, home, and the people who count on you, with over-commitment and control as the risks. The date is the only input; the remaining core numbers are read from the name.",
      },
      {
        q: "Which birth dates give Life Path 6?",
        a: "Any date whose reduced month, day, and year add to 6, 15, 24, 42, or 51. Reduce each part first: a sixth month stays 6, a 15th day becomes 6, a year like 1992 becomes 3. Then add the three and reduce the sum; that example gives 15, which reduces to 6. The calculator here works the same steps and prints them.",
      },
      {
        q: "Is Life Path 6 a good number?",
        a: "There is no good or bad life path in the tradition, only leanings. A 6's strengths are warmth, fairness, and reliability when things go wrong; its difficulties are over-commitment and a habit of managing people who did not ask to be managed. Readings weigh what someone does with the leaning, not the digit on its own.",
      },
      {
        q: "Which life paths are compatible with 6?",
        a: "The tradition pairs 6 most easily with 2, 3, and 9, finds 4 and 8 steady, and treats 5 and 7 as the harder matches, since both guard their freedom and privacy. These are the tradition's conventions, not measurements. A fuller comparison uses both people's core numbers; the compatibility tool on this site compares two birth charts instead.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 7,
    title: "Life Path 7 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 7 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 7, and how to check yours in seconds.",
    intro: [
      "Life Path 7 is the number of the person who needs to understand a thing before trusting it. Pythagorean numerology derives the Life Path from the birth date: month, day, and year are each reduced to a digit or a master number, then added together and reduced one last time. When that final total lands on 7, the tradition reads a life organised around study, privacy, and a scepticism that is closer to care than to contempt.",
      "Five different totals reduce to 7 — 7 itself, 16, 25, 34, and 52 — and about 11.1 per cent of birth dates from 1900 to 2099 arrive at it. One of those routes, 16, is a karmic debt number in the tradition and gets its own note below.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number ask the second question while everyone else is still answering the first. They read the manual, check the source, and notice the detail that does not fit, and they would rather be quiet and right than quick and half sure. Crowds tire them faster than work does. Given a problem and a closed door, a 7 can go a long way without needing anyone to check in.",
          "The solitude is real, and it is not the same as unhappiness. A 7 keeps a small number of people close and gives them more attention than a sociable person spreads across a wider circle. Being understood is welcome; being interrupted is not.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are researcher, analyst, engineer, editor, or the specialist who is trusted to say whether something is true. Open-plan offices and daily stand-ups are where a 7 does its worst work. Given a hard question and time to think, it tends to come back with an answer that holds, and with the three objections you had not considered.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 7 is slow to open and steady once it has. It wants a partner who can be in the same room without filling the silence, and who takes a quiet evening as a compliment rather than a symptom. Partners who need constant reassurance will find the distance hard; partners with an inner life of their own find a 7 restful company. The tradition pairs it comfortably with the methodical 4 and the curious 5, and warns that the reassurance-seeking 2 and the outward-facing 8 want more company than a 7 offers.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "Every gift of a 7 has a cost that looks just like it. Analysis becomes suspicion; privacy becomes withdrawal; depth becomes a refusal to say anything until it can be proven. The work of a 7 is learning that some things are felt before they are known, and that being hard to fool is not the same as being hard to reach. A door left open now and then is a smaller risk than it looks.",
        ],
      },
      {
        heading: "The 16/7 karmic debt",
        paragraphs: [
          "When the birth-date total is 16 rather than 7, 25, 34, or 52, the tradition writes the number 16/7 and calls it a karmic debt. The reading is the same 7 with a sharper lesson: something was once built on the wrong footing and came down, and the correction is to rebuild with more humility and clearer sight. The calculator prints the total before it reduces it, so you can see whether your 7 came by way of 16.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 7 mean?",
        a: "In Pythagorean numerology, 7 is the number of the inward turn. A Life Path 7 is read as a life built around analysis, privacy, and depth, with suspicion and withdrawal as the risks. The birth date is all it needs; the name accounts for the other core numbers.",
      },
      {
        q: "Which birth dates give Life Path 7?",
        a: "Any date whose reduced month, day, and year add to 7, 16, 25, 34, or 52. Reduce each part first: a twelfth month becomes 3, a 29th day becomes 11 and stays 11, a year like 1987 becomes 7. Then add the three and reduce what you get. The calculator on this page does the arithmetic and lays out each step.",
      },
      {
        q: "Is Life Path 7 a good number?",
        a: "The tradition treats no life path as better than another; each is a tendency. A 7's strengths are perception and thoroughness; its difficulties are suspicion and keeping people at a distance. What counts in a reading is how the tendency is handled, not the number.",
      },
      {
        q: "Which life paths are compatible with 7?",
        a: "The tradition pairs 7 most easily with 4 and 5, finds 1 and 9 workable with enough room, and treats 2 and 8 as harder pairings unless both people are patient about distance. They are conventions rather than findings. A fuller comparison takes both people's core numbers into account, and the compatibility tool on this site works from birth charts, not numerology.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 8,
    title: "Life Path 8 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 8 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 8, and how to check yours in seconds.",
    intro: [
      "Life Path 8 is the number of the person who takes charge. In Pythagorean numerology the Life Path comes from the birth date alone: month, day, and year are each reduced to a single digit or a master number, then added together and reduced again. When that final total lands on 8, the tradition reads a life organised around ambition, authority, and the wish to be judged by what got done.",
      "Six different totals reduce to 8 — 8, 17, 26, 35, 44, and 53. None of them is a karmic debt number, so there is no second reading to add. Of the birth dates from 1900 to 2099, 11.1% arrive at 8.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number see the whole board and want to be the one moving the pieces. They notice who holds authority in a room and where the real decision is being made. They work best with a large goal, a clear line of responsibility, and a way of measuring the result at the end. Effort that produces nothing anyone can point to makes them visibly frustrated. Praise is welcome; a finished result is better.",
          "Ambition here is not vanity. An 8 wants the authority because it wants the outcome, and it will carry the responsibility that comes with it, including the blame. It keeps its word, expects the same back, and takes a long view that people mistake for coldness until they see what it built.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The obvious fits are manager, director, head of a department, or the person who runs the operation while someone else holds the title. An 8 is at its best with a team to organise, a target everyone can see, and the standing to make the unpopular call. It does its worst work where nobody owns the result, and it tends to take charge of a leaderless room whether or not anyone asked.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 8 is loyal and protective, and it shows love by making things work: the house runs, the plans hold, the problem gets handled. Partners who need to be asked how they feel will have to say so, because an 8 assumes that competence is the compliment. The tradition pairs it comfortably with the patient 2, the methodical 4, and the caretaking 6, and warns that an 8 and a 1 both want the last word.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The shadows here are the strengths taken one step further. Authority becomes control; strategy becomes a habit of weighing people by their usefulness; stamina becomes a refusal to stop until something breaks. The work of an 8 is to see the people around it as more than what they contribute, and to stop while stopping is still a choice rather than a collapse. A result nobody wanted to be part of is smaller than it looks.",
        ],
      },
      {
        heading: "Where the number comes from",
        paragraphs: [
          "A total of 8 means the reduced month, day, and year added to 8 straight away. The next two, 17 and 26, are the ordinary routes: three small parts adding to a two-digit total that reduces to 8 in one step. The larger totals, 35, 44, and 53, only appear when an 11 or a 22 sits in one of the parts and stays whole. Enter a date below and the calculator prints the whole total before reducing it, so the route is plain for any birthday.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 8 mean?",
        a: "In Pythagorean numerology, 8 is the number of results. A Life Path 8 is read as a life built around ambition, authority, and responsibility for outcomes, with control and overwork as the risks. The birth date alone decides it; the other core numbers are worked from the name.",
      },
      {
        q: "Which birth dates give Life Path 8?",
        a: "Any date whose reduced month, day, and year add to 8, 17, 26, 35, 44, or 53. Reduce each part first: a tenth month becomes 1, a 26th day becomes 8, a year like 1979 becomes 8. Then add the three and reduce the sum; that example makes 17, which becomes 8. The calculator on this page runs the same sum and lists every step.",
      },
      {
        q: "Is Life Path 8 a good number?",
        a: "Life paths are not ranked in the tradition; each describes a set of tendencies. An 8's strengths are capability, confidence, and the nerve to make the unpopular decision; its difficulties are control and a habit of pushing on past the point of rest. Most readings care about what a person does with the tendency rather than the number.",
      },
      {
        q: "Which life paths are compatible with 8?",
        a: "The tradition pairs 8 most easily with 2, 4, and 6, finds 3 and 9 warm but pulling in other directions, and treats 1 and 5 as a contest over who decides. These pairings are conventions, not measurements; a fuller comparison uses both people's core numbers, and the compatibility tool on this site works from two birth charts rather than two numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 9,
    title: "Life Path 9 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 9 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 9, and how to check yours in seconds.",
    intro: [
      "Life Path 9 is the number of the person who takes the wide view. In Pythagorean numerology the Life Path comes from the birth date: month, day, and year are each reduced to a single digit or a master number, added together, and reduced again. When that final total lands on 9, the tradition reads a life organised around compassion, breadth, and the ability to let things end.",
      "Five different totals reduce to 9 — 9, 18, 27, 36, and 45 — so it is one of the more common life paths, about 11.1 per cent of birth dates from 1900 to 2099. None of those routes is a karmic debt number, so a 9 has no extra note; the arithmetic is set out below.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number notice the whole room before they notice their own seat in it. They are moved by situations other people file under somebody else's problem, and they give time and attention more freely than is strictly sensible. The tradition associates 9 with endings as much as with causes: it is the last single digit, and the people who carry it tend to close a chapter cleanly.",
          "Generous does not mean soft. A 9 holds opinions about how the world should be run and will say them out loud. Its warmth is broad rather than close: easy with strangers, sometimes slower with the people nearest to hand. Being counted on is welcome; being confined to one corner is not.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are teacher, counsellor, doctor, campaigner, or the person in any organisation who keeps asking who the work is for. Narrow, repetitive briefs are where a 9 does its worst work. Given a purpose it believes in, it carries an unreasonable load without complaint and finishes projects other people quietly abandoned. It is also the colleague who says first when something has run its course.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 9 loves widely and wants a partner who does not resent that. It is slow to hold a grudge and hard to reach when the cause of the month has all its attention. Partners who need to be the centre of every evening will find the breadth wearing; partners with a cause of their own find a 9 a steady companion. The tradition pairs it comfortably with the expressive 3 and the caring 6, and warns that the practical 4 and the results-minded 8 want firmer ground.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The shadows here go by the same names as the strengths. Compassion becomes martyrdom; breadth becomes a way of never being fully present; the gift for endings becomes a habit of leaving before the difficult part. The work of a 9 is holding a little back for itself, and extending to the particular people at hand the forgiveness it offers humanity at large.",
        ],
      },
      {
        heading: "Where the number comes from",
        paragraphs: [
          "Five totals reduce to 9: the reduced month, day, and year can add to 9 directly, or to 18, 27, 36, or 45. Each folds back to 9 when its digits are added: 1 and 8, 2 and 7, 3 and 6, 4 and 5. None of the karmic debt numbers, 13, 14, 16, or 19, is on that list. The calculator prints the total before it reduces it, so the route your 9 took is visible.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 9 mean?",
        a: "In Pythagorean numerology, 9 is the number of completion. A Life Path 9 is read as a life built around compassion, breadth, and causes larger than one person, with self-neglect and distance from the people close by as the risks. Only the birth date is involved; the other core numbers come from the name.",
      },
      {
        q: "Which birth dates give Life Path 9?",
        a: "Any date whose reduced month, day, and year add to 9, 18, 27, 36, or 45. Start by reducing each part: a ninth month stays 9, a 27th day becomes 9, a year like 1980 becomes 9. Then add the three and reduce once more. The calculator on this page sets out every step of the sum.",
      },
      {
        q: "Is Life Path 9 a good number?",
        a: "The tradition does not rank life paths as good or bad; it describes tendencies. A 9's strengths are generosity and a wide, tolerant view; its difficulties are giving too much away and being easier to admire than to reach. In a reading, the handling of the tendency counts for more than the number.",
      },
      {
        q: "Which life paths are compatible with 9?",
        a: "The tradition pairs 9 most easily with 3, 6, and a second 9, finds 1 and 2 workable with patience, and treats 4 and 8 as the hardest matches. These are conventions rather than measurements. A fuller comparison uses both people's core numbers, and the compatibility tool on this site works from two birth charts, not two numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 11,
    title: "Life Path 11 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 11 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 11, and how to check yours in seconds.",
    intro: [
      "Life Path 11 is the first of the three master numbers, and the tradition reads it as a 2 pitched higher than a 2 usually goes. In Pythagorean numerology the Life Path is taken from the birth date: month, day, and year are each reduced to a single digit or a master number, then the three are added and reduced again. When that final total is 11 it stays 11. The tradition reads a life organised around intuition, sensitivity, and the restlessness of noticing more than most people do.",
      "Four totals give an 11 — 11 itself, plus 29, 38, and 47, which add to 11 and stop there. None of the four is a karmic debt number. About 6.1 per cent of birth dates from 1900 to 2099 arrive here. It is usually written 11/2; the 2 is the setting it rests in between the moments the 11 shows.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number notice the undercurrent first and the surface second. They know who in a room is unhappy before a word is said, and they seldom wait to be told. Ideas arrive whole and early, often ahead of the evidence, which makes an 11 useful near the start of anything. The other side is nerves, because all that reception has to go somewhere.",
          "The sensitivity is the 2's, and so is the diplomacy. An 11 wants harmony as much as any 2 does, but it also wants to say what it has seen. The two wishes pull against each other. On a good day it inspires; on a poor one it frets, second-guesses, and takes on other people's moods as its own.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The roles that suit an 11 are counsellor, teacher, designer, writer, or the person a team asks what is really going on. An 11 does well wherever perception is the job and poorly wherever it is treated as a distraction. It needs structure around it, since structure is not what it supplies. Given a brief and a calm room, it tends to see the answer before the meeting has agreed on the question.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 11 feels a great deal and says less of it than it should. It is attentive, loyal, and easily hurt, and it reads a partner so well that the partner feels either understood or watched. The tradition pairs it comfortably with the steady 4 and the caring 6, which supply ground, and with the cooperative 2. It warns that 11 with 5 runs out of stillness, and that two 11s double each other's nerves.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The strengths here come with difficulties of the same shape. Perception becomes anxiety; inspiration becomes a dozen half-begun visions; sensitivity becomes a habit of absorbing every mood within reach. The work of an 11 is grounding: plain routine, one project chosen and finished, and checking an intuition against the facts before acting on it. An 11 that never learns this, the tradition says, lives as an anxious 2.",
        ],
      },
      {
        heading: "Living as a 2",
        paragraphs: [
          "The tradition writes 11/2 because the master number is not the everyday setting. Most days an 11 is a 2: cooperative, tactful, a good listener, happier in a pair than in charge. The 11 appears when an idea takes hold or a room needs someone to name what is wrong. What separates the two is whether the sensitivity gets used or merely suffered. A 2 keeps the peace; an 11 is asked to say what it sees. The calculator keeps the unreduced total on screen, so you can see whether yours came in at 11, 29, 38, or 47.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 11 mean?",
        a: "In Pythagorean numerology, 11 is the first master number, read as a 2 with more intensity. A Life Path 11 is associated with intuition, sensitivity, and inspiration, with nerves and indecision as the risks. It is written 11/2 and is taken from the birth date alone; the rest of the core numbers come from the name.",
      },
      {
        q: "Which birth dates give Life Path 11?",
        a: "Any date whose reduced month, day, and year add to 11, 29, 38, or 47. Reduce each part on its own: an eleventh month stays 11, a 29th day becomes 11 and stays 11, a year like 1985 becomes 5. Then add the three and reduce the sum, keeping 11 where it appears. The calculator on this page runs the sum and keeps every step visible.",
      },
      {
        q: "Is Life Path 11 a good number?",
        a: "No life path is good or bad in the tradition, and a master number is not a promotion. An 11's strengths are perception and the ability to inspire; its difficulties are nerves, self-doubt, and too many visions at once. Most readings weigh what someone does with the tendency far more than the number.",
      },
      {
        q: "Which life paths are compatible with 11?",
        a: "The tradition pairs 11 most easily with 2, 4, and 6, and finds 8 and 9 workable with patience. It warns that 5 and a second 11 add restlessness to restlessness. These pairings are conventions rather than measurements; a real comparison uses both people's core numbers, and the compatibility tool on this site works from two birth charts, not two numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 22,
    title: "Life Path 22 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 22 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 22, and how to check yours in seconds.",
    intro: [
      "Life Path 22 is the number of the person who builds at scale. The Life Path in Pythagorean numerology comes from the birth date: month, day, and year are each brought to a digit or a master number, then added and reduced a final time. When that final total is 22 it stays 22. The tradition reads a life organised around long plans, practical method, and leaving something standing that other people will use.",
      "Only one total reaches 22 — 22 itself — since a master number is not reduced further, and none of the karmic debt numbers is involved. About 3.4 per cent of birth dates between 1900 and 2099 arrive here, one of the less common life paths. The tradition writes it 22/4, and on ordinary days a 22 lives as a 4.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number think in structures. Where a 4 wants the schedule to hold, a 22 wants the whole building to hold, and to outlast the people who planned it. Patient with detail and impatient with vagueness, they ask the practical question first: who does this, by when, with what. From outside the size of their plans looks like ambition; from inside it feels like an obligation to get the thing built.",
          "The number carries the nerves of the master numbers along with the discipline of the 4. A 22 that has found work large enough for it is steady and quietly formidable. One that has not can seem restless, over-careful, or oddly underpowered, as though waiting for a project that deserves the effort.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The natural shapes are architect, engineer, planner, or the manager who turns a sprawling idea into a working system. A 22 does its best work where the plan is long and the result is concrete. It is less suited to work finished by Friday and forgotten by Monday, and it needs colleagues to carry what it cannot hold alone.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "A 22 is loyal, practical, and slow to say what it feels, preferring to show it: the repaired thing, the plan for the year, the promise kept. Partners who need to hear it said will have to ask. The tradition pairs it comfortably with the cooperative 2, the steady 4, and the responsible 6. It warns that the sociable 3 and the restless 5 can find a 22's long plans confining.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The risks here are the strengths grown past their use. Vision becomes a plan too large to start; discipline becomes rigidity; practicality becomes a refusal to try what cannot be drawn to scale first. The particular risk is doubt on the way in, since the plans look unreasonable until half built. The work is trusting the size of the idea, then letting a team carry most of it: a structure many people use is never built by one.",
        ],
      },
      {
        heading: "Living as a 4",
        paragraphs: [
          "The tradition writes the number 22/4 because a master number is not a full-time state. Most days a 22 is a 4: reliable, methodical, doing the next task on the list. The 22 shows in what the list is for. What separates the two is reach rather than talent. A 4 builds something sound for the people in front of it; a 22 builds something sound that strangers will use after it has moved on.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 22 mean?",
        a: "In Pythagorean numerology, 22 is the master builder: a 4 with an architect's ambition. A Life Path 22 is read as a life built around long plans, discipline, and structures other people will use, with rigidity and self-doubt as the risks. The birth date on its own produces it; the name gives the remaining core numbers.",
      },
      {
        q: "Which birth dates give Life Path 22?",
        a: "Any date whose reduced month, day, and year add to exactly 22. Reduce each part first: a fourth month is 4, a 9th day is 9, a year like 1998 becomes 27 and then 9. Add the three: 4 + 9 + 9 makes 22, a master number, so it is left as it is. The calculator here does the same arithmetic and shows each reduction.",
      },
      {
        q: "Is Life Path 22 a good number?",
        a: "The tradition does not grade life paths, and a master number is not a promotion. A 22's strengths are discipline and reach; its difficulties are rigidity and doubting its own plans. A reading cares more about what is done with the tendency than about the number.",
      },
      {
        q: "Which life paths are compatible with 22?",
        a: "The tradition pairs 22 most easily with 2, 4, and 6, finds 8 a strong ally with the same taste for results, and warns that 3 and 5 can find its long plans a weight. None of this is measured. A fuller comparison reads both people's core numbers, and the compatibility tool on this site sets two birth charts side by side rather than two numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
  {
    number: 33,
    title: "Life Path 33 Meaning: Traits, Work, Love, and Growth | Zodiacs.org",
    description:
      "What Life Path 33 means in Pythagorean numerology: how it shows up, at work and in relationships, which birth dates reduce to 33, and how to check yours in seconds.",
    intro: [
      "Life Path 33 is the number of the teacher, and the rarest of the three master numbers. In Pythagorean numerology the Life Path is the birth date worked down: month, day, and year are each reduced to a digit or a master number, added together, and reduced once again. When that final total is 33, the tradition reads a life organised around service, guidance, and a responsibility that does not stop at the family.",
      "Only one total reduces to 33 — 33 itself. It covers about 0.5 percent of birth dates from 1900 to 2099, the smallest share of any life path. It is not a karmic debt number. The tradition writes it 33/6: the 33 is the calling, and the 6 is the number it answers to most days.",
    ],
    sections: [
      {
        heading: "How it shows up",
        paragraphs: [
          "People with this number are the ones others bring their trouble to, and they rarely turn anyone away. They notice who in a room is struggling and act before being asked. The instinct is to teach rather than to fix: a 33 would rather show the method than do the task, though it will do the task when needed.",
          "The care is real, and it is not soft. A 33 can be exacting with people it believes are capable of more, and holds itself to the same rule. What it wants is not thanks but evidence that the help took. Being relied on is welcome; being taken for granted wears it down faster than it will admit.",
        ],
      },
      {
        heading: "At work",
        paragraphs: [
          "The work that fits is teacher, mentor, counsellor, nurse, or the senior colleague who trains everyone and is thanked by almost no one. A 33 does its best work where improvement is visible over months rather than by Friday. Its worst comes in any workplace that treats people as interchangeable. Given a class, a ward, or a team to bring on, it tends to stay long after it could have left.",
        ],
      },
      {
        heading: "In relationships",
        paragraphs: [
          "The 33 gives first and asks later. It is loyal, attentive, and quick to carry a partner's burdens, which is a gift until it becomes a habit nobody agreed to. Partners who want a peer rather than a carer will need to say so. The tradition pairs it comfortably with the cooperative 2, the wide-hearted 9, and a steady 6. It warns about the restless 5 and the private 7, which do not want to be looked after.",
        ],
      },
      {
        heading: "The growth edge",
        paragraphs: [
          "The shadow of a 33 is the same quality overdone. Service becomes martyrdom; guidance becomes a lecture; devotion becomes a way of never having to ask for anything. The tradition's growth line is a sense of proportion: give what can be spared, notice the point at which help has become a way of running someone's life, and let the people you look after do something for you in return. A 33 that cannot receive is teaching the wrong lesson.",
        ],
      },
      {
        heading: "Living as a 6",
        paragraphs: [
          "On most days a 33 is a 6: the caretaker, responsible for the household and measuring a good week by who was looked after. What separates the two, in the tradition's reading, is reach. A 6 cares for its own; a 33 keeps widening the circle to students, patients, neighbours, and strangers, and carries the extra weight. The tradition says the 33 only shows itself under that load; a person who never takes it on lives, contentedly, as a 6. The calculator keeps the unreduced total on screen, so you can see whether your date reaches 33 or a plain 6.",
        ],
      },
    ],
    faq: [
      {
        q: "What does Life Path 33 mean?",
        a: "In Pythagorean numerology, 33 is the master number of the teacher: a 6 with a wider brief. A Life Path 33 is read as a life built around service, guidance, and care beyond the family, with self-sacrifice and exhaustion as the risks. The date alone produces it; the name is the source of the other core numbers.",
      },
      {
        q: "Which birth dates give Life Path 33?",
        a: "Any date whose reduced month, day, and year add to exactly 33. Reduce each part first: an eleventh month stays 11, an eleventh day stays 11, and a year like 2009 also becomes 11. Add the three and the total is 33, which is kept as a master number rather than reduced to 6. The calculator on this page works it through and shows each step.",
      },
      {
        q: "Is Life Path 33 a good number?",
        a: "The tradition does not rate one life path above another; each names a tendency. A 33's strengths are warmth, wisdom, and the trust of people who trust few; its difficulties are over-giving and a quiet resentment when nothing comes back. The number is rare enough that most readings treat it as a demand rather than a prize.",
      },
      {
        q: "Which life paths are compatible with 33?",
        a: "The tradition pairs 33 most easily with 2, 6, and 9, and finds 4 and 11 steady company. It treats 5 and 7 as the hardest fits, since neither wants to be looked after. These are conventions of the tradition, not measurements; a fuller comparison uses both people's core numbers, and the compatibility tool on this site compares birth charts rather than numbers.",
      },
    ],
    published: '2026-09-07',
    updated: '2026-09-07',
  },
];

export function lifePathPage(number: CoreNumber): LifePathPage | undefined {
  return LIFE_PATH_PAGES.find((page) => page.number === number);
}
