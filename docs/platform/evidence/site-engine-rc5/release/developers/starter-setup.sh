( set -eu
mkdir zodiacs-starter
cd zodiacs-starter
curl --disable --fail --silent --show-error --proto '=https' --max-time 30 \
  'https://raw.githubusercontent.com/ZodiacsOfficial/site/dd5d83cdf2a2a5d7096175f01ce985b47824a376/public/examples/zodiacs-platform-starter-0.1.0-rc.3.tgz' -o 'zodiacs-platform-starter-0.1.0-rc.3.tgz'
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const bytes = readFileSync('zodiacs-platform-starter-0.1.0-rc.3.tgz');
const expected = 'facafd75a8366a69dfae7397c9c2c68ee636987fb25d479ef380533408bd8d8a';
if (createHash('sha256').update(bytes).digest('hex') !== expected) {
  throw new Error('Archive checksum mismatch. Do not extract or install.');
}
console.log('Archive verified');
JS
tar -xzf 'zodiacs-platform-starter-0.1.0-rc.3.tgz'
cd package
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm start
)
