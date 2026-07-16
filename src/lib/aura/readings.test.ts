import { describe, expect, it } from 'vitest';
import {
  composeAuraReadingText,
  groundedAuraReflection,
  type AuraReadingFacts,
  type AuraReadingNatalFact,
  type AuraReadingSkyFact,
} from './readings';
import { AURA_SIGN_ORDER } from './types';

function facts(overrides: Partial<AuraReadingFacts> = {}): AuraReadingFacts {
  return { sign: 'cancer', illustrative: false, natal: [], sky: null, ...overrides };
}

describe('Registry Aura braided readings', () => {
  it('keeps the base line as the lead and the only card-safe text', () => {
    const reading = composeAuraReadingText(facts());
    expect(reading.lead).toBe(groundedAuraReflection('cancer'));
    expect(reading.text.startsWith(reading.lead)).toBe(true);
  });

  it('writes the sky strand from the actual driving fact', () => {
    expect(composeAuraReadingText(facts({ sky: { kind: 'moon' } })).detail).toBe(
      'The Moon is passing through this sign — a day or two of extra feeling here, then it moves on. Your chart is quiet in this sign — this one comes from the sky, not from you.',
    );
    expect(composeAuraReadingText(facts({ sky: { kind: 'sun' } })).detail).toContain(
      'The Sun is in this sign — this is its season, and the light stays on it for weeks.',
    );
    expect(
      composeAuraReadingText(facts({ sky: { kind: 'sun-and-moon' } })).detail,
    ).toContain('a loud few days for one sign');
    expect(
      composeAuraReadingText(
        facts({
          sky: { kind: 'event', eventKind: 'station', body: 'Mercury', eventType: 'retrograde' },
        }),
      ).detail,
    ).toContain(
      'Mercury turns retrograde in this sign — the classic time to double-check, finish, and repair rather than launch something new.',
    );
    expect(
      composeAuraReadingText(
        facts({
          sky: { kind: 'event', eventKind: 'station', body: 'Mercury', eventType: 'direct' },
        }),
      ).detail,
    ).toContain('Mercury turns direct in this sign — what felt stuck starts to move again.');
    expect(
      composeAuraReadingText(
        facts({ sky: { kind: 'event', eventKind: 'lunation', body: 'Moon', eventType: 'full' } }),
      ).detail,
    ).toContain('full Moon in this sign — feelings and results come into full view');
    expect(
      composeAuraReadingText(
        facts({ sky: { kind: 'event', eventKind: 'lunation', body: 'Moon', eventType: 'new' } }),
      ).detail,
    ).toContain('new Moon in this sign — the quiet starting line of the month');
    expect(
      composeAuraReadingText(
        facts({
          sky: { kind: 'event', eventKind: 'eclipse', body: 'Sun', eventType: 'total solar' },
        }),
      ).detail,
    ).toContain('A solar eclipse lands in this sign — a rare reset.');
    expect(
      composeAuraReadingText(
        facts({
          sky: { kind: 'event', eventKind: 'eclipse', body: 'Moon', eventType: 'total lunar' },
        }),
      ).detail,
    ).toContain('A lunar eclipse lands in this sign — endings show what they meant.');
    expect(
      composeAuraReadingText(
        facts({ sky: { kind: 'event', eventKind: 'ingress', body: 'Venus', eventType: null } }),
      ).detail,
    ).toContain('Venus has just entered this sign and will color it for a while');
  });

  it('writes the chart strand for the strongest echoing point, in plain words', () => {
    const natal = (fact: AuraReadingNatalFact) =>
      composeAuraReadingText(facts({ natal: [fact] })).detail;
    expect(natal({ kind: 'body', body: 'Sun' })).toBe(
      'This is also your Sun sign — home ground. You know this energy from the inside.',
    );
    expect(natal({ kind: 'body', body: 'Moon' })).toBe(
      'Your Moon is here too, so this sign already knows your moods.',
    );
    expect(natal({ kind: 'body', body: 'Mercury' })).toBe(
      'Your Mercury sits here — the way you think and talk already has this sign’s accent.',
    );
    expect(natal({ kind: 'body', body: 'Venus' })).toBe(
      'Your Venus lives here — what you enjoy, and how you show warmth, carries this sign’s style.',
    );
    expect(natal({ kind: 'body', body: 'Mars' })).toBe(
      'Your Mars is here — when you push for something, this is the gear you use.',
    );
    expect(natal({ kind: 'angle', angle: 'Ascendant' })).toBe(
      'This is also your rising sign — the side of you people meet first.',
    );
    expect(natal({ kind: 'angle', angle: 'Midheaven' })).toBe(
      'This sign sits at the top of your chart, where work and reputation live.',
    );
  });

  it('mentions when more of the chart gathers in the sign', () => {
    const reading = composeAuraReadingText(
      facts({
        natal: [
          { kind: 'body', body: 'Moon' },
          { kind: 'body', body: 'Mercury' },
          { kind: 'body', body: 'Venus' },
        ],
      }),
    );
    expect(reading.detail).toBe(
      'Your Moon is here too, so this sign already knows your moods. And it isn’t alone — more of your chart lives in this sign.',
    );
  });

  it('turns absence into honest text instead of silence', () => {
    expect(composeAuraReadingText(facts()).detail).toBe(
      'The sky is quiet in this sign, and your chart is too. Nothing here is urgent — and that’s worth knowing.',
    );
    expect(
      composeAuraReadingText(facts({ sky: { kind: 'moon' } })).detail,
    ).toContain('Your chart is quiet in this sign — this one comes from the sky, not from you.');
  });

  it('speaks about the example chart honestly instead of saying “your”', () => {
    const withChart = composeAuraReadingText(
      facts({ illustrative: true, natal: [{ kind: 'body', body: 'Moon' }], sky: { kind: 'moon' } }),
    );
    expect(withChart.detail).toContain(
      'The example chart has placements here too — with a real chart, this is where the reading gets personal.',
    );
    expect(withChart.detail).not.toContain('your moods');

    const quiet = composeAuraReadingText(facts({ illustrative: true }));
    expect(quiet.detail).toBe(
      'The sky is quiet in this sign, and the example chart is too. Nothing here is urgent — and that’s worth knowing.',
    );
  });

  it('falls back safely when an event arrives without its structured parts', () => {
    const reading = composeAuraReadingText(
      facts({ sky: { kind: 'event', eventKind: 'ingress', body: null, eventType: null } }),
    );
    expect(reading.detail).toContain(
      'A dated sky event marks this sign — the exact details are in the evidence below.',
    );
  });

  it('stays plain, dated-neutral, and bounded across the entire product space', () => {
    const natalOptions: AuraReadingNatalFact[][] = [
      [],
      [{ kind: 'body', body: 'Sun' }],
      [{ kind: 'body', body: 'Moon' }],
      [{ kind: 'body', body: 'Mercury' }],
      [{ kind: 'body', body: 'Venus' }],
      [{ kind: 'body', body: 'Mars' }],
      [{ kind: 'angle', angle: 'Ascendant' }],
      [{ kind: 'angle', angle: 'Midheaven' }],
      [
        { kind: 'body', body: 'Sun' },
        { kind: 'body', body: 'Venus' },
        { kind: 'angle', angle: 'Midheaven' },
      ],
    ];
    const skyOptions: Array<AuraReadingSkyFact | null> = [
      null,
      { kind: 'sun' },
      { kind: 'moon' },
      { kind: 'sun-and-moon' },
      { kind: 'event', eventKind: 'station', body: 'Mercury', eventType: 'retrograde' },
      { kind: 'event', eventKind: 'station', body: 'Venus', eventType: 'direct' },
      { kind: 'event', eventKind: 'lunation', body: 'Moon', eventType: 'new' },
      { kind: 'event', eventKind: 'lunation', body: 'Moon', eventType: 'full' },
      { kind: 'event', eventKind: 'eclipse', body: 'Sun', eventType: 'annular solar' },
      { kind: 'event', eventKind: 'eclipse', body: 'Moon', eventType: 'penumbral lunar' },
      { kind: 'event', eventKind: 'ingress', body: 'Jupiter', eventType: null },
      { kind: 'event', eventKind: 'ingress', body: null, eventType: null },
    ];
    for (const sign of AURA_SIGN_ORDER) {
      for (const natal of natalOptions) {
        for (const sky of skyOptions) {
          for (const illustrative of [false, true]) {
            const reading = composeAuraReadingText({ sign, natal, sky, illustrative });
            const label = `${sign}/${natal.length}/${sky ? ('eventKind' in sky ? sky.eventKind : sky.kind) : 'quiet'}/${illustrative}`;
            expect(reading.text, label).toBe(`${reading.lead} ${reading.detail}`);
            expect(reading.lead.length, label).toBeLessThanOrEqual(120);
            expect(reading.detail.length, label).toBeLessThanOrEqual(340);
            expect(/\b(?:today|tonight|now)\b/i.test(reading.text), label).toBe(false);
            expect(/ingress|committed|lunation|activation/i.test(reading.text), label).toBe(false);
            expect(/[A-Z“]/.test(reading.text[0]), label).toBe(true);
            expect(reading.text.endsWith('.'), label).toBe(true);
            expect(reading.text.includes('  '), label).toBe(false);
            expect(reading.text.includes('..'), label).toBe(false);
            expect(reading.text.includes('undefined'), label).toBe(false);
            if (illustrative) {
              // The example may address the reader ("you"), but must never
              // claim the example chart is theirs ("your ...").
              expect(/\byour\b/i.test(reading.detail), label).toBe(false);
            }
          }
        }
      }
    }
  });

  it('keeps every base line short and free of the old literary phrasing', () => {
    for (const sign of AURA_SIGN_ORDER) {
      const base = groundedAuraReflection(sign);
      expect(base.length).toBeLessThanOrEqual(120);
      expect(base.endsWith('.')).toBe(true);
    }
    expect(groundedAuraReflection('leo')).not.toContain('its measure');
    expect(groundedAuraReflection('aries')).not.toContain('momentum');
    expect(groundedAuraReflection('pisces')).toBe(
      'Name what you’re feeling before deciding what it means. Feelings are information, not instructions.',
    );
  });
});
