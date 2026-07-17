import assert from "node:assert/strict";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { findChromium, STABLE_CHROMIUM_ARGS } from "./visual/browser.mjs";
import { withPreview } from "./visual/preview-server.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const proofRoot = resolve(root, "docs/acceptance/registry-aura");
const fixedNow = "2026-07-16T12:00:00.000Z";
const recordCheckedAt = "2026-07-15T23:30:00.000Z";
const address = "11111111111111111111111111111111";
const allSigns = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const profile = {
  version: 1,
  settings: { houseSystem: "whole" },
  charts: [
    {
      id: "aura-browser-fixture",
      name: "Browser fixture chart",
      createdAt: fixedNow,
      updatedAt: fixedNow,
      birth: {
        date: "1994-05-02",
        time: "12:00",
        timeKnown: true,
        place: null,
      },
      summary: {
        engineVersion: "fixture",
        utcISO: "1994-05-02T12:00:00.000Z",
        houseSystem: "whole",
        bodies: [
          { body: "Sun", lon: 42, retrograde: false },
          { body: "Moon", lon: 105, retrograde: false },
          { body: "Mercury", lon: 100, retrograde: false },
          { body: "Venus", lon: 102, retrograde: false },
          { body: "Mars", lon: 132, retrograde: false },
          { body: "Jupiter", lon: 218, retrograde: true },
          { body: "Saturn", lon: 337, retrograde: false },
          { body: "Uranus", lon: 295, retrograde: true },
          { body: "Neptune", lon: 294, retrograde: true },
          { body: "Pluto", lon: 237, retrograde: true },
        ],
        angles: { asc: 190, mc: 100 },
        flags: [],
      },
    },
  ],
};

async function verifyAuraBundleSafety() {
  const assetRoot = resolve(root, "dist/_astro");
  const auraBundles = (await readdir(assetRoot)).filter((file) =>
    /^RegistryAura\..+\.js$/.test(file),
  );
  assert.equal(
    auraBundles.length,
    1,
    "the feature-on build must emit one RegistryAura entry bundle",
  );
  const pending = [resolve(assetRoot, auraBundles[0])];
  const visited = new Set();
  const sources = [];
  while (pending.length) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = await readFile(file, "utf8");
    sources.push(source);
    for (const match of source.matchAll(/["']([^"']+\.js)["']/g)) {
      const specifier = match[1];
      const candidate = specifier.startsWith("_astro/")
        ? resolve(root, "dist", specifier)
        : specifier.startsWith("/_astro/")
          ? resolve(root, "dist", specifier.slice(1))
          : specifier.startsWith(".")
            ? resolve(dirname(file), specifier)
            : null;
      if (
        !candidate ||
        !candidate.startsWith(assetRoot) ||
        visited.has(candidate)
      )
        continue;
      try {
        await readFile(candidate, "utf8");
        pending.push(candidate);
      } catch {
        // Ignore non-emitted references; every executable chunk is present in dist.
      }
    }
  }
  const source = sources.join("\n");
  assert.ok(
    visited.size > 1,
    "the Aura safety scan must include lazy connector, composer, and share chunks",
  );
  const forbiddenWalletMethods = [
    "personal_sign",
    "eth_sign",
    "eth_signTransaction",
    "eth_signTypedData",
    "eth_signTypedData_v1",
    "eth_signTypedData_v2",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
    "eth_sendRawTransaction",
    "wallet_sendCalls",
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "signMessage",
    "signAndSendTransaction",
    "signAndSendAllTransactions",
    "signTransaction",
    "signAllTransactions",
    "sendTransaction",
  ];
  for (const method of forbiddenWalletMethods) {
    assert.equal(
      source.includes(method),
      false,
      `the RegistryAura bundle must not contain wallet mutation method ${method}`,
    );
  }
}

async function installDeterministicBrowserState(
  context,
  storedProfile = profile,
  shareMode = "download",
) {
  await context.addInitScript(
    ({ storedProfile, now, shareMode }) => {
      if (storedProfile)
        localStorage.setItem(
          "zodiacs.profile.v1",
          JSON.stringify(storedProfile),
        );
      const NativeDate = Date;
      const fixed = new NativeDate(now).valueOf();
      class FixedDate extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [fixed]));
        }
        static now() {
          return fixed;
        }
      }
      Object.setPrototypeOf(FixedDate, NativeDate);
      globalThis.Date = FixedDate;
      globalThis.__auraSharePayload = null;
      globalThis.__auraRevokedUrls = [];
      const nativeRevokeObjectUrl = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (value) => {
        globalThis.__auraRevokedUrls.push(String(value));
        nativeRevokeObjectUrl(value);
      };
      Object.defineProperty(Navigator.prototype, "canShare", {
        configurable: true,
        value:
          shareMode === "web"
            ? ({ files }) => Array.isArray(files) && files.length === 1
            : undefined,
      });
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        value:
          shareMode === "web"
            ? async (payload) => {
                globalThis.__auraSharePayload = {
                  keys: Object.keys(payload).sort(),
                  files: (payload.files ?? []).map((file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                  })),
                  title: payload.title,
                  text: payload.text,
                  url: payload.url,
                };
              }
            : undefined,
      });
      globalThis.__auraPaintedText = [];
      const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function auraFillText(
        text,
        ...args
      ) {
        globalThis.__auraPaintedText.push(String(text));
        return nativeFillText.call(this, text, ...args);
      };
    },
    { storedProfile, now: fixedNow, shareMode },
  );
}

async function verifyWalletEducation(browser, baseURL) {
  const noJsContext = await browser.newContext({
    viewport: { width: 375, height: 900 },
    javaScriptEnabled: false,
    colorScheme: "dark",
  });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "domcontentloaded",
  });
  const noJsGuide = noJsPage.locator("#wallet-basics");
  await noJsGuide.waitFor();
  const noJsText = await noJsGuide.textContent();
  for (const required of [
    "Wallets, without the jargon",
    "Public address",
    "Recovery phrase or private key",
    "Aura never needs your wallet secrets",
    "Never type a recovery phrase, private key, wallet password, or PIN into Registry Aura",
    "No wallet, balance, purchase, or birth chart is needed",
    "Solana and Base are separate public networks",
    "Use the public address on the network where the Zodiac appears",
    "Wallet software may expose the public accounts you authorize; Aura selects and uses one compatible address",
    "whose mint or contract matches a Zodiac listed by this Registry",
    "independent third parties with their own terms, privacy practices, fees, and security risks",
  ]) {
    assert.ok(
      noJsText.includes(required),
      `the no-JavaScript wallet guide must explain: ${required}`,
    );
  }
  assert.equal(
    await noJsGuide.evaluate((guide) => {
      const composer = document.querySelector(".aura-entry");
      return Boolean(
        composer &&
        guide.compareDocumentPosition(composer) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
    true,
    "wallet education must appear before the composer",
  );
  await noJsContext.close();

  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    colorScheme: "dark",
  });
  await installDeterministicBrowserState(context);
  await context.addInitScript(() => {
    globalThis.__walletGuideAccountCalls = 0;
    window.addEventListener("wallet-standard:app-ready", (event) => {
      event.detail?.register?.({
        name: "Guide test wallet",
        accounts: [],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: async () => {
              globalThis.__walletGuideAccountCalls += 1;
              return { accounts: [] };
            },
          },
        },
      });
    });
    window.addEventListener("eip6963:requestProvider", () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {
              uuid: "03bad54b-fd66-4d77-bfdb-e3ea04fc9248",
              name: "Guide Base wallet",
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
              rdns: "org.zodiacs.guide-wallet",
            },
            provider: {
              request: async () => {
                globalThis.__walletGuideAccountCalls += 1;
                return [];
              },
            },
          },
        }),
      );
    });
  });
  const page = await context.newPage();
  let holdingsRequests = 0;
  await page.route("**/api/aura-holdings", (route) => {
    holdingsRequests += 1;
    return route.abort();
  });
  await page.goto(`${baseURL}/registry/aura/#wallet-basics`, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.evaluate(() => location.hash), "#wallet-basics");

  const staticDemo = page.locator(".aura-page__demo");
  await staticDemo.waitFor();
  const staticDemoText = await staticDemo.innerText();
  assert.match(
    staticDemoText,
    /An example reading/i,
    "the first screen must open with the server-rendered example",
  );
  assert.match(
    staticDemoText,
    /no public address\s+was checked/i,
  );
  assert.match(
    staticDemoText,
    /no chart was read from this browser/i,
    "the first-screen example must not imply a local chart exists",
  );
  assert.equal(
    await staticDemo.locator("[data-aura-record-sign]").count(),
    4,
    "the static example Alignment must draw the four example discs",
  );

  const primerExample = page.getByRole("link", {
    name: "Open the full example",
  });
  assert.equal(await primerExample.getAttribute("href"), "#aura-composer");
  await primerExample.click();
  await page.locator("#aura-result-title").waitFor();
  assert.match(
    await page.locator('[data-aura-source="record"]').innerText(),
    /Illustrative example/i,
  );
  const exampleChartSource = await page
    .locator('.aura-result [data-aura-source="chart"]')
    .innerText();
  assert.match(
    exampleChartSource,
    /Example chart/i,
    "the example docket must not claim a selected local chart",
  );
  assert.match(exampleChartSource, /No chart was read from this browser/i);
  assert.equal(
    /Recorded birth time|Selected birth chart/i.test(exampleChartSource),
    false,
    "example-mode chart plate must not carry real-chart labels",
  );
  assert.equal(
    holdingsRequests,
    0,
    "the first-screen example must not invoke the holdings endpoint",
  );
  assert.equal(
    await page.evaluate(() => globalThis.__walletGuideAccountCalls),
    0,
    "the first-screen example must not request wallet accounts",
  );
  await page.getByRole("button", { name: "Close example" }).click();
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-primer-example",
  );
  assert.equal(
    await primerExample.evaluate((node) => node === document.activeElement),
    true,
    "closing the example must return focus to its first-screen trigger",
  );

  const guide = page.locator("#wallet-basics");
  const firstDetails = guide.locator("details").first();
  const firstSummary = firstDetails.locator("summary");
  await firstSummary.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await firstDetails.getAttribute("open"),
    "",
    "Enter must open a wallet-guide disclosure",
  );
  assert.equal(
    await firstSummary.evaluate((node) => node === document.activeElement),
    true,
    "disclosure focus must remain on its summary",
  );
  await page.keyboard.press("Space");
  assert.equal(
    await firstDetails.getAttribute("open"),
    null,
    "Space must close a wallet-guide disclosure",
  );
  assert.equal(
    await firstSummary.evaluate((node) => node === document.activeElement),
    true,
    "focus must remain safe after closing",
  );

  await guide.locator("details").evaluateAll((details) =>
    details.forEach((item) => {
      item.open = true;
    }),
  );
  assert.equal(
    holdingsRequests,
    0,
    "opening wallet education must not invoke the holdings endpoint",
  );
  assert.equal(
    await page.evaluate(() => globalThis.__walletGuideAccountCalls),
    0,
    "opening wallet education must not request wallet accounts",
  );
  const links = await guide
    .locator('a[href^="https://"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.href,
        target: node.getAttribute("target"),
        rel: node.getAttribute("rel") ?? "",
      })),
    );
  assert.deepEqual(links.map(({ href }) => new URL(href).hostname).sort(), [
    "ethereum.org",
    "ethereum.org",
    "phantom.com",
  ]);
  assert.equal(
    links.every(({ href }) => new URL(href).search === ""),
    true,
    "official wallet links must contain no query or tracking data",
  );
  assert.equal(
    links.every(
      ({ target, rel }) =>
        target === "_blank" &&
        rel.includes("noopener") &&
        rel.includes("noreferrer"),
    ),
    true,
    "new-tab wallet links must isolate the opener",
  );
  assert.equal(
    /safe to share|anonymous|verified owner/i.test(await guide.innerText()),
    false,
    "wallet education must not overstate privacy or identity",
  );

  await page.evaluate(() => window.scrollTo(0, 0));
  const guideBounds = await guide.boundingBox();
  assert.ok(guideBounds);
  const guidePage = await page.screenshot({ fullPage: true });
  await sharp(guidePage)
    .extract({
      left: 0,
      top: Math.max(0, Math.floor(guideBounds.y)),
      width: 375,
      height: Math.ceil(guideBounds.height),
    })
    .png()
    .toFile(resolve(proofRoot, "wallet-basics-375.png"));
  await page.setViewportSize({ width: 320, height: 800 });
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "the fully opened wallet guide must not scroll horizontally at 320px",
  );
  assert.equal(
    await guide
      .locator("summary")
      .evaluateAll((nodes) =>
        nodes.every((node) => node.getBoundingClientRect().height >= 44),
      ),
    true,
    "wallet-guide disclosure targets must be at least 44px tall",
  );
  await context.close();
}

async function captureCase(
  browser,
  baseURL,
  name,
  heldSigns,
  reducedMotion = "no-preference",
) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion,
  });
  await installDeterministicBrowserState(context);
  await context.addCookies([
    { name: "aura-auth-probe", value: "must-not-leave", url: baseURL },
  ]);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const endpointBodies = [];
  const endpointCookies = [];
  let downloadCount = 0;
  let retainedPreviewUrl = null;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack || error.message),
  );
  page.on("download", () => {
    downloadCount += 1;
  });
  await page.route("**/api/aura-holdings", async (route) => {
    endpointBodies.push(route.request().postDataJSON());
    endpointCookies.push((await route.request().allHeaders()).cookie ?? null);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "solana",
        heldSigns,
        checkedAt: recordCheckedAt,
      }),
    });
  });

  const response = await page.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "networkidle",
  });
  assert.equal(response?.status(), 200, "Aura route should load");
  assert.ok(
    (await page.locator("body").innerText()).includes("Registry Aura"),
    "Aura page should not be blank",
  );
  assert.equal(
    await page
      .locator(
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
      )
      .count(),
    0,
  );
  const boundarySummary = await page
    .locator(".aura-entry__boundary-lines")
    .innerText();
  assert.match(
    boundarySummary,
    /Read-only\. Symbolic\. Never an investment signal/i,
    "the boundary summary lines must stay visible without opening anything",
  );
  assert.match(boundarySummary, /Only the address is sent/i);
  assert.match(boundarySummary, /listed in this Registry — not approval/i);
  await page
    .locator(".aura-entry__boundary details, .aura-storage-details")
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.open = true;
      }),
    );
  const boundaryText = await page.locator(".aura-entry__boundary").innerText();
  assert.match(
    boundaryText,
    /read-only symbolic display.+not a price prediction/i,
  );
  assert.match(boundaryText, /may lose all market value/i);
  assert.match(
    boundaryText,
    /public address and its on-chain history are public and may become linked to a person/i,
  );
  assert.match(
    boundaryText,
    /Aura uses and sends one compatible address through Zodiacs\.org.+blockchain data provider/i,
  );
  assert.match(
    boundaryText,
    /official Zodiac.+mint or contract.+listed by this Registry/i,
  );
  assert.match(
    boundaryText,
    /present\/not-present.+does not show quantities, prices, holding history, or unrelated assets/i,
  );
  const storageText = await page.locator("#aura-storage-note").innerText();
  assert.match(
    storageText,
    /public address, network, held-sign result, check time, selected chart ID, and save\/expiry times/i,
  );
  assert.match(storageText, /session storage and restores them for 8 hours/i);
  assert.match(
    storageText,
    /local browser storage and restores them for 24 hours/i,
  );
  assert.match(storageText, /deleted when Aura next reads them/i);
  assert.deepEqual(
    await page
      .locator(".aura-entry__privacy a")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ["/disclosure/", "/privacy/", "/terms/"],
    "Disclosure, Privacy, and Terms must be available at the composition decision point",
  );
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page
    .locator("#aura-result-title")
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(async (error) => {
      console.error("Aura browser state:", {
        status: await page
          .locator("#aura-status")
          .innerText()
          .catch(() => ""),
        errors: consoleErrors,
        pageErrors,
        resultCount: await page.locator(".aura-result").count(),
        titleCount: await page.locator("#aura-result-title").count(),
        resultText: await page
          .locator(".aura-result")
          .innerText()
          .catch(() => ""),
        text: (await page.locator("body").innerText()).slice(0, 1200),
      });
      throw error;
    });
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-result-title",
  );

  assert.deepEqual(
    endpointBodies,
    [{ address }],
    "the endpoint request must contain only the address",
  );
  assert.deepEqual(
    endpointCookies,
    [null],
    "the address lookup must omit unrelated first-party cookies",
  );
  assert.equal(JSON.stringify(endpointBodies).includes("birth"), false);
  const result = page.locator(".aura-result");
  const resultText = await result.innerText();
  assert.equal(
    await result.locator("[data-aura-record-sign]").count(),
    heldSigns.length,
    "the record row must draw held signs only",
  );
  assert.equal(
    await result.locator("[data-aura-record-sign] img").count(),
    heldSigns.length,
    "every held sign must carry exactly one pastel disc",
  );
  assert.equal(
    await result.locator(".aura-algn thead .aura-algn__col").count(),
    12,
    "the Alignment must keep all twelve zodiac columns",
  );
  const rowLabels = (
    await result
      .locator(".aura-algn__lbl")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""))
  ).join("\n");
  assert.match(rowLabels, /Birth chart/i);
  assert.match(rowLabels, /private, read on this device/i);
  assert.match(rowLabels, /At this address/i);
  assert.match(rowLabels, /public record · checked/i);
  assert.match(rowLabels, /Sky/i);
  assert.equal(
    await result.locator(".aura-algn__wheel .wheel image title").count(),
    12,
    "the full natal wheel must survive behind its disclosure with all twelve coordinates",
  );
  assert.equal(
    await result.locator(".aura-algn__wheel[open]").count(),
    0,
    "the natal wheel disclosure must start closed",
  );
  assert.equal(
    resultText.includes(address),
    false,
    "result must not expose address",
  );
  assert.equal(
    resultText.includes(profile.charts[0].name),
    false,
    "result must not expose chart name",
  );
  assert.equal(
    /\b(?:of\s+(?:twelve|12)|12\s*\/\s*12|complete(?:d|ion)?)\b/i.test(
      resultText,
    ),
    false,
    "result must not use denominators or completion language",
  );
  assert.equal(
    /\b(?:Natal echo|Active now|Next activation|Rooted|Awake|Radiant)\b/i.test(
      resultText,
    ),
    false,
    "legacy state and ranking labels must be absent",
  );

  assert.deepEqual(
    await page
      .locator("[data-aura-source]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-aura-source")),
      ),
    ["chart", "record", "sky"],
    "the identifier-free source docket must stay ordered Chart, Record, Sky",
  );
  const chartSource = await page
    .locator('[data-aura-source="chart"]')
    .innerText();
  const recordSource = await page
    .locator('[data-aura-source="record"]')
    .innerText();
  const skySource = await page.locator('[data-aura-source="sky"]').innerText();
  assert.match(chartSource, /Selected birth chart/i);
  assert.match(chartSource, /Local/i);
  assert.match(chartSource, /Read on this device; never sent/i);
  assert.match(recordSource, /Public wallet address/i);
  assert.match(
    recordSource,
    new RegExp(
      `${heldSigns.length} official Zodiac${heldSigns.length === 1 ? "" : "s"} found`,
      "i",
    ),
  );
  assert.match(
    recordSource,
    /Checked July 15, 2026/i,
    "the wallet fact must carry its own checked date",
  );
  assert.match(
    recordSource,
    /Checked July 15, 2026 UTC/i,
    "the UTC-derived wallet date must name UTC",
  );
  assert.match(
    recordSource,
    /· yesterday/i,
    "a divergent wallet date must carry its relative word",
  );
  assert.match(
    recordSource,
    /Re-check to update/i,
    "a divergent wallet date must point at the re-check action",
  );
  assert.equal(
    recordSource.includes("July 16, 2026"),
    false,
    "the wallet fact must not borrow the sky date",
  );
  assert.match(skySource, /The sky/i);
  assert.match(skySource, /Sun in .+ · Moon in ./i);
  assert.match(skySource, /Computed for this visit/i);
  assert.match(
    skySource,
    /July 16, 2026/i,
    "the sky fact must carry its own date",
  );
  assert.match(
    skySource,
    /July 16, 2026 UTC/i,
    "the UTC-derived sky date must name UTC",
  );
  assert.equal(
    skySource.includes("July 15, 2026"),
    false,
    "the sky fact must not borrow the wallet checked date",
  );
  assert.match(
    await page.locator(".aura-source-docket__join").innerText(),
    /wallet record never changes the birth chart; it only determines which held signs receive a reading/i,
  );

  assert.equal(
    await result.evaluate((root) => {
      const nodes = [
        root.querySelector(".aura-result__sources"),
        root.querySelector(".aura-algn table"),
        root.querySelector(".aura-algn__wheel"),
        root.querySelector("[data-aura-fact]"),
        root.querySelector("[data-aura-reading]"),
        root.querySelector("[data-aura-evidence]"),
        root.querySelector("[data-aura-share-disclosure]"),
      ];
      return (
        nodes.every(Boolean) &&
        nodes
          .slice(0, -1)
          .every((node, index) =>
            Boolean(
              node.compareDocumentPosition(nodes[index + 1]) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          )
      );
    }),
    true,
    "the result must follow docket, alignment, wheel, fact, reading, evidence, sharing order",
  );

  assert.match(
    await page.locator("[data-aura-fact]").innerText(),
    /a talisman for this visit — a symbolic focus, not a score\s+or an ownership claim/i,
  );
  assert.match(
    await page.locator("[data-aura-reading]").innerText(),
    /Next on the calendar/i,
  );
  assert.match(
    await page.locator("[data-aura-reading]").innerText(),
    /Across the held signs/i,
  );
  assert.equal(
    /committed/i.test(await result.innerText()),
    false,
    "repo vocabulary must not reach consumer copy",
  );
  const readingText = await page.locator("[data-aura-reading]").innerText();
  if (heldSigns.includes("leo")) {
    assert.match(
      readingText,
      /The Moon is passing through this sign/i,
      "the reading must quote the driving sky fact",
    );
    assert.match(
      readingText,
      /Your Mars is here/i,
      "the reading must name the strongest echoing chart point",
    );
  } else if (heldSigns.includes("cancer")) {
    assert.match(
      readingText,
      /The Sun is in this sign/i,
      "the reading must quote the Sun-season fact",
    );
    assert.match(
      readingText,
      /Your Moon is here too/i,
      "the reading must name the strongest echoing chart point",
    );
    assert.match(
      readingText,
      /more of your chart lives in this sign/i,
      "several echoes must be acknowledged plainly",
    );
  }
  assert.equal(
    /\b(?:today|now)\b/i.test(
      await page
        .locator("[data-aura-fact], [data-aura-reading]")
        .allInnerTexts()
        .then((items) => items.join("\n")),
    ),
    false,
    "factual and reading copy must use dated language",
  );

  const markState = await result
    .locator("[data-aura-record-sign]")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        sign: node.getAttribute("data-aura-record-sign"),
        discs: node.querySelectorAll("img").length,
        animationName: getComputedStyle(node).animationName,
        filter: getComputedStyle(node).filter,
      })),
    );
  assert.equal(
    markState.every((entry) => entry.discs === 1),
    true,
    "each held record cell must carry exactly one disc and nothing else",
  );
  assert.equal(
    markState.every(
      (entry) => entry.animationName === "none" && entry.filter === "none",
    ),
    true,
    "record marks must have no breathing animation or glow",
  );
  const skyMarkSigns = await result
    .locator("[data-aura-sky-mark]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-aura-sky-mark")),
    );
  assert.ok(
    skyMarkSigns.includes("cancer") && skyMarkSigns.includes("leo"),
    "the sky row must mark the current Sun and Moon signs",
  );
  if (heldSigns.includes("cancer")) {
    const cancerChart = result.locator('[data-aura-chart-mark="cancer"]');
    assert.equal(
      await cancerChart.count(),
      1,
      "a sign's chart evidence must collapse into one mark",
    );
    const cancerChartText = await cancerChart.textContent();
    assert.ok(
      cancerChartText?.includes("4"),
      "four Cancer chart facts must render as one numeral chip",
    );
    assert.match(cancerChartText ?? "", /Moon, Mercury, Venus, Midheaven/);
  }
  assert.ok(
    await page.evaluate(
      () => sessionStorage.getItem("zodiacs.aura.session.v1") !== null,
    ),
  );

  if (reducedMotion === "reduce") {
    const motion = await result.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        name: style.animationName,
        iterations: style.animationIterationCount,
      };
    });
    assert.deepEqual(
      motion,
      { name: "aura-reduced-fade", iterations: "1" },
      "reduced motion must use one finished-state fade",
    );
  } else {
    assert.equal(
      await result.evaluate(
        (node) => getComputedStyle(node).animationIterationCount,
      ),
      "1",
      "the result entrance must run once",
    );
  }

  await page.evaluate(async () => {
    const settle = Promise.all([
      document.fonts.ready,
      ...[...document.images].map((image) =>
        image.decode().catch(() => undefined),
      ),
    ]);
    await Promise.race([
      settle,
      new Promise((resolveWait) => setTimeout(resolveWait, 1_500)),
    ]);
  });
  await page.waitForTimeout(250);

  const proofBounds = await page.evaluate(() => {
    const start = document
      .querySelector(".aura-result__sources")
      ?.getBoundingClientRect();
    const end = document
      .querySelector("[data-aura-reading]")
      ?.getBoundingClientRect();
    return start && end
      ? {
          top: start.top + window.scrollY,
          bottom: end.bottom + window.scrollY,
        }
      : null;
  });
  assert.ok(proofBounds);
  const proofY = Math.max(0, Math.floor(proofBounds.top - 16));
  const fullProof = await page.screenshot({
    fullPage: true,
  });
  const fullProofMeta = await sharp(fullProof).metadata();
  const proofBottom = Math.min(
    fullProofMeta.height ?? 0,
    Math.ceil(proofBounds.bottom + 16),
  );
  assert.ok(proofBottom > proofY);
  await sharp(fullProof)
    .extract({
      left: 0,
      top: proofY,
      width: 375,
      height: proofBottom - proofY,
    })
    .png()
    .toFile(resolve(proofRoot, `${name}-375.png`));
  assert.deepEqual(consoleErrors, [], `console errors in ${name} case`);
  assert.deepEqual(pageErrors, [], `page errors in ${name} case`);

  if (name === "one") {
    const chartDisclosure = page.getByRole("checkbox", {
      name: /Add “In the selected birth chart”/,
    });
    assert.equal(
      await chartDisclosure.isChecked(),
      false,
      "chart disclosure must be off by default",
    );
    const createPreview = page.getByRole("button", {
      name: "Create card preview",
    });
    await createPreview.click();
    const previewHeading = page.getByRole("heading", {
      name: "Review your card",
    });
    await previewHeading.waitFor();
    assert.equal(
      await previewHeading.evaluate((node) => node === document.activeElement),
      true,
      "focus must move to the completed preview",
    );
    assert.equal(
      downloadCount,
      0,
      "creating a preview must not download anything",
    );
    assert.equal(
      await page.evaluate(() => globalThis.__auraSharePayload),
      null,
      "creating a preview must not open Web Share",
    );
    const previewImage = page.getByRole("img", {
      name: "Preview of the Registry Aura card that will be shared",
    });
    await previewImage.evaluate((image) => image.decode());
    const accessibleCard = await page
      .locator("#aura-share-preview-card-description")
      .innerText();
    for (const required of [
      "Registry Aura card dated",
      "Private birth chart, public wallet address, and dated sky are read side by side",
      "Cancer",
      "Found at a public wallet address, checked",
      "Sky: Sun in Cancer, Moon in Leo",
      "Symbolic reading:",
      "not a wallet score or investment signal",
      "Composed on this device. zodiacs.org/registry/aura",
    ]) {
      assert.ok(
        accessibleCard.includes(required),
        `accessible preview must describe ${required}`,
      );
    }
    for (const forbidden of [
      address,
      profile.charts[0].name,
      "105°",
      "12:00",
    ]) {
      assert.equal(
        accessibleCard.includes(forbidden),
        false,
        `accessible preview must not describe ${forbidden}`,
      );
    }
    const firstPreviewUrl = await previewImage.getAttribute("src");
    assert.match(
      firstPreviewUrl ?? "",
      /^blob:/,
      "the preview must stay in an on-device blob URL",
    );
    assert.deepEqual(
      await previewImage.evaluate((image) => ({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
      { width: 1080, height: 1350 },
    );
    assert.equal(
      await page.getByRole("button", { name: "Share card" }).count(),
      0,
      "unsupported Web Share must not present a dead-end Share button",
    );
    await page
      .getByText(
        "This browser does not offer file sharing. Download the reviewed PNG instead.",
      )
      .waitFor();
    await page
      .locator(".aura-share-preview")
      .screenshot({ path: resolve(proofRoot, "social-preview-375.png") });

    await page.getByRole("button", { name: "Close preview" }).click();
    await page.waitForFunction(() =>
      document.activeElement?.textContent?.includes("Create card preview"),
    );
    assert.equal(await page.locator(".aura-share-preview").count(), 0);
    await page.waitForFunction(
      (url) => globalThis.__auraRevokedUrls.includes(url),
      firstPreviewUrl,
    );

    await createPreview.click();
    await previewHeading.waitFor();
    retainedPreviewUrl = await previewImage.getAttribute("src");
    const downloadReady = page.waitForEvent("download");
    const downloadButton = page.getByRole("button", { name: "Download PNG" });
    await downloadButton.click();
    const download = await downloadReady;
    assert.equal(downloadCount, 1);
    assert.equal(download.suggestedFilename(), "zodiacs-registry-aura.png");
    const downloadPath = await download.path();
    assert.ok(downloadPath);
    const png = await readFile(downloadPath);
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    await page.getByText("Aura card downloaded.").waitFor();
    assert.equal(
      await downloadButton.evaluate((node) => node === document.activeElement),
      true,
      "download must retain keyboard focus",
    );
    const painted = await page.evaluate(() => globalThis.__auraPaintedText);
    for (const required of [
      "REGISTRY AURA",
      "PRIVATE BIRTH CHART · READ ON A DEVICE, NEVER SHOWN",
      "CANCER FOUND AT A PUBLIC WALLET ADDRESS · CHECKED JUL 15, 2026 UTC",
      "SKY · SUN IN CANCER · MOON IN LEO · JUL 16, 2026 UTC",
      "Cancer",
      "A symbolic reading — not a wallet score or investment signal.",
      "COMPOSED ON THIS DEVICE",
      "ZODIACS.ORG/REGISTRY/AURA",
    ]) {
      assert.ok(
        painted.some((text) => text.includes(required)),
        `social card must paint ${required}`,
      );
    }
    for (const forbidden of [
      address,
      profile.charts[0].name,
      "Browser fixture",
      "105°",
      "12:00",
    ]) {
      assert.equal(
        painted.some((text) => text.includes(forbidden)),
        false,
        `social card must not paint ${forbidden}`,
      );
    }
    await page.getByText("Aura card downloaded.").waitFor();

    const cardPage = await context.newPage();
    await cardPage.setViewportSize({ width: 250, height: 313 });
    await cardPage.setContent(
      `<style>html,body{margin:0;background:#060709}img{display:block;width:250px;height:auto}</style><img alt="Registry Aura social card" src="data:image/png;base64,${png.toString("base64")}">`,
    );
    await cardPage.locator("img").evaluate((image) => image.decode());
    assert.deepEqual(
      await cardPage
        .locator("img")
        .evaluate((image) => ({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      { width: 1080, height: 1350 },
    );
    await cardPage.screenshot({
      path: resolve(proofRoot, "social-card-250.png"),
    });
    await cardPage.close();

    const meaningful = page.getByRole("button", { name: "Meaningful" });
    await meaningful.click();
    await page.getByText(/Response recorded as “Meaningful.”/).waitFor();
    assert.equal(
      await meaningful.evaluate((node) => node === document.activeElement),
      true,
      "submitting the optional response must preserve keyboard focus",
    );
    assert.equal(await meaningful.getAttribute("aria-disabled"), "true");
  }

  const recordGeometry = heldSigns.includes("cancer")
    ? await result
        .locator('[data-aura-record-sign="cancer"]')
        .evaluate((node) => {
          const disc = node.querySelector("img");
          const bounds = disc?.getBoundingClientRect();
          return {
            width: bounds ? Math.round(bounds.width) : null,
            height: bounds ? Math.round(bounds.height) : null,
            transform: getComputedStyle(node).transform,
            filter: getComputedStyle(node).filter,
          };
        })
    : null;

  await page.getByRole("button", { name: "Clear this reading" }).click();
  assert.equal(await page.locator(".aura-result").count(), 0);
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("zodiacs.aura.session.v1"),
    ),
    null,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("zodiacs.aura.local.v1")),
    null,
  );
  if (retainedPreviewUrl) {
    await page.waitForFunction(
      (url) => globalThis.__auraRevokedUrls.includes(url),
      retainedPreviewUrl,
    );
  }
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-address",
  );
  assert.equal(
    await page
      .locator("#aura-address")
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await context.close();
  return recordGeometry;
}

async function verifyNoChartAndOfflineExample(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: "reduce",
  });
  await installDeterministicBrowserState(context, null);
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: "Calculate and save a chart" })
    .waitFor();
  assert.ok(
    (
      await page
        .getByRole("link", { name: "Calculate and save a chart" })
        .getAttribute("href")
    )?.includes("return=registry-aura"),
  );
  await context.setOffline(true);
  await page.getByRole("button", { name: "See the example" }).click();
  await page.locator("#aura-result-title").waitFor();
  assert.equal(
    await page.locator(".aura-result [data-aura-record-sign]").count(),
    4,
  );
  assert.equal(
    await page.locator(".aura-result .aura-algn__wheel .wheel image title").count(),
    12,
  );
  const exampleRecord = await page
    .locator('.aura-result [data-aura-source="record"]')
    .innerText();
  assert.match(exampleRecord, /Illustrative example/i);
  assert.match(exampleRecord, /4 illustrative Zodiacs shown/i);
  assert.match(exampleRecord, /No public address was checked/i);
  const exampleChart = await page
    .locator('.aura-result [data-aura-source="chart"]')
    .innerText();
  assert.match(exampleChart, /Example chart/i);
  assert.match(exampleChart, /No chart was read from this browser/i);
  const exampleReading = await page
    .locator(".aura-result [data-aura-reading]")
    .innerText();
  assert.match(
    exampleReading,
    /The example chart has placements here too/i,
    "the example reading must not claim the chart is the visitor's",
  );
  assert.equal(
    /\byour\b/i.test(
      (await page
        .locator(".aura-result .aura-result__reading-detail")
        .innerText()) ?? "",
    ),
    false,
    "the example strands must never say “your”",
  );
  assert.equal(
    await page.locator("[data-aura-share-disclosure]").count(),
    0,
    "the illustrative example must not expose social sharing",
  );
  assert.equal(
    await page.getByRole("button", { name: "Create card preview" }).count(),
    0,
  );
  assert.equal(
    await page.locator(".aura-result__response").count(),
    0,
    "the illustrative example must not collect meaningfulness feedback",
  );
  assert.equal(
    await page.getByRole("button", { name: /Meaningful|Not yet/ }).count(),
    0,
  );
  assert.deepEqual(
    await page
      .locator(".aura-result [data-aura-record-sign]")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).animationName),
      ),
    ["none", "none", "none", "none"],
  );
  assert.equal(
    await page
      .locator(".aura-result .aura-result__composition")
      .evaluate((node) => getComputedStyle(node).animationName),
    "none",
    "reduced motion must collapse the choreography into the single result fade",
  );
  assert.equal(
    await page
      .locator(".aura-result")
      .evaluate((node) => getComputedStyle(node).animationName),
    "aura-reduced-fade",
  );
  await context.close();
}

async function verifyRequestInvalidation(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context);
  const page = await context.newPage();
  let releaseLookup;
  const lookupStarted = new Promise((resolveStarted) => {
    releaseLookup = resolveStarted;
  });
  let allowResponse;
  const responseAllowed = new Promise((resolveResponse) => {
    allowResponse = resolveResponse;
  });
  await page.route("**/api/aura-holdings", async (route) => {
    releaseLookup();
    await responseAllowed;
    await route
      .fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chain: "solana",
          heldSigns: ["aries"],
          checkedAt: fixedNow,
        }),
      })
      .catch(() => {});
  });
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await lookupStarted;
  await page
    .locator("#aura-address")
    .fill("0x0000000000000000000000000000000000000001");
  allowResponse();
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".aura-result").count(),
    0,
    "an invalidated lookup must not restore its result",
  );
  assert.equal(
    await page.getByRole("button", { name: "Read them side by side" }).isEnabled(),
    true,
  );
  await context.close();
}

async function verifyRememberInterleaving(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context);
  const page = await context.newPage();
  let lookupStarted;
  const started = new Promise((resolveStarted) => {
    lookupStarted = resolveStarted;
  });
  let allowResponse;
  const responseAllowed = new Promise((resolveResponse) => {
    allowResponse = resolveResponse;
  });
  await page.route("**/api/aura-holdings", async (route) => {
    lookupStarted();
    await responseAllowed;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "solana",
        heldSigns: ["aries"],
        checkedAt: fixedNow,
      }),
    });
  });
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#aura-address").fill(address);
  const remember = page.getByRole("checkbox", {
    name: /Remember this address/,
  });
  await remember.check();
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await started;
  await remember.uncheck();
  allowResponse();
  await page.locator("#aura-result-title").waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("zodiacs.aura.local.v1")),
    null,
    "unchecking Remember during a lookup must win",
  );
  assert.ok(
    await page.evaluate(
      () => sessionStorage.getItem("zodiacs.aura.session.v1") !== null,
    ),
  );
  await remember.check();
  assert.ok(
    await page.evaluate(
      () => localStorage.getItem("zodiacs.aura.local.v1") !== null,
    ),
    "checking Remember after composition must persist the current valid lookup",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#aura-result-title").waitFor();
  assert.equal(
    await page
      .getByRole("checkbox", { name: /Remember this address/ })
      .isChecked(),
    true,
    "restoring matching session and local records must truthfully show Remember as enabled",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      session: Boolean(sessionStorage.getItem("zodiacs.aura.session.v1")),
      local: Boolean(localStorage.getItem("zodiacs.aura.local.v1")),
    })),
    { session: true, local: true },
    "a remembered reload must retain both bounded records",
  );
  await context.close();
}

async function verifyInputInvalidatesPersistence(browser, baseURL) {
  const twoChartProfile = JSON.parse(JSON.stringify(profile));
  twoChartProfile.charts.push({
    ...JSON.parse(JSON.stringify(profile.charts[0])),
    id: "aura-browser-fixture-second",
    name: "Second browser fixture",
    birth: { ...profile.charts[0].birth, date: "1994-05-03" },
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context, twoChartProfile);
  const page = await context.newPage();
  await page.route("**/api/aura-holdings", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "solana",
        heldSigns: ["cancer"],
        checkedAt: recordCheckedAt,
      }),
    }),
  );
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#aura-address").fill(address);
  await page.getByRole("checkbox", { name: /Remember this address/ }).check();
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator("#aura-result-title").waitFor();
  assert.equal(
    await page.evaluate(() =>
      Boolean(
        sessionStorage.getItem("zodiacs.aura.session.v1") &&
        localStorage.getItem("zodiacs.aura.local.v1"),
      ),
    ),
    true,
    "a remembered composition must populate both bounded storage records",
  );

  await page.locator("#aura-address").fill(address.slice(0, -1));
  assert.equal(
    await page.locator(".aura-result").count(),
    0,
    "editing the address must clear the composed result",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      session: sessionStorage.getItem("zodiacs.aura.session.v1"),
      local: localStorage.getItem("zodiacs.aura.local.v1"),
    })),
    { session: null, local: null },
    "editing the address must delete both persisted chart-address joins",
  );

  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator("#aura-result-title").waitFor();
  await page.locator("#aura-chart").selectOption("aura-browser-fixture-second");
  assert.equal(
    await page.locator(".aura-result").count(),
    0,
    "changing the selected chart must clear the composed result",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      session: sessionStorage.getItem("zodiacs.aura.session.v1"),
      local: localStorage.getItem("zodiacs.aura.local.v1"),
    })),
    { session: null, local: null },
    "changing the chart must delete both persisted chart-address joins",
  );
  await context.close();
}

async function verifySocialShareAndDisclosure(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context, profile, "web");
  const page = await context.newPage();
  await page.route("**/api/aura-holdings", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "solana",
        heldSigns: ["cancer"],
        checkedAt: recordCheckedAt,
      }),
    }),
  );
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator("#aura-result-title").waitFor();

  const chartDisclosure = page.getByRole("checkbox", {
    name: /Add.*selected birth chart/i,
  });
  assert.equal(
    await chartDisclosure.isChecked(),
    false,
    "the chart fact must start private",
  );
  assert.match(
    await page.locator("[data-aura-share-disclosure]").innerText(),
    /other people and apps may save or repost the image.+clearing Aura cannot remove those copies/i,
    "the share control must explain that public copies cannot be recalled",
  );
  await page.getByRole("button", { name: "Create card preview" }).click();
  const previewImage = page.getByRole("img", {
    name: "Preview of the Registry Aura card that will be shared",
  });
  await previewImage.evaluate((image) => image.decode());
  assert.equal(
    await page.evaluate(() => globalThis.__auraSharePayload),
    null,
    "preview creation must not invoke Web Share",
  );
  const privatePreviewUrl = await previewImage.getAttribute("src");
  assert.match(privatePreviewUrl ?? "", /^blob:/);
  const privatePreviewSize = await page.evaluate(
    async (url) => (await (await fetch(url)).blob()).size,
    privatePreviewUrl,
  );
  const shareButton = page.getByRole("button", { name: "Share card" });
  await shareButton.click();
  await page.getByText("Aura card opened in your share sheet.").waitFor();
  assert.equal(
    await shareButton.evaluate((node) => node === document.activeElement),
    true,
    "Web Share must retain keyboard focus",
  );
  const defaultPainted = await page.evaluate(
    () => globalThis.__auraPaintedText,
  );
  assert.ok(defaultPainted.includes("Cancer"));
  assert.equal(
    defaultPainted.some((text) =>
      /also appears in the selected birth chart/i.test(text),
    ),
    false,
  );
  const payload = await page.evaluate(() => globalThis.__auraSharePayload);
  assert.deepEqual(
    payload.keys,
    ["files"],
    "Web Share must receive the PNG only",
  );
  assert.equal(payload.files.length, 1);
  assert.equal(payload.files[0].name, "zodiacs-registry-aura.png");
  assert.equal(payload.files[0].type, "image/png");
  assert.equal(
    payload.files[0].size,
    privatePreviewSize,
    "Web Share must receive the exact reviewed PNG bytes",
  );
  for (const forbidden of [
    address,
    profile.charts[0].name,
    profile.charts[0].birth.date,
    "?",
    "#",
  ]) {
    assert.equal(
      JSON.stringify(payload).includes(forbidden),
      false,
      `Web Share payload must not contain ${forbidden}`,
    );
  }

  await chartDisclosure.check();
  await page.waitForFunction(
    () => document.querySelector(".aura-share-preview") === null,
  );
  await page.waitForFunction(
    (url) => globalThis.__auraRevokedUrls.includes(url),
    privatePreviewUrl,
  );
  assert.equal(
    (
      await page.evaluate(() =>
        sessionStorage.getItem("zodiacs.aura.session.v1"),
      )
    )?.includes("shareChart"),
    false,
    "the per-share chart choice must not persist",
  );
  await page.evaluate(() => {
    globalThis.__auraPaintedText = [];
    globalThis.__auraSharePayload = null;
  });
  await page.getByRole("button", { name: "Create card preview" }).click();
  await previewImage.evaluate((image) => image.decode());
  const disclosedPreviewUrl = await previewImage.getAttribute("src");
  assert.match(disclosedPreviewUrl ?? "", /^blob:/);
  const disclosedPreviewSize = await page.evaluate(
    async (url) => (await (await fetch(url)).blob()).size,
    disclosedPreviewUrl,
  );
  await page.getByRole("button", { name: "Share card" }).click();
  await page.waitForFunction(() => globalThis.__auraSharePayload !== null);
  const disclosedPainted = await page.evaluate(
    () => globalThis.__auraPaintedText,
  );
  assert.ok(
    disclosedPainted.includes("Cancer"),
    "chart disclosure must not change the public focal sign",
  );
  assert.equal(
    disclosedPainted.some((text) =>
      /Cancer also appears in the selected birth chart/i.test(text),
    ),
    true,
  );
  assert.deepEqual(
    (await page.evaluate(() => globalThis.__auraSharePayload)).keys,
    ["files"],
  );
  assert.equal(
    (await page.evaluate(() => globalThis.__auraSharePayload)).files[0].size,
    disclosedPreviewSize,
  );

  await page.getByRole("button", { name: "Re-check the address" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-aura-share-disclosure] input")?.checked ===
      false,
  );
  await page.waitForFunction(
    () => document.querySelector(".aura-share-preview") === null,
  );
  await page.waitForFunction(
    (url) => globalThis.__auraRevokedUrls.includes(url),
    disclosedPreviewUrl,
  );
  assert.equal(
    await chartDisclosure.isChecked(),
    false,
    "a refreshed composition must reset the per-share disclosure",
  );
  await context.close();
}

async function verifyUnknownTimeOmissions(browser, baseURL) {
  const unknownTimeProfile = JSON.parse(JSON.stringify(profile));
  unknownTimeProfile.charts[0].birth.time = null;
  unknownTimeProfile.charts[0].birth.timeKnown = false;
  unknownTimeProfile.charts[0].summary.angles = null;
  unknownTimeProfile.charts[0].summary.flags = ["no-time"];
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context, unknownTimeProfile);
  const page = await context.newPage();
  await page.route("**/api/aura-holdings", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "solana",
        heldSigns: ["cancer"],
        checkedAt: recordCheckedAt,
      }),
    }),
  );
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator("#aura-result-title").waitFor();
  assert.match(
    await page.locator('[data-aura-source="chart"]').innerText(),
    /Unknown time · sign-level estimates only/i,
  );
  const wheelLabel = await page
    .locator(".aura-result .aura-algn__wheel .wheel")
    .getAttribute("aria-label");
  assert.equal(
    /Moon|Ascendant|Midheaven|\d+°/i.test(wheelLabel ?? ""),
    false,
    "unknown-time wheel description must omit Moon, angles, and exact degrees",
  );
  const unknownTimeCancerMark = await page
    .locator('.aura-result [data-aura-chart-mark="cancer"]')
    .textContent();
  assert.ok(
    unknownTimeCancerMark?.includes("2"),
    "unknown-time Cancer evidence must collapse to a two-placement chip",
  );
  assert.equal(
    /Moon|Midheaven/.test(unknownTimeCancerMark ?? ""),
    false,
    "unknown-time Cancer evidence must omit Moon and MC",
  );
  assert.match(
    (
      await page
        .locator('.aura-result .aura-algn__lbl')
        .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? "").join("\n"))
    ),
    /noon estimate/i,
    "the chart row label must disclose the noon estimate",
  );
  const plate = page
    .locator(".aura-plate")
    .filter({ has: page.getByText("Cancer", { exact: true }) })
    .first();
  await plate.locator("summary").click();
  const chartRegister = plate
    .locator(".aura-register")
    .filter({ has: page.getByRole("heading", { name: "Chart", exact: true }) });
  const chartText = await chartRegister.innerText();
  assert.match(chartText, /Mercury in Cancer/i);
  assert.match(chartText, /Venus in Cancer/i);
  assert.equal(
    /Moon|Ascendant|Midheaven|\d+°/i.test(chartText),
    false,
    "unknown-time chart evidence must omit Moon, angles, and exact degrees",
  );
  assert.match(
    await page.locator(".aura-result__limits").innerText(),
    /natal Moon is excluded[\s\S]*Ascendant and Midheaven.*excluded/i,
  );
  await context.close();
}

async function verifyWalletLifecycle(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context);
  await context.addInitScript(() => {
    const listeners = new Map();
    const calls = [];
    const first = "0x0000000000000000000000000000000000000001";
    const provider = {
      request: async ({ method }) => {
        calls.push(method);
        if (method === "eth_requestAccounts") return [first];
        throw new Error(`Unexpected wallet method: ${method}`);
      },
      on: (event, listener) => {
        const own = listeners.get(event) ?? new Set();
        own.add(listener);
        listeners.set(event, own);
      },
      removeListener: (event, listener) =>
        listeners.get(event)?.delete(listener),
    };
    const detail = {
      info: {
        uuid: "350670db-19fa-4704-a166-e52e178b59d2",
        name: "Aura test wallet",
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        rdns: "org.zodiacs.test-wallet",
      },
      provider,
    };
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail }),
      );
    window.addEventListener("eip6963:requestProvider", announce);
    globalThis.__auraWalletTest = {
      calls,
      emit(event, value) {
        for (const listener of listeners.get(event) ?? []) listener(value);
      },
    };
  });
  const page = await context.newPage();
  let lookupCount = 0;
  let firstLookupStarted;
  const firstStarted = new Promise((resolveStarted) => {
    firstLookupStarted = resolveStarted;
  });
  let allowFirstResponse;
  const firstResponseAllowed = new Promise((resolveResponse) => {
    allowFirstResponse = resolveResponse;
  });
  await page.route("**/api/aura-holdings", async (route) => {
    lookupCount += 1;
    if (lookupCount === 1) {
      firstLookupStarted();
      await firstResponseAllowed;
      await route
        .fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            chain: "solana",
            heldSigns: ["cancer"],
            checkedAt: fixedNow,
          }),
        })
        .catch(() => {});
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chain: "base",
        heldSigns: ["aries"],
        checkedAt: fixedNow,
      }),
    });
  });
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  assert.deepEqual(
    await page.evaluate(() => globalThis.__auraWalletTest.calls),
    [],
    "discovery must not request an account",
  );
  const connectBaseButton = page.getByRole("button", {
    name: "Connect Base wallet",
  });
  assert.equal(
    await connectBaseButton.getAttribute("aria-expanded"),
    null,
    "a direct one-provider connect must not claim to expand a chooser",
  );
  assert.equal(await connectBaseButton.getAttribute("aria-controls"), null);
  // Chain buttons carry their network marks; a single detected provider
  // personalises its button with the wallet's own announced icon + name.
  assert.equal(
    await page
      .locator('.aura-address-methods img.aura-chain-mark')
      .count(),
    2,
    "both chain buttons must wear their network mark",
  );
  assert.equal(
    await connectBaseButton.locator("img.aura-wallet-icon").count(),
    1,
    "the single detected wallet's own icon must appear on its button",
  );
  assert.ok(
    (await connectBaseButton.innerText()).includes("via Aura test wallet"),
    "the single detected wallet must be named on the button",
  );
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await firstStarted;
  await connectBaseButton.click();
  await page.getByText("Aura test wallet · connected address · Base").waitFor();
  assert.deepEqual(
    await page.evaluate(() => globalThis.__auraWalletTest.calls),
    ["eth_requestAccounts"],
  );
  await page.waitForFunction(() =>
    document.activeElement?.textContent?.includes("Connect Base wallet"),
  );
  assert.equal(
    await page.getByRole("button", { name: "Read them side by side" }).isEnabled(),
    true,
    "connecting during a lookup must leave Compose usable",
  );
  allowFirstResponse();
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".aura-result").count(),
    0,
    "the superseded pasted-address result must stay discarded",
  );
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator("#aura-result-title").waitFor();

  const second = "0x0000000000000000000000000000000000000002";
  await page.evaluate(
    (value) => globalThis.__auraWalletTest.emit("accountsChanged", [value]),
    second,
  );
  await page.waitForFunction(
    (value) =>
      document.querySelector("#aura-address")?.value === value &&
      !document.querySelector(".aura-result"),
    second,
  );
  assert.equal(
    await page.locator("#aura-address").getAttribute("readonly"),
    "",
  );
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-address",
  );
  assert.equal(
    await page
      .locator("#aura-address")
      .evaluate((node) => node === document.activeElement),
    true,
  );

  await page.evaluate(() => globalThis.__auraWalletTest.emit("disconnect"));
  await page.waitForFunction(
    () =>
      document.querySelector("#aura-address")?.value === "" &&
      !document.querySelector(".aura-connected"),
  );
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-address",
  );
  assert.equal(
    await page
      .locator("#aura-address")
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await context.close();
}

async function verifyWalletPickerFocus(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
  });
  await installDeterministicBrowserState(context);
  await context.addInitScript(() => {
    const announce = (uuid, name, account) =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {
              uuid,
              name,
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
              rdns: `org.zodiacs.${name.toLowerCase().replaceAll(" ", "-")}`,
            },
            provider: {
              request: async ({ method }) => {
                if (method === "eth_requestAccounts") return [account];
                throw new Error(`Unexpected wallet method: ${method}`);
              },
              on: () => {},
              removeListener: () => {},
            },
          },
        }),
      );
    window.addEventListener("eip6963:requestProvider", () => {
      announce(
        "93f3c4ea-5b5b-42ec-9372-af30c1907552",
        "First test wallet",
        "0x0000000000000000000000000000000000000001",
      );
      announce(
        "ff5af88e-44b1-492f-84db-d7380adbb177",
        "Second test wallet",
        "0x0000000000000000000000000000000000000002",
      );
    });
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  const connectBaseButton = page.getByRole("button", {
    name: "Connect Base wallet",
  });
  assert.equal(await connectBaseButton.getAttribute("aria-expanded"), "false");
  await connectBaseButton.click();
  assert.equal(await connectBaseButton.getAttribute("aria-expanded"), "true");
  // Each picker row wears the icon the wallet announced about itself.
  assert.equal(
    await page.locator("#aura-base-wallets img.aura-wallet-icon").count(),
    2,
    "every announced wallet icon must appear in the picker",
  );
  await page.getByRole("button", { name: "Second test wallet" }).click();
  await page
    .getByText("Second test wallet · connected address · Base")
    .waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.textContent?.includes("Connect Base wallet"),
  );
  assert.equal(await connectBaseButton.getAttribute("aria-expanded"), "false");
  await context.close();
}

async function verifyEdgeStates(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 320, height: 800 },
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await installDeterministicBrowserState(context);
  const page = await context.newPage();
  let outcome = "held";
  await page.route("**/api/aura-holdings", (route) =>
    outcome !== "unavailable"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            chain: "solana",
            heldSigns: outcome === "held" ? ["cancer"] : [],
            checkedAt: recordCheckedAt,
          }),
        })
      : route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "unavailable" }),
        }),
  );
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  await page.locator("#wallet-basics details").evaluateAll((details) =>
    details.forEach((item) => {
      item.open = true;
    }),
  );
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "320px/400% equivalent must not scroll horizontally",
  );
  assert.equal(
    await page
      .locator("#wallet-basics summary")
      .evaluateAll((nodes) =>
        nodes.every((node) => node.getBoundingClientRect().height >= 44),
      ),
    true,
    "wallet guidance must retain usable disclosure targets in forced colors",
  );
  await page.locator("#wallet-basics details").evaluateAll((details) =>
    details.forEach((item) => {
      item.open = false;
    }),
  );
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.locator('.aura-result [data-aura-record-sign="cancer"]').waitFor();
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "the composed result must not scroll horizontally at the 320px/400% equivalent",
  );
  await page.locator(".aura-evidence .aura-plate summary").first().click();
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "opened evidence must not scroll horizontally at the 320px/400% equivalent",
  );
  await page
    .getByText(
      "The card features Cancer, chosen from the public record and dated sky — never from the chart.",
    )
    .waitFor();
  const forcedColorMarks = await page
    .locator(
      '.aura-result [data-aura-record-sign="cancer"] img, .aura-result [data-aura-chart-mark="cancer"], .aura-result [data-aura-sky-mark="cancer"]',
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return node.tagName === "IMG"
          ? style.outlineStyle !== "none" && style.outlineWidth !== "0px"
          : style.color !== "rgba(0, 0, 0, 0)" ||
              style.borderTopColor !== "rgba(0, 0, 0, 0)" ||
              style.backgroundColor !== "rgba(0, 0, 0, 0)";
      }),
    );
  assert.equal(
    forcedColorMarks.length > 1 && forcedColorMarks.every(Boolean),
    true,
    "record discs, chart marks, and sky marks must remain visible in forced colors",
  );

  await page
    .getByRole("button", { name: "Clear this reading" })
    .click();
  outcome = "empty";
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page.getByText("Public record", { exact: true }).waitFor();
  await page.getByText("Public record", { exact: true }).click();
  const emptyResultText = await page.locator(".aura-result").innerText();
  assert.ok(emptyResultText.includes("no absence is assigned meaning"));
  assert.match(emptyResultText, /does not mean the address is empty/i);
  assert.match(emptyResultText, /do not need to buy one/i);
  assert.match(emptyResultText, /intended public address and network/i);
  assert.equal(
    await page.getByRole("button", { name: "Try another address" }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", { name: "See the example" }).count(),
    1,
  );
  assert.equal(await page.locator(".aura-result [data-aura-record-sign]").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "Create card preview" }).count(),
    0,
    "an empty public record must not manufacture a share focus",
  );

  await page
    .getByRole("button", { name: "Clear this reading" })
    .click();
  outcome = "unavailable";
  await page.locator("#aura-address").fill(address);
  await page.getByRole("button", { name: "Read them side by side" }).click();
  await page
    .getByText(
      "The blockchain data provider did not return a complete answer. No absence has been inferred.",
    )
    .waitFor();
  assert.equal(await page.locator(".aura-result").count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "See the example instead" })
      .count(),
    1,
    "a provider failure must keep the example escape visible",
  );
  await page.waitForFunction(
    () => document.activeElement?.id === "aura-address",
  );
  assert.equal(
    await page
      .locator("#aura-address")
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await context.close();
}

// The flag-on build hands the landing hero's secondary button to Aura in
// both render paths: the stamped static markup (no-JS visitors, first
// paint) and the compiled React bundle (which branches on the stamped meta
// at runtime). Asserted from the built files, not a live mount — the
// landing loads React from unpkg, and CI must not depend on a CDN.
async function verifyLandingHeroHandoff() {
  const staticHtml = await readFile(
    resolve(root, "dist/registry/index.html"),
    "utf8",
  );
  assert.ok(
    staticHtml.includes(
      '<a class="btn" href="/registry/aura/"><span>Bring your birth chart</span></a>',
    ),
    "static landing hero must carry the Aura CTA while the flag is on",
  );
  assert.ok(
    staticHtml.includes(
      '<a class="cine__why" href="/thesis/">Why this exists</a>',
    ),
    "static landing hero must keep the thesis as a demoted text link",
  );
  assert.ok(
    !staticHtml.includes('<a class="btn" href="/thesis/">'),
    "the thesis button must not survive the flag-on stamp",
  );

  const bundle = await readFile(
    resolve(root, "dist/assets/app.js"),
    "utf8",
  );
  for (const marker of [
    "Bring your birth chart",
    "Why this exists",
    "cine__why",
    "/registry/aura/",
  ]) {
    assert.ok(
      bundle.includes(marker),
      `compiled landing bundle must carry the hero handoff (missing ${JSON.stringify(marker)})`,
    );
  }
}

// A first-time desktop visitor must see the page name and the example
// together on the first screen; a bottom-aligned lede beside the tall
// example card silently pushed the headline below the fold.
async function verifyHeroAboveTheFold(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // Geometry assertions: read the settled layout, not a mid-entrance frame.
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });
  const headline = await page
    .locator(".aura-page__hero h1")
    .boundingBox();
  const example = await page.locator(".aura-page__demo").boundingBox();
  assert.ok(headline, "hero headline must render");
  assert.ok(example, "hero example must render");
  assert.ok(
    headline.y >= 0 && headline.y + headline.height <= 800,
    `the headline must sit inside the first 1280x800 screen (got y=${headline.y})`,
  );
  assert.ok(
    example.y < 800,
    "the example must begin inside the first desktop screen",
  );

  // The V3 hero's "two honest doors" must be actionable without
  // scrolling: buried at the bottom of the ~930px example card they
  // were on no one's first screen.
  for (const [name, href] of [
    ["Open the full example", "#aura-composer"],
    ["Start with your chart", "#aura-composer"],
  ]) {
    const door = await page
      .locator(`.aura-page__hero a:has-text("${name}")`)
      .boundingBox();
    assert.ok(door, `hero door "${name}" must render`);
    assert.ok(
      door.y >= 0 && door.y + door.height <= 800,
      `hero door "${name}" must sit inside the first 1280x800 screen (got y=${door.y})`,
    );
    const target = await page
      .locator(`.aura-page__hero a:has-text("${name}")`)
      .getAttribute("href");
    assert.equal(target, href, `hero door "${name}" must anchor to the composer`);
  }
  await context.close();
}

// The hero's example card is a narrow container on a wide viewport, so
// the Alignment inside it must wear the stacked band-label shape (labels
// above their row) that phones get — the side-label desktop shape crushes
// twelve sign columns into ~18px each and the record discs collide.
async function verifyDemoCardDensity(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // Geometry assertions: read the settled layout, not a mid-entrance frame.
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });

  const label = await page
    .locator(".aura-page__demo .aura-algn__lbl")
    .first()
    .boundingBox();
  const firstCell = await page
    .locator(".aura-page__demo .aura-algn tbody tr")
    .first()
    .locator(".aura-algn__cell")
    .first()
    .boundingBox();
  assert.ok(label && firstCell, "demo Alignment must render labels and cells");
  assert.ok(
    label.y + label.height <= firstCell.y + 1,
    `demo band label must sit above its marks row, not beside it (label bottom ${label.y + label.height}, cell top ${firstCell.y})`,
  );

  const discs = await page
    .locator(".aura-page__demo .aura-algn__disc")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, width: box.width };
      }),
    );
  assert.ok(discs.length >= 2, "the example record must show several discs");
  const sorted = [...discs].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width);
    assert.ok(
      gap >= 2,
      `record discs in the demo card must not collide (gap ${gap.toFixed(1)}px)`,
    );
  }
  await context.close();
}

// The natural question one scroll below the hero is "what is this?" —
// a plain-language answer with the three sources must sit between the
// hero and the wallet guide.
async function verifyWhatIsSection(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/aura/`, { waitUntil: "networkidle" });

  const section = page.locator("#what-is-aura");
  assert.equal(await section.count(), 1, "the what-is section must exist");
  assert.match(
    await section.locator("h2").innerText(),
    /what is registry aura/i,
    "the section heading must answer the visitor's literal question",
  );
  const tiles = section.locator(".aura-what__tile");
  assert.equal(await tiles.count(), 3, "one tile per source");
  const titles = (await tiles.locator("h3").allInnerTexts()).join(" | ");
  for (const expected of ["Birth chart", "Address record", "Today’s sky"]) {
    assert.ok(titles.includes(expected), `missing source tile: ${expected}`);
  }
  assert.equal(
    await tiles.locator(".aura-what__mark").count(),
    3,
    "each tile teaches its mark",
  );

  const what = await section.boundingBox();
  const basics = await page.locator("#wallet-basics").boundingBox();
  assert.ok(
    what.y < basics.y,
    "the what-is answer must come before the wallet guide",
  );
  await context.close();
}

// A visitor with a saved chart should see their chart at the door, not a
// generic label.
async function verifyChartAwareDoor(browser, baseURL) {
  const anonymous = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "networkidle",
  });
  const anonymousDoor = anonymousPage.locator(".aura-page__cta .btn--primary");
  assert.equal(
    (await anonymousDoor.innerText()).trim(),
    "Start with your chart",
    "without a saved chart the door stays generic",
  );
  await anonymous.close();

  const returning = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  await returning.addInitScript((storedProfile) => {
    localStorage.setItem("zodiacs.profile.v1", JSON.stringify(storedProfile));
  }, profile);
  const returningPage = await returning.newPage();
  await returningPage.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "networkidle",
  });
  const door = returningPage.locator(".aura-page__cta .btn--primary");
  const doorText = await door.innerText();
  assert.ok(
    doorText.includes(profile.charts[0].name),
    `the door must present the saved chart by name (got ${JSON.stringify(doorText)})`,
  );
  assert.equal(
    await door.getAttribute("href"),
    "#aura-composer",
    "the personalised door still leads to the composer",
  );
  assert.equal(
    await door.locator("img").count(),
    1,
    "the personalised door carries the chart's sun-sign disc",
  );
  await returning.close();
}

// Sections wake as they enter the viewport; reduced motion sees
// everything immediately (parity, never a lesser page).
async function verifyScrollChoreography(browser, baseURL) {
  const animated = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const animatedPage = await animated.newPage();
  await animatedPage.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "networkidle",
  });
  const tile = animatedPage.locator(".aura-what__tile").first();
  await tile.scrollIntoViewIfNeeded();
  await animatedPage.waitForFunction(() => {
    const node = document.querySelector(".aura-what__tile");
    return node && getComputedStyle(node).opacity === "1";
  });
  const heroOpacity = await animatedPage
    .locator(".aura-page__hero h1")
    .evaluate((node) => getComputedStyle(node).opacity);
  assert.equal(heroOpacity, "1", "the hero must finish fully painted");
  await animated.close();

  const reduced = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${baseURL}/registry/aura/`, {
    waitUntil: "networkidle",
  });
  const reducedOpacity = await reducedPage
    .locator(".aura-what__tile")
    .first()
    .evaluate((node) => getComputedStyle(node).opacity);
  assert.equal(
    reducedOpacity,
    "1",
    "reduced motion must see every section without scrolling",
  );
  await reduced.close();
}

await mkdir(proofRoot, { recursive: true });
await verifyAuraBundleSafety();
await verifyLandingHeroHandoff();
const executablePath = await findChromium();
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});
try {
  await withPreview({ port: 4331 }, async (baseURL) => {
    await verifyHeroAboveTheFold(browser, baseURL);
    await verifyDemoCardDensity(browser, baseURL);
    await verifyWhatIsSection(browser, baseURL);
    await verifyChartAwareDoor(browser, baseURL);
    await verifyScrollChoreography(browser, baseURL);
    await verifyWalletEducation(browser, baseURL);
    const oneGeometry = await captureCase(browser, baseURL, "one", ["cancer"]);
    const fourGeometry = await captureCase(browser, baseURL, "four", [
      "cancer",
      "leo",
      "scorpio",
      "aquarius",
    ]);
    const twelveGeometry = await captureCase(
      browser,
      baseURL,
      "twelve",
      allSigns,
    );
    assert.deepEqual(
      fourGeometry,
      oneGeometry,
      "a held record frame must not grow, lift, or move when four signs are held",
    );
    assert.deepEqual(
      twelveGeometry,
      oneGeometry,
      "a held record frame must not gain prestige treatment when twelve signs are held",
    );
    await verifyNoChartAndOfflineExample(browser, baseURL);
    await verifyRequestInvalidation(browser, baseURL);
    await verifyRememberInterleaving(browser, baseURL);
    await verifyInputInvalidatesPersistence(browser, baseURL);
    await verifySocialShareAndDisclosure(browser, baseURL);
    await verifyUnknownTimeOmissions(browser, baseURL);
    await verifyWalletLifecycle(browser, baseURL);
    await verifyWalletPickerFocus(browser, baseURL);
    await verifyEdgeStates(browser, baseURL);
  });
} finally {
  await browser.close();
}

console.log(
  "aura-drive: beginner wallet education, first-screen example, V3 docket/order, Alignment grammar, mixed dates with relative note, chart/sky marks, disc parity, unknown-time omissions, exact-blob social preview/share/download, persistence, wallet lifecycle, forced colors, offline/error states with example escape, and 375px/250px proofs verified",
);
