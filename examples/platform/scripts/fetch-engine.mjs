import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const candidate = JSON.parse(await readFile(new URL('../candidate.json', import.meta.url), 'utf8'));
const target = new URL(`../vendor/zodiacs-engine-${candidate.version}.tgz`, import.meta.url);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
try {
  const existing = await readFile(target);
  if (sha256(existing) !== candidate.sha256) throw new Error('Existing candidate artifact hash mismatch; remove it before retrying setup.');
  console.log(`Verified existing candidate ${candidate.version}: ${candidate.sha256}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const response = await fetch(candidate.url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Candidate download failed: HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 4 * 1024 * 1024) throw new Error('Candidate exceeds the 4 MiB download limit.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (sha256(bytes) !== candidate.sha256) throw new Error('Downloaded candidate hash mismatch; nothing installed.');
  await mkdir(new URL('../vendor/', import.meta.url), { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  console.log(`Downloaded and verified candidate ${candidate.version}: ${candidate.sha256}`);
}
