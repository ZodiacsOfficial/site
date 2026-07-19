import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import dailyPublication from '../src/data/daily-publication.json';
import dailyManifest from '../src/data/daily-publication-manifest.json';
import horoscopeProgram from '../src/data/horoscope-program.json';
import constitution from '../src/lib/editorial-policy/constitution.v1.json';
import {
  independentWordCount,
  verifyDailyPublicationCopy,
  verifyHoroscopeProgramCopy,
} from './independent-copy-verifier';

function ruleIds(failures: ReturnType<typeof verifyDailyPublicationCopy>): string[] {
  return failures.map((failure) => failure.ruleId);
}

describe('independent copy verifier', () => {
  it('accepts the committed daily and multi-surface packages', () => {
    expect(verifyDailyPublicationCopy(dailyPublication)).toEqual([]);
    expect(verifyHoroscopeProgramCopy(horoscopeProgram)).toEqual([]);
  });

  it('records independent copy approval separately from same-renderer replay', () => {
    const copyRole = constitution.roles.find((role) => role.id === 'copy-verifier');
    expect(copyRole?.kind).toBe('independent-serialized-copy-policy');
    expect(dailyManifest.verification.independentFromGenerator).toBe(true);
    expect(dailyManifest.verification.copyCheck).toMatchObject({
      implementation: 'zodiacs.independent-copy-verifier.v1',
      independentImplementation: true,
      status: 'passed',
    });
    expect(dailyManifest.verification.deterministicReplay).toMatchObject({
      independentImplementation: false,
      status: 'passed',
    });
  });

  it('fails closed on malformed roots', () => {
    expect(ruleIds(verifyDailyPublicationCopy(null))).toContain('COPY-STRUCT-ROOT');
    expect(ruleIds(verifyHoroscopeProgramCopy([]))).toContain('COPY-STRUCT-ROOT');
  });

  it('independently catches daily structure, evidence, length, voice, and duplication', () => {
    const tampered = structuredClone(dailyPublication) as unknown as {
      signs: Array<{
        headline: string;
        lines: Array<{ text: string; evidenceRefs: string[] }>;
      }>;
    };
    tampered.signs[0].headline = 'Too short';
    tampered.signs[0].lines[0].text += ' Delve!';
    tampered.signs[0].lines[0].evidenceRefs = ['missing:fact'];
    tampered.signs[1].headline = tampered.signs[2].headline;
    tampered.signs[1].lines[1].text = tampered.signs[2].lines[1].text;

    const ids = ruleIds(verifyDailyPublicationCopy(tampered));
    expect(ids).toContain('COPY-LENGTH-WORDS');
    expect(ids).toContain('COPY-VOICE-ai-delve');
    expect(ids).toContain('COPY-VOICE-EXCLAMATION');
    expect(ids).toContain('COPY-EVIDENCE-UNKNOWN');
    expect(ids).toContain('COPY-DIST-EXACT');
  });

  it('independently catches program evidence, declared length, voice, and distinctness', () => {
    const tampered = structuredClone(horoscopeProgram) as unknown as {
      signs: Array<{
        sign: string;
        readings: Record<string, {
          sign: string;
          passages: Array<{ text: string; evidenceRefs: string[] }>;
          text: string;
          wordCount: number;
        }>;
      }>;
    };
    const ariesToday = tampered.signs[0].readings.today;
    ariesToday.passages[0].evidenceRefs[0] = 'missing:fact';
    ariesToday.passages[0].text += ' Delve!';
    ariesToday.text = ariesToday.passages.map((passage) => passage.text).join('\n\n');
    ariesToday.wordCount = independentWordCount(ariesToday.text);

    const geminiToday = tampered.signs[2].readings.today;
    tampered.signs[1].readings.today = structuredClone(geminiToday);
    tampered.signs[1].readings.today.sign = tampered.signs[1].sign;
    tampered.signs[1].readings.tomorrow.wordCount = 1;

    const ids = ruleIds(verifyHoroscopeProgramCopy(tampered));
    expect(ids).toContain('COPY-EVIDENCE-UNKNOWN');
    expect(ids).toContain('COPY-LENGTH-DECLARATION');
    expect(ids).toContain('COPY-VOICE-BANNED');
    expect(ids).toContain('COPY-VOICE-EXCLAMATION');
    expect(ids).toContain('COPY-DIST-EXACT');
  });

  it('independently reconciles prose claims to phase, sign, aspect, house, and event receipts', () => {
    const tampered = structuredClone(horoscopeProgram) as unknown as {
      evidence: Array<Record<string, unknown>>;
      signs: Array<{
        readings: Record<string, {
          passages: Array<{ text: string; evidenceRefs: string[] }>;
          text: string;
          wordCount: number;
        }>;
      }>;
    };
    const reading = tampered.signs[0].readings.today;
    reading.passages[0].text = reading.passages[0].text.replace('waxing crescent', 'waning crescent');
    reading.passages[1].text = reading.passages[1].text.replace('in Cancer', 'in Leo');
    reading.passages[2].text = reading.passages[2].text
      .replace('Mars sextile Saturn', 'Mars square Saturn')
      .replace('errands, siblings, messages, and the near neighborhood', 'money, possessions, and what steadies you');
    reading.text = reading.passages.map((passage) => passage.text).join('\n\n');
    reading.wordCount = independentWordCount(reading.text);

    const derived = tampered.evidence.find((receipt) => (
      receipt.id === reading.passages[0].evidenceRefs.find((ref) => ref.startsWith('derived:'))
    ));
    if (derived) derived.house = 8;

    const ids = ruleIds(verifyHoroscopeProgramCopy(tampered));
    expect(ids).toContain('COPY-EVIDENCE-CLAIM');
    expect(ids).toContain('COPY-EVIDENCE-THEME');
    expect(ids).toContain('COPY-EVIDENCE-DERIVATION');
  });

  it('has no renderer, builder, or generator-validator dependency', () => {
    const source = readFileSync(new URL('./independent-copy-verifier.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*(?:daily-publication|horoscope-program)['"]/u);
    expect(source).not.toMatch(/\bbuild(?:DailyPublication|HoroscopeProgram)\b/u);
    expect(source).not.toMatch(/\bvalidate(?:DailyPublication|HoroscopeProgram)\b/u);
  });
});
