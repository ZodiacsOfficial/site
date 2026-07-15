const rawPreviewUrl = process.env.PREVIEW_URL;

if (!rawPreviewUrl) {
  throw new Error('PREVIEW_URL is required.');
}

const previewUrl = new URL(rawPreviewUrl);
if (previewUrl.protocol !== 'https:' || !previewUrl.hostname.endsWith('.vercel.app')) {
  throw new Error(`Refusing to probe a non-Vercel preview URL: ${previewUrl.origin}`);
}

const protectionFailure = 'the no-secret smoke requires a public Preview deployment';
const sameOriginHeaders = {
  accept: 'application/json',
  origin: previewUrl.origin,
  referer: `${previewUrl.origin}/`,
  'user-agent': 'zodiacs-preview-function-smoke/1.0',
};

const probes = [
  {
    label: 'email subscribe',
    path: '/api/email/subscribe',
    init: {
      method: 'POST',
      headers: { ...sameOriginHeaders, 'content-type': 'application/json' },
      // The filled honeypot is still valid input, but prevents a configured
      // provider from sending mail if Preview gains ESP configuration later.
      body: JSON.stringify({
        email: 'preview-smoke@example.com',
        locale: 'en',
        website: 'preview-smoke',
      }),
    },
    accepts: (status) => status < 500 || status === 503,
    expectation: 'a non-5xx response or the designed HTTP 503 disabled response',
  },
  {
    label: 'email confirm',
    path: '/api/email/confirm?token=x',
    init: { method: 'GET', headers: sameOriginHeaders },
    accepts: (status) => status < 500 || status === 503,
    expectation: 'a non-5xx response or the designed HTTP 503 disabled response',
  },
  {
    label: 'wallet birth',
    path: '/api/wallet-birth',
    init: {
      method: 'POST',
      headers: { ...sameOriginHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'preview-smoke' }),
    },
    accepts: (status) => status < 500,
    expectation: 'a non-5xx response',
  },
  {
    label: 'assistant method guard',
    path: '/api/assistant',
    init: { method: 'GET', headers: sameOriginHeaders },
    accepts: (status) => status === 405,
    expectation: 'HTTP 405',
  },
];

function annotation(value) {
  return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function bodyExcerpt(body) {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > 500 ? `${oneLine.slice(0, 500)}…` : oneLine;
}

const failures = [];
for (const probe of probes) {
  const endpoint = new URL(probe.path, previewUrl);
  let response;
  let body = '';
  try {
    response = await fetch(endpoint, {
      ...probe.init,
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    body = await response.text();
  } catch (error) {
    failures.push(`${probe.label}: request failed: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  const vercelError = response.headers.get('x-vercel-error') ?? '';
  const location = response.headers.get('location') ?? '';
  const functionInvocationFailed = vercelError.toUpperCase().includes('FUNCTION_INVOCATION_FAILED')
    || body.toUpperCase().includes('FUNCTION_INVOCATION_FAILED');
  console.log(`\n${probe.init.method} ${endpoint.pathname}${endpoint.search}`);
  console.log(`status: ${response.status}`);
  console.log(`content-type: ${response.headers.get('content-type') ?? '(none)'}`);
  console.log(`x-vercel-error: ${vercelError || '(none)'}`);
  if (location) console.log(`location: ${location}`);
  console.log(`body: ${bodyExcerpt(body) || '(empty)'}`);

  if (functionInvocationFailed) {
    failures.push(`${probe.label}: Vercel reported FUNCTION_INVOCATION_FAILED`);
    continue;
  }
  if (response.status >= 300 && response.status < 400) {
    failures.push(
      `${probe.label}: preview redirected (${response.status}) to ${location || '(missing location)'}; `
      + protectionFailure,
    );
    continue;
  }
  if (response.status === 401 || response.status === 403) {
    failures.push(
      `${probe.label}: preview returned ${response.status}; ${protectionFailure}`,
    );
    continue;
  }
  if (!probe.accepts(response.status)) {
    failures.push(`${probe.label}: expected ${probe.expectation}, received HTTP ${response.status}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`::error title=Preview API smoke failed::${annotation(failure)}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nPreview API smoke passed for ${previewUrl.origin}`);
}
