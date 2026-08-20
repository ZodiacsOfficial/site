import { appendFileSync } from 'node:fs';
import { inspectNextMonthHoroscopes } from './horoscope-deadline-lib.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

const root = option('--root') ?? process.cwd();
const clock = option('--now') ?? process.env.HOROSCOPE_REMINDER_NOW;
const result = inspectNextMonthHoroscopes({
  root,
  now: clock ? new Date(clock) : new Date(),
});

const githubOutput = option('--github-output');
if (githubOutput) {
  appendFileSync(githubOutput, [
    `month=${result.month}`,
    `label=${result.label}`,
    `missing_count=${result.missingSigns.length}`,
    'missing_checklist<<HOROSCOPE_MISSING_EOF',
    result.missingChecklist,
    'HOROSCOPE_MISSING_EOF',
    '',
  ].join('\n'));
}

console.log(JSON.stringify(result));
