import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatConsumerBoundaryViolation,
  scanConsumerBoundary,
} from './consumer-boundary-lib.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = await scanConsumerBoundary(repo);

if (result.violations.length) {
  console.error(`consumer-boundary: ${result.violations.length} violation(s) across ${result.files.length} checked files`);
  for (const violation of result.violations) {
    console.error(`- ${formatConsumerBoundaryViolation(violation)}`);
  }
  process.exitCode = 1;
} else {
  console.log(`consumer-boundary: clear · ${result.files.length} source files checked`);
}
