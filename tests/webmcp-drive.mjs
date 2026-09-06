/**
 * WebMCP interoperability drive against the production build.
 *
 *   npm run build
 *   npm run test:webmcp
 */
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { projectRoot, withPreview } from './visual/preview-server.mjs';

const polyfillPath = resolve(
  projectRoot,
  'node_modules/@mcp-b/webmcp-polyfill/dist/index.iife.js',
);
await access(polyfillPath);

async function enumerateAndCall(page) {
  await page.waitForFunction(() => (
    navigator.modelContextTesting?.listTools()
      .some((tool) => tool.name === 'zodiacs.search')
  ));
  return page.evaluate(async () => {
    const testing = navigator.modelContextTesting;
    if (!testing) throw new Error('modelContextTesting is unavailable');
    const tools = testing.listTools().map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema: inputSchema ? JSON.parse(inputSchema) : null,
    }));
    const wire = await testing.executeTool(
      'zodiacs.search',
      JSON.stringify({ query: 'birth charts' }),
    );
    if (!wire) throw new Error('zodiacs.search returned no wire result');
    const decoded = JSON.parse(wire);
    const envelope = decoded?.structuredContent ?? decoded;
    return {
      tools,
      assetRequests: performance.getEntriesByType('resource')
        .map((entry) => new URL(entry.name))
        .filter((url) => url.pathname === '/assets/webmcp-register.js')
        .map((url) => `${url.pathname}${url.search}`),
      responseShape: decoded?.structuredContent ? 'CallToolResult' : 'raw envelope',
      envelope,
    };
  });
}

function assertCall(label, capture) {
  if (!capture.assetRequests.length || capture.assetRequests.some((url) => (
    url !== '/assets/webmcp-register.js?v=search-ranking-2'
  ))) {
    throw new Error(`${label}: WebMCP must load the refreshed Search ranking cache key`);
  }
  if (capture.tools.length !== 1 || capture.tools[0].name !== 'zodiacs.search') {
    throw new Error(`${label}: expected only zodiacs.search`);
  }
  if (!capture.envelope?.ok) throw new Error(`${label}: search returned an error envelope`);
  const results = capture.envelope.data.results;
  const paths = results.map((entry) => entry.path);
  if (!paths.slice(0, 3).includes('/birth-chart/')) {
    throw new Error(`${label}: /birth-chart/ is not in the top three`);
  }
  if (results.some((entry) => (
    entry.kind === 'registry'
    || /^\/(?:registry|thesis|sdk|archive|collect)(?:\/|$)/.test(entry.path)
  ))) {
    throw new Error(`${label}: wing entry leaked`);
  }
}

await withPreview({ port: 4412 }, async (baseURL) => {
  const executablePath = await findChromium();

  const nativeBrowser = await chromium.launch({
    executablePath,
    args: [
      ...STABLE_CHROMIUM_ARGS,
      '--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport',
    ],
  });
  let native;
  try {
    const page = await nativeBrowser.newPage();
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    native = await enumerateAndCall(page);
    assertCall('Chrome testing flag', native);
  } finally {
    await nativeBrowser.close();
  }

  const polyfillBrowser = await chromium.launch({
    executablePath,
    args: STABLE_CHROMIUM_ARGS,
  });
  let polyfill;
  let exclusions;
  try {
    const context = await polyfillBrowser.newContext();
    await context.addInitScript({ path: polyfillPath });
    const page = await context.newPage();
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    polyfill = await enumerateAndCall(page);
    assertCall('MCP-B 4.0.0', polyfill);

    exclusions = {};
    for (const path of ['/es/', '/terminal/', '/registry/', '/thesis/', '/sdk/', '/archive/']) {
      const excludedPage = await context.newPage();
      await excludedPage.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
      await excludedPage.waitForTimeout(100);
      exclusions[path] = await excludedPage.evaluate(() => ({
        tools: navigator.modelContextTesting?.listTools().map((tool) => tool.name) ?? [],
        requestedAsset: performance.getEntriesByType('resource')
          .some((entry) => entry.name.includes('/assets/webmcp-register.js')),
      }));
      await excludedPage.close();
    }
    if (Object.values(exclusions).some((entry) => entry.tools.length || entry.requestedAsset)) {
      throw new Error('Spanish or registry pages loaded the English WebMCP tool');
    }
  } finally {
    await polyfillBrowser.close();
  }

  console.log(JSON.stringify({ native, polyfill, exclusions }, null, 2));
});
