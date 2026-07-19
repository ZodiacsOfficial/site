import { describe, expect, it } from 'vitest';
import daily from '../src/data/daily.json';
import horoscopeProgramData from '../src/data/horoscope-program.json';
import { pageReadingFromProgram } from '../src/lib/horoscope-page-data';
import type { HoroscopeProgram } from '../src/lib/horoscope-program';
import { GET as dailySkyFeed } from '../src/pages/feeds/daily-sky.xml';
import { GET as horoscopeFeed } from '../src/pages/feeds/horoscopes.xml';
import { GET as signHoroscopeFeed } from '../src/pages/feeds/horoscopes/[sign].xml';

const horoscopeProgram = horoscopeProgramData as HoroscopeProgram;

async function xmlFrom(result: Response | Promise<Response>): Promise<string> {
  const response = await result;
  expect(response.status).toBe(200);
  return response.text();
}

function feedDates(xml: string): string[] {
  return [...xml.matchAll(/<(?:lastBuildDate|pubDate)>([^<]+)<\/(?:lastBuildDate|pubDate)>/g)]
    .map((match) => match[1]);
}

describe('daily feed publication timestamps', () => {
  it('publishes the Daily Sky edition at 00:00 UTC, not its noon snapshot instant', async () => {
    const xml = await xmlFrom(dailySkyFeed({} as Parameters<typeof dailySkyFeed>[0]));
    const expected = new Date(`${daily.date}T00:00:00Z`).toUTCString();

    expect(feedDates(xml)).toEqual([expected, expected]);
    expect(xml).toContain('Positions at 12:00 UTC');
  });

  it('keeps aggregate and per-sign RSS dates aligned with Article publication dates', async () => {
    const page = pageReadingFromProgram(horoscopeProgram, 'aries', 'today');
    const expected = new Date(page.datePublished).toUTCString();
    const aggregate = await xmlFrom(horoscopeFeed({} as Parameters<typeof horoscopeFeed>[0]));
    const sign = await xmlFrom(signHoroscopeFeed({
      params: { sign: 'aries' },
    } as Parameters<typeof signHoroscopeFeed>[0]));

    expect(page.datePublished).toBe(`${horoscopeProgram.anchorDate}T00:00:00.000Z`);
    expect(feedDates(aggregate)).toEqual(Array(13).fill(expected));
    expect(feedDates(sign)).toEqual([expected, expected]);
  });
});
