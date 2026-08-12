import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ASSISTANT_EVAL_PRODUCTION_REF = 'refs/heads/main';
export const ASSISTANT_EVAL_PRODUCTION_ORIGIN = 'https://zodiacs.org';
export const ASSISTANT_EVAL_PREVIEW_REF = 'refs/heads/codex/ask-zodiacs-guide';

const assistantPreviewHostname = /^zodiacs-[a-z0-9]+-zodiacsofficial\.vercel\.app$/u;
const rejectionMessage = 'Evaluation target/ref is not an approved exact deployment origin.';

export function validateAssistantEvalTarget({ baseUrl, ref } = {}) {
  if (typeof baseUrl !== 'string' || typeof ref !== 'string') {
    throw new Error(rejectionMessage);
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(rejectionMessage);
  }

  const exactOrigin = url.origin === baseUrl
    && url.username === ''
    && url.password === ''
    && url.port === ''
    && url.pathname === '/'
    && url.search === ''
    && url.hash === '';
  const production = ref === ASSISTANT_EVAL_PRODUCTION_REF
    && url.origin === ASSISTANT_EVAL_PRODUCTION_ORIGIN;
  const askPreview = ref === ASSISTANT_EVAL_PREVIEW_REF
    && url.protocol === 'https:'
    && assistantPreviewHostname.test(url.hostname);

  if (!exactOrigin || (!production && !askPreview)) {
    throw new Error(rejectionMessage);
  }

  return {
    kind: production ? 'production' : 'preview',
    origin: url.origin,
  };
}

function main() {
  const target = validateAssistantEvalTarget({
    baseUrl: process.env.EVAL_BASE,
    ref: process.env.EVAL_REF,
  });
  const label = target.kind === 'production' ? 'production' : 'Ask preview';
  console.log(`Approved ${label} target: ${target.origin}`);
}

const directInvocation = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (directInvocation) main();
