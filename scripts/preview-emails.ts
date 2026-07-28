#!/usr/bin/env node
/**
 * Renders one representative message per mailer to HTML on disk, so the
 * branded shell can be looked at instead of imagined.
 *
 *   npx vite-node scripts/preview-emails.ts -- --out .email-preview
 *
 * Output is a scratch directory, never committed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderEmailHtml, renderEmailText, type EmailDocument } from '../src/lib/email/template';

const BASE = process.env.PREVIEW_BASE || 'https://zodiacs.org';

const outIndex = process.argv.indexOf('--out');
const outDir = resolve(process.cwd(), outIndex > -1 ? process.argv[outIndex + 1] : '.email-preview');

const digest: EmailDocument = {
  preheader: 'Your saved charts, Jul 13-19 — the closest transits, with orbs.',
  eyebrow: 'Weekly digest · Jul 13-19',
  title: 'Your sky, Jul 13-19',
  sign: 'leo',
  identity: '2 saved charts',
  intro: 'The closest aspects to your saved charts this week, with the orb each one is measured at.',
  sections: [
    {
      heading: 'Frida',
      rows: [
        { label: 'Jul 14', body: 'Jupiter puts focus on your way of thinking.', receipt: 'transiting Jupiter conjunction natal Mercury, 0.0 deg orb.' },
        { label: 'Jul 13', body: 'Mercury puts focus on your sense of self.', receipt: 'transiting Mercury conjunction natal Sun, 0.1 deg orb.' },
        { label: 'Jul 16', body: 'Venus backs up your independence.', receipt: 'transiting Venus trine natal Uranus, 0.1 deg orb.' },
      ],
    },
    {
      heading: 'Diego',
      rows: [],
      empty: 'Nothing within 3° of exact this week — a quiet one for this chart.',
    },
  ],
  cta: { label: 'Read all transits', url: `${BASE}/transits/` },
  footerLines: ['You receive this because you asked for a Monday digest of your saved charts.'],
  unsubscribeUrl: `${BASE}/api/unsubscribe?u=demo&sig=demo`,
};

const confirm: EmailDocument = {
  preheader: 'One tap to confirm your daily forecast.',
  eyebrow: 'Confirm your subscription',
  title: 'Confirm your daily forecast',
  sign: 'scorpio',
  identity: 'Daily · Scorpio',
  intro: 'Tap the button to start receiving your daily forecast. The link works for 48 hours.',
  sections: [
    {
      paragraphs: [
        'If you did not request this, ignore this email — nothing will be subscribed, and the link expires on its own.',
      ],
    },
  ],
  cta: { label: 'Confirm subscription', url: `${BASE}/api/email/confirm?token=demo` },
  footerLines: ['Zodiacs.org — free astrology tools and sign guides.'],
};

const daily: EmailDocument = {
  preheader: 'Sun 21°04′ Leo · Moon in Capricorn · a working Tuesday.',
  eyebrow: 'Daily · Tue 28 Jul 2026',
  title: 'A day that rewards finishing things',
  sign: 'leo',
  identity: 'Leo · sun sign',
  intro: 'The Moon spends the day in Capricorn, which tends to favour the unglamorous half of a project.',
  sections: [
    {
      heading: 'Today',
      paragraphs: [
        'Mercury holds a close trine to Saturn, and the combination is good for anything that needs to be right the first time: contracts, corrections, the email you have rewritten twice.',
        'Nothing in the sky argues for a big new start. The day is better spent closing what is already open.',
      ],
    },
    {
      heading: 'Ahead',
      rows: [
        { label: 'Jul 31', body: 'Full moon in Aquarius.', receipt: 'exact 04:12 UTC' },
      ],
    },
  ],
  cta: { label: 'See your full chart', url: `${BASE}/birth-chart/` },
  links: [{ label: 'Why this appeared', url: `${BASE}/methodology/` }],
  footerLines: ['Zodiacs.org · 2261 Market Street, San Francisco, CA 94114'],
  unsubscribeUrl: `${BASE}/api/email/unsubscribe?token=demo`,
  manageUrl: `${BASE}/profile/`,
};

await mkdir(outDir, { recursive: true });
for (const [name, doc] of Object.entries({ digest, confirm, daily })) {
  await writeFile(resolve(outDir, `${name}.html`), renderEmailHtml(doc, BASE), 'utf8');
  await writeFile(resolve(outDir, `${name}.txt`), renderEmailText(doc), 'utf8');
  const bytes = Buffer.byteLength(renderEmailHtml(doc, BASE), 'utf8');
  console.log(`${name}.html — ${(bytes / 1024).toFixed(1)} KB`);
}
console.log(`\nWrote previews to ${outDir}`);
