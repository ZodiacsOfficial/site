/**
 * The install commands the engine page publishes.
 *
 * Same discipline as `mcp-install-block.ts`, and here for the same reason: the
 * page tells readers to check a digest, so the block has to actually check one.
 * An audit of the earlier MCP block found it running `shasum -a 256` and
 * printing the expected value in a comment — that reads like a check and is
 * not one, because shasum exits 0 on any readable file and the lines after it
 * run regardless.
 *
 * This block is shorter than the MCP one because nothing is unpacked: the
 * archive is downloaded, compared, and handed to npm. What it must never do is
 * reach `npm install` on bytes it did not verify. `scripts/engine-install-block.test.mjs`
 * executes it against the real archive, a tampered one, a truncated one, and a
 * failing download.
 */
export interface EngineArtifact {
  readonly name: string;
  readonly version: string;
  readonly artifactUrl: string;
  readonly sha256: string;
}

/** The filename the archive lands under, taken from the published URL. */
export function archiveNameFor(artifact: EngineArtifact): string {
  return artifact.artifactUrl.slice(artifact.artifactUrl.lastIndexOf('/') + 1);
}

export function engineInstallBlock(artifact: EngineArtifact): string {
  const file = archiveNameFor(artifact);
return `( set -eu
# POSIX shell — macOS, Linux or WSL. Not PowerShell. It runs in a subshell, so
# a failure stops the install without closing your terminal.
BASE=$(pwd)
FILE='${file}'
if test -e "$FILE" || test -L "$FILE"; then
  echo "Stop: $FILE already exists here. Move or delete it, then run this again." >&2
  exit 1
fi
# A download that fails verification is removed, so the guard above does not
# then block the retry. Once npm takes over the archive stays: npm reports its
# own failures, and the file is what you would retry with.
trap 'status=$?; if test "$status" -ne 0; then rm -f "$BASE/$FILE"; fi; exit $status' EXIT

curl --disable --fail --silent --show-error --location --proto '=https' --max-time 120 \\
  '${artifact.artifactUrl}' -o "$FILE"

node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = '${file}';
const expected = '${artifact.sha256}';
const bytes = readFileSync(file);
const actual = createHash('sha256').update(bytes).digest('hex');
if (actual !== expected) {
  console.error(\`Stop: this is not the published archive.\\n  expected \${expected}\\n  got      \${actual}\`);
  console.error('Nothing was installed.');
  process.exit(1);
}
console.log(\`Archive verified: \${actual}\`);
JS

trap - EXIT
npm install "./$FILE"
echo "Installed ${artifact.name}@${artifact.version} from the verified archive."
)`;
}
