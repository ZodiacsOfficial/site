( set -eu
mkdir zodiacs-starter
cd zodiacs-starter
curl --disable --fail --silent --show-error --proto '=https' --max-time 30 \
  'https://raw.githubusercontent.com/ZodiacsOfficial/site/80dff5f16ec17045bcb52110a8105a9ad3492a99/public/examples/zodiacs-platform-starter-0.1.0-rc.2.tgz' -o 'zodiacs-platform-starter-0.1.0-rc.2.tgz'
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const bytes = readFileSync('zodiacs-platform-starter-0.1.0-rc.2.tgz');
const expected = 'd409a395966e78b3ddc0604d75d4a836477987d99814ff786f55aee9e464e420';
if (createHash('sha256').update(bytes).digest('hex') !== expected) {
  throw new Error('Archive checksum mismatch. Do not extract or install.');
}
console.log('Archive verified');
JS
tar -xzf 'zodiacs-platform-starter-0.1.0-rc.2.tgz'
cd package
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm start
)
