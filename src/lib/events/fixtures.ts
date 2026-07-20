/**
 * Labeled sample events for template review — NOT sky facts.
 *
 * These exist so every contract edge (missing optional fields, the
 * everything-on variant, an open-ended span) has render coverage without
 * waiting for a matching real event. They are never index-eligible, never
 * enter the sitemap or search index, and render only under
 * /events/preview/ behind a visible sample banner. Dates use 2030 — past
 * the verified catalogs — so no sample can be mistaken for a listed fact.
 */
import type { CatalogEvent } from './types';

const SAMPLE_NOTE = 'Sample data for template review — not a real sky date.';

export const FIXTURE_EVENTS: Omit<CatalogEvent, 'indexEligible' | 'fixture'>[] = [
  {
    // Minimal lunation: no moon name, no degree, no interpretation —
    // exercises graceful degradation of every optional slot.
    facts: {
      id: 'fixture-full-moon-minimal',
      family: 'lunation',
      subtype: 'full',
      path: '/events/preview/sample-full-moon/',
      title: 'Sample full moon — minimal fields',
      at: '2030-01-19T12:00:00.000Z',
      bodies: ['Moon', 'Sun'],
      signs: ['cancer'],
      provenance: { source: 'fixture' },
    },
    relations: { nearby: [] },
  },
  {
    // Everything-on aspect: interpretation, sign notes, limitations,
    // relations with reasons — the richest template variant.
    facts: {
      id: 'fixture-aspect-rich',
      family: 'aspect',
      subtype: 'trine',
      path: '/events/preview/sample-aspect/',
      title: 'Sample alignment — every field on',
      at: '2030-03-08T09:30:00.000Z',
      bodies: ['Saturn', 'Uranus'],
      signs: ['gemini', 'libra'],
      degree: 11.5,
      aspectType: 'trine',
      orb: 0,
      provenance: { source: 'fixture' },
    },
    relations: {
      previous: { id: 'fixture-full-moon-minimal', reason: 'Sample link — the previous exact hit of this pair' },
      nearby: [
        { id: 'fixture-full-moon-minimal', reason: 'Sample link — one day away, part of the same sample sky' },
      ],
    },
    interpretation: {
      lead: `${SAMPLE_NOTE} A lead paragraph sits here: one or two concrete sentences on what the alignment pairs and why the week around it tends to feel workable.`,
      body: [
        'Body paragraphs continue the reading in plain language, grounded in the facts above.',
        'A second paragraph shows how multi-paragraph interpretation composes on the page.',
      ],
      reflections: [
        'A practical prompt renders like this.',
        'A second prompt shows the list rhythm.',
      ],
      signNotes: [
        { sign: 'aries', house: 3, note: 'Sample note for Aries — the third-house register.' },
        { sign: 'taurus', house: 2, note: 'Sample note for Taurus — the second-house register.' },
      ],
      limitations: [SAMPLE_NOTE],
    },
  },
  {
    // Open-ended span: an end past the data horizon (null) — exercises the
    // honest "past the data horizon" label.
    facts: {
      id: 'fixture-retrograde-open',
      family: 'retrograde',
      subtype: 'cycle',
      path: '/events/preview/sample-retrograde/',
      title: 'Sample retrograde — open-ended window',
      start: '2030-11-20T00:00:00.000Z',
      end: null,
      bodies: ['Neptune'],
      signs: ['taurus'],
      provenance: { source: 'fixture' },
    },
    relations: { nearby: [] },
  },
];
