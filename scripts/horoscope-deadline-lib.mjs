import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const MONTHLY_HOROSCOPE_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

const MONTH_LABEL = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function nextUtcMonth(now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) {
    throw new Error(`invalid reminder clock: ${String(now)}`);
  }

  const next = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth() + 1,
    1,
  ));
  return {
    month: next.toISOString().slice(0, 7),
    label: MONTH_LABEL.format(next),
  };
}

export function inspectNextMonthHoroscopes({
  root = process.cwd(),
  now = new Date(),
  fileExists = existsSync,
} = {}) {
  const { month, label } = nextUtcMonth(now);
  const expected = MONTHLY_HOROSCOPE_SIGNS.map((sign) => ({
    sign,
    path: join(root, 'src', 'content', 'horoscopes', `${month}-${sign}.mdx`),
  }));
  const missing = expected.filter(({ path }) => !fileExists(path));

  return {
    month,
    label,
    complete: missing.length === 0,
    missingSigns: missing.map(({ sign }) => sign),
    missingChecklist: missing.map(({ sign }) => `- [ ] ${sign}`).join('\n'),
  };
}
