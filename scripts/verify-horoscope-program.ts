import { readFile } from 'node:fs/promises';
import type { HoroscopeProgram } from '../src/lib/horoscope-program';
import {
  HOROSCOPE_PROGRAM_PATH,
  expectedHoroscopeProgram,
} from './horoscope-program-files';

const actual = JSON.parse(await readFile(HOROSCOPE_PROGRAM_PATH, 'utf8')) as HoroscopeProgram;
const { program: expected, violations } = await expectedHoroscopeProgram(actual.anchorDate);

if (violations.length) {
  console.error(`verify-horoscope-program: ${violations.length} policy violation(s)`);
  for (const failure of violations) {
    console.error(`  ${failure.ruleId} ${failure.path}: ${failure.message}`);
  }
  process.exit(1);
}
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('verify-horoscope-program: committed program differs from deterministic regeneration');
  process.exit(1);
}

console.log(
  `verify-horoscope-program: OK — ${actual.anchorDate}, ${actual.signs.length} signs, `
  + `${actual.evidence.length} evidence receipts`,
);
