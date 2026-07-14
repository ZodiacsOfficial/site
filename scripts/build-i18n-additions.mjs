import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EN as TRUST_EN } from '../src/strings/en.mjs';
import {
  BREADCRUMB_LABELS,
  OG_EN,
  SCHEMA_EN,
} from '../src/strings/seo.en.mjs';
import { PWA_MANIFEST_EN, PWA_PUSH_EN } from '../src/strings/pwa.en.mjs';
import { PWA_PROMPT_EN } from '../src/strings/pwa.ts';
import { PUSH_COPY } from '../src/strings/push.ts';
import { PROGRAMMATIC_EN } from '../src/strings/programmatic.ts';
import { SHARE_CARD_EN } from '../src/lib/share-card-copy.ts';
import {
  CHINESE_ZODIAC_ANIMALS,
  CHINESE_ZODIAC_COPY,
} from '../src/data/chinese-zodiac.ts';
import {
  WIDGET_EN,
  WIDGET_PHASE_NAMES_EN,
  WIDGET_PLANET_NAMES_EN,
  WIDGET_SIGN_NAMES_EN,
} from '../src/strings/widgets.ts';
import { WALLET_CHART_EN } from '../src/strings/wallet-chart.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'i18n-additions.md');

const EMAIL_KEYS = [
  'emailCaptureKicker', 'emailCaptureTitle', 'emailCaptureCopy',
  'emailCaptureEmailLabel', 'emailCaptureEmailPlaceholder',
  'emailCaptureSignLegend', 'emailCaptureNoSign', 'emailCaptureSubmit',
  'emailCaptureSubmitting', 'emailCaptureSuccess', 'emailCaptureErrorTitle',
  'emailCaptureError', 'emailCapturePrivacy', 'emailCaptureHoneypot',
  'emailPendingTitle', 'emailPendingBody', 'emailConfirmSubject',
  'emailConfirmMessage', 'emailConfirmIgnore', 'emailConfirmTitle',
  'emailConfirmBody', 'emailConfirmAction', 'emailConfirmedTitle',
  'emailConfirmedBody', 'emailConfirmInvalidTitle', 'emailConfirmInvalidBody',
  'emailReturnHome', 'footerWidgets',
];

const SHARE_POSITIONS_KEYS = [
  'shareOptionsTitle', 'closeShare', 'hideBirthDetails',
  'copyPositionsLink', 'positionsShareNote', 'positionsOnlyTitle',
  'positionsOnlyNotice', 'positionsOnlyPrivacy', 'positionsLinkInvalid',
  'shareLinkAmbiguous', 'positionsShareUnavailable',
];

const COMPATIBILITY_PREFILL_KEYS = ['title', 'help', 'clear'];

function objectKeys(prefix, value) {
  return Object.keys(value).map((key) => `${prefix}.${key}`);
}

function ogKeys() {
  const keys = ['og.fallbackAlt'];
  for (const key of Object.keys(OG_EN.signNames)) keys.push(`og.signNames.${key}`);
  for (const group of [
    'share', 'signGuide', 'registryLot', 'registry', 'thesis', 'disclosure',
    'horoscope', 'rising', 'placements', 'compatibility',
  ]) {
    for (const key of Object.keys(OG_EN[group])) {
      if (!['path', 'image'].includes(key)) keys.push(`og.${group}.${key}`);
    }
  }
  for (const key of Object.keys(OG_EN.planetNames)) keys.push(`og.planetNames.${key}`);
  keys.push('og.pin.signGuide.kicker');
  for (const key of Object.keys(OG_EN.pin.horoscope)) keys.push(`og.pin.horoscope.${key}`);
  keys.push('og.pin.howTo.kicker', 'og.pin.howTo.title');
  for (const key of Object.keys(OG_EN.pin.howTo.steps)) keys.push(`og.pin.howTo.steps.${key}`);
  for (const tool of OG_EN.tools) {
    for (const key of ['kicker', 'title', 'sub']) keys.push(`og.tools.${tool.key}.${key}`);
  }
  return keys;
}

function schemaKeys() {
  return [
    ...objectKeys('schema', SCHEMA_EN),
    ...objectKeys('schema.breadcrumbLabels', BREADCRUMB_LABELS),
  ];
}

function chineseKeys() {
  const keys = objectKeys('chineseZodiac', CHINESE_ZODIAC_COPY);
  for (const animal of CHINESE_ZODIAC_ANIMALS) {
    for (const field of ['name', 'association', 'context']) {
      keys.push(`chineseZodiac.animals.${animal.slug}.${field}`);
    }
  }
  return keys;
}

function widgetKeys() {
  return [
    ...objectKeys('widgets', WIDGET_EN),
    ...objectKeys('widgets.signNames', WIDGET_SIGN_NAMES_EN),
    ...objectKeys('widgets.planetNames', WIDGET_PLANET_NAMES_EN),
    ...objectKeys('widgets.phaseNames', WIDGET_PHASE_NAMES_EN),
  ];
}

export function i18nAdditionSections() {
  return [
    ['WS1 — trust, disclosure, and archive receipts', Object.keys(TRUST_EN)],
    ['WS2b — email capture and shared footer', EMAIL_KEYS],
    ['WS2c — OG and social-card art', ogKeys()],
    ['WS2d — structured data', schemaKeys()],
    ['WS3 — share cards and result sharing', [
      ...objectKeys('shareCard', SHARE_CARD_EN),
      ...SHARE_POSITIONS_KEYS.map((key) => `sharePositions.${key}`),
      ...COMPATIBILITY_PREFILL_KEYS.map((key) => `compatibilityPrefill.${key}`),
    ]],
    ['WS4 — PWA, install prompt, and flag-off push scaffold', [
      ...objectKeys('pwa.manifest', PWA_MANIFEST_EN),
      ...objectKeys('pwa.prompt', PWA_PROMPT_EN),
      ...objectKeys('push.prompt', PUSH_COPY.en),
      ...objectKeys('push.notification', PWA_PUSH_EN),
    ]],
    ['WS5 — programmatic pages and Chinese zodiac', [
      ...objectKeys('programmatic', PROGRAMMATIC_EN),
      ...chineseKeys(),
    ]],
    ['WS6 — widgets', widgetKeys()],
    ['WS8 — wallet natal chart', objectKeys('walletChart', WALLET_CHART_EN)],
  ].map(([title, keys]) => [title, [...new Set(keys)].sort()]);
}

export function renderI18nAdditions() {
  const sections = i18nAdditionSections();
  const count = sections.reduce((sum, [, keys]) => sum + keys.length, 0);
  const body = sections.map(([title, keys]) => [
    `## ${title}`,
    '',
    ...keys.map((key) => `- \`${key}\``),
    '',
  ].join('\n')).join('\n');
  return `# i18n additions\n\n` +
    `TODO(i18n): translate the ${count} additive English keys below into PT, FR, and IT after the locale branch lands. Existing translated strings were not edited except for additive EN/ES parity keys.\n\n` +
    `This file is generated by \`scripts/build-i18n-additions.mjs\` from the English catalogues and the small set of keys added to the existing site UI catalogue. Paths, URLs, slugs, schema enum constants, Roman numerals, and brand wordmarks are not translation keys.\n\n` +
    body;
}

export async function writeI18nAdditions(path = output) {
  const content = renderI18nAdditions();
  await writeFile(path, content, 'utf8');
  return content;
}

export async function i18nManifestIsCurrent(path = output) {
  return readFile(path, 'utf8').then((value) => value === renderI18nAdditions(), () => false);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = await writeI18nAdditions();
  console.log(`i18n additions: ${content.split('\n- `').length - 1} keys written.`);
}
