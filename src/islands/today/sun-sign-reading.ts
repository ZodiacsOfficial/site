import { HOUSE_THEME, dailyReading, solarHouse, type Daily } from '../../lib/daily';

/** A jargon-free one-line reading for visitors who only know their Sun sign. */
export function sunSignTodayLine(sunSign: string, daily: Daily): string {
  const moon = daily.bodies.find((body) => body.body === 'Moon');
  if (!moon) return dailyReading(sunSign, daily).headline;

  const theme = HOUSE_THEME[solarHouse(moon.sign, sunSign)];
  return `Today may draw more attention to ${theme}.`;
}
