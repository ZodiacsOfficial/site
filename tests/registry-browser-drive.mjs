/**
 * Compatibility entrypoint for the Registry browser gate.
 *
 * The former selector drive coupled four separate products to the old
 * combined Terminal page. Keep the public command stable while running the
 * focused authority hub, sign-record, and Consumer/Pro Terminal contracts.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const drives = [
  './registry-hub-drive.mjs',
  './sign-record-drive.mjs',
  './terminal-split-drive.mjs',
];
let failed = false;

for (const relativePath of drives) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  const status = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', () => resolve(1));
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  if (status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
