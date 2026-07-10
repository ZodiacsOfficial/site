import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { chromium } from 'playwright-core';

async function isExecutable(path) {
  if (!path) return false;
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function pathCandidates(names) {
  return (process.env.PATH ?? '')
    .split(delimiter)
    .flatMap((directory) => names.map((name) => join(directory, name)));
}

/**
 * playwright-core deliberately downloads no browser. Prefer an explicit CI
 * path, then a Playwright-managed Chromium if one exists, then the stable
 * Chrome/Chromium that ships with the host image.
 */
export async function findChromium() {
  const explicit = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ];

  let playwrightPath;
  try {
    playwrightPath = chromium.executablePath();
  } catch {
    playwrightPath = undefined;
  }

  const platformPaths = process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      ]
    : process.platform === 'win32'
      ? [
          `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ];

  const candidates = [
    ...explicit,
    playwrightPath,
    ...platformPaths,
    ...pathCandidates([
      'google-chrome',
      'google-chrome-stable',
      'chromium',
      'chromium-browser',
      'chrome',
    ]),
  ];

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  throw new Error(
    'No Chromium browser found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or CHROME_PATH to an executable Chrome/Chromium binary.',
  );
}

export const STABLE_CHROMIUM_ARGS = [
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-features=Translate,BackForwardCache',
  '--disable-font-subpixel-positioning',
  '--disable-lcd-text',
  '--font-render-hinting=none',
  '--hide-scrollbars',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-sandbox',
];
