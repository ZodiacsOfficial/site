/*
 * Prints every Julian calendar date from 1500-01-01 to 2199-12-31 with the
 * Gregorian date src/lib/time/calendar.ts converts it to, one pair per line,
 * for julian-vs-swiss.py. Run from the repository root:
 *
 *   npx vite-node --script docs/platform/evidence/engine-beyond-swiss/corpora/tools/julian-dump.ts > julian-pairs.txt
 */
import { julianToGregorian } from '../../../../../../src/lib/time/calendar';

const lengths = (year: number) => [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const lines: string[] = [];
for (let year = 1500; year <= 2199; year += 1) {
  lengths(year).forEach((days, month) => {
    for (let day = 1; day <= days; day += 1) {
      const julian = `${pad(year, 4)}-${pad(month + 1)}-${pad(day)}`;
      lines.push(`${julian} ${julianToGregorian(julian)}`);
    }
  });
}
process.stdout.write(`${lines.join('\n')}\n`);
