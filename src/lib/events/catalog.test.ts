import { describe, expect, it } from 'vitest';
import { bodyLongitude } from '../engine/full';
import { degreeInSign, signForLongitude } from '../signs';
import { solarHouse } from '../daily';
import { eventsCatalog, RETRO_PAGE_PLANETS, SLOW_BODIES } from './catalog';
import { eventClock, metaDescription, metaTitle, moonNameForDate } from './format';
import { INTERPRETED_IDS, interpretationFor } from './interpretations';
import { EVENTS_INDEX_ELIGIBLE } from './types';

const catalog = eventsCatalog();
const byId = catalog.byId;
const anchor = (id: string) => {
  const event = byId.get(id)!;
  return new Date(event.facts.at ?? event.facts.start ?? 0).getTime();
};

describe('events catalog — construction', () => {
  it('builds every family from the committed catalogs', () => {
    const families = new Set(catalog.events.map((event) => event.facts.family));
    for (const family of ['lunation', 'eclipse', 'retrograde', 'ingress', 'aspect', 'station']) {
      expect(families.has(family as never), `family ${family}`).toBe(true);
    }
  });

  it('gives every event a unique id and every page a unique trailing-slash path', () => {
    const ids = new Set<string>();
    const paths = new Set<string>();
    const pageIds = new Set(catalog.pages.map((page) => page.facts.id));
    for (const event of [...catalog.events, ...catalog.fixtures]) {
      expect(ids.has(event.facts.id), event.facts.id).toBe(false);
      ids.add(event.facts.id);
      expect(event.facts.path.startsWith('/'), event.facts.path).toBe(true);
      if (pageIds.has(event.facts.id) || event.fixture) {
        expect(event.facts.path.endsWith('/'), event.facts.path).toBe(true);
        expect(event.facts.path.includes('#'), event.facts.path).toBe(false);
        expect(paths.has(event.facts.path), event.facts.path).toBe(false);
        paths.add(event.facts.path);
      }
    }
  });

  it('keeps outer-planet cycles and stations on the /retrogrades/ table anchors', () => {
    const jupiter = byId.get('jupiter-retrograde-2026-12-13')!;
    expect(jupiter.facts.path).toBe('/retrogrades/#retrograde-jupiter-2026-12-13');
    expect(catalog.pages.some((page) => page.facts.id === jupiter.facts.id)).toBe(false);
    const saturnStation = byId.get('saturn-stations-retrograde-2026-07-26')!;
    expect(saturnStation.facts.path).toBe('/retrogrades/#retrograde-saturn-2026-07-26');
    const mercuryCycle = byId.get('mercury-retrograde-2026-06-29')!;
    expect(catalog.pages.some((page) => page.facts.id === mercuryCycle.facts.id)).toBe(true);
  });

  it('keeps the branch-wide indexing policy off for every event', () => {
    expect(EVENTS_INDEX_ELIGIBLE).toBe(false);
    for (const event of [...catalog.events, ...catalog.fixtures]) {
      expect(event.indexEligible, event.facts.id).toBe(false);
    }
  });

  it('marks fixtures as fixtures, under /events/preview/, never from real sources', () => {
    expect(catalog.fixtures.length).toBeGreaterThan(0);
    for (const fixture of catalog.fixtures) {
      expect(fixture.fixture).toBe(true);
      expect(fixture.facts.provenance.source).toBe('fixture');
      expect(fixture.facts.path.startsWith('/events/preview/')).toBe(true);
    }
    for (const event of catalog.events) {
      expect(event.facts.provenance.source).not.toBe('fixture');
      expect(event.facts.path.startsWith('/events/preview/')).toBe(false);
    }
  });
});

describe('events catalog — named regression vectors', () => {
  it('carries the 2026-07-29 full moon in Aquarius (the Buck Moon)', () => {
    const full = byId.get('full-moon-2026-07-29')!;
    expect(full).toBeDefined();
    expect(full.facts.path).toBe('/full-moon/2026-07-29/');
    expect(full.facts.signs).toEqual(['aquarius']);
    expect(full.facts.degree).toBeGreaterThan(5.5);
    expect(full.facts.degree).toBeLessThan(7.5);
    expect(full.facts.moonName).toBe('Buck');
  });

  it('carries the 2026-08-12 new moon at 20° Leo from the monthly catalog', () => {
    const newMoon = byId.get('new-moon-2026-08-12')!;
    expect(newMoon.facts.signs).toEqual(['leo']);
    expect(newMoon.facts.degree).toBeCloseTo(20.04, 1);
    expect(newMoon.facts.provenance.source).toBe('transits-2026-08.json');
  });

  it('pairs the 2026-08-12 new moon with its total solar eclipse, both ways', () => {
    const newMoon = byId.get('new-moon-2026-08-12')!;
    const eclipse = byId.get('eclipse-2026-08-12')!;
    expect(newMoon.relations.eclipse?.id).toBe('eclipse-2026-08-12');
    expect(eclipse.relations.lunation?.id).toBe('new-moon-2026-08-12');
    expect(eclipse.facts.eclipseKind).toBe('total');
    expect(eclipse.facts.subtype).toBe('solar');
    expect(eclipse.facts.obscuration).toBe(1);
    expect(newMoon.relations.eclipse?.reason.length).toBeGreaterThan(10);
  });

  it('carries the summer 2026 Mercury retrograde with both stations', () => {
    const cycle = byId.get('mercury-retrograde-2026-06-29')!;
    expect(cycle.facts.start?.slice(0, 10)).toBe('2026-06-29');
    expect(cycle.facts.end?.slice(0, 10)).toBe('2026-07-23');
    expect(cycle.facts.clamped).toBe(false);
    const rxStation = byId.get('mercury-stations-retrograde-2026-06-29')!;
    const directStation = byId.get('mercury-stations-direct-2026-07-23')!;
    expect(rxStation.relations.cycle?.id).toBe(cycle.facts.id);
    expect(directStation.relations.cycle?.id).toBe(cycle.facts.id);
    // The interpretation claims a 26° → 16° arc entirely inside Cancer; pin it.
    expect(cycle.facts.signs).toEqual(['cancer']);
    const rxLon = bodyLongitude('Mercury', new Date(cycle.facts.start!));
    expect(signForLongitude(rxLon).slug).toBe('cancer');
    expect(Math.floor(degreeInSign(rxLon))).toBe(26);
    const directLon = bodyLongitude('Mercury', new Date(cycle.facts.end!));
    expect(signForLongitude(directLon).slug).toBe('cancer');
    expect(degreeInSign(directLon)).toBeGreaterThan(16);
    expect(degreeInSign(directLon)).toBeLessThan(17);
  });

  it('marks the windows clipped at the data horizon as clamped, without station degrees', () => {
    const jupiter = byId.get('jupiter-retrograde-2026-01-01')!;
    expect(jupiter.facts.clamped).toBe(true);
    expect(jupiter.facts.degree).toBeUndefined();
    expect(byId.get('jupiter-stations-retrograde-2026-01-01')).toBeUndefined();
  });

  it('names the 2026-05-31 full moon a blue moon (second full moon of May)', () => {
    const blue = byId.get('full-moon-2026-05-31')!;
    expect(blue.facts.moonName).toBe('Blue');
    expect(moonNameForDate('2026-07-29T14:36:19.011Z', false)).toBe('Buck');
  });

  it('carries the slow-planet ingresses of early 2026 with origin signs', () => {
    const saturn = byId.get('saturn-enters-aries-2026-02-14')!;
    expect(saturn.facts.fromSign).toBe('pisces');
    const neptune = byId.get('neptune-enters-aries-2026-01-26')!;
    expect(neptune.facts.signs).toEqual(['aries']);
    const uranus = byId.get('uranus-enters-gemini-2026-04-26')!;
    expect(uranus.facts.fromSign).toBe('taurus');
  });

  it('carries the committed slow-pair exact aspects with zero orb', () => {
    const trine = byId.get('jupiter-trine-saturn-2026-08-31')!;
    expect(trine.facts.orb).toBe(0);
    expect(trine.facts.degree).toBeCloseTo(13.68, 1);
    const uranusPluto = byId.get('uranus-trine-pluto-2026-07-18')!;
    expect(uranusPluto.facts.signs).toEqual(['gemini', 'aquarius']);
    for (const event of catalog.events) {
      if (event.facts.family !== 'aspect') continue;
      expect(event.facts.orb).toBe(0);
      for (const body of event.facts.bodies) {
        expect(SLOW_BODIES).toContain(body as never);
      }
    }
  });

  it('has real Venus and Mars cycles so every retrograde page family renders', () => {
    expect(byId.get('venus-retrograde-2026-10-03')).toBeDefined();
    expect(byId.get('mars-retrograde-2027-01-10')).toBeDefined();
    expect(RETRO_PAGE_PLANETS).toEqual(['Mercury', 'Venus', 'Mars']);
  });
});

describe('events catalog — derivation agreement', () => {
  it('agrees with the engine at every monthly-catalog lunation instant', () => {
    for (const event of catalog.events) {
      if (event.facts.family !== 'lunation') continue;
      if (!event.facts.provenance.source.startsWith('transits-')) continue;
      const lon = bodyLongitude('Moon', new Date(event.facts.at!));
      expect(signForLongitude(lon).slug, event.facts.id).toBe(event.facts.signs[0]);
      expect(Math.abs(degreeInSign(lon) - event.facts.degree!), event.facts.id).toBeLessThan(0.1);
    }
  });
});

describe('events catalog — relations', () => {
  it('keeps previous/next chronological, comparable, and bidirectional', () => {
    for (const event of catalog.events) {
      const { previous, next } = event.relations;
      if (previous) {
        const other = byId.get(previous.id)!;
        expect(other, previous.id).toBeDefined();
        expect(anchor(previous.id)).toBeLessThan(anchor(event.facts.id));
        expect(other.facts.family).toBe(event.facts.family);
        expect(other.relations.next?.id).toBe(event.facts.id);
        expect(previous.reason.length).toBeGreaterThan(5);
      }
      if (next) {
        expect(anchor(next.id)).toBeGreaterThan(anchor(event.facts.id));
        expect(byId.get(next.id)?.relations.previous?.id).toBe(event.facts.id);
      }
    }
  });

  it('keeps nearby links within five days, capped, resolvable, and reasoned', () => {
    const DAY = 86_400_000;
    for (const event of catalog.events) {
      expect(event.relations.nearby.length).toBeLessThanOrEqual(3);
      for (const link of event.relations.nearby) {
        expect(byId.get(link.id), link.id).toBeDefined();
        expect(Math.abs(anchor(link.id) - anchor(event.facts.id))).toBeLessThanOrEqual(5 * DAY);
        expect(link.reason.length).toBeGreaterThan(10);
        expect(link.id).not.toBe(event.facts.id);
      }
    }
  });

  it('never repeats the paired eclipse/lunation inside nearby', () => {
    const eclipse = byId.get('eclipse-2026-08-12')!;
    expect(eclipse.relations.nearby.some((link) => link.id === 'new-moon-2026-08-12')).toBe(false);
    const newMoon = byId.get('new-moon-2026-08-12')!;
    expect(newMoon.relations.nearby.some((link) => link.id === 'eclipse-2026-08-12')).toBe(false);
    for (const event of catalog.events) {
      const paired = [event.relations.lunation?.id, event.relations.eclipse?.id];
      for (const link of event.relations.nearby) {
        expect(paired.includes(link.id), `${event.facts.id} repeats ${link.id}`).toBe(false);
      }
    }
  });

  it('keeps nearby lists to dated moments — no cycle spans, no own stations', () => {
    for (const event of catalog.events) {
      for (const link of event.relations.nearby) {
        const other = byId.get(link.id)!;
        expect(other.facts.family, `${event.facts.id} -> ${link.id}`).not.toBe('retrograde');
        if (event.facts.family === 'retrograde') {
          const ownStation = other.facts.family === 'station'
            && other.facts.bodies[0] === event.facts.bodies[0];
          expect(ownStation, `${event.facts.id} -> ${link.id}`).toBe(false);
        }
      }
    }
  });
});

describe('events catalog — metadata and copy', () => {
  const pages = [...catalog.pages, ...catalog.fixtures];

  it('produces unique titles, meta titles, and meta descriptions per page', () => {
    const titles = new Set<string>();
    const metaTitles = new Set<string>();
    const descriptions = new Set<string>();
    for (const event of pages) {
      expect(titles.has(event.facts.title), event.facts.title).toBe(false);
      titles.add(event.facts.title);
      const meta = metaTitle(event.facts);
      expect(metaTitles.has(meta), meta).toBe(false);
      metaTitles.add(meta);
      const description = metaDescription(event.facts);
      expect(descriptions.has(description), event.facts.id).toBe(false);
      descriptions.add(description);
      expect(description.length).toBeGreaterThan(70);
      expect(description.length).toBeLessThan(230);
    }
  });

  it('keeps banned vocabulary and register tells out of every authored passage', () => {
    const banned = [
      /delve|unlock|embark|tapestry|vibrant|elevate|empower|harness/i,
      /in today's world/i,
      /done properly|computed properly|shows? (its|their) work|like a human|no mush|not vibes/i,
      /AI-operated|versioned template|generation mode|source hash|fail-closed|noon-UTC snapshot/i,
      /proportionate to the evidence|source receipts?|computed from the real sky|committed calculation/i,
      /!/,
      /celestial event invites/i,
    ];
    const passages: string[] = [];
    for (const id of INTERPRETED_IDS) {
      const interpretation = interpretationFor(id)!;
      passages.push(interpretation.lead, ...(interpretation.body ?? []),
        ...(interpretation.reflections ?? []), ...(interpretation.limitations ?? []),
        ...(interpretation.signNotes ?? []).map((note) => note.note));
    }
    for (const event of pages) {
      passages.push(metaDescription(event.facts), event.facts.title);
    }
    for (const passage of passages) {
      for (const pattern of banned) {
        expect(pattern.test(passage), `${pattern} in: ${passage.slice(0, 80)}`).toBe(false);
      }
    }
  });

  it('binds every authored interpretation to a real catalog event', () => {
    for (const id of INTERPRETED_IDS) {
      const event = byId.get(id);
      expect(event, id).toBeDefined();
      expect(event!.fixture).toBeUndefined();
      expect(event!.interpretation).toBeDefined();
    }
  });

  it('keeps the Buck Moon sign notes distinct and on the declared house method', () => {
    const full = byId.get('full-moon-2026-07-29')!;
    const notes = full.interpretation!.signNotes!;
    expect(notes.length).toBe(12);
    const texts = new Set(notes.map((note) => note.note));
    expect(texts.size).toBe(12);
    for (const note of notes) {
      expect(note.house).toBe(solarHouse('aquarius', note.sign));
      expect(note.note.length).toBeGreaterThan(40);
    }
  });

  it('pins the factual claims made inside authored copy to the catalogs', () => {
    // Eclipse page claims a 17:45 universal-time peak on August 12.
    const eclipse = byId.get('eclipse-2026-08-12')!;
    expect(eventClock(eclipse.facts.at!)).toBe('17:45 UTC');
    expect(byId.get('eclipse-2026-08-28')!.facts.subtype).toBe('lunar');
    // The new-moon and eclipse copy both reference the August 28 pair date.
    expect(byId.get('full-moon-2026-08-28')!.relations.eclipse?.id).toBe('eclipse-2026-08-28');
    // Jupiter–Saturn copy claims 13° in Leo/Aries fire signs.
    const trine = byId.get('jupiter-trine-saturn-2026-08-31')!;
    expect(trine.facts.signs).toEqual(['leo', 'aries']);
    // Uranus–Pluto copy claims 4° in air signs, with Pluto retrograde.
    const uranusPluto = byId.get('uranus-trine-pluto-2026-07-18')!;
    expect(Math.floor(uranusPluto.facts.degree!)).toBe(4);
    const plutoRx = byId.get('pluto-retrograde-2026-05-06')!;
    expect(new Date(plutoRx.facts.start!) < new Date(uranusPluto.facts.at!)).toBe(true);
    expect(new Date(plutoRx.facts.end!) > new Date(uranusPluto.facts.at!)).toBe(true);
    // Saturn-ingress copy claims a late-July retrograde station in Aries.
    const saturnRx = byId.get('saturn-retrograde-2026-07-26')!;
    expect(saturnRx.facts.signs).toContain('aries');
    // Buck Moon copy claims Mercury direct July 23 and Saturn retrograde July 26.
    expect(byId.get('mercury-stations-direct-2026-07-23')).toBeDefined();
    expect(byId.get('saturn-stations-retrograde-2026-07-26')).toBeDefined();
  });
});
