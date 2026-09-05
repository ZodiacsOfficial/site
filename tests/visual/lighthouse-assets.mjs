import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const privateHeader = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|apikey)$/i;
const privateQuery = /^(?:access_token|refresh_token|token|api_key|apikey|password|secret|code|session|signature)$/i;

function assertLocalUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)
    || !loopbackHosts.has(url.hostname) || url.username || url.password
    || [...url.searchParams.keys()].some((key) => privateQuery.test(key))) {
    throw new Error('Raw Lighthouse assets require an unauthenticated loopback URL.');
  }
}

/** Retain measured assets, never request additional browser instrumentation. */
export async function saveLighthouseAssets(result, directory, name) {
  const { Trace, DevtoolsLog } = result.artifacts ?? {};
  if (!Array.isArray(Trace?.traceEvents) || !Array.isArray(DevtoolsLog)) {
    throw new Error('Lighthouse returned no complete raw trace and DevTools log.');
  }
  assertLocalUrl(result.lhr.requestedUrl);
  assertLocalUrl(result.lhr.finalDisplayedUrl);
  for (const { params = {} } of DevtoolsLog) {
    for (const record of [params, params.request, params.response]) {
      if (!record) continue;
      if (record.url && /^https?:/i.test(record.url)) assertLocalUrl(record.url);
      if (record.postData || record.postDataEntries?.length
        || Object.keys(record.headers ?? {}).some((key) => privateHeader.test(key))
        || /(?:^|\r?\n)(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|apikey):/i.test(record.headersText ?? '')) {
        throw new Error('Raw Lighthouse assets must not contain private request or response data.');
      }
    }
  }
  await Promise.all([
    writeFile(resolve(directory, `${name}.trace.json`), JSON.stringify(Trace)),
    writeFile(resolve(directory, `${name}.devtoolslog.json`), JSON.stringify(DevtoolsLog)),
  ]);
}
