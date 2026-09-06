import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const LIMIT = 50;
const ASSET_TYPES = new Set(['script', 'stylesheet', 'image', 'font', 'fetch', 'xhr']);

function scrubUrls(value) {
  return String(value).replace(/https?:\/\/[^\s"'<>]+/g, (value) => {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      return '[invalid URL]';
    }
  });
}

// Observe only: this wrapper never retries or changes the hydration deadline.
export function trackHydrationDiagnostics(page, { baseURL, errors, outputDir }) {
  const origin = new URL(baseURL).origin;
  const failedAssets = [];
  let failedAssetCount = 0;
  const record = (request, status, error = null) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !ASSET_TYPES.has(request.resourceType())) return;
    failedAssetCount += 1;
    failedAssets.push({ path: url.pathname, type: request.resourceType(), status, error });
    if (failedAssets.length > LIMIT) failedAssets.shift();
  };
  page.on('requestfailed', (request) => record(
    request, null, scrubUrls(request.failure()?.errorText ?? 'request failed'),
  ));
  page.on('response', (response) => {
    if (response.status() >= 400) record(response.request(), response.status());
  });

  return async (hydrate) => {
    try {
      await hydrate();
    } catch (failure) {
      try {
        const report = {
          schema: 'zodiacs.t17-hydration-failure.v1',
          path: new URL(page.url()).pathname,
          failure: { name: failure.name, message: scrubUrls(failure.message) },
          errorCount: errors.length,
          errors: errors.slice(-LIMIT).map(scrubUrls),
          failedAssetCount,
          failedAssets,
        };
        // Print before attempting an image: a closed or unresponsive page must
        // not erase the browser errors that explain the original failure.
        console.error(JSON.stringify(report));
        await mkdir(outputDir, { recursive: true });
        try {
          await page.screenshot({
            path: join(outputDir, 'hydration-failure.png'),
            fullPage: false,
            animations: 'allow',
            timeout: 5_000,
          });
          report.screenshot = { file: 'hydration-failure.png', captured: true };
        } catch (error) {
          report.screenshot = { captured: false, error: scrubUrls(error.message) };
          console.error(`T17 failure screenshot unavailable: ${scrubUrls(error.message)}`);
        }
        await writeFile(join(outputDir, 'hydration-failure.json'), `${JSON.stringify(report, null, 2)}\n`);
      } catch (error) {
        console.error(`T17 hydration diagnostics unavailable: ${scrubUrls(error.message)}`);
      } finally {
        throw failure;
      }
    }
  };
}
